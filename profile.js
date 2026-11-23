/* =========================================================
   NEXA PROFILE
   Organized profile: header, stories row, posts grid.
   Click a post -> focused viewer you can scroll through,
   with like / comment / share / download / use sound.
   Changing your profile picture never creates a post.
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
let isFriend = false;
let allPosts = [];
let profilePosts = [];
let profileStories = [];
let activeFilter = "all";

let viewerPosts = [];
let viewerCurrentId = null;
let viewerObserver = null;
let pendingAvatarDataUrl = null;


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
const profilePostsViewButton = $("profilePostsViewButton");
const profileFilters = $("profileFilters");
const editProfileButton = $("editProfileButton");
const addFriendProfileButton = $("addFriendProfileButton");
const messageProfileButton = $("messageProfileButton");
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

const postViewer = $("postViewer");
const postViewerScroller = $("postViewerScroller");
const postViewerClose = $("postViewerClose");
const pvComments = $("pvComments");
const pvCommentsList = $("pvCommentsList");
const pvCommentsForm = $("pvCommentsForm");
const pvCommentInput = $("pvCommentInput");
const pvCommentsClose = $("pvCommentsClose");


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

function saveCurrentUser() {
    localStorage.setItem("nexaCurrentUser", JSON.stringify(currentUser));
}

function toast(message) {
    let container = document.getElementById("nexaToast");
    if (!container) {
        container = document.createElement("div");
        container.id = "nexaToast";
        Object.assign(container.style, {
            position: "fixed",
            bottom: "24px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(15, 23, 42, 0.92)",
            color: "#fff",
            padding: "10px 18px",
            borderRadius: "999px",
            fontSize: "14px",
            zIndex: "99999",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(56, 189, 248, 0.35)",
            transition: "opacity 0.25s ease",
            pointerEvents: "none"
        });
        document.body.appendChild(container);
    }

    container.textContent = message;
    container.style.opacity = "1";

    clearTimeout(container._timer);
    container._timer = setTimeout(() => {
        container.style.opacity = "0";
    }, 2600);
}

function unlockPageIfNothingOpen() {
    const viewerOpen = postViewer && !postViewer.hidden;
    const editOpen = editProfileModal && !editProfileModal.hidden;
    const statusOpen = profileStatusModal && !profileStatusModal.hidden;

    if (!viewerOpen && !editOpen && !statusOpen) {
        document.body.style.overflow = "";
    }
}

function formatCount(number) {
    const value = Number(number || 0);

    if (value >= 1000000) {
        return (value / 1000000).toFixed(value % 1000000 === 0 ? 0 : 1) + "M";
    }

    if (value >= 1000) {
        return (value / 1000).toFixed(value % 1000 === 0 ? 0 : 1) + "K";
    }

    return String(value);
}

function timeAgo(timestamp) {
    if (!timestamp) {
        return "Just now";
    }

    const date = new Date(timestamp);

    if (Number.isNaN(date.getTime())) {
        return "Just now";
    }

    const seconds = Math.floor(Math.max(0, Date.now() - date.getTime()) / 1000);

    if (seconds < 60) {
        return "Just now";
    }

    const minutes = Math.floor(seconds / 60);

    if (minutes < 60) {
        return minutes + "m";
    }

    const hours = Math.floor(minutes / 60);

    if (hours < 24) {
        return hours + "h";
    }

    const days = Math.floor(hours / 24);

    if (days < 7) {
        return days + "d";
    }

    return date.toLocaleDateString([], { month: "short", day: "numeric" });
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

/* returns: "reel", "video", "photo" or "text" */
function getPostKind(post) {
    const media = String(getPostMedia(post));

    if (!media) {
        return "text";
    }

    const explicit = String(post?.media_type || post?.mediaType || "").toLowerCase();

    if (explicit === "reel") {
        return "reel";
    }

    if (explicit.startsWith("video") || explicit === "video") {
        return "video";
    }

    if (media.startsWith("data:video/") || /\.(mp4|webm|ogg|mov)(\?|$)/i.test(media)) {
        return "video";
    }

    return "photo";
}

function isVideoKind(kind) {
    return kind === "reel" || kind === "video";
}

