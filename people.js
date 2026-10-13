/* =========================================================
   NEXA PEOPLE
   Shows everyone who has joined NEXA (the `profiles` table)
   and who is online right now (Supabase Realtime presence)
========================================================= */


/* =========================================================
   ELEMENTS
========================================================= */

const $ = id => document.getElementById(id);

const searchInput = $("searchInput");
const clearSearchButton = $("clearSearchButton");
const searchPeopleButton = $("searchPeopleButton");
const usersList = $("usersList");
const emptyPeople = $("emptyPeople");
const peopleLoading = $("peopleLoading");
const peopleCount = $("peopleCount");
const searchStatus = $("searchStatus");
const onlineNote = $("onlineNote");
const logoutButton = $("logoutButton");
const notificationArea = $("notificationArea");

const miniAvatar = $("miniAvatar");
const sidebarAvatar = $("sidebarAvatar");
const sidebarUserName = $("sidebarUserName");
const sidebarUsername = $("sidebarUsername");
const mobileProfileAvatar = $("mobileProfileAvatar");

const myProfileAvatar = $("myProfileAvatar");
const myProfileName = $("myProfileName");
const myProfileUsername = $("myProfileUsername");
const myProfileBio = $("myProfileBio");


/* =========================================================
   STATE
========================================================= */

let currentUser = getStoredUser();

let allUsers = [];
let isLoadingUsers = false;
let loadFailed = false;
let searchTimer = null;

let onlineIds = new Set();
let presenceChannel = null;
let presenceTimer = null;


/* =========================================================
   AUTHENTICATION
========================================================= */

function getStoredUser() {

    try {

        const stored = localStorage.getItem("nexaCurrentUser");

        return stored ? JSON.parse(stored) : null;

    } catch (error) {

        console.error("Could not read current user:", error);

        return null;
    }
}

if (!currentUser) {

    window.location.replace("index.html");

    throw new Error("No NEXA user is logged in.");
}


/* =========================================================
   EXTRA STYLES
   (online badge + error card, so people.css needs no change)
========================================================= */

function injectStyles() {

    const style = document.createElement("style");

    style.textContent = `
        .online-pill {
            display: inline-flex;
            align-items: center;
            gap: 5px;

            margin-left: 8px;
            padding: 2px 8px;

            border-radius: 999px;

            background: rgba(54, 170, 131, .14);
            color: #4cd3a3;

            font-size: 10px;
            font-weight: 700;
            vertical-align: middle;
        }

        .online-pill::before {
            content: "";

            width: 6px;
            height: 6px;

            border-radius: 50%;

            background: #4cd3a3;
            box-shadow: 0 0 8px #4cd3a3;
        }

        .people-error {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 10px;

            padding: 40px 20px;

            border: 1px dashed rgba(212, 175, 55, .3);
            border-radius: 18px;

            text-align: center;
        }

        .people-error button {
            min-height: 38px;
            padding: 0 18px;

            border: 0;
            border-radius: 10px;

            background: linear-gradient(135deg, #a27a16, #d4af37);
            color: #080706;

            font-weight: 800;
            cursor: pointer;
        }
    `;

    document.head.appendChild(style);
}


/* =========================================================
   USER HELPERS
========================================================= */

function getUserId(user) {

    if (!user) {
        return null;
    }

    return user.id ?? user._id ?? user.userId ?? null;
}

function getUserName(user) {

    return (
        user?.name ||
        user?.username ||
        user?.email ||
        "NEXA User"
    );
}

function getUsername(user) {

    return (
        user?.username ||
        user?.name ||
        (user?.email ? String(user.email).split("@")[0] : "") ||
        "nexauser"
    );
}

function getAvatarLetter(user) {

    return (
        String(getUserName(user)).trim().charAt(0).toUpperCase() || "N"
    );
}

function getProfileImage(user) {

    return (
        user?.profile_picture ||
        user?.profilePicture ||
        user?.avatar ||
        user?.photo ||
        user?.profileImage ||
        ""
    );
}

function escapeHTML(value) {

    const div = document.createElement("div");

    div.textContent = String(value ?? "");

    return div.innerHTML;
}

