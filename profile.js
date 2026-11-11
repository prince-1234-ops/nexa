/* =========================================================
   NEXA PROFILE
   Supabase + Public Profiles + Posts + Likes + Friends
   (corrected version)
========================================================= */


/* =========================================================
   SUPABASE + LOGIN CHECK
========================================================= */

if (typeof nexaSupabase === "undefined") {
    throw new Error("NEXA Supabase is not available.");
}

let storedUser = null;

try {
    storedUser = JSON.parse(localStorage.getItem("nexaCurrentUser"));
} catch (_) {
    storedUser = null;
}

if (!storedUser) {
    window.location.href = "index.html";
    throw new Error("No NEXA user is logged in.");
}


/* =========================================================
   STATE
========================================================= */

let currentUser = storedUser;
let profileUser = null;
let isOwnProfile = true;
let profilePosts = [];
let profileStories = [];
let profileLikesCount = 0;


/* =========================================================
   DOM
========================================================= */

const $ = id => document.getElementById(id);

const profilePageLoading = $("profilePageLoading");
const profileUsernameTitle = $("profileUsernameTitle");
const profilePhoto = $("profilePhoto");
const profilePhotoFallback = $("profilePhotoFallback");
const profileName = $("profileName");
const profileUsername = $("profileUsername");
const profileBio = $("profileBio");
const profilePostsCount = $("profilePostsCount");
const profileFriendsCount = $("profileFriendsCount");
const profileLikesCountElement = $("profileLikesCount");
const profileStoriesElement = $("profileStories");
const profileStoriesLoading = $("profileStoriesLoading");
const profilePostsGrid = $("profilePostsGrid");
const profilePostsLoading = $("profilePostsLoading");
const profileEmptyPosts = $("profileEmptyPosts");
const editProfileButton = $("editProfileButton");
const addFriendProfileButton = $("addFriendProfileButton");
const messageProfileButton = $("messageProfileButton");
const profileBackButton = $("profileBackButton");
const profileMenuButton = $("profileMenuButton");
const profileStatusCloud = $("profileStatusCloud");
const profileStatusPreview = $("profileStatusPreview");
const profileStatusModal = $("profileStatusModal");
const profileStatusInput = $("profileStatusInput");
const profileStatusCharacters = $("profileStatusCharacters");
const saveProfileStatusButton = $("saveProfileStatusButton");
const editProfileModal = $("editProfileModal");
const profilePictureInput = $("profilePictureInput");
const editProfilePhotoPreview = $("editProfilePhotoPreview");
const editProfileName = $("editProfileName");
const editProfileUsername = $("editProfileUsername");
const editProfileBio = $("editProfileBio");
const saveProfileButton = $("saveProfileButton");
const profilePostViewer = $("profilePostViewer");
const profilePostViewerContent = $("profilePostViewerContent");
const closeProfilePostViewer = $("closeProfilePostViewer");


/* =========================================================
   HELPERS
========================================================= */

function escapeHTML(value) {
    const element = document.createElement("div");
    element.textContent = String(value ?? "");
    return element.innerHTML;
}

function getProfilePicture(user) {
    return user?.profile_picture || user?.profilePicture || "";
}

function getDisplayName(user) {
    return user?.name || user?.username || "NEXA Member";
}

function normalizeFriends(value) {

    if (Array.isArray(value)) {
        return value;
    }

    if (typeof value === "string") {

        const trimmed = value.trim();

        if (!trimmed) {
            return [];
        }

        try {
            const parsed = JSON.parse(trimmed);
            return Array.isArray(parsed) ? parsed : [];
        } catch (_) {
            return trimmed
                .split(",")
                .map(id => id.trim())
                .filter(Boolean);
        }
    }

    return [];
}

function getFriendIds(user) {

    return normalizeFriends(user?.friends)
        .map(friend =>
            typeof friend === "object" ? friend?.id : friend
        )
        .filter(id =>
            id !== undefined &&
            id !== null &&
            String(id).trim()
        )
        .map(id => String(id));
}

function showLoading(visible) {

    if (!profilePageLoading) {
        return;
    }

    profilePageLoading.classList.toggle("hidden", !visible);
    profilePageLoading.style.display = visible ? "" : "none";
}

function formatEngagementCount(number) {

    const value = Number(number || 0);

    if (value >= 1000000) {
        return (value / 1000000).toFixed(
            value % 1000000 === 0 ? 0 : 1
        ) + "M";
    }

    if (value >= 1000) {
        return (value / 1000).toFixed(
            value % 1000 === 0 ? 0 : 1
        ) + "K";
    }

    return String(value);
}

function timeAgoProfile(timestamp) {

    if (!timestamp) {
        return "Just now";
    }

    const date = new Date(timestamp);

    if (Number.isNaN(date.getTime())) {
        return "Just now";
    }

    const seconds = Math.floor(
        Math.max(0, Date.now() - date.getTime()) / 1000
    );

    if (seconds < 60) {
        return "Just now";
    }

    const minutes = Math.floor(seconds / 60);

    if (minutes < 60) {
        return `${minutes}m`;
    }

    const hours = Math.floor(minutes / 60);

    if (hours < 24) {
        return `${hours}h`;
    }

    const days = Math.floor(hours / 24);

    if (days < 7) {
        return `${days}d`;
    }

    return date.toLocaleDateString([], {
        month: "short",
        day: "numeric"
    });
}

function saveCurrentUser() {
    localStorage.setItem(
        "nexaCurrentUser",
        JSON.stringify(currentUser)
    );
}


/* =========================================================
   POST HELPERS
========================================================= */

function getPostMedia(post) {

    return (
        post?.media ||
        post?.image ||
        post?.image_url ||
        post?.video ||
        post?.video_url ||
        post?.media_url ||
        ""
    );
}

function getPostMediaType(post) {

    const explicit = String(
        post?.media_type || post?.mediaType || ""
    ).toLowerCase();

    if (explicit) {
        return explicit;
    }

    const media = String(getPostMedia(post));

    if (media.startsWith("data:video/")) {
        return "video";
    }

    if (/\.(mp4|webm|ogg)(\?|$)/i.test(media)) {
        return "video";
    }

    return "image";
}