/* A profile-picture change must never show up as a post. */
function isProfilePictureOnlyPost(post) {
    const type = String(post?.media_type || post?.mediaType || "").toLowerCase();

    const avatarTypes = [
        "profile", "avatar", "profile_picture", "profile-picture",
        "profilepicture", "profile_photo", "profile-photo"
    ];

    if (avatarTypes.includes(type) || post?.is_profile_picture === true) {
        return true;
    }

    const media = getPostMedia(post);
    const picture = getProfilePicture(profileUser);

    return Boolean(media) && Boolean(picture) && String(media) === String(picture);
}

function likeCount(post) {
    return (Array.isArray(post.likes) ? post.likes.length : 0) + Number(post.demo_likes || 0);
}

function commentCount(post) {
    return (Array.isArray(post.comments) ? post.comments.length : 0) + Number(post.demo_comments || 0);
}

function shareCount(post) {
    return Number(post.shares || 0) + Number(post.demo_shares || 0);
}

function isLikedByMe(post) {
    return Array.isArray(post.likes) && post.likes.some(id => String(id) === String(currentUser.id));
}

function findPost(id) {
    return allPosts.find(post => String(post.id) === String(id));
}


/* =========================================================
   LOAD PROFILE
========================================================= */

function getRequestedProfileId() {
    const params = new URLSearchParams(window.location.search);
    return params.get("user") || params.get("id") || String(currentUser.id);
}

async function loadProfile() {
    const requestedId = getRequestedProfileId();
    isOwnProfile = String(requestedId) === String(currentUser.id);

    try {
        const { data, error } = await nexaSupabase
            .from("profiles")
            .select("id, name, username, profile_picture, bio, status, created_at")
            .eq("id", String(requestedId))
            .maybeSingle();

        if (error) {
            throw error;
        }

        if (!data) {
            throw new Error("Profile not found.");
        }

        profileUser = data;

        if (isOwnProfile) {
            currentUser.name = data.name ?? currentUser.name;
            currentUser.username = data.username ?? currentUser.username;
            currentUser.profilePicture = data.profile_picture || "";
            currentUser.profile_picture = data.profile_picture || "";
            currentUser.bio = data.bio ?? currentUser.bio;
            currentUser.status = data.status ?? currentUser.status;

            saveCurrentUser();
        }

        renderProfileHeader();
    } catch (error) {
        console.error("NEXA profile loading error:", error);

        if (profileName) {
            profileName.textContent = "Could not load this profile.";
        }

        if (profileUsername) {
            profileUsername.textContent = "";
        }

        if (profileBio) {
            profileBio.textContent = "";
        }
    }
}

function renderProfileHeader() {
    if (!profileUser) {
        return;
    }

    const name = getDisplayName(profileUser);
    const picture = getProfilePicture(profileUser);

    if (profileUsernameTitle) {
        profileUsernameTitle.textContent = profileUser.username ? "@" + profileUser.username : name;
    }

    if (profileName) {
        profileName.textContent = name;
    }

    if (profileUsername) {
        profileUsername.textContent = profileUser.username ? "@" + profileUser.username : "@nexa";
    }

    if (profileBio) {
        profileBio.textContent = profileUser.bio || "Welcome to NEXA.";
    }

    if (profileStatusPreview) {
        const statusText = profileUser.status || "";
        if (statusText) {
            profileStatusPreview.textContent = statusText;
            if (profileStatusCloud) profileStatusCloud.hidden = false;
        } else if (isOwnProfile) {
            profileStatusPreview.textContent = "+ Set a status...";
            if (profileStatusCloud) profileStatusCloud.hidden = false;
        } else if (profileStatusCloud) {
            profileStatusCloud.hidden = true;
        }
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
        profilePhotoFallback.textContent = name.trim().charAt(0).toUpperCase() || "N";
        profilePhotoFallback.style.display = picture ? "none" : "flex";
    }

    if (editProfileButton) {
        editProfileButton.hidden = !isOwnProfile;
    }

    if (messageProfileButton) {
        messageProfileButton.hidden = isOwnProfile;
    }

    renderFriendButton();
}

function renderFriendButton() {
    if (!addFriendProfileButton) {
        return;
    }

    addFriendProfileButton.hidden = isOwnProfile;

    if (isOwnProfile) {
        return;
    }

    addFriendProfileButton.disabled = isFriend;

    addFriendProfileButton.innerHTML = isFriend
        ? `<i class="fa-solid fa-check"></i><span>Friends</span>`
        : `<i class="fa-solid fa-user-plus"></i><span>Add Friend</span>`;
}


/* =========================================================
   FRIENDS (nexa_friends table — same as People + Messages)
========================================================= */