function showNotification(text) {

    if (!notificationArea) {
        return;
    }

    const notice = document.createElement("div");

    notice.className = "nexa-notification";
    notice.textContent = text;

    notificationArea.appendChild(notice);

    setTimeout(() => {

        notice.classList.add("hide");

        setTimeout(() => notice.remove(), 250);

    }, 3000);
}

function setAvatar(element, user) {

    if (!element) {
        return;
    }

    const image = getProfileImage(user);

    element.textContent = "";

    if (!image) {
        element.textContent = getAvatarLetter(user);
        return;
    }

    const img = document.createElement("img");

    img.src = image;
    img.alt = getUserName(user);

    img.addEventListener("error", () => {
        element.textContent = getAvatarLetter(user);
    });

    element.appendChild(img);
}


/* =========================================================
   DISPLAY CURRENT USER
========================================================= */

function displayMyProfile() {

    const name = getUserName(currentUser);
    const username = getUsername(currentUser);

    setAvatar(miniAvatar, currentUser);
    setAvatar(sidebarAvatar, currentUser);
    setAvatar(myProfileAvatar, currentUser);

    if (mobileProfileAvatar) {
        mobileProfileAvatar.textContent = getAvatarLetter(currentUser);
    }

    if (sidebarUserName) sidebarUserName.textContent = name;
    if (sidebarUsername) sidebarUsername.textContent = "@" + username;

    if (myProfileName) myProfileName.textContent = name;
    if (myProfileUsername) myProfileUsername.textContent = "@" + username;

    if (myProfileBio) {
        myProfileBio.textContent = currentUser.bio || "No bio yet.";
    }
}

function mergeCurrentUser(profile) {

    currentUser = {
        ...currentUser,
        ...profile,
        profilePicture: profile.profile_picture || ""
    };

    localStorage.setItem("nexaCurrentUser", JSON.stringify(currentUser));
}


/* =========================================================
   MY PROFILE ROW
   Signing up only creates a login. If there is no matching
   row in `profiles`, create one so you appear in the list.
========================================================= */

async function ensureMyProfile() {

    const id = getUserId(currentUser);

    if (!id) {
        return;
    }

    const { error } = await nexaSupabase
        .from("profiles")
        .upsert(
            {
                id: String(id),
                name: getUserName(currentUser),
                username: getUsername(currentUser)
            },
            { onConflict: "id", ignoreDuplicates: true }
        );

    if (error) {
        console.warn("NEXA People could not create your profile row:", error.message);
    }
}

/* Never throws: a missing profile must not stop the list loading */

async function loadCurrentUser() {

    const userId = String(getUserId(currentUser));

    try {

        let { data, error } = await nexaSupabase
            .from("profiles")
            .select("*")
            .eq("id", userId)
            .maybeSingle();

        if (error) {
            console.warn("NEXA People current user error:", error.message);
            return;
        }

        if (!data) {

            await ensureMyProfile();

            const retry = await nexaSupabase
                .from("profiles")
                .select("*")
                .eq("id", userId)
                .maybeSingle();

            data = retry.data;
        }

        if (data) {
            mergeCurrentUser(data);
        }

    } catch (error) {

        console.warn("NEXA People current user error:", error);

    } finally {

        displayMyProfile();
    }
}


/* =========================================================
   FRIENDS
========================================================= */

function getCurrentFriends() {

    if (!Array.isArray(currentUser.friends)) {
        currentUser.friends = [];
    }

    return currentUser.friends;
}

function isFriend(userId) {

    return getCurrentFriends().some(id => String(id) === String(userId));
}


/* =========================================================
   LOAD EVERYONE
========================================================= */

function setLoading(loading) {

    isLoadingUsers = loading;

    if (peopleLoading) {
        peopleLoading.hidden = !loading;
    }
}

