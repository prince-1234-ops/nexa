/* =========================================================
   NEXA PEOPLE
   Real server-connected people discovery
========================================================= */


/* =========================================================
   API
========================================================= */

const API_URL = "http://localhost:3000";


/* =========================================================
   CURRENT USER
========================================================= */

let currentUser = null;


/* =========================================================
   ELEMENTS
========================================================= */

const searchInput =
    document.getElementById("searchInput");

const clearSearchButton =
    document.getElementById("clearSearchButton");

const searchPeopleButton =
    document.getElementById("searchPeopleButton");

const usersList =
    document.getElementById("usersList");

const emptyPeople =
    document.getElementById("emptyPeople");

const peopleLoading =
    document.getElementById("peopleLoading");

const peopleCount =
    document.getElementById("peopleCount");

const searchStatus =
    document.getElementById("searchStatus");

const miniAvatar =
    document.getElementById("miniAvatar");

const logoutButton =
    document.getElementById("logoutButton");

const notificationArea =
    document.getElementById("notificationArea");

const myProfileAvatar =
    document.getElementById("myProfileAvatar");

const myProfileName =
    document.getElementById("myProfileName");

const myProfileUsername =
    document.getElementById("myProfileUsername");

const myProfileBio =
    document.getElementById("myProfileBio");


/* =========================================================
   STATE
========================================================= */

let allUsers = [];

let isLoadingUsers = false;

let searchTimer = null;


/* =========================================================
   AUTHENTICATION
========================================================= */

function getStoredUser() {

    try {

        const stored =
            localStorage.getItem(
                "nexaCurrentUser"
            );

        if (!stored) {
            return null;
        }

        return JSON.parse(stored);

    } catch (error) {

        console.error(
            "Could not read current user:",
            error
        );

        return null;
    }
}


currentUser =
    getStoredUser();


if (!currentUser) {

    window.location.href =
        "index.html";

    throw new Error(
        "No NEXA user is logged in."
    );
}


/* =========================================================
   USER HELPERS
========================================================= */

function getUserId(user) {

    if (!user) {
        return null;
    }

    return (
        user.id ??
        user._id ??
        user.userId ??
        null
    );
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
        user?.email ||
        "nexauser"
    );
}


function getAvatarLetter(user) {

    const name =
        getUserName(user);

    return (
        String(name)
            .trim()
            .charAt(0)
            .toUpperCase() ||
        "N"
    );
}


/* =========================================================
   HTML ESCAPE
========================================================= */

function escapeHTML(value) {

    const div =
        document.createElement("div");

    div.textContent =
        String(value ?? "");

    return div.innerHTML;
}


/* =========================================================
   NOTIFICATION
========================================================= */

function showNotification(text) {

    if (!notificationArea) {
        return;
    }

    const notice =
        document.createElement("div");

    notice.className =
        "nexa-notification";

    notice.textContent =
        text;

    notificationArea.appendChild(
        notice
    );

    setTimeout(() => {

        notice.classList.add(
            "hide"
        );

        setTimeout(() => {
            notice.remove();
        }, 250);

    }, 3000);
}


/* =========================================================
   PROFILE IMAGE
========================================================= */

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


/* =========================================================
   SET AVATAR ELEMENT
========================================================= */

function setAvatar(
    element,
    user
) {

    if (!element) {
        return;
    }

    const image =
        getProfileImage(user);

    const name =
        getUserName(user);


    if (image) {

        element.innerHTML = `
            <img
                src="${escapeHTML(image)}"
                alt="${escapeHTML(name)}"
                onerror="this.style.display='none'; this.parentElement.textContent='${escapeHTML(
                    getAvatarLetter(user)
                )}'"
            >
        `;

    } else {

        element.textContent =
            getAvatarLetter(user);

    }
}


/* =========================================================
   DISPLAY CURRENT USER
========================================================= */

