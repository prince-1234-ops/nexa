/* =========================================================
   NEXA PROFILE
   Organized profile: header, stories row, posts grid.
   Click a post -> focused viewer you can scroll through,
   with like / comment / share / download.
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

function showLoading(visible) {

    if (!profilePageLoading) {
        return;
    }

    profilePageLoading.classList.toggle("hidden", !visible);
    profilePageLoading.style.display = visible ? "" : "none";
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
            .select("id, name, username, profile_picture, bio, created_at")
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

    } catch (error) {

        console.error("NEXA add friend error:", error);

        alert("Could not add this friend.");
    }
}

function messageProfile() {

    if (!profileUser || isOwnProfile) {
        return;
    }

    window.location.href = "messages.html?user=" + encodeURIComponent(String(profileUser.id));
}


/* =========================================================
   LOAD POSTS + LIKES
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

        await loadLikes();

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

        if (activeFilter === "all") {
            return true;
        }

        if (activeFilter === "photo") {
            return kind === "photo";
        }

        if (activeFilter === "video") {
            return kind === "video";
        }

        if (activeFilter === "reel") {
            return kind === "reel";
        }

        return true;
    });
}

function renderPosts() {

    applyFilter();

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

    profilePostsGrid.style.display = "";

    profilePosts.forEach(post => {

        const kind = getPostKind(post);
        const media = getPostMedia(post);

        const tile = document.createElement("button");

        tile.type = "button";
        tile.className = "profile-post";
        tile.dataset.postId = String(post.id);

        let mediaHTML = "";
        let badge = "";

        if (kind === "photo") {

            mediaHTML = `<img src="${escapeHTML(media)}" alt="NEXA post" loading="lazy">`;

        } else if (isVideoKind(kind)) {

            mediaHTML = `<video src="${escapeHTML(media)}#t=0.1" muted playsinline preload="metadata"></video>`;

            badge = `
                <span class="profile-post-badge">
                    <i class="fa-solid ${kind === "reel" ? "fa-clapperboard" : "fa-play"}"></i>
                </span>
            `;

        } else {

            mediaHTML = `<span class="profile-post-text">${escapeHTML(post.text || "")}</span>`;
        }

        tile.innerHTML = `
            ${mediaHTML}
            ${badge}
            <span class="profile-post-overlay">
                <span><i class="fa-solid fa-heart"></i> ${formatCount(likeCount(post))}</span>
                <span><i class="fa-regular fa-comment"></i> ${formatCount(commentCount(post))}</span>
            </span>
        `;

        tile.addEventListener("click", () => openViewer(post.id));

        profilePostsGrid.appendChild(tile);
    });
}

profileFilters?.addEventListener("click", event => {

    const button = event.target.closest("[data-filter]");

    if (!button) {
        return;
    }

    activeFilter = button.dataset.filter;

    profileFilters.querySelectorAll(".profile-filter").forEach(item => {
        item.classList.toggle("active", item === button);
    });

    renderPosts();
});

profilePostsViewButton?.addEventListener("click", () => {

    const list = profilePostsGrid.classList.toggle("list-view");

    profilePostsViewButton.innerHTML = list
        ? `<i class="fa-solid fa-table-cells-large"></i>`
        : `<i class="fa-solid fa-grip"></i>`;
});


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


/* ---------- viewer clicks ---------- */

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

            const { error } = await nexaSupabase.from("likes").delete().eq("id", existing.id);

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
        console.error("NEXA profile like error:", error);
    }
}


/* ---------- share ---------- */

async function sharePost(post) {

    const url =
        window.location.origin +
        window.location.pathname +
        "?user=" + encodeURIComponent(String(profileUser.id));

    try {

        if (navigator.share) {

            await navigator.share({
                title: "NEXA",
                text: post.text || "Check out this post on NEXA.",
                url
            });

        } else if (navigator.clipboard) {

            await navigator.clipboard.writeText(url);

            toast("Link copied.");
        }

    } catch (error) {

        if (error && error.name === "AbortError") {
            return;
        }

        console.error("NEXA profile share error:", error);

        return;
    }

    try {

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

        post.shares = Number(data.shares || newShares);

        refreshSlide(post);

    } catch (error) {
        console.error("NEXA profile share count error:", error);
    }
}