async function loadFriendInfo() {
    if (!profileUser) {
        return;
    }

    try {
        const { count, error } = await nexaSupabase
            .from("nexa_friends")
            .select("user_id", { count: "exact", head: true })
            .eq("user_id", String(profileUser.id));

        if (error) {
            throw error;
        }

        if (profileFriendsCount) {
            profileFriendsCount.textContent = String(count || 0);
        }

        if (!isOwnProfile) {
            const { data, error: friendError } = await nexaSupabase
                .from("nexa_friends")
                .select("user_id")
                .eq("user_id", String(currentUser.id))
                .eq("friend_id", String(profileUser.id))
                .limit(1);

            if (friendError) {
                throw friendError;
            }

            isFriend = Array.isArray(data) && data.length > 0;
            renderFriendButton();
        }
    } catch (error) {
        console.error("NEXA profile friends error:", error);
    }
}

async function addFriendFromProfile() {
    if (!profileUser || isOwnProfile || isFriend) {
        return;
    }

    const me = String(currentUser.id);
    const other = String(profileUser.id);

    try {
        const { error } = await nexaSupabase
            .from("nexa_friends")
            .insert({ user_id: me, friend_id: other });

        /* 23505 = already friends */
        if (error && error.code !== "23505") {
            throw error;
        }

        /* two-way friendship; ignore if it already exists or is not allowed */
        try {
            await nexaSupabase
                .from("nexa_friends")
                .insert({ user_id: other, friend_id: me });
        } catch (_) { }

        isFriend = true;
        renderFriendButton();
        await loadFriendInfo();
        toast("Friend added!");
    } catch (error) {
        console.error("NEXA add friend error:", error);
        toast("Could not add this friend.");
    }
}

function messageProfile() {
    if (!profileUser || isOwnProfile) {
        return;
    }

    window.location.href = "messages.html?user=" + encodeURIComponent(String(profileUser.id));
}


/* =========================================================
   STORIES ROW
========================================================= */

async function loadProfileStories() {
    if (!profileUser || !profileStoriesElement) {
        return;
    }

    try {
        const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

        const { data, error } = await nexaSupabase
            .from("stories")
            .select("*")
            .eq("author_id", String(profileUser.id))
            .gte("created_at", cutoff)
            .order("created_at", { ascending: false });

        if (error) {
            throw error;
        }

        profileStories = Array.isArray(data) ? data : [];
    } catch (_) {
        profileStories = [];
    }

    if (profileStoriesLoading) {
        profileStoriesLoading.style.display = "none";
    }

    if (!profileStories.length) {
        profileStoriesElement.innerHTML = "";
        return;
    }

    profileStoriesElement.innerHTML = profileStories.map(story => {
        const thumb = story.media || story.image_url || getProfilePicture(profileUser);
        const label = story.caption || timeAgo(story.created_at);

        return `
            <button type="button" class="profile-story-item" data-story-id="${escapeHTML(story.id)}">
                <span class="profile-story-ring">
                    ${thumb
                        ? `<img src="${escapeHTML(thumb)}" alt="Story">`
                        : `<span>${escapeHTML(getDisplayName(profileUser).charAt(0).toUpperCase())}</span>`}
                </span>
                <small>${escapeHTML(label)}</small>
            </button>
        `;
    }).join("");
}


/* =========================================================
   LOAD POSTS + LIKES + COMMENTS
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

        allPosts = (Array.isArray(data) ? data : []).filter(
            post => !isProfilePictureOnlyPost(post)
        );

        await Promise.all([loadLikes(), loadComments()]);
    } catch (error) {
        console.error("NEXA profile posts error:", error);
        allPosts = [];
    }

    if (profilePostsCount) {
        profilePostsCount.textContent = String(allPosts.length);
    }

    refreshTotalLikes();
    renderPosts();
}

async function loadLikes() {
    const likesByPost = {};

    try {
        const ids = allPosts.map(post => post.id).filter(Boolean);

        if (ids.length) {
            const { data, error } = await nexaSupabase
                .from("likes")
                .select("post_id, user_id")
                .in("post_id", ids);

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
    } catch (error) {
        console.error("NEXA profile likes error:", error);
    }

    allPosts.forEach(post => {
        post.likes = likesByPost[String(post.id)] || [];
    });
}

async function loadComments() {
    const commentsByPost = {};

    try {
        const ids = allPosts.map(post => post.id).filter(Boolean);

        if (ids.length) {
            const { data, error } = await nexaSupabase
                .from("comments")
                .select("*")
                .in("post_id", ids)
                .order("created_at", { ascending: true });

            if (error) {
                throw error;
            }

            (data || []).forEach(row => {
                const key = String(row.post_id);
                if (!commentsByPost[key]) {
                    commentsByPost[key] = [];
                }
                commentsByPost[key].push(row);
            });
        }
    } catch (error) {
        console.error("NEXA profile comments error:", error);
    }

    allPosts.forEach(post => {
        post.comments = commentsByPost[String(post.id)] || (Array.isArray(post.comments) ? post.comments : []);
    });
}

function refreshTotalLikes() {
    const total = allPosts.reduce((sum, post) => sum + likeCount(post), 0);

    if (profileLikesCountElement) {
        profileLikesCountElement.textContent = formatCount(total);
    }
}


/* =========================================================
   POSTS GRID (clean, uniform tiles)
========================================================= */

