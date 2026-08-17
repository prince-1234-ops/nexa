/* =========================================================
   NEXA PROFILE
   ========================================================= */

const API_BASE = "http://localhost:3000/api";


/* =========================================================
   CURRENT USER
   ========================================================= */

let currentUser = JSON.parse(
    localStorage.getItem("nexaCurrentUser")
);

if (!currentUser) {
    window.location.href = "index.html";
    throw new Error("No NEXA user logged in.");
}


/* =========================================================
   USERS
   ========================================================= */

function getUsers() {

    return JSON.parse(
        localStorage.getItem("nexaUsers")
    ) || [];
}


/* =========================================================
   LOAD USERS FROM NEXA SERVER
========================================================= */

async function loadUsersFromServer() {

    try {

        const response =
            await fetch(
                `${API_BASE}/users`
            );


        if (!response.ok) {

            throw new Error(
                `Users request failed: ${response.status}`
            );
        }


        const data =
            await response.json();


        const serverUsers =
            Array.isArray(data)
                ? data
                : data.users;


        if (!Array.isArray(serverUsers)) {

            throw new Error(
                "Invalid users response."
            );
        }


        /*
         * Server is now our source of truth.
         */

        localStorage.setItem(
            "nexaUsers",
            JSON.stringify(serverUsers)
        );


        /*
         * Get our latest user object.
         */

        const latestUser =
            serverUsers.find(
                user =>
                    String(user.id) ===
                    String(currentUser.id)
            );


        if (latestUser) {

            currentUser =
                latestUser;


            localStorage.setItem(
                "nexaCurrentUser",
                JSON.stringify(
                    currentUser
                )
            );
        }


        renderProfile();

    } catch (error) {

        console.error(
            "Could not load NEXA users:",
            error
        );

    }
}


function getLatestCurrentUser() {

    const users = getUsers();

    const found = users.find(
        user =>
            String(user.id) ===
            String(currentUser.id)
    );

    if (found) {
        currentUser = found;
    }

    return currentUser;
}

getLatestCurrentUser();


/* =========================================================
   ELEMENTS
   ========================================================= */

const profilePhoto =
    document.getElementById("profilePhoto");

const profileUsername =
    document.getElementById("profileUsername");

const profileName =
    document.getElementById("profileName");

const profileBio =
    document.getElementById("profileBio");

const postsCount =
    document.getElementById("postsCount");

const friendsCount =
    document.getElementById("friendsCount");

const likesCount =
    document.getElementById("likesCount");

const profilePostGrid =
    document.getElementById("profilePostGrid");

const emptyProfilePosts =
    document.getElementById("emptyProfilePosts");

const peopleRow =
    document.getElementById("peopleRow");


/* =========================================================
   EDIT MODAL
   ========================================================= */

const editModal =
    document.getElementById("editModal");

const editProfileButton =
    document.getElementById("editProfileButton");

const closeEdit =
    document.getElementById("closeEdit");

const profileForm =
    document.getElementById("profileForm");

const nameInput =
    document.getElementById("name");

const usernameInput =
    document.getElementById("username");

const bioInput =
    document.getElementById("bio");

const pictureInput =
    document.getElementById("pictureInput");

const editorPhoto =
    document.getElementById("editorPhoto");

const profileMessage =
    document.getElementById("profileMessage");

const removePicture =
    document.getElementById("removePicture");


/* =========================================================
   PEOPLE MODAL
   ========================================================= */

const peopleModal =
    document.getElementById("peopleModal");

const peopleModalTitle =
    document.getElementById("peopleModalTitle");

const peopleList =
    document.getElementById("peopleList");

const closePeople =
    document.getElementById("closePeople");


/* =========================================================
   POST VIEWER
   ========================================================= */

const postViewer =
    document.getElementById("postViewer");

const viewerContent =
    document.getElementById("viewerContent");

const closeViewer =
    document.getElementById("closeViewer");

const viewerPrevious =
    document.getElementById("viewerPrevious");

const viewerNext =
    document.getElementById("viewerNext");

    const viewerActions =
    document.getElementById("viewerActions");