function postLikeCount(post) {

    const real = Array.isArray(post.likes) ? post.likes.length : 0;

    return real + Number(post.demo_likes || 0);
}

function postCommentCount(post) {

    const real = Array.isArray(post.comments) ? post.comments.length : 0;

    return real + Number(post.demo_comments || 0);
}

function postShareCount(post) {

    return Number(post.shares || 0) + Number(post.demo_shares || 0);
}

function isPostLikedByMe(post) {

    return (
        Array.isArray(post.likes) &&
        post.likes.some(id => String(id) === String(currentUser.id))
    );
}


/* =========================================================
   PROFILE USER ID
========================================================= */

function getRequestedProfileId() {

    const params = new URLSearchParams(window.location.search);

    return (
        params.get("user") ||
        params.get("id") ||
        String(currentUser.id)
    );
}


/* =========================================================
   LOAD PROFILE
========================================================= */

async function loadProfile() {

    const requestedId = getRequestedProfileId();

    isOwnProfile = String(requestedId) === String(currentUser.id);

    try {

        const { data, error } = await nexaSupabase
            .from("profiles")
            .select(`
                id,
                name,
                username,
                profile_picture,
                bio,
                friends,
                created_at
            `)
            .eq("id", String(requestedId))
            .maybeSingle();

        if (error) {
            throw error;
        }

        if (!data) {
            throw new Error("Profile not found.");
        }

        profileUser = data;

        /* Keep the logged-in user's local identity synchronized. */

        if (isOwnProfile) {

            currentUser.name = data.name ?? currentUser.name;
            currentUser.username = data.username ?? currentUser.username;
            currentUser.profilePicture =
                data.profile_picture || currentUser.profilePicture || "";
            currentUser.profile_picture =
                data.profile_picture || currentUser.profile_picture || "";
            currentUser.bio = data.bio ?? currentUser.bio;
            currentUser.friends = getFriendIds(data);

            saveCurrentUser();

        } else {

            /* Also refresh my own friends list so the Add Friend button is accurate. */

            try {

                const { data: me } = await nexaSupabase
                    .from("profiles")
                    .select("friends")
                    .eq("id", String(currentUser.id))
                    .maybeSingle();

                if (me) {
                    currentUser.friends = getFriendIds(me);
                    saveCurrentUser();
                }

            } catch (_) { }
        }

        renderProfileHeader();

    } catch (error) {

        console.error("NEXA profile loading error:", error);

        renderProfileError("Could not load this profile.");
    }
}

function renderProfileError(message) {

    if (profileName) {
        profileName.textContent = message;
    }

    if (profileUsername) {
        profileUsername.textContent = "";
    }

    if (profileBio) {
        profileBio.textContent = "";
    }
}


/* =========================================================
   PROFILE HEADER
========================================================= */

function renderProfileHeader() {

    if (!profileUser) {
        return;
    }

    const name = getDisplayName(profileUser);

    const username = profileUser.username
        ? "@" + profileUser.username
        : "@nexa";

    const picture = getProfilePicture(profileUser);

    if (profileUsernameTitle) {
        profileUsernameTitle.textContent = profileUser.username
            ? "@" + profileUser.username
            : name;
    }

    if (profileName) {
        profileName.textContent = name;
    }

    if (profileUsername) {
        profileUsername.textContent = username;
    }

    if (profileBio) {
        profileBio.textContent = profileUser.bio || "Welcome to NEXA.";
    }

    if (profilePhoto) {

        if (picture) {
            profilePhoto.src = picture;
            profilePhoto.alt = name;
            profilePhoto.style.display = "block";
        } else {
            profilePhoto.removeAttribute("src");
            profilePhoto.style.display = "none";
        }
    }

    if (profilePhotoFallback) {

        profilePhotoFallback.textContent =
            name.trim().charAt(0).toUpperCase() || "N";

        profilePhotoFallback.style.display = picture ? "none" : "flex";
    }

    if (editProfileButton) {
        editProfileButton.hidden = !isOwnProfile;
    }

    if (addFriendProfileButton) {

        addFriendProfileButton.hidden = isOwnProfile;

        if (!isOwnProfile) {

            const alreadyFriends = getFriendIds(currentUser)
                .includes(String(profileUser.id));

            addFriendProfileButton.disabled = alreadyFriends;

            addFriendProfileButton.innerHTML = alreadyFriends
                ? `<i class="fa-solid fa-check"></i><span>Friends</span>`
                : `<i class="fa-solid fa-user-plus"></i><span>Add Friend</span>`;
        }
    }

    if (messageProfileButton) {
        messageProfileButton.hidden = isOwnProfile;
    }
}


/* =========================================================
   FRIEND COUNT
========================================================= */

async function loadFriendCount() {

    if (!profileUser) {
        return 0;
    }

    const friendIds = getFriendIds(profileUser);

    if (profileFriendsCount) {
        profileFriendsCount.textContent = String(friendIds.length);
    }

    return friendIds.length;
}


/* =========================================================
   LOAD POSTS
========================================================= */

async function loadProfilePosts() {

    if (!profileUser) {
        return;
    }

    try {

        const { data, error } = await nexaSupabase
            .from("posts")
            .select("*")
            .eq("author_id", String(profileUser.id))
            .order("created_at", { ascending: false });

        if (error) {
            throw error;
        }

        profilePosts = Array.isArray(data) ? data : [];

        if (profilePostsCount) {
            profilePostsCount.textContent = String(profilePosts.length);
        }

        await loadProfileLikeCount();

        renderProfilePosts();

    } catch (error) {

        console.error("NEXA profile posts error:", error);

        profilePosts = [];

        if (profilePostsCount) {
            profilePostsCount.textContent = "0";
        }

        renderProfilePosts();
    }
}


/* =========================================================
   LOAD LIKES
   Reads the "likes" table, fills post.likes with the
   user ids who liked each post, and totals the likes.
========================================================= */