async function getUsers() {

    if (isLoadingUsers) {
        return;
    }

    setLoading(true);

    loadFailed = false;

    try {

        let result = await nexaSupabase
            .from("profiles")
            .select("*")
            .order("created_at", { ascending: false });

        /* No created_at column? Ask again without sorting. */

        if (result.error) {

            console.warn("NEXA People ordered query failed:", result.error.message);

            result = await nexaSupabase.from("profiles").select("*");
        }

        if (result.error) {
            throw result.error;
        }

        allUsers = Array.isArray(result.data) ? result.data : [];

        const mine = allUsers.find(
            user => String(user.id) === String(getUserId(currentUser))
        );

        if (mine) {
            mergeCurrentUser(mine);
            displayMyProfile();
        }

        if (allUsers.length <= 1) {
            console.warn(
                "NEXA People: only " + allUsers.length + " profile(s) returned. " +
                "If more people have signed up, run people-setup.sql in Supabase " +
                "(row level security may be hiding other profiles)."
            );
        }

        console.log("NEXA People loaded from Supabase:", allUsers.length);

    } catch (error) {

        console.error(
            "NEXA People Supabase error:",
            error.message,
            error.details,
            error.hint,
            error.code
        );

        allUsers = [];
        loadFailed = true;

        showNotification("Could not load NEXA people.");

    } finally {

        setLoading(false);
    }
}


/* =========================================================
   ONLINE NOW (Supabase Realtime presence)
========================================================= */

function isOnline(userId) {

    return onlineIds.has(String(userId));
}

function updateOnlineNote() {

    if (!onlineNote) {
        return;
    }

    const myId = String(getUserId(currentUser));

    const count = allUsers.filter(
        user => String(user.id) !== myId && isOnline(user.id)
    ).length;

    onlineNote.textContent = count
        ? `${count} ${count === 1 ? "person" : "people"} online now`
        : "Discover your next connection";
}

function startPresence() {

    try {

        const myId = String(getUserId(currentUser));

        presenceChannel = nexaSupabase.channel("nexa-online", {
            config: { presence: { key: myId } }
        });

        presenceChannel
            .on("presence", { event: "sync" }, () => {

                onlineIds = new Set(Object.keys(presenceChannel.presenceState()));

                clearTimeout(presenceTimer);

                presenceTimer = setTimeout(() => {

                    updateOnlineNote();

                    renderUsers(searchInput ? searchInput.value : "");

                }, 200);
            })
            .subscribe(async status => {

                if (status === "SUBSCRIBED") {

                    await presenceChannel.track({
                        id: myId,
                        at: new Date().toISOString()
                    });
                }
            });

        window.addEventListener("pagehide", () => {

            try { presenceChannel.untrack(); } catch { }
        });

    } catch (error) {

        console.warn("NEXA People presence error:", error);
    }
}


/* =========================================================
   FILTER + SORT
========================================================= */

function filterUsers(search = "") {

    const text = String(search).trim().toLowerCase();

    const currentId = getUserId(currentUser);

    const list = allUsers.filter(user => {

        const userId = getUserId(user);

        /* Never show yourself */

        if (
            currentId !== null &&
            userId !== null &&
            String(userId) === String(currentId)
        ) {
            return false;
        }

        if (!text) {
            return true;
        }

        return (
            String(user.name || "").toLowerCase().includes(text) ||
            String(user.username || "").toLowerCase().includes(text) ||
            String(user.bio || "").toLowerCase().includes(text)
        );
    });

    /* People who are online come first */

    return list.sort(
        (a, b) => Number(isOnline(b.id)) - Number(isOnline(a.id))
    );
}

function updateCount(count) {

    if (peopleCount) {
        peopleCount.textContent = `${count} ${count === 1 ? "person" : "people"}`;
    }
}

function updateSearchUI(search, count) {

    const text = String(search).trim();

    if (clearSearchButton) {
        clearSearchButton.hidden = !text;
    }

    if (!searchStatus) {
        return;
    }

    searchStatus.textContent = text
        ? `${count} result${count === 1 ? "" : "s"} for "${text}"`
        : "";
}


/* =========================================================
   USER CARD
========================================================= */