const viewerLike =
    document.getElementById("viewerLike");

const viewerComment =
    document.getElementById("viewerComment");

const viewerShare =
    document.getElementById("viewerShare");

const viewerCopy =
    document.getElementById("viewerCopy");

const viewerSave =
    document.getElementById("viewerSave");

const viewerCaption =
    document.getElementById("viewerCaption");


/* =========================================================
   STATE
   ========================================================= */

let posts = [];

let viewerPosts = [];

let viewerIndex = -1;

let selectedPicture =
    currentUser.profilePicture || "";


/* =========================================================
   HELPERS
   ========================================================= */

function escapeHTML(value) {

    const div = document.createElement("div");

    div.textContent = String(value ?? "");

    return div.innerHTML;
}


function getUserId() {

    return (
        currentUser.id ||
        currentUser._id ||
        currentUser.userId ||
        currentUser.email ||
        currentUser.username
    );
}


function getInitial(user) {

    const name =
        user?.name ||
        user?.username ||
        "N";

    return (
        name.trim().charAt(0).toUpperCase() ||
        "N"
    );
}


function getProfilePicture(user) {

    return (
        user?.profilePicture ||
        user?.avatar ||
        ""
    );
}


function getMediaURL(media) {

    if (!media) {
        return "";
    }

    const value = String(media);

    if (
        value.startsWith("http://") ||
        value.startsWith("https://") ||
        value.startsWith("data:") ||
        value.startsWith("blob:")
    ) {
        return value;
    }

    if (value.startsWith("/")) {
        return "http://localhost:3000" + value;
    }

    return "http://localhost:3000/" + value;
}


/* =========================================================
   PROFILE PICTURE
   ========================================================= */

function renderMainPicture() {

    const picture =
        getProfilePicture(currentUser);

    if (picture) {

        profilePhoto.innerHTML = `
            <img
                src="${escapeHTML(picture)}"
                alt="Profile picture"
            >
        `;

    } else {

        profilePhoto.innerHTML = `
            <span>
                ${escapeHTML(
                    getInitial(currentUser)
                )}
            </span>
        `;
    }
}


function renderEditorPicture() {

    if (selectedPicture) {

        editorPhoto.innerHTML = `
            <img
                src="${escapeHTML(selectedPicture)}"
                alt="Profile picture preview"
            >
        `;

    } else {

        editorPhoto.innerHTML = `
            <span>
                ${escapeHTML(
                    getInitial(currentUser)
                )}
            </span>
        `;
    }
}


/* =========================================================
   IMAGE COMPRESSION
   ========================================================= */

function compressImage(file) {

    return new Promise((resolve, reject) => {

        const reader = new FileReader();

        reader.onload = event => {

            const image = new Image();

            image.onload = () => {

                const maxSize = 500;

                let width = image.width;
                let height = image.height;

                if (
                    width > maxSize ||
                    height > maxSize
                ) {

                    if (width > height) {

                        height = Math.round(
                            height * maxSize / width
                        );

                        width = maxSize;

                    } else {

                        width = Math.round(
                            width * maxSize / height
                        );

                        height = maxSize;
                    }
                }

                const canvas =
                    document.createElement("canvas");

                canvas.width = width;
                canvas.height = height;

                const context =
                    canvas.getContext("2d");

                context.drawImage(
                    image,
                    0,
                    0,
                    width,
                    height
                );

                resolve(
                    canvas.toDataURL(
                        "image/jpeg",
                        0.82
                    )
                );
            };

            image.onerror = reject;

            image.src = event.target.result;
        };

        reader.onerror = reject;

        reader.readAsDataURL(file);
    });
}


/* =========================================================
   OPEN EDIT PROFILE
   ========================================================= */

editProfileButton.addEventListener(
    "click",
    () => {

        nameInput.value =
            currentUser.name || "";

        usernameInput.value =
            currentUser.username || "";

        bioInput.value =
            currentUser.bio || "";

        selectedPicture =
            getProfilePicture(currentUser);

        renderEditorPicture();

        profileMessage.textContent = "";

        editModal.classList.add("show");

        document.body.style.overflow = "hidden";
    }
);