async function loadProfileLikeCount() {

    profileLikesCount = 0;

    try {

        const postIds = profilePosts
            .map(post => post.id)
            .filter(Boolean);

        const likesByPost = {};

        if (postIds.length) {

            const { data, error } = await nexaSupabase
                .from("likes")
                .select("id, post_id, user_id")
                .in("post_id", postIds);

            if (error) {
                throw error;
            }

            (data || []).forEach(row => {

                const key = String(row.post_id);

                if (!likesByPost[key]) {
                    likesByPost[key] = [];
                }

                likesByPost[key].push(String(row.user_id));
            });
        }

        profilePosts.forEach(post => {
            post.likes = likesByPost[String(post.id)] || [];
        });

        profileLikesCount = profilePosts.reduce(
            (total, post) => total + postLikeCount(post),
            0
        );

    } catch (error) {

        console.error("NEXA profile likes error:", error);

        profilePosts.forEach(post => {
            if (!Array.isArray(post.likes)) {
                post.likes = [];
            }
        });

        profileLikesCount = profilePosts.reduce(
            (total, post) => total + postLikeCount(post),
            0
        );
    }

    if (profileLikesCountElement) {
        profileLikesCountElement.textContent =
            formatEngagementCount(profileLikesCount);
    }
}

function refreshTotalLikes() {

    profileLikesCount = profilePosts.reduce(
        (total, post) => total + postLikeCount(post),
        0
    );

    if (profileLikesCountElement) {
        profileLikesCountElement.textContent =
            formatEngagementCount(profileLikesCount);
    }
}


/* =========================================================
   RENDER POSTS
========================================================= */

function renderProfileAvatarHTML() {

    const picture = getProfilePicture(profileUser);

    if (picture) {
        return `
            <img
                src="${escapeHTML(picture)}"
                alt="${escapeHTML(
                    profileUser?.username ||
                    profileUser?.name ||
                    "NEXA User"
                )}"
            >
        `;
    }

    return escapeHTML(
        (
            profileUser?.username ||
            profileUser?.name ||
            "N"
        )
            .charAt(0)
            .toUpperCase()
    );
}

function renderProfilePosts() {

    if (profilePostsLoading) {
        profilePostsLoading.style.display = "none";
    }

    if (!profilePostsGrid) {
        return;
    }

    profilePostsGrid.innerHTML = "";

    if (!profilePosts.length) {

        profilePostsGrid.style.display = "none";

        if (profileEmptyPosts) {
            profileEmptyPosts.hidden = false;
        }

        return;
    }

    if (profileEmptyPosts) {
        profileEmptyPosts.hidden = true;
    }

    profilePostsGrid.style.display = "grid";

    profilePosts.forEach(post => {

        const media = getPostMedia(post);

        const mediaType = String(
            post.media_type || post.mediaType || ""
        ).toLowerCase();


        /* =====================================================
           REEL
        ===================================================== */

        if (mediaType === "reel") {

            const reel = document.createElement("article");

            reel.className = "profile-reel-card";
            reel.dataset.postId = String(post.id);

            const liked = isPostLikedByMe(post);

            reel.innerHTML = `

                <div class="profile-reel-media">

                    <video
                        src="${escapeHTML(media)}"
                        class="profile-reel-video"
                        muted
                        loop
                        playsinline
                        preload="metadata"
                    ></video>

                    <div class="profile-reel-gradient"></div>

                    <div class="profile-reel-author">

                        <div class="profile-reel-avatar">
                            ${renderProfileAvatarHTML()}
                        </div>

                        <div>
                            <strong>
                                ${escapeHTML(
                                    post.author_name ||
                                    profileUser?.username ||
                                    profileUser?.name ||
                                    "NEXA User"
                                )}
                            </strong>

                            <span>
                                ${escapeHTML(timeAgoProfile(post.created_at))}
                            </span>
                        </div>

                    </div>

                    <div class="profile-reel-actions">

                        <button
                            type="button"
                            class="profile-reel-action ${liked ? "liked" : ""}"
                            data-profile-action="like"
                            data-id="${escapeHTML(post.id)}"
                        >
                            <span class="profile-reel-action-icon"
                                  style="${liked ? "color:#ff3040;" : ""}">
                                ${liked ? "♥" : "♡"}
                            </span>
                            <span>${formatEngagementCount(postLikeCount(post))}</span>
                        </button>

                        <button
                            type="button"
                            class="profile-reel-action"
                            data-profile-action="comment"
                            data-id="${escapeHTML(post.id)}"
                        >
                            <span class="profile-reel-action-icon">💬</span>
                            <span>${formatEngagementCount(postCommentCount(post))}</span>
                        </button>

                        <button
                            type="button"
                            class="profile-reel-action"
                            data-profile-action="share"
                            data-id="${escapeHTML(post.id)}"
                        >
                            <span class="profile-reel-action-icon">↗</span>
                            <span>${formatEngagementCount(postShareCount(post))}</span>
                        </button>

                    </div>

                    ${post.text
                        ? `
                            <div class="profile-reel-caption">
                                ${escapeHTML(post.text)}
                            </div>
                          `
                        : ""
                    }

                </div>
            `;

            const video = reel.querySelector(".profile-reel-video");

            reel.addEventListener("click", event => {

                if (event.target.closest("[data-profile-action]")) {
                    return;
                }

                openProfileReelViewer(post);
            });

            if (video) {

                const observer = new IntersectionObserver(
                    entries => {

                        entries.forEach(entry => {

                            if (
                                entry.isIntersecting &&
                                entry.intersectionRatio >= 0.65
                            ) {
                                video.play().catch(() => { });
                            } else {
                                video.pause();
                            }
                        });
                    },
                    { threshold: [0, 0.65, 1] }
                );

                observer.observe(video);
            }

            profilePostsGrid.appendChild(reel);

            return;
        }


        /* =====================================================
           NORMAL POST
        ===================================================== */

        const card = document.createElement("button");

        card.type = "button";
        card.className = "profile-post";
        card.dataset.postId = String(post.id);

        let mediaHTML = "";

        if (media) {

            mediaHTML = mediaType.startsWith("video")
                ? `
                    <video
                        src="${escapeHTML(media)}"
                        muted
                        playsinline
                        preload="metadata"
                    ></video>
                  `
                : `
                    <img
                        src="${escapeHTML(media)}"
                        alt="NEXA post"
                        loading="lazy"
                    >
                  `;
        }

        card.innerHTML = `

            ${mediaHTML}

            <span class="profile-post-overlay">

                <span>
                    <i class="fa-solid fa-heart"></i>
                    ${formatEngagementCount(postLikeCount(post))}
                </span>

                <span>
                    <i class="fa-regular fa-comment"></i>
                    ${formatEngagementCount(postCommentCount(post))}
                </span>

            </span>
        `;

        card.addEventListener("click", () => {
            openPostViewer(post);
        });

        profilePostsGrid.appendChild(card);
    });
}