function displayMyProfile() {

    const name =
        getUserName(currentUser);

    const username =
        getUsername(currentUser);

    const bio =
        currentUser.bio ||
        "No bio yet.";


    setAvatar(
        miniAvatar,
        currentUser
    );


    setAvatar(
        myProfileAvatar,
        currentUser
    );


    if (myProfileName) {

        myProfileName.textContent =
            name;
    }


    if (myProfileUsername) {

        myProfileUsername.textContent =
            "@" + username;
    }


    if (myProfileBio) {

        myProfileBio.textContent =
            bio;
    }
}


/* =========================================================
   LOAD CURRENT USER FROM SERVER
========================================================= */

async function loadCurrentUser() {

    const userId =
        getUserId(currentUser);

    if (!userId) {

        throw new Error(
            "Current user has no ID."
        );
    }


    try {

        const {
            data,
            error
        } =
            await nexaSupabase
                .from("profiles")
                .select("*")
                .eq(
                    "id",
                    userId
                )
                .single();


        if (error) {
            throw error;
        }


        if (!data) {

            throw new Error(
                "Your NEXA profile was not found."
            );
        }


        currentUser = {

            ...currentUser,

            ...data,

            profilePicture:
                data.profile_picture ||
                ""
        };


        localStorage.setItem(
            "nexaCurrentUser",
            JSON.stringify(
                currentUser
            )
        );


        displayMyProfile();


        return currentUser;


    } catch (error) {

        console.error(
            "NEXA People current user Supabase error:",
            error
        );

        throw error;
    }
}


/* =========================================================
   FRIENDS
========================================================= */

function getCurrentFriends() {

    if (
        !Array.isArray(
            currentUser.friends
        )
    ) {

        currentUser.friends = [];
    }

    return currentUser.friends;
}


function isFriend(userId) {

    return getCurrentFriends()
        .some(
            id =>
                String(id) ===
                String(userId)
        );
}


/* =========================================================
   LOADING
========================================================= */

function setLoading(loading) {

    isLoadingUsers =
        loading;

    if (peopleLoading) {

        peopleLoading.hidden =
            !loading;
    }
}


/* =========================================================
   GET ALL USERS
========================================================= */

async function getUsers() {

    if (isLoadingUsers) {
        return allUsers;
    }

    try {

        setLoading(true);

        const {
            data,
            error
        } =
            await nexaSupabase
                .from("profiles")
                .select("*")
                .order(
                    "created_at",
                    {
                        ascending: true
                    }
                );

        if (error) {
            throw error;
        }

        allUsers =
            Array.isArray(data)
                ? data
                : [];


        /* -------------------------------------------------
           FIND CURRENT USER
        ------------------------------------------------- */

        const currentId =
            getUserId(currentUser);

        const serverCurrentUser =
            allUsers.find(
                user =>
                    String(
                        user.id
                    ) ===
                    String(
                        currentId
                    )
            );


        if (serverCurrentUser) {

            currentUser = {

                ...currentUser,

                ...serverCurrentUser,

                profilePicture:
                    serverCurrentUser.profile_picture ||
                    ""
            };


            localStorage.setItem(
                "nexaCurrentUser",
                JSON.stringify(
                    currentUser
                )
            );

            displayMyProfile();
        }


        console.log(
            "NEXA People loaded from Supabase:",
            allUsers.length
        );


        return allUsers;

    } catch (error) {

        console.error(
            "NEXA People Supabase error:",
            error
        );

        allUsers = [];

        showNotification(
            "Could not load NEXA people."
        );

        return [];

    } finally {

        setLoading(false);
    }
}


/* =========================================================
   FILTER USERS
========================================================= */