/* =========================================================
   CLOSE EDIT PROFILE
   ========================================================= */

function closeEditModal() {

    editModal.classList.remove("show");

    document.body.style.overflow = "";
}


closeEdit.addEventListener(
    "click",
    closeEditModal
);


document
    .querySelector("#editModal .modal-bg")
    .addEventListener(
        "click",
        closeEditModal
    );


/* =========================================================
   CHANGE PICTURE
   ========================================================= */

pictureInput.addEventListener(
    "change",
    async event => {

        const file =
            event.target.files?.[0];

        if (!file) {
            return;
        }

        if (!file.type.startsWith("image/")) {

            profileMessage.textContent =
                "Choose an image file.";

            return;
        }

        try {

            selectedPicture =
                await compressImage(file);

            renderEditorPicture();

        } catch (error) {

            console.error(error);

            profileMessage.textContent =
                "Could not load that picture.";
        }
    }
);


/* =========================================================
   REMOVE PICTURE
   ========================================================= */

removePicture.addEventListener(
    "click",
    () => {

        selectedPicture = "";

        pictureInput.value = "";

        renderEditorPicture();
    }
);


/* =========================================================
   SAVE PROFILE
   ========================================================= */

profileForm.addEventListener(
    "submit",
    event => {

        event.preventDefault();

        const name =
            nameInput.value.trim();

        const username =
            usernameInput.value.trim();

        const bio =
            bioInput.value.trim();

        if (!name || !username) {

            profileMessage.textContent =
                "Name and username are required.";

            return;
        }

        const users = getUsers();

        const duplicate = users.some(
            user =>
                String(user.id) !==
                String(currentUser.id) &&

                String(user.username || "")
                    .toLowerCase() ===
                username.toLowerCase()
        );

        if (duplicate) {

            profileMessage.textContent =
                "That username is already taken.";

            return;
        }

        currentUser.name = name;
        currentUser.username = username;
        currentUser.bio = bio;
        currentUser.profilePicture =
            selectedPicture;

        const userIndex =
            users.findIndex(
                user =>
                    String(user.id) ===
                    String(currentUser.id)
            );

        if (userIndex !== -1) {

            users[userIndex] = currentUser;

        } else {

            users.push(currentUser);
        }

        localStorage.setItem(
            "nexaUsers",
            JSON.stringify(users)
        );

        localStorage.setItem(
            "nexaCurrentUser",
            JSON.stringify(currentUser)
        );

        renderProfile();

        profileMessage.textContent =
            "Profile updated successfully.";

        setTimeout(
            closeEditModal,
            700
        );
    }
);


/* =========================================================
   LOAD POSTS
   ========================================================= */

async function loadPosts() {

    try {

        const response =
            await fetch(`${API_BASE}/posts`);

        if (!response.ok) {

            throw new Error(
                `Server returned ${response.status}`
            );
        }

        const data =
            await response.json();

        if (Array.isArray(data)) {

            posts = data;

        } else if (
            data &&
            Array.isArray(data.posts)
        ) {

            posts = data.posts;

        } else {

            posts = [];
        }

    } catch (error) {

        console.error(
            "Profile posts error:",
            error
        );

        posts = [];
    }

    renderProfilePosts();

    updateStatistics();
}

/* =========================================================
   VIEWER LIKE
========================================================= */

async function toggleViewerLike() {

    const post =
        viewerPosts[viewerIndex];


    if (!post) {
        return;
    }


    try {

        const response =
            await fetch(
                `${API_BASE}/posts/${post.id}/like`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        userId:
                            getUserId()
                    })
                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.message ||
                "Could not update like."
            );
        }


        /*
         * Update the local post.
         */

        post.likes =
            Array.isArray(post.likes)
                ? post.likes
                : [];


        const myId =
            String(getUserId());


        if (data.liked) {

            if (
                !post.likes
                    .map(String)
                    .includes(myId)
            ) {

                post.likes.push(
                    getUserId()
                );
            }

        } else {

            post.likes =
                post.likes.filter(
                    id =>
                        String(id) !==
                        myId
                );
        }


        renderViewer();

        renderProfilePosts();

        updateStatistics();

    } catch (error) {

        console.error(
            "Viewer like error:",
            error
        );
    }
}