/* =========================================================
   PROFILE REEL VIEWER
========================================================= */

let profileViewerPosts = [];
let profileViewerIndex = 0;
let profileViewer = null;

function getProfileReels() {

    return profilePosts.filter(post =>
        String(
            post.media_type || post.mediaType || ""
        ).toLowerCase() === "reel" &&
        getPostMedia(post)
    );
}

function openProfileReelViewer(post) {

    profileViewerPosts = getProfileReels();

    profileViewerIndex = profileViewerPosts.findIndex(
        item => String(item.id) === String(post.id)
    );

    if (profileViewerIndex < 0) {
        return;
    }

    if (profileViewer) {
        profileViewer.remove();
    }

    profileViewer = document.createElement("div");
    profileViewer.className = "profile-reel-viewer";

    document.body.appendChild(profileViewer);
    document.body.style.overflow = "hidden";

    renderProfileViewerReel();

    /* Mouse wheel */

    profileViewer.addEventListener(
        "wheel",
        event => {

            event.preventDefault();

            if (Math.abs(event.deltaY) < 35) {
                return;
            }

            if (event.deltaY > 0) {
                showNextProfileViewerReel();
            } else {
                showPreviousProfileViewerReel();
            }
        },
        { passive: false }
    );

    /* Touch swipe */

    let startY = 0;

    profileViewer.addEventListener(
        "touchstart",
        event => {

            const touch = event.touches[0];

            if (touch) {
                startY = touch.clientY;
            }
        },
        { passive: true }
    );

    profileViewer.addEventListener(
        "touchend",
        event => {

            const touch = event.changedTouches[0];

            if (!touch) {
                return;
            }

            const difference = startY - touch.clientY;

            if (Math.abs(difference) < 60) {
                return;
            }

            if (difference > 0) {
                showNextProfileViewerReel();
            } else {
                showPreviousProfileViewerReel();
            }
        },
        { passive: true }
    );

    /* Keyboard */

    document.removeEventListener("keydown", profileViewerKeyboardHandler);
    document.addEventListener("keydown", profileViewerKeyboardHandler);
}

function renderProfileViewerReel() {

    if (!profileViewer || !profileViewerPosts.length) {
        return;
    }

    const post = profileViewerPosts[profileViewerIndex];

    const media = getPostMedia(post);

    const liked = isPostLikedByMe(post);

    profileViewer.innerHTML = `

        <button type="button" class="profile-reel-viewer-close">
            ×
        </button>

        <div class="profile-reel-viewer-media">

            <video
                src="${escapeHTML(media)}"
                autoplay
                controls
                loop
                playsinline
                preload="metadata"
            ></video>

            <div class="profile-reel-viewer-actions">

                <button
                    type="button"
                    data-viewer-action="like"
                    class="${liked ? "liked" : ""}"
                >
                    <span style="${liked ? "color:#ff3040;" : ""}">
                        ${liked ? "♥" : "♡"}
                    </span>
                    <small>${formatEngagementCount(postLikeCount(post))}</small>
                </button>

                <button type="button" data-viewer-action="comment">
                    <span>💬</span>
                    <small>${formatEngagementCount(postCommentCount(post))}</small>
                </button>

                <button type="button" data-viewer-action="share">
                    <span>↗</span>
                    <small>${formatEngagementCount(postShareCount(post))}</small>
                </button>

            </div>

            <div class="profile-reel-viewer-info">

                <strong>
                    ${escapeHTML(
                        post.author_name ||
                        profileUser?.username ||
                        profileUser?.name ||
                        "NEXA User"
                    )}
                </strong>

                <span>
                    ${escapeHTML(timeAgoProfile(post.created_at))}
                </span>

                ${post.text
                    ? `<p>${escapeHTML(post.text)}</p>`
                    : ""
                }

            </div>

        </div>
    `;

    profileViewer
        .querySelector(".profile-reel-viewer-close")
        ?.addEventListener("click", closeProfileReelViewer);

    profileViewer
        .querySelectorAll("[data-viewer-action]")
        .forEach(button => {

            button.addEventListener("click", async event => {

                event.preventDefault();
                event.stopPropagation();

                const action = button.dataset.viewerAction;

                const video = profileViewer.querySelector("video");
                const wasPaused = video?.paused;
                const currentTime = video?.currentTime || 0;

                if (action === "like") {
                    await toggleProfileReelLike(post.id);
                } else if (action === "comment") {
                    await openProfileReelComments(post.id);
                } else if (action === "share") {
                    await shareProfileReel(post.id);
                }

                renderProfileViewerReel();

                /* Restore playback position after re-render. */

                const newVideo = profileViewer?.querySelector("video");

                if (newVideo) {

                    try {
                        newVideo.currentTime = currentTime;
                    } catch (_) { }

                    if (wasPaused) {
                        newVideo.pause();
                    }
                }
            });
        });
}

function showNextProfileViewerReel() {

    if (!profileViewerPosts.length) {
        return;
    }

    profileViewerIndex++;

    if (profileViewerIndex >= profileViewerPosts.length) {
        profileViewerIndex = 0;
    }

    renderProfileViewerReel();
}