function filterUsers(
    search = ""
) {

    const text =
        String(search)
            .trim()
            .toLowerCase();


    const currentId =
        getUserId(currentUser);


    return allUsers.filter(
        user => {

            const userId =
                getUserId(user);


            /*
             * Never show yourself.
             */

            if (
                currentId !== null &&
                userId !== null &&
                String(userId) ===
                String(currentId)
            ) {

                return false;
            }


            /*
             * No search.
             */

            if (!text) {
                return true;
            }


            const name =
                String(
                    user.name || ""
                ).toLowerCase();


            const username =
                String(
                    user.username || ""
                ).toLowerCase();


            const email =
                String(
                    user.email || ""
                ).toLowerCase();


            const bio =
                String(
                    user.bio || ""
                ).toLowerCase();


            return (
                name.includes(text) ||
                username.includes(text) ||
                email.includes(text) ||
                bio.includes(text)
            );
        }
    );
}


/* =========================================================
   COUNT
========================================================= */

function updateCount(count) {

    if (!peopleCount) {
        return;
    }


    peopleCount.textContent =
        `${count} ${
            count === 1
                ? "person"
                : "people"
        }`;
}


/* =========================================================
   SEARCH UI
========================================================= */

function updateSearchUI(
    search,
    count
) {

    const text =
        String(search).trim();


    if (clearSearchButton) {

        clearSearchButton.hidden =
            !text;
    }


    if (!searchStatus) {
        return;
    }


    if (!text) {

        searchStatus.textContent =
            "";

        return;
    }


    searchStatus.textContent =
        `${count} result${
            count === 1
                ? ""
                : "s"
        } for "${text}"`;
}


/* =========================================================
   USER CARD
========================================================= */

function createUserCard(user) {

    const userId =
        getUserId(user);

    const name =
        getUserName(user);

    const username =
        getUsername(user);

    const bio =
        user.bio ||
        "No bio yet.";

    const friend =
        isFriend(userId);

    const avatar =
        getProfileImage(user);


    const card =
        document.createElement(
            "article"
        );


    card.className =
        "people-user-card";


    card.dataset.userId =
        String(userId);


    let avatarHTML;


    if (avatar) {

        avatarHTML = `
            <img
                src="${escapeHTML(avatar)}"
                alt="${escapeHTML(name)}"
                class="user-card-image"
            >
        `;

    } else {

        avatarHTML =
            escapeHTML(
                getAvatarLetter(user)
            );
    }


    card.innerHTML = `

        <div class="people-user-main">

            <div class="people-user-avatar">

                ${avatarHTML}

            </div>


            <div class="people-user-info">

                <h3>
                    ${escapeHTML(name)}
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
                class="friendButton ${
                    friend
                        ? "is-friend"
                        : ""
                }"
                data-action="friend"
                data-user-id="${escapeHTML(
                    String(userId)
                )}"
            >
                ${
                    friend
                        ? "✓ Friends"
                        : "Add Friend"
                }
            </button>


            <button
                type="button"
                class="messageButton"
                data-action="message"
                data-user-id="${escapeHTML(
                    String(userId)
                )}"
            >
                Message
            </button>

        </div>

    `;


    return card;
}


/* =========================================================
   RENDER USERS
========================================================= */

function renderUsers(
    search = ""
) {

    if (!usersList) {
        return;
    }


    const results =
        filterUsers(search);


    usersList.innerHTML =
        "";


    updateCount(
        results.length
    );


    updateSearchUI(
        search,
        results.length
    );


    if (emptyPeople) {

        emptyPeople.hidden =
            results.length !== 0;
    }


    if (results.length === 0) {
        return;
    }


    const fragment =
        document.createDocumentFragment();


    results.forEach(
        user => {

            fragment.appendChild(
                createUserCard(user)
            );
        }
    );


    usersList.appendChild(
        fragment
    );
}


/* =========================================================
   SAVE FRIENDS TO SUPABASE
   ========================================================= */