function createUserCard(user) {

    const userId = getUserId(user);
    const name = getUserName(user);
    const username = getUsername(user);
    const bio = user.bio || "No bio yet.";
    const friend = isFriend(userId);
    const avatar = getProfileImage(user);
    const online = isOnline(userId);

    const card = document.createElement("article");

    card.className = "people-user-card";
    card.dataset.userId = String(userId);

    const avatarHTML = avatar
        ? `<img
                src="${escapeHTML(avatar)}"
                alt="${escapeHTML(name)}"
                class="user-card-image"
                data-letter="${escapeHTML(getAvatarLetter(user))}"
           >`
        : escapeHTML(getAvatarLetter(user));

    card.innerHTML = `

        <div class="people-user-main">

            <div class="people-user-avatar">
                ${avatarHTML}
            </div>

            <div class="people-user-info">

                <h3>
                    ${escapeHTML(name)}
                    ${online ? `<span class="online-pill">Online</span>` : ""}
                </h3>

                <span class="people-username">
                    @${escapeHTML(username)}
                </span>

                <p>
                    ${escapeHTML(bio)}
                </p>

            </div>

        </div>

        <div class="people-user-actions">

            <button
                type="button"
                class="friendButton ${friend ? "is-friend" : ""}"
                data-action="friend"
                data-user-id="${escapeHTML(String(userId))}"
            >
                ${friend ? "✓ Friends" : "Add Friend"}
            </button>

            <button
                type="button"
                class="messageButton"
                data-action="message"
                data-user-id="${escapeHTML(String(userId))}"
            >
                Message
            </button>

        </div>
    `;

    return card;
}

/* Broken profile picture → fall back to the first letter */

if (usersList) {

    usersList.addEventListener("error", event => {

        const img = event.target;

        if (img instanceof HTMLImageElement) {
            img.parentElement.textContent = img.dataset.letter || "N";
        }
    }, true);
}


/* =========================================================
   RENDER
========================================================= */

function renderUsers(search = "") {

    if (!usersList) {
        return;
    }

    usersList.innerHTML = "";

    /* The query itself failed */

    if (loadFailed) {

        updateCount(0);
        updateSearchUI("", 0);

        if (emptyPeople) {
            emptyPeople.hidden = true;
        }

        usersList.innerHTML = `
            <div class="people-error">
                <strong>We couldn't load the NEXA community.</strong>
                <span>Check your connection and try again.</span>
                <button type="button" data-action="retry">Try again</button>
            </div>
        `;

        return;
    }

    const results = filterUsers(search);

    updateCount(results.length);
    updateSearchUI(search, results.length);
    updateOnlineNote();

    if (emptyPeople) {

        emptyPeople.hidden = results.length !== 0;

        const title = emptyPeople.querySelector("h3");
        const text = emptyPeople.querySelector("p");
        const searching = String(search).trim() !== "";

        if (title) {
            title.textContent = searching ? "Nobody found" : "No one else has joined yet";
        }

        if (text) {
            text.textContent = searching
                ? "Try searching with another name, username or keyword."
                : "As soon as more people join NEXA, they will appear here.";
        }
    }

    if (!results.length) {
        return;
    }

    const fragment = document.createDocumentFragment();

    results.forEach(user => fragment.appendChild(createUserCard(user)));

    usersList.appendChild(fragment);
}


/* =========================================================
   TOGGLE FRIEND
   Your list is saved first. The other person's list is
   updated too when the database allows it.
========================================================= */