viewerLike.addEventListener(
    "click",
    event => {

        event.stopPropagation();

        toggleViewerLike();
    }
);

/* =========================================================
   POST OWNER
   ========================================================= */

function postBelongsToCurrentUser(post) {

    if (
        post.authorId !== undefined &&
        post.authorId !== null
    ) {

        return (
            String(post.authorId) ===
            String(getUserId())
        );
    }

    return (
        String(post.authorName || "")
            .toLowerCase() ===
        String(
            currentUser.name ||
            currentUser.username ||
            ""
        ).toLowerCase()
    );
}


function getMyPosts() {

    return posts.filter(
        post =>
            postBelongsToCurrentUser(post)
    );
}


/* =========================================================
   LIKES
   ========================================================= */

function getLikesCount(post) {

    if (Array.isArray(post.likes)) {
        return post.likes.length;
    }

    return Number(post.likes || 0);
}


function getTotalLikes(postsToCount) {

    return postsToCount.reduce(
        (total, post) =>
            total + getLikesCount(post),
        0
    );
}


/* =========================================================
   FRIENDS
   ========================================================= */

function getFriendIds() {

    const source =
        currentUser.friends ||
        currentUser.friendIds ||
        currentUser.connections ||
        [];

    if (!Array.isArray(source)) {
        return [];
    }

    return source
        .map(friend => {

            if (
                typeof friend === "object" &&
                friend !== null
            ) {

                return (
                    friend.id ||
                    friend.userId ||
                    friend.friendId
                );
            }

            return friend;
        })
        .filter(Boolean);
}


function getFriends() {

    const friendIds =
        getFriendIds().map(String);

    return getUsers().filter(
        user =>
            friendIds.includes(
                String(user.id)
            )
    );
}


/* =========================================================
   PEOPLE SUGGESTIONS
   ========================================================= */

function renderSuggestions() {

    const users = getUsers();

    const friendIds =
        getFriendIds().map(String);

    const suggestions =
        users
            .filter(user => {

                if (
                    String(user.id) ===
                    String(currentUser.id)
                ) {
                    return false;
                }

                return !friendIds.includes(
                    String(user.id)
                );
            })
            .slice(0, 8);

    peopleRow.innerHTML = "";

    suggestions.forEach(user => {

        const card =
            document.createElement("div");

        card.className = "person-card";

        const image =
            getProfilePicture(user);

        card.innerHTML = `

            <div class="person-photo">

                ${
                    image
                        ? `
                            <img
                                src="${escapeHTML(image)}"
                                alt=""
                            >
                        `
                        : escapeHTML(
                            getInitial(user)
                        )
                }

            </div>

            <div class="person-name">
                ${escapeHTML(
                    user.name || "NEXA User"
                )}
            </div>

            <div class="person-username">
                @${escapeHTML(
                    user.username || "user"
                )}
            </div>

            <button
                type="button"
                class="add-friend"
                data-id="${escapeHTML(user.id)}">
                Add Friend
            </button>
        `;

        card
            .querySelector(".add-friend")
            .addEventListener(
                "click",
                () => addFriend(user.id)
            );

        peopleRow.appendChild(card);
    });
}


/* =========================================================
   ADD FRIEND
   ========================================================= */
async function addFriend(friendId) {

    try {

        const response =
            await fetch(
                `${API_BASE}/users/${getUserId()}/friends`,
                {
                    method: "PUT",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        friendId:
                            Number(friendId),

                        action:
                            "add"
                    })
                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.message ||
                "Could not add friend."
            );
        }


        /*
         * Update current user with
         * server's version.
         */

        currentUser =
            data.user;


        /*
         * Refresh local cache.
         */

        const users =
            getUsers();


        const index =
            users.findIndex(
                user =>
                    String(user.id) ===
                    String(currentUser.id)
            );


        if (index !== -1) {

            users[index] =
                currentUser;

        } else {

            users.push(
                currentUser
            );
        }


        localStorage.setItem(
            "nexaUsers",
            JSON.stringify(users)
        );


        localStorage.setItem(
            "nexaCurrentUser",
            JSON.stringify(
                currentUser
            )
        );


        /*
         * Reload everything.
         */

        await loadUsersFromServer();


        console.log(
            "Friend added successfully."
        );

    } catch (error) {

        console.error(
            "Add friend error:",
            error
        );


        alert(
            error.message ||
            "Could not add friend."
        );
    }
}