function showPreviousProfileViewerReel() {

    if (!profileViewerPosts.length) {
        return;
    }

    profileViewerIndex--;

    if (profileViewerIndex < 0) {
        profileViewerIndex = profileViewerPosts.length - 1;
    }

    renderProfileViewerReel();
}

function profileViewerKeyboardHandler(event) {

    if (!profileViewer) {
        return;
    }

    if (event.key === "ArrowDown") {
        event.preventDefault();
        showNextProfileViewerReel();
        return;
    }

    if (event.key === "ArrowUp") {
        event.preventDefault();
        showPreviousProfileViewerReel();
        return;
    }

    if (event.key === "Escape") {
        event.preventDefault();
        closeProfileReelViewer();
    }
}

function closeProfileReelViewer() {

    if (profileViewer) {
        profileViewer.remove();
        profileViewer = null;
    }

    document.removeEventListener("keydown", profileViewerKeyboardHandler);

    document.body.style.overflow = "";

    renderProfilePosts();
}


/* =========================================================
   POST VIEWER (normal posts)
========================================================= */

function openPostViewer(post) {

    if (!profilePostViewer || !profilePostViewerContent) {
        return;
    }

    const media = getPostMedia(post);
    const mediaType = getPostMediaType(post);

    const caption = post.caption || post.content || post.text || "";

    let mediaHTML = "";

    if (media) {

        mediaHTML = (
            mediaType === "reel" ||
            mediaType.startsWith("video")
        )
            ? `
                <video
                    src="${escapeHTML(media)}"
                    controls
                    autoplay
                    playsinline
                ></video>
              `
            : `
                <img
                    src="${escapeHTML(media)}"
                    alt="NEXA post"
                >
              `;
    }

    profilePostViewerContent.innerHTML = `

        <div class="profile-post-viewer-card">

            ${mediaHTML}

            <div
                class="profile-post-viewer-info"
                style="
                    margin-top:18px;
                    padding:18px;
                    border:1px solid rgba(212,175,55,0.18);
                    border-radius:18px;
                    background:rgba(15,15,15,0.92);
                "
            >

                <div
                    style="
                        color:#d4af37;
                        font-size:12px;
                        margin-bottom:8px;
                    "
                >
                    <i class="fa-solid fa-heart"></i>
                    ${formatEngagementCount(postLikeCount(post))} likes
                </div>

                ${caption
                    ? `
                        <p
                            style="
                                color:#d7d1c1;
                                font-size:13px;
                                line-height:1.7;
                            "
                        >
                            ${escapeHTML(caption)}
                        </p>
                      `
                    : ""
                }

            </div>

        </div>
    `;

    profilePostViewer.hidden = false;

    document.body.style.overflow = "hidden";
}

function closePostViewer() {

    if (profilePostViewer) {
        profilePostViewer.hidden = true;
    }

    if (profilePostViewerContent) {
        profilePostViewerContent.innerHTML = "";
    }

    document.body.style.overflow = "";
}


/* =========================================================
   STORIES
========================================================= */

async function loadProfileStories() {

    if (!profileUser) {
        return;
    }

    try {

        const { data, error } = await nexaSupabase
            .from("stories")
            .select("*")
            .eq("user_id", String(profileUser.id))
            .order("created_at", { ascending: false });

        if (error) {
            throw error;
        }

        profileStories = (data || []).map(story => ({

            id: story.id,
            userId: story.user_id,

            username:
                story.username ||
                profileUser.username ||
                profileUser.name ||
                "NEXA User",

            authorAvatar:
                story.author_avatar ||
                getProfilePicture(profileUser) ||
                "",

            media: story.media || "",
            mediaType: story.media_type || "image",
            createdAt: story.created_at,

            likes: Array.isArray(story.likes) ? story.likes : [],
            comments: Array.isArray(story.comments) ? story.comments : [],
            shares: Number(story.shares || 0)
        }));

        renderProfileStories();

    } catch (error) {

        console.error("NEXA profile stories error:", error);

        profileStories = [];

        renderProfileStories();
    }
}

function renderProfileStories() {

    if (profileStoriesLoading) {
        profileStoriesLoading.style.display = "none";
    }

    if (!profileStoriesElement) {
        return;
    }

    profileStoriesElement.innerHTML = "";

    if (!profileStories.length) {

        profileStoriesElement.innerHTML = `
            <div class="profile-stories-empty">
                <i class="fa-regular fa-clock"></i>
                <span>No stories yet.</span>
            </div>
        `;

        return;
    }

    profileStories.forEach(story => {

        const button = document.createElement("button");

        button.type = "button";
        button.className = "profile-story";

        const media = story.media || "";

        const isVideo = String(story.mediaType || "")
            .toLowerCase()
            .startsWith("video");

        const mediaHTML = isVideo
            ? `
                <video
                    src="${escapeHTML(media)}"
                    muted
                    playsinline
                    preload="metadata"
                ></video>
              `
            : `
                <img
                    src="${escapeHTML(media)}"
                    alt="Story"
                    loading="lazy"
                >
              `;

        button.innerHTML = `
            <div class="profile-story-ring">
                ${mediaHTML}
            </div>

            <span class="profile-story-name">
                ${escapeHTML(story.username || "Story")}
            </span>
        `;

        button.addEventListener("click", () => {
            openProfileStoryViewer(story);
        });

        profileStoriesElement.appendChild(button);
    });
}

