/* =========================================================
   NEXA PEOPLE
   Premium people discovery
========================================================= */


/* =========================================================
   CURRENT USER
========================================================= */

const currentUser = JSON.parse(
    localStorage.getItem("nexaCurrentUser")
);

if (!currentUser) {

    window.location.href = "index.html";

    throw new Error(
        "No NEXA user is logged in."
    );

}


/* =========================================================
   API
========================================================= */

const API_URL = "http://localhost:3000";


/* =========================================================
   ELEMENTS
========================================================= */

const searchInput =
    document.getElementById("searchInput");

const clearSearchButton =
    document.getElementById("clearSearchButton");

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


/* =========================================================
   YOUR PROFILE
========================================================= */

const myProfileAvatar =
    document.getElementById("myProfileAvatar");

const myProfileName =
    document.getElementById("myProfileName");

const myProfileUsername =
    document.getElementById(
        "myProfileUsername"
    );

const myProfileBio =
    document.getElementById(
        "myProfileBio"
    );


/* =========================================================
   STATE
========================================================= */

let allUsers = [];

let isLoadingUsers = false;

let searchTimer = null;


/* =========================================================
   USER HELPERS
========================================================= */

function getUserId(user = currentUser) {

    return (
        user?.id ??
        user?._id ??
        user?.userId ??
        user?.email ??
        user?.username ??
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

    return (
        String(
            getUserName(user)
        )
        .trim()
        .charAt(0)
        .toUpperCase() || "N"
    );

}


/* =========================================================
   ESCAPE HTML
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

        notice.remove();

    }, 3000);

}


/* =========================================================
   DISPLAY MY PROFILE
========================================================= */

function displayMyProfile() {

    const users =
        JSON.parse(
            localStorage.getItem("nexaUsers")
        ) || [];


    const latestUser =
        users.find(
            user =>
                String(
                    getUserId(user)
                ) ===
                String(
                    getUserId(currentUser)
                )
        );


    const user =
        latestUser || currentUser;


    /*
     * Synchronize current user.
     */

    Object.assign(
        currentUser,
        user
    );


    const name =
        getUserName(currentUser);

    const username =
        getUsername(currentUser);

    const bio =
        currentUser.bio ||
        "No bio yet.";

    const avatar =
        currentUser.profilePicture ||
        currentUser.avatar ||
        currentUser.photo ||
        currentUser.profileImage ||
        null;


    /* =====================================================
       MINI AVATAR
    ===================================================== */

    if (miniAvatar) {

        if (avatar) {

            miniAvatar.innerHTML = `
                <img
                    src="${escapeHTML(avatar)}"
                    alt="${escapeHTML(name)}"
                >
            `;

        } else {

            miniAvatar.textContent =
                getAvatarLetter(currentUser);

        }

    }


    /* =====================================================
       BIG PROFILE AVATAR
    ===================================================== */

    if (myProfileAvatar) {

        if (avatar) {

            myProfileAvatar.innerHTML = `
                <img
                    src="${escapeHTML(avatar)}"
                    alt="${escapeHTML(name)}"
                >
            `;

        } else {

            myProfileAvatar.textContent =
                getAvatarLetter(currentUser);

        }

    }


    /* =====================================================
       NAME
    ===================================================== */

    if (myProfileName) {

        myProfileName.textContent =
            name;

    }


    /* =====================================================
       USERNAME
    ===================================================== */

    if (myProfileUsername) {

        myProfileUsername.textContent =
            `@${username}`;

    }


    /* =====================================================
       BIO
    ===================================================== */

    if (myProfileBio) {

        myProfileBio.textContent =
            bio;

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


/* ---------------------------------------------------------
   CHECK FRIEND
--------------------------------------------------------- */

function isFriend(userId) {

    return getCurrentFriends().some(
        id =>
            String(id) ===
            String(userId)
    );

}


/* ---------------------------------------------------------
   UPDATE LOCAL FRIEND STATE
--------------------------------------------------------- */

function setLocalFriendState(
    userId,
    shouldBeFriend
) {

    const id =
        Number(userId);


    if (!Number.isFinite(id)) {
        return;
    }


    const friends =
        getCurrentFriends();


    if (shouldBeFriend) {

        if (
            !friends.some(
                friendId =>
                    String(friendId) ===
                    String(id)
            )
        ) {

            currentUser.friends.push(
                id
            );

        }

    } else {

        currentUser.friends =
            friends.filter(
                friendId =>
                    String(friendId) !==
                    String(id)
            );

    }


    localStorage.setItem(
        "nexaCurrentUser",
        JSON.stringify(
            currentUser
        )
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
   LOAD USERS
========================================================= */

async function getUsers() {

    if (isLoadingUsers) {

        return allUsers;

    }


    try {

        setLoading(true);


        const response =
            await fetch(
                `${API_URL}/api/users`
            );


        if (!response.ok) {

            throw new Error(
                `Server returned ${response.status}`
            );

        }


        const data =
            await response.json();


        if (Array.isArray(data)) {

            allUsers =
                data;

        }

        else if (
            data &&
            Array.isArray(data.users)
        ) {

            allUsers =
                data.users;

        }

        else {

            allUsers = [];

        }


        /*
         * Find the newest version of the
         * logged-in user from the server.
         */

        const serverCurrentUser =
            allUsers.find(
                user =>
                    String(
                        getUserId(user)
                    ) ===
                    String(
                        getUserId(currentUser)
                    )
            );


        if (serverCurrentUser) {

            Object.assign(
                currentUser,
                serverCurrentUser
            );


            localStorage.setItem(
                "nexaCurrentUser",
                JSON.stringify(
                    currentUser
                )
            );

        }


        return allUsers;

    }


    catch (error) {

        console.error(
            "NEXA people error:",
            error
        );


        showNotification(
            "Could not connect to NEXA."
        );


        allUsers = [];


        return [];

    }


    finally {

        setLoading(false);

    }

}


/* =========================================================
   FILTER
========================================================= */

function filterUsers(search = "") {

    const text =
        String(search)
            .trim()
            .toLowerCase();


    const currentId =
        getUserId();


    return allUsers.filter(
        user => {

            const userId =
                getUserId(user);


            /*
             * NEVER SHOW YOURSELF
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
             * NO SEARCH
             */

            if (!text) {

                return true;

            }


            const name =
                String(
                    user.name || ""
                )
                .toLowerCase();


            const username =
                String(
                    user.username || ""
                )
                .toLowerCase();


            const bio =
                String(
                    user.bio || ""
                )
                .toLowerCase();


            return (
                name.includes(text) ||
                username.includes(text) ||
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
        user.profilePicture ||
        user.avatar ||
        user.photo ||
        user.profileImage ||
        null;


    const card =
        document.createElement("article");


    card.className =
        "people-user-card";


    card.dataset.userId =
        String(userId);


    const avatarHTML =
        avatar

            ? `
                <img
                    src="${escapeHTML(avatar)}"
                    alt="${escapeHTML(name)}"
                >
              `

            : escapeHTML(
                getAvatarLetter(user)
            );


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
   RENDER
========================================================= */

function renderUsers(search = "") {

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
   UPDATE FRIEND ON SERVER
========================================================= */

async function updateFriendOnServer(
    userId,
    action
) {

    const currentId =
        getUserId();


    if (
        currentId === null
    ) {

        throw new Error(
            "Current user ID is missing."
        );

    }


    const response =
        await fetch(
            `${API_URL}/api/users/${encodeURIComponent(
                currentId
            )}/friends`,
            {

                method: "PUT",

                headers: {

                    "Content-Type":
                        "application/json"

                },

                body:
                    JSON.stringify({

                        friendId:
                            Number(
                                userId
                            ),

                        action

                    })

            }
        );


    const data =
        await response.json()
            .catch(
                () => ({})
            );


    if (!response.ok) {

        throw new Error(
            data.message ||
            `Server returned ${response.status}`
        );

    }


    return data;

}


/* =========================================================
   TOGGLE FRIEND
========================================================= */

async function toggleFriend(userId) {

    const alreadyFriend =
        isFriend(userId);


    const action =
        alreadyFriend
            ? "remove"
            : "add";


    /*
     * Optimistic UI:
     * update immediately.
     */

    setLocalFriendState(
        userId,
        !alreadyFriend
    );


    renderUsers(
        searchInput
            ? searchInput.value
            : ""
    );


    try {

        const result =
            await updateFriendOnServer(
                userId,
                action
            );


        /*
         * The server returns the
         * updated current user.
         */

        if (
            result &&
            result.user
        ) {

            Object.assign(
                currentUser,
                result.user
            );

        }


        /*
         * Save latest current user.
         */

        localStorage.setItem(
            "nexaCurrentUser",
            JSON.stringify(
                currentUser
            )
        );


        /*
         * Also update the matching
         * users in the local list.
         */

        if (
            result &&
            result.friend
        ) {

            const friendIndex =
                allUsers.findIndex(
                    user =>
                        String(
                            getUserId(user)
                        ) ===
                        String(
                            getUserId(
                                result.friend
                            )
                        )
                );


            if (
                friendIndex !== -1
            ) {

                allUsers[
                    friendIndex
                ] =
                    result.friend;

            }

        }


        renderUsers(
            searchInput
                ? searchInput.value
                : ""
        );


        showNotification(
            action === "add"
                ? "Friend added."
                : "Friend removed."
        );

    }


    catch (error) {

        console.error(
            "NEXA friend update error:",
            error
        );


        /*
         * Roll back optimistic UI.
         */

        setLocalFriendState(
            userId,
            alreadyFriend
        );


        renderUsers(
            searchInput
                ? searchInput.value
                : ""
        );


        showNotification(
            error.message ||
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
                action === "friend"
            ) {

                if (
                    button.disabled
                ) {
                    return;
                }


                button.disabled =
                    true;


                try {

                    await toggleFriend(
                        userId
                    );

                }

                finally {

                    /*
                     * The card may have been
                     * re-rendered, so this is
                     * harmless.
                     */

                    button.disabled =
                        false;

                }


                return;

            }


            if (
                action === "message"
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
                    100
                );

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


            searchInput.focus();


            renderUsers("");

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

    displayMyProfile();


    await getUsers();


    /*
     * Refresh profile information after
     * receiving the latest server users.
     */

    displayMyProfile();


    renderUsers(
        searchInput
            ? searchInput.value
            : ""
    );

}


initializePeople();/* =========================================================
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


    const response =
        await fetch(
            `${API_URL}/api/users`
        );


    if (!response.ok) {

        throw new Error(
            `Server returned ${response.status}`
        );
    }


    const data =
        await response.json();


    const users =
        Array.isArray(data)
            ? data
            : Array.isArray(data.users)
                ? data.users
                : [];


    const serverUser =
        users.find(
            user =>
                String(
                    getUserId(user)
                ) ===
                String(userId)
        );


    if (!serverUser) {

        throw new Error(
            "Logged-in user was not found on the server."
        );
    }


    /*
     * Replace the local copy with
     * the real server copy.
     */

    currentUser =
        serverUser;


    localStorage.setItem(
        "nexaCurrentUser",
        JSON.stringify(
            currentUser
        )
    );


    displayMyProfile();


    return currentUser;
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


        const response =
            await fetch(
                `${API_URL}/api/users`
            );


        if (!response.ok) {

            throw new Error(
                `Server returned ${response.status}`
            );
        }


        const data =
            await response.json();


        if (Array.isArray(data)) {

            allUsers =
                data;

        } else if (
            data &&
            Array.isArray(data.users)
        ) {

            allUsers =
                data.users;

        } else {

            allUsers = [];
        }


        /*
         * Update current user from
         * the same server response.
         */

        const currentId =
            getUserId(currentUser);


        const freshCurrentUser =
            allUsers.find(
                user =>
                    String(
                        getUserId(user)
                    ) ===
                    String(currentId)
            );


        if (freshCurrentUser) {

            currentUser =
                freshCurrentUser;


            localStorage.setItem(
                "nexaCurrentUser",
                JSON.stringify(
                    currentUser
                )
            );


            displayMyProfile();
        }


        return allUsers;

    } catch (error) {

        console.error(
            "NEXA People error:",
            error
        );


        showNotification(
            "Could not load people from NEXA."
        );


        allUsers = [];

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
   SAVE FRIENDS
========================================================= */

async function saveFriendsToServer(
    friendIds
) {

    const currentId =
        getUserId(currentUser);


    if (!currentId) {

        throw new Error(
            "Current user ID is missing."
        );
    }


    const response =
        await fetch(
            `${API_URL}/api/users/${encodeURIComponent(
                currentId
            )}/friends`,
            {

                method: "PUT",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body:
                    JSON.stringify({
                        friendIds:
                            friendIds
                    })
            }
        );


    if (!response.ok) {

        const text =
            await response.text();


        throw new Error(
            text ||
            `Server returned ${response.status}`
        );
    }


    return response.json();
}


/* =========================================================
   TOGGLE FRIEND
========================================================= */

async function toggleFriend(
    userId
) {

    const originalFriends =
        [
            ...getCurrentFriends()
        ];


    const alreadyFriend =
        isFriend(userId);


    if (alreadyFriend) {

        currentUser.friends =
            getCurrentFriends()
                .filter(
                    id =>
                        String(id) !==
                        String(userId)
                );

    } else {

        currentUser.friends = [
            ...getCurrentFriends(),
            Number(userId)
        ];
    }


    /*
     * Update screen immediately.
     */

    renderUsers(
        searchInput
            ? searchInput.value
            : ""
    );


    try {

        const result =
            await saveFriendsToServer(
                currentUser.friends
            );


        /*
         * Server returns the
         * authoritative user.
         */

        if (
            result &&
            result.user
        ) {

            currentUser =
                result.user;
        }


        localStorage.setItem(
            "nexaCurrentUser",
            JSON.stringify(
                currentUser
            )
        );


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
            "Friend update error:",
            error
        );


        /*
         * Roll back.
         */

        currentUser.friends =
            originalFriends;


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