async function saveFriendsToServer(friendIds) {

    const currentId =
        getUserId(currentUser);

    if (!currentId) {

        throw new Error(
            "Current user ID is missing."
        );
    }


    const cleanFriends =
        Array.from(
            new Set(
                (Array.isArray(friendIds)
                    ? friendIds
                    : []
                )
                .map(id => String(id))
                .filter(
                    id =>
                        id !==
                        String(currentId)
                )
            )
        );


    const {
        data,
        error
    } =
        await nexaSupabase
            .from("profiles")
            .update({
                friends:
                    cleanFriends
            })
            .eq(
                "id",
                currentId
            )
            .select("*")
            .single();


    if (error) {
        throw error;
    }


    return {
        success: true,
        user: data
    };
}

/* =========================================================
   TOGGLE FRIEND
   Supabase-backed
   Mutual friendship
   ========================================================= */

async function toggleFriend(userId) {

    const currentId =
        String(
            getUserId(currentUser)
        );

    const friendId =
        String(userId);


    if (!currentId || !friendId) {
        return;
    }


    if (currentId === friendId) {

        showNotification(
            "You cannot add yourself."
        );

        return;
    }


    const alreadyFriend =
        isFriend(friendId);


    const originalCurrentFriends =
        [
            ...getCurrentFriends()
        ];


    try {

        /* =================================================
           LOAD BOTH PROFILES
        ================================================= */

        const {
            data: profiles,
            error: profilesError
        } =
            await nexaSupabase
                .from("profiles")
                .select(
                    "id, friends"
                )
                .in(
                    "id",
                    [
                        currentId,
                        friendId
                    ]
                );


        if (profilesError) {
            throw profilesError;
        }


        const currentProfile =
            profiles?.find(
                profile =>
                    String(profile.id) ===
                    currentId
            );


        const friendProfile =
            profiles?.find(
                profile =>
                    String(profile.id) ===
                    friendId
            );


        if (
            !currentProfile ||
            !friendProfile
        ) {

            throw new Error(
                "Could not find both profiles."
            );
        }


        let currentFriends =
            Array.isArray(
                currentProfile.friends
            )
                ? [
                    ...currentProfile.friends
                ]
                : [];


        let friendFriends =
            Array.isArray(
                friendProfile.friends
            )
                ? [
                    ...friendProfile.friends
                ]
                : [];


        /* =================================================
           ADD OR REMOVE
        ================================================= */

        if (alreadyFriend) {

            currentFriends =
                currentFriends.filter(
                    id =>
                        String(id) !==
                        friendId
                );


            friendFriends =
                friendFriends.filter(
                    id =>
                        String(id) !==
                        currentId
                );

        } else {

            if (
                !currentFriends.some(
                    id =>
                        String(id) ===
                        friendId
                )
            ) {

                currentFriends.push(
                    friendId
                );
            }


            if (
                !friendFriends.some(
                    id =>
                        String(id) ===
                        currentId
                )
            ) {

                friendFriends.push(
                    currentId
                );
            }
        }


        /* =================================================
           SAVE CURRENT USER
        ================================================= */

        const {
            data: updatedCurrent,
            error: currentError
        } =
            await nexaSupabase
                .from("profiles")
                .update({

                    friends:
                        currentFriends

                })
                .eq(
                    "id",
                    currentId
                )
                .select("*")
                .single();


        if (currentError) {
            throw currentError;
        }


        /* =================================================
           SAVE FRIEND
        ================================================= */

        const {
            data: updatedFriend,
            error: friendError
        } =
            await nexaSupabase
                .from("profiles")
                .update({

                    friends:
                        friendFriends

                })
                .eq(
                    "id",
                    friendId
                )
                .select("*")
                .single();


        if (friendError) {
            throw friendError;
        }


        /* =================================================
           UPDATE LOCAL CURRENT USER
        ================================================= */

        currentUser =
            {
                ...currentUser,

                ...updatedCurrent,

                profilePicture:
                    updatedCurrent.profile_picture ||
                    ""
            };


        localStorage.setItem(
            "nexaCurrentUser",
            JSON.stringify(
                currentUser
            )
        );


        /* =================================================
           UPDATE LOCAL USER LIST
        ================================================= */

        const friendIndex =
            allUsers.findIndex(
                user =>
                    String(
                        getUserId(user)
                    ) ===
                    friendId
            );


        if (
            friendIndex !==
            -1
        ) {

            allUsers[
                friendIndex
            ] =
                {
                    ...allUsers[
                        friendIndex
                    ],

                    ...updatedFriend
                };
        }


        displayMyProfile();


        renderUsers(
            searchInput
                ? searchInput.value
                : ""
        );


        showNotification(
            alreadyFriend
                ? "Friend removed."
                : "Friend added."
        );


    } catch (error) {

        console.error(
            "NEXA Supabase friend update error:",
            error.message,
            error.details,
            error.hint,
            error.code
        );


        currentUser.friends =
            originalCurrentFriends;


        localStorage.setItem(
            "nexaCurrentUser",
            JSON.stringify(
                currentUser
            )
        );


        renderUsers(
            searchInput
                ? searchInput.value
                : ""
        );


        showNotification(
            "Could not update your friends."
        );
    }
}