function openProfileStoryViewer(story) {

    if (!story) {
        return;
    }

    const media = story.media || "";

    const isVideo = String(story.mediaType || "")
        .toLowerCase()
        .startsWith("video");

    const viewer = document.createElement("div");

    viewer.className = "profile-story-viewer";

    viewer.innerHTML = `

        <button type="button" class="profile-story-viewer-close">
            ×
        </button>

        <div class="profile-story-viewer-content">

            ${isVideo
                ? `
                    <video
                        src="${escapeHTML(media)}"
                        controls
                        autoplay
                        playsinline
                    ></video>
                  `
                : `
                    <img
                        src="${escapeHTML(media)}"
                        alt="Story"
                    >
                  `
            }

        </div>

        <div class="profile-story-viewer-actions">

            <button type="button" class="profile-story-like">
                ♥
                <span>${Array.isArray(story.likes) ? story.likes.length : 0}</span>
            </button>

            <button type="button" class="profile-story-comment">
                💬
                <span>${Array.isArray(story.comments) ? story.comments.length : 0}</span>
            </button>

            <button type="button" class="profile-story-share">
                ↗
                <span>${Number(story.shares || 0)}</span>
            </button>

        </div>
    `;

    document.body.appendChild(viewer);

    document.body.style.overflow = "hidden";

    function closeStoryViewer() {

        viewer.remove();

        document.removeEventListener("keydown", storyEscape);

        document.body.style.overflow = "";
    }

    function storyEscape(event) {
        if (event.key === "Escape") {
            closeStoryViewer();
        }
    }

    document.addEventListener("keydown", storyEscape);

    viewer
        .querySelector(".profile-story-viewer-close")
        ?.addEventListener("click", closeStoryViewer);
}


/* =========================================================
   EDIT PROFILE
========================================================= */

function openEditProfileModal() {

    if (!editProfileModal || !profileUser) {
        return;
    }

    if (editProfileName) {
        editProfileName.value = profileUser.name || "";
    }

    if (editProfileUsername) {
        editProfileUsername.value = profileUser.username || "";
    }

    if (editProfileBio) {
        editProfileBio.value = profileUser.bio || "";
    }

    renderEditProfilePicture(getProfilePicture(profileUser));

    editProfileModal.hidden = false;

    document.body.style.overflow = "hidden";
}

function renderEditProfilePicture(picture) {

    if (!editProfilePhotoPreview) {
        return;
    }

    if (picture) {

        editProfilePhotoPreview.innerHTML = `
            <img
                src="${escapeHTML(picture)}"
                alt="Profile preview"
            >
        `;

    } else {

        editProfilePhotoPreview.innerHTML = `
            <span>
                ${escapeHTML(
                    getDisplayName(profileUser)
                        .trim()
                        .charAt(0)
                        .toUpperCase() || "N"
                )}
            </span>
        `;
    }
}

function compressProfileImage(file) {

    return new Promise((resolve, reject) => {

        const reader = new FileReader();

        reader.onload = () => {

            const image = new Image();

            image.onload = () => {

                const maxSize = 700;

                let width = image.width;
                let height = image.height;

                if (width > height && width > maxSize) {

                    height = Math.round(height * (maxSize / width));
                    width = maxSize;

                } else if (height > maxSize) {

                    width = Math.round(width * (maxSize / height));
                    height = maxSize;
                }

                const canvas = document.createElement("canvas");

                canvas.width = width;
                canvas.height = height;

                canvas
                    .getContext("2d")
                    .drawImage(image, 0, 0, width, height);

                resolve(canvas.toDataURL("image/jpeg", 0.82));
            };

            image.onerror = reject;

            image.src = reader.result;
        };

        reader.onerror = reject;

        reader.readAsDataURL(file);
    });
}


/* =========================================================
   SAVE PROFILE
========================================================= */

async function saveProfile() {

    if (!profileUser || !isOwnProfile) {
        return;
    }

    const name = editProfileName
        ? editProfileName.value.trim()
        : "";

    const username = editProfileUsername
        ? editProfileUsername.value
            .trim()
            .replace(/^@/, "")
            .toLowerCase()
        : "";

    const bio = editProfileBio
        ? editProfileBio.value.trim()
        : "";

    if (!name) {
        alert("Please enter your name.");
        return;
    }

    if (saveProfileButton) {

        saveProfileButton.disabled = true;

        saveProfileButton.innerHTML = `
            <i class="fa-solid fa-spinner fa-spin"></i>
            Saving...
        `;
    }

    try {

        let profilePicture = getProfilePicture(profileUser);

        if (profilePictureInput?.files?.[0]) {
            profilePicture = await compressProfileImage(
                profilePictureInput.files[0]
            );
        }

        const { data, error } = await nexaSupabase
            .from("profiles")
            .update({
                name,
                username,
                bio,
                profile_picture: profilePicture
            })
            .eq("id", String(currentUser.id))
            .select(`
                id,
                name,
                username,
                profile_picture,
                bio,
                friends,
                created_at
            `)
            .single();

        if (error) {
            throw error;
        }

        profileUser = data;

        currentUser.name = data.name;
        currentUser.username = data.username;
        currentUser.profilePicture = data.profile_picture || "";
        currentUser.profile_picture = data.profile_picture || "";
        currentUser.bio = data.bio || "";
        currentUser.friends = getFriendIds(data);

        saveCurrentUser();

        renderProfileHeader();

        closeModal(editProfileModal);

        if (profilePictureInput) {
            profilePictureInput.value = "";
        }

        await loadFriendCount();
        await loadProfilePosts();

        window.dispatchEvent(
            new CustomEvent("nexaProfileUpdated", { detail: data })
        );

    } catch (error) {

        console.error("NEXA profile save error:", error);

        alert("Could not save your profile.");

    } finally {

        if (saveProfileButton) {

            saveProfileButton.disabled = false;

            saveProfileButton.innerHTML = `
                <i class="fa-solid fa-check"></i>
                Save Profile
            `;
        }
    }
}


/* =========================================================
   WHAT'S NEW (STATUS)
========================================================= */

function getStatusStorageKey() {

    return (
        "nexaProfileStatus_" +
        String(profileUser?.id || currentUser.id)
    );
}

function getSavedStatus() {

    try {

        const raw = localStorage.getItem(getStatusStorageKey());

        if (!raw) {
            return null;
        }

        const status = JSON.parse(raw);

        if (!status || !status.expiresAt) {
            return null;
        }

        if (Date.now() >= Number(status.expiresAt)) {
            localStorage.removeItem(getStatusStorageKey());
            return null;
        }

        return status;

    } catch (_) {

        return null;
    }
}

function renderStatus() {

    if (!profileStatusPreview) {
        return;
    }

    profileStatusPreview.textContent =
        getSavedStatus()?.text || "Share an update";
}