function applyFilter() {
    profilePosts = allPosts.filter(post => {
        const kind = getPostKind(post);

        if (activeFilter === "all") return true;
        if (activeFilter === "photo") return kind === "photo";
        if (activeFilter === "video") return kind === "video";
        if (activeFilter === "reel") return kind === "reel";

        return true;
    });
}

function renderPosts() {
    applyFilter();

    if (profilePostsLoading) {
        profilePostsLoading.style.display = "none";
    }

    if (!profilePostsGrid) return;

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

    profilePostsGrid.style.display = "";

    profilePosts.forEach(post => {
        const kind = getPostKind(post);
        const media = getPostMedia(post);
        const tile = document.createElement("article");

        tile.className = "profile-post";
        tile.dataset.postId = String(post.id);
        tile.tabIndex = 0;
        tile.setAttribute("role", "button");
        tile.setAttribute("aria-label", "Open post");

        let mediaHTML = "";
        let badge = "";

        if (kind === "photo") {
            mediaHTML = `<img src="${escapeHTML(media)}" alt="NEXA post" loading="lazy">`;
        } else if (isVideoKind(kind)) {
            mediaHTML = `<video src="${escapeHTML(media)}#t=0.1"
                muted playsinline preload="metadata"></video>`;

            badge = `
                <span class="profile-post-badge">
                    <i class="fa-solid ${kind === "reel" ? "fa-clapperboard" : "fa-play"}"></i>
                </span>`;
        } else {
            mediaHTML = `<span class="profile-post-text">${escapeHTML(post.text || "")}</span>`;
        }

        const menuHTML = isOwnProfile ? `
            <div class="profile-post-menu">
                <button type="button"
                        class="profile-post-menu-trigger"
                        data-post-menu-trigger
                        aria-label="Post options"
                        aria-expanded="false">
                    <i class="fa-solid fa-ellipsis-vertical"></i>
                </button>

                <div class="profile-post-menu-panel" data-post-menu-panel hidden>
                    <button type="button" data-post-act="download">
                        <i class="fa-solid fa-download"></i> Download
                    </button>
                    <button type="button" data-post-act="share">
                        <i class="fa-solid fa-share"></i> Share
                    </button>
                    <button type="button" class="danger" data-post-act="delete">
                        <i class="fa-solid fa-trash"></i> Delete
                    </button>
                </div>
            </div>` : "";

        tile.innerHTML = `
            ${mediaHTML}
            ${badge}
            <span class="profile-post-overlay">
                <span><i class="fa-solid fa-heart"></i> ${formatCount(likeCount(post))}</span>
                <span><i class="fa-regular fa-comment"></i> ${formatCount(commentCount(post))}</span>
            </span>
            ${menuHTML}
        `;

        profilePostsGrid.appendChild(tile);
    });
}