/* =========================================================
   PEOPLE WHO LIKED POSTS
   ========================================================= */

function getPeopleWhoLiked() {

    const users = getUsers();

    const likedIds = new Set();

    getMyPosts().forEach(post => {

        if (Array.isArray(post.likes)) {

            post.likes.forEach(id => {
                likedIds.add(String(id));
            });
        }
    });

    return users.filter(
        user =>
            likedIds.has(
                String(user.id)
            )
    );
}


/* =========================================================
   RENDER POSTS
   ========================================================= */

function renderProfilePosts() {

    const myPosts = getMyPosts();

    profilePostGrid.innerHTML = "";

    if (myPosts.length === 0) {

        profilePostGrid.style.display = "none";

        emptyProfilePosts.style.display = "flex";

        return;
    }

    profilePostGrid.style.display = "grid";

    emptyProfilePosts.style.display = "none";

    myPosts.forEach(post => {

        const tile =
            document.createElement("div");

        const type =
            post.mediaType;

        if (type === "reel") {
            tile.className =
                "profile-post reel";
        } else if (type === "image") {
            tile.className =
                "profile-post image";
        } else {
            tile.className =
                "profile-post text";
        }

        let content = "";

        if (
            type === "image" &&
            post.media
        ) {

            content = `
                <img
                    src="${escapeHTML(
                        getMediaURL(post.media)
                    )}"
                    alt="NEXA post"
                    loading="lazy"
                >
            `;

        } else if (
            (
                type === "reel" ||
                type === "video"
            ) &&
            post.media
        ) {

            content = `
                <video
                    src="${escapeHTML(
                        getMediaURL(post.media)
                    )}"
                    muted
                    playsinline
                    preload="metadata">
                </video>
            `;

        } else {

            content = `
                <p>
                    ${escapeHTML(
                        post.text ||
                        "NEXA Post"
                    )}
                </p>
            `;
        }

        tile.innerHTML =
            content +
            `
                <div class="post-hover">

                    <span>
                        ♥ ${getLikesCount(post)}
                    </span>

                    <span>
                        💬 ${
                            Array.isArray(post.comments)
                                ? post.comments.length
                                : 0
                        }
                    </span>

                </div>
            `;

        tile.addEventListener(
            "click",
            () => openViewer(post)
        );

        profilePostGrid.appendChild(tile);
    });
}


/* =========================================================
   POST VIEWER
   ========================================================= */

function openViewer(post) {

    viewerPosts =
        getMyPosts().filter(
            item =>
                item.media &&
                (
                    item.mediaType === "image" ||
                    item.mediaType === "video" ||
                    item.mediaType === "reel"
                )
        );

    viewerIndex =
        viewerPosts.findIndex(
            item =>
                String(item.id) ===
                String(post.id)
        );

    if (viewerIndex === -1) {
        return;
    }

    renderViewer();

    postViewer.classList.add("show");

    document.body.style.overflow = "hidden";
}


/* =========================================================
   RENDER VIEWER
========================================================= */