/* ---------- download ---------- */

async function downloadPost(post) {

    const url = getPostMedia(post);

    if (!url) {
        toast("This post has no photo or video to download.");
        return;
    }

    try {

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error("Download failed.");
        }

        const blob = await response.blob();

        const extension =
            (blob.type.split("/")[1] || "").split(";")[0] ||
            (String(url).split("?")[0].split(".").pop() || "file");

        const link = document.createElement("a");

        link.href = URL.createObjectURL(blob);
        link.download = "nexa-" + post.id + "." + extension;

        document.body.appendChild(link);
        link.click();
        link.remove();

        setTimeout(() => URL.revokeObjectURL(link.href), 4000);

        toast("Download started.");

    } catch (error) {

        console.error("NEXA profile download error:", error);

        /* fallback: open the file so it can be saved manually */
        window.open(url, "_blank", "noopener");
    }
}


/* ---------- comments ---------- */

function renderComments() {

    const post = findPost(viewerCurrentId);

    if (!post || !pvCommentsList) {
        return;
    }

    const comments = Array.isArray(post.comments) ? post.comments : [];

    if (!comments.length) {
        pvCommentsList.innerHTML = `<div class="pv-comments-empty">No comments yet. Be the first.</div>`;
        return;
    }

    pvCommentsList.innerHTML = comments.map(comment => `
        <div class="pv-comment">
            <strong>${escapeHTML(comment.username || comment.userName || "NEXA User")}</strong>
            <p>${escapeHTML(comment.text || "")}</p>
        </div>
    `).join("");

    pvCommentsList.scrollTop = pvCommentsList.scrollHeight;
}

function openComments() {

    if (!pvComments) {
        return;
    }

    renderComments();

    pvComments.hidden = false;

    setTimeout(() => pvCommentInput?.focus(), 80);
}

function closeComments() {

    if (pvComments) {
        pvComments.hidden = true;
    }

    if (pvCommentInput) {
        pvCommentInput.value = "";
    }
}

pvCommentsClose?.addEventListener("click", closeComments);

pvCommentsForm?.addEventListener("submit", async event => {

    event.preventDefault();

    const text = pvCommentInput ? pvCommentInput.value.trim() : "";
    const post = findPost(viewerCurrentId);

    if (!text || !post) {
        return;
    }

    const comments = Array.isArray(post.comments) ? [...post.comments] : [];

    comments.push({
        id: Date.now(),
        userId: String(currentUser.id),
        username: currentUser.username || currentUser.name || "NEXA User",
        text,
        createdAt: new Date().toISOString()
    });

    try {

        const { data, error } = await nexaSupabase
            .from("posts")
            .update({ comments })
            .eq("id", post.id)
            .select("comments")
            .single();

        if (error) {
            throw error;
        }

        post.comments = Array.isArray(data.comments) ? data.comments : comments;

        pvCommentInput.value = "";

        renderComments();
        refreshSlide(post);

    } catch (error) {

        console.error("NEXA profile comment error:", error);

        toast("Could not save your comment.");
    }
});


/* ---------- keyboard ---------- */

document.addEventListener("keydown", event => {

    if (!postViewer || postViewer.hidden) {
        return;
    }

    const typing = document.activeElement === pvCommentInput;

    if (event.key === "Escape") {

        event.preventDefault();

        if (pvComments && !pvComments.hidden) {
            closeComments();
        } else {
            closeViewer();
        }

        return;
    }

    if (typing) {
        return;
    }

    if (event.key === "ArrowDown" || event.key === "PageDown") {
        event.preventDefault();
        stepViewer(1);
        return;
    }

    if (event.key === "ArrowUp" || event.key === "PageUp") {
        event.preventDefault();
        stepViewer(-1);
        return;
    }

    if (event.key === " ") {

        event.preventDefault();

        const slide = postViewerScroller.querySelector(
            `.pv-slide[data-id="${CSS.escape(String(viewerCurrentId))}"]`
        );

        const video = slide?.querySelector("video");

        if (video) {
            if (video.paused) {
                playVideo(video);
            } else {
                video.pause();
            }
        }
    }
});


/* =========================================================
   TOAST
========================================================= */