profilePostsGrid?.addEventListener("click", async event => {
    const tile = event.target.closest(".profile-post");
    if (!tile) return;

    const post = findPost(tile.dataset.postId);
    if (!post) return;

    const trigger = event.target.closest("[data-post-menu-trigger]");
    if (trigger) {
        event.stopPropagation();

        const panel = tile.querySelector("[data-post-menu-panel]");
        const opening = panel.hidden;

        profilePostsGrid.querySelectorAll("[data-post-menu-panel]").forEach(item => {
            item.hidden = true;
        });

        profilePostsGrid.querySelectorAll("[data-post-menu-trigger]").forEach(item => {
            item.setAttribute("aria-expanded", "false");
        });

        panel.hidden = !opening;
        trigger.setAttribute("aria-expanded", String(opening));
        return;
    }

    const action = event.target.closest("[data-post-act]");
    if (action) {
        event.stopPropagation();

        if (action.dataset.postAct === "download") {
            await downloadPost(post);
        } else if (action.dataset.postAct === "share") {
            await sharePost(post);
        } else if (action.dataset.postAct === "delete") {
            await deleteOwnPost(post);
        }

        return;
    }

    openViewer(post.id);
});

profilePostsGrid?.addEventListener("keydown", event => {
    if (!["Enter", " "].includes(event.key)) return;
    if (event.target.closest("button")) return;

    const tile = event.target.closest(".profile-post");
    if (!tile) return;

    event.preventDefault();
    openViewer(tile.dataset.postId);
});

document.addEventListener("click", event => {
    if (!event.target.closest(".profile-post-menu")) {
        profilePostsGrid?.querySelectorAll("[data-post-menu-panel]").forEach(item => {
            item.hidden = true;
        });
        profilePostsGrid?.querySelectorAll("[data-post-menu-trigger]").forEach(item => {
            item.setAttribute("aria-expanded", "false");
        });
    }
});

async function deleteOwnPost(post) {
    if (!isOwnProfile || String(profileUser?.id) !== String(currentUser.id)) {
        return;
    }

    if (!confirm("Delete this post? This cannot be undone.")) {
        return;
    }

    try {
        const { error } = await nexaSupabase
            .from("posts")
            .delete()
            .eq("id", post.id)
            .eq("author_id", String(currentUser.id));

        if (error) throw error;

        allPosts = allPosts.filter(item => String(item.id) !== String(post.id));
        profilePosts = profilePosts.filter(item => String(item.id) !== String(post.id));

        if (profilePostsCount) {
            profilePostsCount.textContent = String(allPosts.length);
        }

        refreshTotalLikes();
        renderPosts();
        toast("Post deleted.");
    } catch (error) {
        console.error("NEXA post delete error:", error);
        toast("Could not delete this post.");
    }
}


/* =========================================================
   POST VIEWER
   Everything else dims; scroll down for the next post.
========================================================= */

function slideHTML(post) {
    const kind = getPostKind(post);
    const media = getPostMedia(post);
    const name = post.author_name || getDisplayName(profileUser);
    const picture = getProfilePicture(profileUser);
    const liked = isLikedByMe(post);

    let mediaHTML;

    if (isVideoKind(kind)) {
        mediaHTML = `<video src="${escapeHTML(media)}" loop playsinline preload="metadata"></video>`;
    } else if (kind === "photo") {
        mediaHTML = `<img src="${escapeHTML(media)}" alt="NEXA post">`;
    } else {
        mediaHTML = `<div class="pv-text">${escapeHTML(post.text || "")}</div>`;
    }

    const avatar = picture
        ? `<img src="${escapeHTML(picture)}" alt="${escapeHTML(name)}">`
        : escapeHTML(name.trim().charAt(0).toUpperCase() || "N");

    const caption = kind !== "text" && post.text
        ? `<p>${escapeHTML(post.text)}</p>`
        : "";

    return `
        <section class="pv-slide" data-id="${escapeHTML(post.id)}">

            <div class="pv-stage">

                <div class="pv-media" data-kind="${kind}">${mediaHTML}</div>

                <div class="pv-progress"><span></span></div>

                <div class="pv-gradient"></div>

                <div class="pv-info">
                    <div class="pv-user">
                        <div class="pv-avatar">${avatar}</div>
                        <div>
                            <strong>${escapeHTML(name)}</strong>
                            <span>${escapeHTML(timeAgo(post.created_at))}</span>
                        </div>
                    </div>
                    ${caption}
                </div>

                <div class="pv-actions">

                    <button type="button" class="pv-action ${liked ? "liked" : ""}" data-act="like" aria-label="Like">
                        <span class="pv-action-icon"><i class="${liked ? "fa-solid" : "fa-regular"} fa-heart"></i></span>
                        <small data-count="like">${formatCount(likeCount(post))}</small>
                    </button>

                    <button type="button" class="pv-action" data-act="comment" aria-label="Comment">
                        <span class="pv-action-icon"><i class="fa-regular fa-comment"></i></span>
                        <small data-count="comment">${formatCount(commentCount(post))}</small>
                    </button>

                    <button type="button" class="pv-action" data-act="share" aria-label="Share">
                        <span class="pv-action-icon"><i class="fa-solid fa-share"></i></span>
                        <small data-count="share">${formatCount(shareCount(post))}</small>
                    </button>

                    <button type="button" class="pv-action" data-act="download" aria-label="Download">
                        <span class="pv-action-icon"><i class="fa-solid fa-download"></i></span>
                        <small>Save</small>
                    </button>

                    ${isVideoKind(kind) ? `
                    <button type="button" class="pv-action" data-act="use-sound" aria-label="Use sound">
                        <span class="pv-action-icon"><i class="fa-solid fa-music"></i></span>
                        <small>Use sound</small>
                    </button>
                    ` : ""}

                </div>

            </div>

        </section>
    `;
}