function renderViewer() {

    if (
        viewerIndex < 0 ||
        viewerIndex >= viewerPosts.length
    ) {
        return;
    }


    const post =
        viewerPosts[viewerIndex];


    if (!post) {
        return;
    }


    const url =
        getMediaURL(
            post.media
        );


    const likes =
        getLikesCount(post);


    const myId =
        String(getUserId());


    const liked =
        Array.isArray(post.likes) &&
        post.likes
            .map(String)
            .includes(myId);


    const saved =
        Array.isArray(post.savedBy) &&
        post.savedBy
            .map(String)
            .includes(myId);


    /*
     * -------------------------------------------------------
     * MEDIA
     * -------------------------------------------------------
     */

    if (
        post.mediaType === "reel" ||
        post.mediaType === "video"
    ) {

        viewerContent.innerHTML = `

            <video
                src="${escapeHTML(url)}"
                controls
                autoplay
                playsinline
                loop>
            </video>

        `;

    } else {

        viewerContent.innerHTML = `

            <img
                src="${escapeHTML(url)}"
                alt="NEXA post">

        `;
    }


    /*
     * -------------------------------------------------------
     * CAPTION
     * -------------------------------------------------------
     */

    viewerCaption.textContent =
        post.text || "";


    /*
     * -------------------------------------------------------
     * LIKE BUTTON
     * -------------------------------------------------------
     */

    viewerLike.innerHTML = `

        <span
            class="action-icon ${
                liked ? "liked" : ""
            }">

            ${liked ? "♥" : "♡"}

        </span>

        <span class="action-label">

            ${likes}

        </span>

    `;


    /*
     * -------------------------------------------------------
     * COMMENT BUTTON
     * -------------------------------------------------------
     */

    const commentCount =
        Array.isArray(post.comments)
            ? post.comments.length
            : 0;


    viewerComment.innerHTML = `

        <span class="action-icon">
            💬
        </span>

        <span class="action-label">
            ${
                commentCount > 0
                    ? `Comment ${commentCount}`
                    : "Comment"
            }
        </span>

    `;


    /*
     * -------------------------------------------------------
     * SHARE BUTTON
     * -------------------------------------------------------
     */

    viewerShare.innerHTML = `

        <span class="action-icon">
            ↗
        </span>

        <span class="action-label">
            Share
        </span>

    `;


    /*
     * -------------------------------------------------------
     * COPY LINK BUTTON
     * -------------------------------------------------------
     */

    viewerCopy.innerHTML = `

        <span class="action-icon">
            🔗
        </span>

        <span class="action-label">
            Copy Link
        </span>

    `;


    /*
     * -------------------------------------------------------
     * SAVE BUTTON
     * -------------------------------------------------------
     */

    viewerSave.innerHTML = `

        <span class="action-icon">
            ${saved ? "★" : "☆"}
        </span>

        <span class="action-label">
            ${saved ? "Saved" : "Save"}
        </span>

    `;
}

    if (
        viewerIndex < 0 ||
        viewerIndex >= viewerPosts.length
    ) {
        return;
    }

    const post =
        viewerPosts[viewerIndex];

    const url =
        getMediaURL(post.media);

    if (
        post.mediaType === "video" ||
        post.mediaType === "reel"
    ) {

        viewerContent.innerHTML = `
            <video
                src="${escapeHTML(url)}"
                controls
                autoplay
                playsinline
                loop>
            </video>
        `;

    } else {

        viewerContent.innerHTML = `
            <img
                src="${escapeHTML(url)}"
                alt="NEXA post">
        `;
    }

viewerShare.addEventListener(
    "click",
    async event => {

        event.stopPropagation();


        const post =
            viewerPosts[viewerIndex];


        if (!post) {
            return;
        }


        const link =
            `${window.location.origin}/home.html#post-${post.id}`;


        try {

            if (
                navigator.share
            ) {

                await navigator.share({

                    title:
                        "NEXA Post",

                    text:
                        post.text ||
                        "Check out this NEXA post.",

                    url:
                        link
                });

            } else {

                await navigator.clipboard.writeText(
                    link
                );

                alert(
                    "Post link copied. You can share it anywhere."
                );
            }

        } catch (error) {

            console.log(
                "Share cancelled."
            );
        }
    }
);

viewerCopy.addEventListener(
    "click",
    async event => {

        event.stopPropagation();


        const post =
            viewerPosts[viewerIndex];


        if (!post) {
            return;
        }


        const link =
            `${window.location.origin}/home.html#post-${post.id}`;


        try {

            await navigator.clipboard.writeText(
                link
            );


            viewerCopy.innerHTML = `

                <span class="action-icon">
                    ✓
                </span>

                <span class="action-label">
                    Copied
                </span>

            `;


            setTimeout(
                () => {

                    viewerCopy.innerHTML = `

                        <span class="action-icon">
                            🔗
                        </span>

                        <span class="action-label">
                            Copy Link
                        </span>

                    `;

                },
                1500
            );

        } catch (error) {

            console.error(
                "Copy failed:",
                error
            );
        }
    }
);