function updateStatusCharacters() {

    if (!profileStatusCharacters || !profileStatusInput) {
        return;
    }

    profileStatusCharacters.textContent =
        profileStatusInput.value.length + " / 180";
}

function openStatusModal() {

    if (!profileStatusModal) {
        return;
    }

    /* Only the owner can post an update. */

    if (!isOwnProfile) {
        return;
    }

    if (profileStatusInput) {
        profileStatusInput.value = getSavedStatus()?.text || "";
    }

    updateStatusCharacters();

    profileStatusModal.hidden = false;

    document.body.style.overflow = "hidden";

    setTimeout(() => {
        profileStatusInput?.focus();
    }, 50);
}

function saveStatus() {

    if (!isOwnProfile || !profileStatusInput) {
        return;
    }

    const text = profileStatusInput.value.trim();

    if (!text) {

        localStorage.removeItem(getStatusStorageKey());

        renderStatus();

        closeModal(profileStatusModal);

        return;
    }

    const status = {
        text,
        createdAt: new Date().toISOString(),
        expiresAt: Date.now() + 24 * 60 * 60 * 1000
    };

    localStorage.setItem(
        getStatusStorageKey(),
        JSON.stringify(status)
    );

    renderStatus();

    closeModal(profileStatusModal);

    window.dispatchEvent(
        new CustomEvent("nexaStatusUpdated", { detail: status })
    );
}


/* =========================================================
   ADD FRIEND
========================================================= */

async function addFriendFromProfile() {

    if (!profileUser || isOwnProfile) {
        return;
    }

    try {

        const friendId = String(profileUser.id);

        /* Always start from the latest friends list in the database. */

        const { data: me, error: meError } = await nexaSupabase
            .from("profiles")
            .select("friends")
            .eq("id", String(currentUser.id))
            .maybeSingle();

        if (meError) {
            throw meError;
        }

        const currentIds = getFriendIds(me || currentUser);

        if (currentIds.includes(friendId)) {
            alert("You are already friends.");
            return;
        }

        currentIds.push(friendId);

        const { data, error } = await nexaSupabase
            .from("profiles")
            .update({ friends: currentIds })
            .eq("id", String(currentUser.id))
            .select("id, friends")
            .single();

        if (error) {
            throw error;
        }

        currentUser.friends = currentIds;

        saveCurrentUser();

        if (addFriendProfileButton) {

            addFriendProfileButton.innerHTML = `
                <i class="fa-solid fa-check"></i>
                <span>Friends</span>
            `;

            addFriendProfileButton.disabled = true;
        }

        window.dispatchEvent(
            new CustomEvent("nexaFriendsUpdated", { detail: data })
        );

    } catch (error) {

        console.error("NEXA add friend error:", error);

        alert("Could not add this friend.");
    }
}


/* =========================================================
   MESSAGE PROFILE
========================================================= */

function messageProfile() {

    if (!profileUser || isOwnProfile) {
        return;
    }

    window.location.href =
        "messages.html?user=" +
        encodeURIComponent(String(profileUser.id));
}


/* =========================================================
   MODAL HELPERS
========================================================= */

function closeModal(modal) {

    if (!modal) {
        return;
    }

    modal.hidden = true;

    /* Only unlock the page when nothing else is open. */

    const editOpen = editProfileModal && !editProfileModal.hidden;
    const statusOpen = profileStatusModal && !profileStatusModal.hidden;
    const viewerOpen = profilePostViewer && !profilePostViewer.hidden;
    const reelOpen = !!profileViewer;

    if (!editOpen && !statusOpen && !viewerOpen && !reelOpen) {
        document.body.style.overflow = "";
    }
}

document.addEventListener("click", event => {

    const closeTarget = event.target.closest("[data-close-modal]");

    if (!closeTarget) {
        return;
    }

    const modalId = closeTarget.dataset.closeModal;

    if (modalId === "editProfileModal") {
        closeModal(editProfileModal);
    }

    if (modalId === "profileStatusModal") {
        closeModal(profileStatusModal);
    }
});


/* =========================================================
   REEL ACTIONS: LIKE / SHARE / COMMENT
========================================================= */

async function toggleProfileReelLike(postId) {

    const post = profilePosts.find(
        item => String(item.id) === String(postId)
    );

    if (!post) {
        return false;
    }

    const userId = String(currentUser.id);

    try {

        const { data: existing, error: checkError } = await nexaSupabase
            .from("likes")
            .select("id")
            .eq("post_id", post.id)
            .eq("user_id", userId)
            .maybeSingle();

        if (checkError) {
            throw checkError;
        }

        if (!Array.isArray(post.likes)) {
            post.likes = [];
        }

        let liked;

        if (existing) {

            const { error } = await nexaSupabase
                .from("likes")
                .delete()
                .eq("id", existing.id);

            if (error) {
                throw error;
            }

            liked = false;

            post.likes = post.likes.filter(
                id => String(id) !== userId
            );

        } else {

            const { error } = await nexaSupabase
                .from("likes")
                .insert({
                    post_id: post.id,
                    user_id: userId
                });

            if (error) {
                throw error;
            }

            liked = true;

            if (!post.likes.some(id => String(id) === userId)) {
                post.likes.push(userId);
            }
        }

        refreshTotalLikes();

        /* Refresh the grid when the fullscreen viewer is not open.
           (When it is open, the viewer re-renders itself.) */

        if (!profileViewer) {
            renderProfilePosts();
        }

        return liked;

    } catch (error) {

        console.error("NEXA profile Reel like error:", error);

        return false;
    }
}

async function shareProfileReel(postId) {

    const post = profilePosts.find(
        item => String(item.id) === String(postId)
    );

    if (!post) {
        return;
    }

    try {

        if (navigator.share) {

            await navigator.share({
                title: "NEXA Reel",
                text: post.text || "Check out this Reel on NEXA.",
                url: window.location.href
            });

        } else if (navigator.clipboard) {

            await navigator.clipboard.writeText(window.location.href);
        }

        const newShares = Number(post.shares || 0) + 1;

        const { data, error } = await nexaSupabase
            .from("posts")
            .update({ shares: newShares })
            .eq("id", post.id)
            .select("shares")
            .single();

        if (error) {
            throw error;
        }

        post.shares = Number(data.shares || 0);

        if (!profileViewer) {
            renderProfilePosts();
        }

    } catch (error) {

        /* The user closing the share sheet throws AbortError — ignore it. */

        if (error?.name !== "AbortError") {
            console.error("NEXA profile reel share error:", error);
        }
    }
}