function playVideo(video) {
    video.muted = false;
    video.volume = 1;

    const attempt = video.play();

    if (attempt && attempt.catch) {
        attempt.catch(() => {
            /* sound blocked by the browser: play silently instead of freezing */
            video.muted = true;
            video.play().catch(() => { });
        });
    }
}

function openViewer(postId) {
    viewerPosts = profilePosts.slice();

    const startIndex = viewerPosts.findIndex(post => String(post.id) === String(postId));

    if (startIndex < 0 || !postViewer || !postViewerScroller) {
        return;
    }

    postViewerScroller.innerHTML = viewerPosts.map(slideHTML).join("");

    postViewer.hidden = false;
    postViewer.setAttribute("aria-hidden", "false");

    document.body.style.overflow = "hidden";

    /* live blue progress bar on every video */
    postViewerScroller.querySelectorAll(".pv-slide").forEach(slide => {
        const video = slide.querySelector("video");
        const bar = slide.querySelector(".pv-progress span");

        if (!video || !bar) {
            return;
        }

        video.addEventListener("timeupdate", () => {
            const duration = video.duration;

            bar.style.width =
                duration && isFinite(duration)
                    ? Math.min(100, (video.currentTime / duration) * 100) + "%"
                    : "0%";
        });
    });

    /* jump to the clicked post */
    postViewerScroller.scrollTop = startIndex * postViewerScroller.clientHeight;
    viewerCurrentId = String(viewerPosts[startIndex].id);

    watchSlides();
}

function watchSlides() {
    if (viewerObserver) {
        viewerObserver.disconnect();
    }

    viewerObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            const slide = entry.target;
            const video = slide.querySelector("video");

            if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
                viewerCurrentId = slide.dataset.id;

                if (pvComments && !pvComments.hidden) {
                    renderComments();
                }

                if (video) {
                    playVideo(video);
                }
            } else if (video) {
                video.pause();
            }
        });
    }, { root: postViewerScroller, threshold: [0, 0.6, 1] });

    postViewerScroller
        .querySelectorAll(".pv-slide")
        .forEach(slide => viewerObserver.observe(slide));
}

function closeViewer() {
    if (!postViewer || postViewer.hidden) {
        return;
    }

    if (viewerObserver) {
        viewerObserver.disconnect();
        viewerObserver = null;
    }

    postViewerScroller.querySelectorAll("video").forEach(video => {
        video.pause();
        video.removeAttribute("src");
        video.load();
    });

    postViewerScroller.innerHTML = "";

    closeComments();

    postViewer.hidden = true;
    postViewer.setAttribute("aria-hidden", "true");

    viewerCurrentId = null;

    unlockPageIfNothingOpen();

    /* refresh the grid counts after likes / comments */
    renderPosts();
}

function stepViewer(direction) {
    if (!postViewerScroller) {
        return;
    }

    postViewerScroller.scrollBy({
        top: direction * postViewerScroller.clientHeight,
        behavior: "smooth"
    });
}

function refreshSlide(post) {
    const slide = postViewerScroller?.querySelector(
        `.pv-slide[data-id="${CSS.escape(String(post.id))}"]`
    );

    if (!slide) {
        return;
    }

    const liked = isLikedByMe(post);
    const likeButton = slide.querySelector('[data-act="like"]');

    if (likeButton) {
        likeButton.classList.toggle("liked", liked);
        likeButton.querySelector("i").className =
            (liked ? "fa-solid" : "fa-regular") + " fa-heart";
    }

    const set = (name, value) => {
        const element = slide.querySelector(`[data-count="${name}"]`);
        if (element) {
            element.textContent = formatCount(value);
        }
    };

    set("like", likeCount(post));
    set("comment", commentCount(post));
    set("share", shareCount(post));

    refreshTotalLikes();
}