viewerSave.addEventListener(
    "click",
    async event => {

        event.stopPropagation();


        const post =
            viewerPosts[viewerIndex];


        if (!post) {
            return;
        }


        if (!Array.isArray(post.savedBy)) {
            post.savedBy = [];
        }


        const myId =
            String(getUserId());


        const alreadySaved =
            post.savedBy
                .map(String)
                .includes(myId);


        if (alreadySaved) {

            post.savedBy =
                post.savedBy.filter(
                    id =>
                        String(id) !==
                        myId
                );

        } else {

            post.savedBy.push(
                getUserId()
            );
        }


        try {

            const response =
                await fetch(
                    `${API_BASE}/posts/${post.id}`,
                    {
                        method: "PUT",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify({

                            savedBy:
                                post.savedBy
                        })
                    }
                );


            if (!response.ok) {
                throw new Error(
                    "Could not save post."
                );
            }


            renderViewer();

        } catch (error) {

            console.error(
                "Save error:",
                error
            );
        }
    }
);

viewerComment.addEventListener(
    "click",
    event => {

        event.stopPropagation();


        const post =
            viewerPosts[viewerIndex];


        if (!post) {
            return;
        }


        const comment =
            prompt(
                "Write a comment on this post:"
            );


        if (!comment || !comment.trim()) {
            return;
        }


        addCommentToPost(
            post,
            comment.trim()
        );
    }
);

async function addCommentToPost(
    post,
    text
) {

    if (!Array.isArray(post.comments)) {

        post.comments = [];
    }


    post.comments.push({

        id:
            Date.now(),

        userId:
            getUserId(),

        username:
            currentUser.username ||
            "user",

        name:
            currentUser.name ||
            "NEXA User",

        text,

        createdAt:
            new Date().toISOString()
    });


    try {

        const response =
            await fetch(
                `${API_BASE}/posts/${post.id}`,
                {
                    method: "PUT",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        comments:
                            post.comments
                    })
                }
            );


        if (!response.ok) {

            throw new Error(
                "Could not save comment."
            );
        }


        renderViewer();

    } catch (error) {

        console.error(
            "Comment error:",
            error
        );
    }
}

/* =========================================================
   VIEWER NAVIGATION
   ========================================================= */

viewerNext.addEventListener(
    "click",
    event => {

        event.stopPropagation();

        if (!viewerPosts.length) {
            return;
        }

        viewerIndex =
            (viewerIndex + 1) %
            viewerPosts.length;

        renderViewer();
    }
);


viewerPrevious.addEventListener(
    "click",
    event => {

        event.stopPropagation();

        if (!viewerPosts.length) {
            return;
        }

        viewerIndex =
            (viewerIndex - 1 +
                viewerPosts.length) %
            viewerPosts.length;

        renderViewer();
    }
);


function closePostViewer() {

    postViewer.classList.remove("show");

    viewerContent.innerHTML = "";

    document.body.style.overflow = "";
}


closeViewer.addEventListener(
    "click",
    closePostViewer
);


document
    .querySelector("#postViewer .viewer-bg")
    .addEventListener(
        "click",
        closePostViewer
    );


/* =========================================================
   MOUSE WHEEL
   ========================================================= */

postViewer.addEventListener(
    "wheel",
    event => {

        if (
            !postViewer.classList.contains("show")
        ) {
            return;
        }

        event.preventDefault();

        if (event.deltaY > 0) {
            viewerNext.click();
        } else {
            viewerPrevious.click();
        }
    },
    {
        passive: false
    }
);


/* =========================================================
   TOUCH SWIPE
   ========================================================= */

let touchStartY = 0;

postViewer.addEventListener(
    "touchstart",
    event => {

        touchStartY =
            event.touches[0].clientY;
    },
    {
        passive: true
    }
);