function toast(message) {

    const element = document.createElement("div");

    element.className = "pv-toast";
    element.textContent = message;

    document.body.appendChild(element);

    setTimeout(() => element.classList.add("show"), 10);

    setTimeout(() => {
        element.classList.remove("show");
        setTimeout(() => element.remove(), 300);
    }, 2200);
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
            username: story.username || getDisplayName(profileUser),
            media: story.media || "",
            mediaType: story.media_type || "image",
            createdAt: story.created_at
        }));

    } catch (error) {

        console.error("NEXA profile stories error:", error);

        profileStories = [];
    }

    renderProfileStories();
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

        const isVideo = String(story.mediaType).toLowerCase().startsWith("video");

        const mediaHTML = isVideo
            ? `<video src="${escapeHTML(story.media)}#t=0.1" muted playsinline preload="metadata"></video>`
            : `<img src="${escapeHTML(story.media)}" alt="Story" loading="lazy">`;

        button.innerHTML = `
            <div class="profile-story-ring">${mediaHTML}</div>
            <span class="profile-story-name">${escapeHTML(timeAgo(story.createdAt))}</span>
        `;

        button.addEventListener("click", () => openStoryViewer(story));

        profileStoriesElement.appendChild(button);
    });
}

function openStoryViewer(story) {

    const isVideo = String(story.mediaType).toLowerCase().startsWith("video");

    const viewer = document.createElement("div");

    viewer.className = "ps-viewer";

    viewer.innerHTML = `
        <button type="button" class="pv-close ps-close" aria-label="Close story">
            <i class="fa-solid fa-xmark"></i>
        </button>

        <div class="ps-stage">
            ${isVideo
                ? `<video src="${escapeHTML(story.media)}" controls autoplay playsinline></video>`
                : `<img src="${escapeHTML(story.media)}" alt="Story">`}
        </div>
    `;

    document.body.appendChild(viewer);
    document.body.style.overflow = "hidden";

    function close() {
        viewer.remove();
        document.removeEventListener("keydown", onKey);
        unlockPageIfNothingOpen();
    }

    function onKey(event) {
        if (event.key === "Escape") {
            close();
        }
    }

    document.addEventListener("keydown", onKey);

    viewer.querySelector(".ps-close").addEventListener("click", close);

    viewer.addEventListener("click", event => {
        if (event.target === viewer) {
            close();
        }
    });
}


/* =========================================================
   EDIT PROFILE
   Saving only updates the profile. It never creates a post.
========================================================= */

function openEditProfileModal() {

    if (!editProfileModal || !profileUser) {
        return;
    }

    editProfileName.value = profileUser.name || "";
    editProfileUsername.value = profileUser.username || "";
    editProfileBio.value = profileUser.bio || "";

    renderEditProfilePicture(getProfilePicture(profileUser));

    editProfileModal.hidden = false;

    document.body.style.overflow = "hidden";
}

function renderEditProfilePicture(picture) {

    if (!editProfilePhotoPreview) {
        return;
    }

    editProfilePhotoPreview.innerHTML = picture
        ? `<img src="${escapeHTML(picture)}" alt="Profile preview">`
        : `<span>${escapeHTML(getDisplayName(profileUser).trim().charAt(0).toUpperCase() || "N")}</span>`;
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

                canvas.getContext("2d").drawImage(image, 0, 0, width, height);

                resolve(canvas.toDataURL("image/jpeg", 0.82));
            };

            image.onerror = reject;
            image.src = reader.result;
        };

        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