/* ---------- viewer clicks (FIXED BRACE MISMATCH) ---------- */

postViewerScroller?.addEventListener("click", async event => {
    const button = event.target.closest("[data-act]");

    if (button) {
        const slide = button.closest(".pv-slide");
        const post = findPost(slide?.dataset.id);

        if (!post) {
            return;
        }

        const act = button.dataset.act;

        if (act === "like") {
            await toggleLike(post);
        } else if (act === "comment") {
            viewerCurrentId = String(post.id);
            openComments();
        } else if (act === "share") {
            await sharePost(post);
        } else if (act === "download") {
            await downloadPost(post);
        } else if (act === "use-sound") {
            const soundId =
                post.sound_id ||
                post.original_sound_id ||
                post.audio_id ||
                post.sound_url ||
                post.audio_url ||
                post.id;

            window.location.href =
                "sounds.html?sound=" + encodeURIComponent(String(soundId)) +
                "&sourcePost=" + encodeURIComponent(String(post.id));
        }

        return;
    }

    /* tap a video = play / pause */
    const media = event.target.closest(".pv-media");

    if (media) {
        const video = media.querySelector("video");

        if (video) {
            if (video.paused) {
                playVideo(video);
            } else {
                video.pause();
            }
        }

        return;
    }

    /* tap the dark area around the post = close */
    if (event.target.classList.contains("pv-slide")) {
        closeViewer();
    }
});

postViewerClose?.addEventListener("click", closeViewer);


/* ---------- like ---------- */

async function toggleLike(post) {
    const userId = String(currentUser.id);

    try {
        const { data: existing, error: checkError } = await nexaSupabase
            .from("likes")
            .select("id")
            .eq("post_id", post.id)
            .eq("user_id", userId)
            .limit(1)
            .maybeSingle();

        if (checkError) {
            throw checkError;
        }

        if (!Array.isArray(post.likes)) {
            post.likes = [];
        }

        if (existing) {
            const { error } = await nexaSupabase
                .from("likes")
                .delete()
                .eq("id", existing.id);

            if (error) {
                throw error;
            }

            post.likes = post.likes.filter(id => String(id) !== userId);
        } else {
            const { error } = await nexaSupabase
                .from("likes")
                .insert({ post_id: post.id, user_id: userId });

            if (error) {
                throw error;
            }

            if (!post.likes.some(id => String(id) === userId)) {
                post.likes.push(userId);
            }
        }

        refreshSlide(post);
    } catch (error) {
        console.error("NEXA toggle like error:", error);
        toast("Could not update like.");
    }
}


/* ---------- comments ---------- */

function openComments() {
    if (!pvComments) return;
    pvComments.hidden = false;
    renderComments();
    pvCommentInput?.focus();
}

function closeComments() {
    if (!pvComments) return;
    pvComments.hidden = true;
}

function renderComments() {
    if (!pvCommentsList) return;

    const post = findPost(viewerCurrentId);
    if (!post) {
        pvCommentsList.innerHTML = "";
        return;
    }

    const list = Array.isArray(post.comments) ? post.comments : [];

    if (!list.length) {
        pvCommentsList.innerHTML = `<p class="pv-no-comments">No comments yet. Start the conversation!</p>`;
        return;
    }

    pvCommentsList.innerHTML = list.map(comment => {
        const author = comment.author_name || comment.username || "NEXA Member";
        const body = comment.text || comment.content || "";
        const time = timeAgo(comment.created_at);

        return `
            <div class="pv-comment-item">
                <div class="pv-comment-head">
                    <strong>${escapeHTML(author)}</strong>
                    <span>${escapeHTML(time)}</span>
                </div>
                <p>${escapeHTML(body)}</p>
            </div>
        `;
    }).join("");
}