async function openProfileReelComments(postId) {

    const post = profilePosts.find(
        item => String(item.id) === String(postId)
    );

    if (!post) {
        return;
    }

    const text = prompt("Write a comment:");

    if (!text?.trim()) {
        return;
    }

    const comments = Array.isArray(post.comments)
        ? [...post.comments]
        : [];

    comments.push({
        id: Date.now(),
        userId: String(currentUser.id),
        username: currentUser.username || currentUser.name || "NEXA User",
        text: text.trim(),
        createdAt: new Date().toISOString()
    });

    const { data, error } = await nexaSupabase
        .from("posts")
        .update({ comments })
        .eq("id", post.id)
        .select("comments")
        .single();

    if (error) {

        console.error("NEXA profile reel comment error:", error);

        return;
    }

    post.comments = Array.isArray(data.comments)
        ? data.comments
        : comments;

    if (!profileViewer) {
        renderProfilePosts();
    }
}

if (profilePostsGrid) {

    profilePostsGrid.addEventListener("click", async event => {

        const button = event.target.closest("[data-profile-action]");

        if (!button) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        const action = button.dataset.profileAction;
        const postId = button.dataset.id;

        if (action === "like") {
            await toggleProfileReelLike(postId);
            return;
        }

        if (action === "comment") {
            await openProfileReelComments(postId);
            return;
        }

        if (action === "share") {
            await shareProfileReel(postId);
        }
    });
}


/* =========================================================
   PROFILE POSTS SCROLLING
========================================================= */

function initializeProfileReelScrolling() {

    if (!profilePostsGrid) {
        return;
    }

    profilePostsGrid.style.overflowY = "auto";
    profilePostsGrid.style.overflowX = "hidden";
    profilePostsGrid.style.webkitOverflowScrolling = "touch";
    profilePostsGrid.style.touchAction = "pan-y";

    profilePostsGrid.addEventListener("dragstart", event => {
        event.preventDefault();
    });

    profilePostsGrid.setAttribute("tabindex", "0");

    /* Keyboard: arrow keys / page keys jump between posts. */

    profilePostsGrid.addEventListener("keydown", event => {

        const keys = ["ArrowDown", "ArrowUp", "PageDown", "PageUp"];

        if (!keys.includes(event.key)) {
            return;
        }

        const posts = Array.from(profilePostsGrid.children);

        if (!posts.length) {
            return;
        }

        event.preventDefault();

        const scrollTop = profilePostsGrid.scrollTop;

        let closestIndex = 0;
        let closestDistance = Infinity;

        posts.forEach((post, index) => {

            const distance = Math.abs(post.offsetTop - scrollTop);

            if (distance < closestDistance) {
                closestDistance = distance;
                closestIndex = index;
            }
        });

        const goingDown =
            event.key === "ArrowDown" || event.key === "PageDown";

        const nextIndex = goingDown
            ? Math.min(posts.length - 1, closestIndex + 1)
            : Math.max(0, closestIndex - 1);

        posts[nextIndex]?.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });
    });
}


/* =========================================================
   BUTTONS + INPUT EVENTS
========================================================= */

profilePictureInput?.addEventListener("change", async event => {

    const file = event.target.files?.[0];

    if (!file) {
        return;
    }

    if (!file.type.startsWith("image/")) {

        alert("Please choose an image.");

        profilePictureInput.value = "";

        return;
    }

    try {

        renderEditProfilePicture(await compressProfileImage(file));

    } catch (error) {

        console.error("NEXA profile preview error:", error);
    }
});

profileStatusInput?.addEventListener("input", updateStatusCharacters);

editProfileButton?.addEventListener("click", openEditProfileModal);
saveProfileButton?.addEventListener("click", saveProfile);
addFriendProfileButton?.addEventListener("click", addFriendFromProfile);
messageProfileButton?.addEventListener("click", messageProfile);
profileStatusCloud?.addEventListener("click", openStatusModal);
saveProfileStatusButton?.addEventListener("click", saveStatus);
closeProfilePostViewer?.addEventListener("click", closePostViewer);

profileBackButton?.addEventListener("click", () => {

    if (window.history.length > 1) {
        window.history.back();
    } else {
        window.location.href = "home.html";
    }
});

profileMenuButton?.addEventListener("click", () => {

    if (isOwnProfile) {
        openEditProfileModal();
    } else {
        alert("Profile options are coming soon.");
    }
});

/* Escape closes the post viewer and modals. */

document.addEventListener("keydown", event => {

    if (event.key !== "Escape" || profileViewer) {
        return;
    }

    if (profilePostViewer && !profilePostViewer.hidden) {
        closePostViewer();
        return;
    }

    if (editProfileModal && !editProfileModal.hidden) {
        closeModal(editProfileModal);
        return;
    }

    if (profileStatusModal && !profileStatusModal.hidden) {
        closeModal(profileStatusModal);
    }
});

/* Profile data refresh event */

window.addEventListener("nexaProfileUpdated", event => {

    if (!event.detail) {
        return;
    }

    if (String(event.detail.id) === String(profileUser?.id)) {

        profileUser = { ...profileUser, ...event.detail };

        renderProfileHeader();
    }
});


/* =========================================================
   PAGE INITIALIZATION
========================================================= */

async function initializeProfile() {

    showLoading(true);

    try {

        await loadProfile();

        await Promise.all([
            loadFriendCount(),
            loadProfilePosts(),
            loadProfileStories()
        ]);

        renderStatus();

        initializeProfileReelScrolling();

    } catch (error) {

        console.error("NEXA profile initialization error:", error);

    } finally {

        showLoading(false);
    }
}

initializeProfile();