postViewer.addEventListener(
    "touchend",
    event => {

        const endY =
            event.changedTouches[0].clientY;

        const distance =
            touchStartY - endY;

        if (Math.abs(distance) < 60) {
            return;
        }

        if (distance > 0) {
            viewerNext.click();
        } else {
            viewerPrevious.click();
        }
    },
    {
        passive: true
    }
);


/* =========================================================
   KEYBOARD
   ========================================================= */

document.addEventListener(
    "keydown",
    event => {

        if (
            !postViewer.classList.contains("show")
        ) {
            return;
        }

        if (event.key === "ArrowDown") {
            viewerNext.click();
        }

        if (event.key === "ArrowUp") {
            viewerPrevious.click();
        }

        if (event.key === "Escape") {
            closePostViewer();
        }
    }
);


/* =========================================================
   PEOPLE MODAL
   ========================================================= */

function openPeopleModal(title, people) {

    peopleModalTitle.textContent = title;

    peopleList.innerHTML = "";

    if (people.length === 0) {

        peopleList.innerHTML = `
            <p style="
                color:rgba(255,255,255,.45);
                text-align:center;
                padding:25px;
            ">
                No people to show yet.
            </p>
        `;

    } else {

        people.forEach(user => {

            const row =
                document.createElement("div");

            row.className =
                "people-modal-row";

            const image =
                getProfilePicture(user);

            row.innerHTML = `

                <div class="people-modal-photo">

                    ${
                        image
                            ? `
                                <img
                                    src="${escapeHTML(image)}"
                                    alt=""
                                >
                            `
                            : escapeHTML(
                                getInitial(user)
                            )
                    }

                </div>

                <div class="people-modal-info">

                    <strong>
                        ${escapeHTML(
                            user.name ||
                            "NEXA User"
                        )}
                    </strong>

                    <span>
                        @${escapeHTML(
                            user.username ||
                            "user"
                        )}
                    </span>

                </div>
            `;

            peopleList.appendChild(row);
        });
    }

    peopleModal.classList.add("show");

    document.body.style.overflow = "hidden";
}


function closePeopleModal() {

    peopleModal.classList.remove("show");

    document.body.style.overflow = "";
}


closePeople.addEventListener(
    "click",
    closePeopleModal
);


document
    .querySelector("#peopleModal .modal-bg")
    .addEventListener(
        "click",
        closePeopleModal
    );


/* =========================================================
   STAT BUTTONS
   ========================================================= */

document
    .getElementById("postsStat")
    .addEventListener(
        "click",
        () => {

            document
                .querySelector(".profile-posts")
                .scrollIntoView({
                    behavior: "smooth"
                });
        }
    );


document
    .getElementById("friendsStat")
    .addEventListener(
        "click",
        () => {

            openPeopleModal(
                "Friends",
                getFriends()
            );
        }
    );


document
    .getElementById("likesStat")
    .addEventListener(
        "click",
        () => {

            openPeopleModal(
                "People Who Liked Your Posts",
                getPeopleWhoLiked()
            );
        }
    );


/* =========================================================
   STATISTICS
   ========================================================= */

function updateStatistics() {

    const mine = getMyPosts();

    postsCount.textContent =
        mine.length;

    friendsCount.textContent =
        getFriends().length;

    likesCount.textContent =
        getTotalLikes(mine);
}


/* =========================================================
   RENDER PROFILE
   ========================================================= */

function renderProfile() {

    profileUsername.textContent =
        "@" +
        (
            currentUser.username ||
            "user"
        );

    profileName.textContent =
        currentUser.name ||
        "NEXA User";

    profileBio.textContent =
        currentUser.bio ||
        "No bio yet.";

    renderMainPicture();

    renderEditorPicture();

    updateStatistics();

    renderSuggestions();

    renderProfilePosts();
}


/* =========================================================
   START
   ========================================================= */

async function initializeProfile() {

    await loadUsersFromServer();

    await loadPosts();

    renderProfile();

    updateStatistics();

    renderSuggestions();
}


initializeProfile();