pvCommentsForm?.addEventListener("submit", async event => {
    event.preventDefault();

    const post = findPost(viewerCurrentId);
    const text = pvCommentInput?.value.trim();

    if (!post || !text) return;

    pvCommentInput.value = "";

    const newComment = {
        post_id: post.id,
        user_id: String(currentUser.id),
        author_name: getDisplayName(currentUser),
        text,
        created_at: new Date().toISOString()
    };

    try {
        const { data, error } = await nexaSupabase
            .from("comments")
            .insert(newComment)
            .select()
            .single();

        if (error) throw error;

        if (!Array.isArray(post.comments)) post.comments = [];
        post.comments.push(data || newComment);

        renderComments();
        refreshSlide(post);
    } catch (error) {
        console.error("NEXA comment error:", error);
        toast("Could not post comment.");
    }
});

pvCommentsClose?.addEventListener("click", closeComments);


/* ---------- share & download ---------- */

async function sharePost(post) {
    const shareUrl = `${window.location.origin}${window.location.pathname}?user=${encodeURIComponent(String(profileUser.id))}&post=${encodeURIComponent(String(post.id))}`;

    try {
        if (navigator.share) {
            await navigator.share({
                title: `${getDisplayName(profileUser)} on NEXA`,
                text: post.text || "Check out this post on NEXA",
                url: shareUrl
            });
        } else if (navigator.clipboard) {
            await navigator.clipboard.writeText(shareUrl);
            toast("Post link copied to clipboard!");
        }

        post.shares = Number(post.shares || 0) + 1;
        refreshSlide(post);

        await nexaSupabase
            .from("posts")
            .update({ shares: post.shares })
            .eq("id", post.id);
    } catch (error) {
        if (error?.name !== "AbortError") {
            console.error("NEXA share error:", error);
        }
    }
}

async function downloadPost(post) {
    const media = getPostMedia(post);

    if (!media) {
        toast("This text post has no media file to download.");
        return;
    }

    try {
        const response = await fetch(media);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);

        const ext = blob.type.includes("video") ? "mp4" : "jpg";
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = `nexa-post-${post.id}.${ext}`;
        document.body.appendChild(link);
        link.click();
        link.remove();

        URL.revokeObjectURL(blobUrl);
        toast("Download started.");
    } catch (_) {
        const link = document.createElement("a");
        link.href = media;
        link.target = "_blank";
        link.download = `nexa-post-${post.id}`;
        link.click();
    }
}


/* =========================================================
   FILTERS, EDIT PROFILE & STATUS MODALS
========================================================= */

profileFilters?.addEventListener("click", event => {
    const btn = event.target.closest("[data-filter]");
    if (!btn) return;

    activeFilter = btn.dataset.filter || "all";

    profileFilters.querySelectorAll("[data-filter]").forEach(item => {
        item.classList.toggle("active", item === btn);
    });

    renderPosts();
});

editProfileButton?.addEventListener("click", () => {
    if (!isOwnProfile || !editProfileModal) return;

    pendingAvatarDataUrl = null;
    if (editProfileName) editProfileName.value = profileUser?.name || "";
    if (editProfileUsername) editProfileUsername.value = profileUser?.username || "";
    if (editProfileBio) editProfileBio.value = profileUser?.bio || "";

    if (editProfilePhotoPreview) {
        const pic = getProfilePicture(profileUser);
        if (pic) {
            editProfilePhotoPreview.src = pic;
            editProfilePhotoPreview.style.display = "block";
        } else {
            editProfilePhotoPreview.style.display = "none";
        }
    }

    editProfileModal.hidden = false;
    document.body.style.overflow = "hidden";
});

profilePictureInput?.addEventListener("change", event => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
        pendingAvatarDataUrl = String(reader.result || "");
        if (editProfilePhotoPreview && pendingAvatarDataUrl) {
            editProfilePhotoPreview.src = pendingAvatarDataUrl;
            editProfilePhotoPreview.style.display = "block";
        }
    };
    reader.readAsDataURL(file);
});

saveProfileButton?.addEventListener("click", async () => {
    if (!isOwnProfile || !profileUser) return;

    const updatedName = editProfileName?.value.trim() || profileUser.name;
    const updatedUsername = (editProfileUsername?.value.trim() || profileUser.username || "")
        .replace(/^@+/, "");
    const updatedBio = editProfileBio?.value.trim() ?? "";
    const updatedPicture = pendingAvatarDataUrl !== null
        ? pendingAvatarDataUrl
        : getProfilePicture(profileUser);

    saveProfileButton.disabled = true;

    try {
        const { error } = await nexaSupabase
            .from("profiles")
            .update({
                name: updatedName,
                username: updatedUsername,
                bio: updatedBio,
                profile_picture: updatedPicture
            })
            .eq("id", String