async function saveProfile() {

    if (!profileUser || !isOwnProfile) {
        return;
    }

    const name = editProfileName.value.trim();

    const username = editProfileUsername.value
        .trim()
        .replace(/^@/, "")
        .toLowerCase();

    const bio = editProfileBio.value.trim();

    if (!name) {
        alert("Please enter your name.");
        return;
    }

    saveProfileButton.disabled = true;
    saveProfileButton.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Saving...`;

    try {

        let picture = getProfilePicture(profileUser);

        if (profilePictureInput?.files?.[0]) {
            picture = await compressProfileImage(profilePictureInput.files[0]);
        }

        const { data, error } = await nexaSupabase
            .from("profiles")
            .update({ name, username, bio, profile_picture: picture })
            .eq("id", String(currentUser.id))
            .select("id, name, username, profile_picture, bio, created_at")
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

        saveCurrentUser();

        renderProfileHeader();

        closeModal(editProfileModal);

        profilePictureInput.value = "";

        /* posts are NOT reloaded or created: the picture only changes the header */

        window.dispatchEvent(new CustomEvent("nexaProfileUpdated", { detail: data }));

    } catch (error) {

        console.error("NEXA profile save error:", error);

        alert("Could not save your profile.");

    } finally {

        saveProfileButton.disabled = false;
        saveProfileButton.innerHTML = `<i class="fa-solid fa-check"></i> Save Profile`;
    }
}


/* =========================================================
   WHAT'S NEW (STATUS)
========================================================= */

function getStatusKey() {
    return "nexaProfileStatus_" + String(profileUser?.id || currentUser.id);
}

function getSavedStatus() {

    try {

        const raw = localStorage.getItem(getStatusKey());

        if (!raw) {
            return null;
        }

        const status = JSON.parse(raw);

        if (!status || Date.now() >= Number(status.expiresAt)) {
            localStorage.removeItem(getStatusKey());
            return null;
        }

        return status;

    } catch (_) {
        return null;
    }
}

function renderStatus() {

    if (profileStatusPreview) {
        profileStatusPreview.textContent = getSavedStatus()?.text || "Share an update";
    }
}

function updateStatusCharacters() {

    if (profileStatusCharacters && profileStatusInput) {
        profileStatusCharacters.textContent = profileStatusInput.value.length + " / 180";
    }
}

function openStatusModal() {

    if (!profileStatusModal || !isOwnProfile) {
        return;
    }

    profileStatusInput.value = getSavedStatus()?.text || "";

    updateStatusCharacters();

    profileStatusModal.hidden = false;

    document.body.style.overflow = "hidden";

    setTimeout(() => profileStatusInput.focus(), 50);
}

function saveStatus() {

    if (!isOwnProfile || !profileStatusInput) {
        return;
    }

    const text = profileStatusInput.value.trim();

    if (!text) {
        localStorage.removeItem(getStatusKey());
    } else {
        localStorage.setItem(getStatusKey(), JSON.stringify({
            text,
            createdAt: new Date().toISOString(),
            expiresAt: Date.now() + 24 * 60 * 60 * 1000
        }));
    }

    renderStatus();

    closeModal(profileStatusModal);
}


/* =========================================================
   MODALS
========================================================= */

function unlockPageIfNothingOpen() {

    const open =
        (editProfileModal && !editProfileModal.hidden) ||
        (profileStatusModal && !profileStatusModal.hidden) ||
        (postViewer && !postViewer.hidden) ||
        document.querySelector(".ps-viewer");

    if (!open) {
        document.body.style.overflow = "";
    }
}

function closeModal(modal) {

    if (!modal) {
        return;
    }

    modal.hidden = true;

    unlockPageIfNothingOpen();
}

document.addEventListener("click", event => {

    const target = event.target.closest("[data-close-modal]");

    if (!target) {
        return;
    }

    closeModal($(target.dataset.closeModal));
});

document.addEventListener("keydown", event => {

    if (event.key !== "Escape" || (postViewer && !postViewer.hidden)) {
        return;
    }

    if (editProfileModal && !editProfileModal.hidden) {
        closeModal(editProfileModal);
    } else if (profileStatusModal && !profileStatusModal.hidden) {
        closeModal(profileStatusModal);
    }
});


/* =========================================================
   BUTTONS + INPUTS
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

$("profilePostsStat")?.addEventListener("click", () => {
    $("profilePostsSection")?.scrollIntoView({ behavior: "smooth" });
});


/* =========================================================
   INITIALIZE
========================================================= */

async function initializeProfile() {

    showLoading(true);

    try {

        await loadProfile();

        await Promise.all([
            loadFriendInfo(),
            loadProfilePosts(),
            loadProfileStories()
        ]);

        renderStatus();

    } catch (error) {

        console.error("NEXA profile initialization error:", error);

    } finally {

        showLoading(false);
    }
}

initializeProfile();