async function toggleFriend(userId) {

    const currentId = String(getUserId(currentUser));
    const friendId = String(userId);

    if (!currentId || !friendId) {
        return;
    }

    if (currentId === friendId) {

        showNotification("You cannot add yourself.");

        return;
    }

    const alreadyFriend = isFriend(friendId);

    try {

        const { data: profiles, error: profilesError } = await nexaSupabase
            .from("profiles")
            .select("id, friends")
            .in("id", [currentId, friendId]);

        if (profilesError) {
            throw profilesError;
        }

        const currentProfile = profiles?.find(p => String(p.id) === currentId);
        const friendProfile = profiles?.find(p => String(p.id) === friendId);

        let currentFriends = Array.isArray(currentProfile?.friends)
            ? [...currentProfile.friends]
            : [...getCurrentFriends()];

        let friendFriends = Array.isArray(friendProfile?.friends)
            ? [...friendProfile.friends]
            : [];

        if (alreadyFriend) {

            currentFriends = currentFriends.filter(id => String(id) !== friendId);
            friendFriends = friendFriends.filter(id => String(id) !== currentId);

        } else {

            if (!currentFriends.some(id => String(id) === friendId)) {
                currentFriends.push(friendId);
            }

            if (!friendFriends.some(id => String(id) === currentId)) {
                friendFriends.push(currentId);
            }
        }

        /* Save my list */

        const { data: updatedCurrent, error: currentError } = await nexaSupabase
            .from("profiles")
            .update({ friends: currentFriends })
            .eq("id", currentId)
            .select("*")
            .single();

        if (currentError) {
            throw currentError;
        }

        mergeCurrentUser(updatedCurrent);

        /* Save their list (best effort — your own list is already saved) */

        if (friendProfile) {

            const { data: updatedFriend, error: friendError } = await nexaSupabase
                .from("profiles")
                .update({ friends: friendFriends })
                .eq("id", friendId)
                .select("*")
                .single();

            if (friendError) {

                console.warn(
                    "NEXA People: could not update the other person's friends list:",
                    friendError.message
                );

            } else {

                const index = allUsers.findIndex(
                    user => String(getUserId(user)) === friendId
                );

                if (index !== -1) {
                    allUsers[index] = { ...allUsers[index], ...updatedFriend };
                }
            }
        }

        displayMyProfile();

        renderUsers(searchInput ? searchInput.value : "");

        showNotification(alreadyFriend ? "Friend removed." : "Friend added.");

    } catch (error) {

        console.error(
            "NEXA Supabase friend update error:",
            error.message,
            error.details,
            error.hint,
            error.code
        );

        renderUsers(searchInput ? searchInput.value : "");

        showNotification("Could not update your friends.");
    }
}


/* =========================================================
   RELOAD
========================================================= */

async function reloadPeople() {

    await loadCurrentUser();

    await getUsers();

    renderUsers(searchInput ? searchInput.value : "");
}


/* =========================================================
   BUTTON ACTIONS
========================================================= */

if (usersList) {

    usersList.addEventListener("click", async event => {

        const button = event.target.closest("[data-action]");

        if (!button) {
            return;
        }

        const action = button.dataset.action;

        if (action === "retry") {

            button.disabled = true;

            await reloadPeople();

            return;
        }

        const userId = button.dataset.userId;

        if (!userId) {
            return;
        }

        if (action === "friend") {

            button.disabled = true;

            await toggleFriend(userId);

            button.disabled = false;

            return;
        }

        if (action === "message") {

            window.location.href =
                `messages.html?user=${encodeURIComponent(userId)}`;
        }
    });
}


/* =========================================================
   SEARCH
========================================================= */

if (searchPeopleButton) {

    searchPeopleButton.addEventListener("click", () => {

        renderUsers(searchInput ? searchInput.value.trim() : "");
    });
}

if (searchInput) {

    searchInput.addEventListener("input", function () {

        const value = this.value;

        clearTimeout(searchTimer);

        searchTimer = setTimeout(() => renderUsers(value), 120);
    });

    searchInput.addEventListener("keydown", event => {

        if (event.key === "Enter") {

            event.preventDefault();

            renderUsers(searchInput.value.trim());
        }
    });
}

if (clearSearchButton) {

    clearSearchButton.addEventListener("click", () => {

        if (!searchInput) {
            return;
        }

        searchInput.value = "";

        renderUsers("");

        searchInput.focus();
    });
}


/* =========================================================
   LOGOUT
   Signs out of Supabase, then lets index.html clear the rest.
========================================================= */

if (logoutButton) {

    logoutButton.addEventListener("click", async () => {

        try { await presenceChannel?.untrack(); } catch { }

        try {
            await nexaSupabase.auth.signOut();
        } catch (error) {
            console.error("NEXA logout error:", error);
        }

        localStorage.removeItem("nexaCurrentUser");

        window.location.replace("index.html?logout=1");
    });
}


/* =========================================================
   INITIALIZE
========================================================= */

async function initializePeople() {

    injectStyles();

    /* Show the stored user straight away */

    displayMyProfile();

    await reloadPeople();

    startPresence();
}

initializePeople();