/* =========================================================
   BUTTON ACTIONS
========================================================= */

if (usersList) {

    usersList.addEventListener(
        "click",
        async event => {

            const button =
                event.target.closest(
                    "[data-action]"
                );


            if (!button) {
                return;
            }


            const action =
                button.dataset.action;


            const userId =
                button.dataset.userId;


            if (!userId) {
                return;
            }


            if (
                action ===
                "friend"
            ) {

                button.disabled =
                    true;


                await toggleFriend(
                    userId
                );


                button.disabled =
                    false;


                return;
            }


            if (
                action ===
                "message"
            ) {

                window.location.href =
                    `messages.html?user=${encodeURIComponent(
                        userId
                    )}`;
            }
        }
    );
}

/* =========================================================
   SEARCH BUTTON
   ========================================================= */

if (searchPeopleButton) {

    searchPeopleButton.addEventListener(
        "click",
        () => {

            const value =
                searchInput
                    ? searchInput.value.trim()
                    : "";

            renderUsers(value);

        }
    );
}

/* =========================================================
   SEARCH
========================================================= */

if (searchInput) {

    searchInput.addEventListener(
        "input",
        function () {

            const value =
                this.value;


            clearTimeout(
                searchTimer
            );


            searchTimer =
                setTimeout(
                    () => {

                        renderUsers(
                            value
                        );

                    },
                    120
                );
        }
    );
}

if (searchInput) {

    searchInput.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Enter"
            ) {

                event.preventDefault();

                renderUsers(
                    searchInput.value.trim()
                );
            }
        }
    );
}


/* =========================================================
   CLEAR SEARCH
========================================================= */

if (clearSearchButton) {

    clearSearchButton.addEventListener(
        "click",
        () => {

            if (!searchInput) {
                return;
            }


            searchInput.value =
                "";


            renderUsers("");


            searchInput.focus();
        }
    );
}


/* =========================================================
   LOGOUT
========================================================= */

if (logoutButton) {

    logoutButton.addEventListener(
        "click",
        () => {

            localStorage.removeItem(
                "nexaCurrentUser"
            );

            window.location.href =
                "index.html";
        }
    );
}


/* =========================================================
   INITIALIZE
========================================================= */

async function initializePeople() {

    try {

        /*
         * Show stored user immediately.
         */

        displayMyProfile();


        /*
         * Then get the authoritative
         * user data from the server.
         */

        await loadCurrentUser();


        /*
         * Load everyone.
         */

        await getUsers();


        /*
         * Render.
         */

        renderUsers(
            searchInput
                ? searchInput.value
                : ""
        );

    } catch (error) {

        console.error(
            "NEXA People initialization error:",
            error
        );


        showNotification(
            "Could not initialize NEXA People."
        );
    }
}


initializePeople();
