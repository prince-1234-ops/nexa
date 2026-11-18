/* =========================================================
   NEXA REELS
   Grid of reels (first frame of each video) -> click to play
   fullscreen. Real likes, comments, shares and saves from
   the same Supabase tables as the Home page. No fake numbers.
========================================================= */

if (typeof nexaSupabase === "undefined") {
    throw new Error("NEXA Supabase is not available.");
}

const currentUser = JSON.parse(localStorage.getItem("nexaCurrentUser"));

if (!currentUser) {
    window.location.href = "index.html";
    throw new Error("No NEXA user is logged in.");
}


/* =========================================================
   ELEMENTS
========================================================= */

const $ = id => document.getElementById(id);

const rlGrid = $("rlGrid");
const rlLoading = $("rlLoading");
const rlEmpty = $("rlEmpty");
const rlFilters = $("rlFilters");
const rlSubtitle = $("rlSubtitle");
const rlFileInput = $("rlFileInput");
const searchInput = $("searchInput");
const notificationArea = $("notificationArea");
const miniAvatar = $("miniAvatar");

const rv = $("rv");
const rvScroller = $("rvScroller");
const rvClose = $("rvClose");
const rvComments = $("rvComments");
const rvCommentsList = $("rvCommentsList");
const rvCommentsForm = $("rvCommentsForm");
const rvCommentInput = $("rvCommentInput");
const rvCommentsClose = $("rvCommentsClose");


/* =========================================================
   STATE
========================================================= */

let reels = [];
let shown = [];
let activeFilter = "latest";
let searchText = "";

let viewerCurrentId = null;
let viewerObserver = null;
let viewerIsOpen = false;


/* =========================================================
   USER HELPERS
========================================================= */

function getUserId() {
    return currentUser.id || currentUser._id || currentUser.userId || currentUser.email || "nexa-user";
}

function getUsername() {
    return currentUser.username || currentUser.name || currentUser.fullName || currentUser.email || "NEXA User";
}

function getUserAvatar() {
    return (
        currentUser.profile_picture ||
        currentUser.profilePicture ||
        currentUser.profileImage ||
        currentUser.avatar ||
        currentUser.image ||
        ""
    );
}

function getAvatarLetter(name) {
    return String(name || "N").trim().charAt(0).toUpperCase() || "N";
}


/* =========================================================
   HELPERS (same as Home)
========================================================= */

function escapeHTML(value) {
    const div = document.createElement("div");
    div.textContent = String(value ?? "");
    return div.innerHTML;
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

    if (days === 1) {
        return "Yesterday";
    }

    if (days < 7) {
        return days + "d";
    }

    return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function showNotification(text) {

    if (!notificationArea) {
        return;
    }

    const notice = document.createElement("div");

    notice.className = "nexa-notification";
    notice.textContent = text;

    notificationArea.appendChild(notice);

    setTimeout(() => notice.remove(), 3000);
}

function updateMiniAvatar() {

    if (!miniAvatar) {
        return;
    }

    const avatar = getUserAvatar();

    miniAvatar.innerHTML = avatar
        ? `<img src="${escapeHTML(getMediaURL(avatar))}" alt="${escapeHTML(getUsername())}">`
        : `<span>${escapeHTML(getAvatarLetter(getUsername()))}</span>`;
}


/* =========================================================
   REAL COUNTS
========================================================= */

const likeCount = post => post.likes.length;
const commentCount = post => post.comments.length;
const shareCount = post => Number(post.shares || 0);

const isLiked = post => post.likes.some(id => String(id) === String(getUserId()));
const isSaved = post => post.savedBy.some(id => String(id) === String(getUserId()));

function findReel(id) {
    return reels.find(post => String(post.id) === String(id));
}


/* =========================================================
   LOAD REELS
========================================================= */

async function fetchReels() {

    const { data: postData, error: postError } = await nexaSupabase
        .from("posts")
        .select("*")
        .eq("media_type", "reel")
        .order("created_at", { ascending: false });

    if (postError) {
        throw postError;
    }

    const rows = (postData || []).filter(post => post.media);

    const ids = rows.map(post => post.id);

    const likesByPost = {};

    if (ids.length) {

        const { data: likeData, error: likeError } = await nexaSupabase
            .from("likes")
            .select("post_id, user_id")
            .in("post_id", ids);

        if (likeError) {
            throw likeError;
        }

        (likeData || []).forEach(like => {

            const key = String(like.post_id);

            if (!likesByPost[key]) {
                likesByPost[key] = [];
            }

            likesByPost[key].push(String(like.user_id));
        });
    }

    const authorIds = [...new Set(rows.map(post => post.author_id).filter(Boolean).map(String))];

    const profileMap = new Map();

    if (authorIds.length) {

        const { data: profileData } = await nexaSupabase
            .from("profiles")
            .select("id, name, username, profile_picture")
            .in("id", authorIds);

        (profileData || []).forEach(profile => profileMap.set(String(profile.id), profile));
    }

    return rows.map(post => {

        const profile = profileMap.get(String(post.author_id));

        return {
            id: post.id,
            createdAt: post.created_at,
            authorId: post.author_id,
            authorName: profile?.name || profile?.username || post.author_name || "NEXA User",
            authorAvatar: profile?.profile_picture || "",
            text: post.text || "",
            media: post.media || "",
            likes: likesByPost[String(post.id)] || [],
            comments: Array.isArray(post.comments) ? post.comments : [],
            shares: Number(post.shares || 0),
            savedBy: Array.isArray(post.saved_by) ? post.saved_by : []
        };
    });
}

async function loadReels() {

    try {

        reels = await fetchReels();

    } catch (error) {

        console.error("NEXA reels loading error:", error);

        reels = [];

        showNotification("Could not load reels.");
    }

    renderGrid();
}


/* =========================================================
   GRID
========================================================= */

function applyView() {

    let list = reels.slice();

    if (activeFilter === "mine") {
        list = list.filter(post => String(post.authorId) === String(getUserId()));
    }

    if (searchText) {
        list = list.filter(post =>
            String(post.authorName).toLowerCase().includes(searchText) ||
            String(post.text).toLowerCase().includes(searchText)
        );
    }

    if (activeFilter === "top") {
        list.sort((a, b) => likeCount(b) - likeCount(a));
    }

    shown = list;
}

function renderGrid() {

    applyView();

    if (rlLoading) {
        rlLoading.remove();
    }

    rlGrid.innerHTML = "";

    if (rlSubtitle) {
        rlSubtitle.textContent =
            reels.length === 1
                ? "1 reel from the NEXA community."
                : reels.length + " reels from the NEXA community.";
    }

    if (!shown.length) {

        rlGrid.style.display = "none";

        if (rlEmpty) {
            rlEmpty.hidden = false;

            const heading = rlEmpty.querySelector("h2");

            if (heading) {
                heading.textContent = reels.length ? "No reels found" : "No reels yet";
            }
        }

        return;
    }

    if (rlEmpty) {
        rlEmpty.hidden = true;
    }

    rlGrid.style.display = "";

    shown.forEach(post => {

        const card = document.createElement("button");

        card.type = "button";
        card.className = "rl-card";
        card.dataset.id = post.id;
        card.title = post.text || post.authorName;

        const avatar = post.authorAvatar
            ? `<img src="${escapeHTML(getMediaURL(post.authorAvatar))}" alt="${escapeHTML(post.authorName)}">`
            : escapeHTML(getAvatarLetter(post.authorName));

        card.innerHTML = `
            <video
                src="${escapeHTML(getMediaURL(post.media))}#t=0.1"
                muted
                loop
                playsinline
                preload="metadata"
            ></video>

            <span class="rl-shade"></span>

            <span class="rl-play">▶</span>

            <span class="rl-meta">

                <span class="rl-author">
                    <span class="rl-avatar">${avatar}</span>
                    <span class="rl-name">${escapeHTML(post.authorName)}</span>
                </span>

                ${post.text ? `<span class="rl-caption">${escapeHTML(post.text)}</span>` : ""}

                <span class="rl-stats">
                    <span class="rl-stat ${isLiked(post) ? "liked" : ""}" data-stat="like">${isLiked(post) ? "♥" : "♡"} <b>${formatCount(likeCount(post))}</b></span>
                    <span class="rl-stat">💬 <b data-stat="comment">${formatCount(commentCount(post))}</b></span>
                </span>

            </span>
        `;

        const video = card.querySelector("video");

        /* hover = silent preview */

        card.addEventListener("mouseenter", () => {
            video.play().catch(() => { });
        });

        card.addEventListener("mouseleave", () => {
            video.pause();
            try { video.currentTime = 0.1; } catch (_) { }
        });

        card.addEventListener("click", () => openViewer(post.id));

        rlGrid.appendChild(card);
    });
}

function refreshCard(post) {

    const card = rlGrid.querySelector(`.rl-card[data-id="${CSS.escape(String(post.id))}"]`);

    if (!card) {
        return;
    }

    const like = card.querySelector('[data-stat="like"]');

    if (like) {
        like.classList.toggle("liked", isLiked(post));
        like.innerHTML = `${isLiked(post) ? "♥" : "♡"} <b>${formatCount(likeCount(post))}</b>`;
    }

    const comment = card.querySelector('b[data-stat="comment"]');

    if (comment) {
        comment.textContent = formatCount(commentCount(post));
    }
}

rlFilters?.addEventListener("click", event => {

    const button = event.target.closest("[data-filter]");

    if (!button) {
        return;
    }

    activeFilter = button.dataset.filter;

    rlFilters.querySelectorAll(".rl-filter").forEach(item => {
        item.classList.toggle("active", item === button);
    });

    renderGrid();
});

searchInput?.addEventListener("input", () => {

    searchText = searchInput.value.trim().toLowerCase();

    renderGrid();
});


/* =========================================================
   VIEWER (scroll down = next reel)
========================================================= */

function slideHTML(post) {

    const liked = isLiked(post);
    const saved = isSaved(post);

    const avatar = post.authorAvatar
        ? `<img src="${escapeHTML(getMediaURL(post.authorAvatar))}" alt="${escapeHTML(post.authorName)}">`
        : escapeHTML(getAvatarLetter(post.authorName));

    return `
        <section class="rv-slide" data-id="${escapeHTML(post.id)}">

            <div class="rv-stage">

                <video class="rv-video" src="${escapeHTML(getMediaURL(post.media))}" loop playsinline preload="metadata"></video>

                <span class="rv-pause-icon">▶</span>

                <div class="rv-progress"><span></span></div>

                <div class="rv-gradient"></div>

                <div class="rv-info">

                    <a class="rv-user" href="profile.html?user=${encodeURIComponent(String(post.authorId || ""))}">
                        <span class="rv-avatar">${avatar}</span>
                        <span>
                            <strong>${escapeHTML(post.authorName)}</strong>
                            <small>${escapeHTML(timeAgo(post.createdAt))}</small>
                        </span>
                    </a>

                    ${post.text ? `<p>${escapeHTML(post.text)}</p>` : ""}

                </div>

                <div class="rv-actions">

                    <button type="button" class="rv-action ${liked ? "liked" : ""}" data-act="like" aria-label="Like">
                        <span class="rv-action-icon">${liked ? "♥" : "♡"}</span>
                        <small data-count="like">${formatCount(likeCount(post))}</small>
                    </button>

                    <button type="button" class="rv-action" data-act="comment" aria-label="Comment">
                        <span class="rv-action-icon">💬</span>
                        <small data-count="comment">${formatCount(commentCount(post))}</small>
                    </button>

                    <button type="button" class="rv-action" data-act="share" aria-label="Share">
                        <span class="rv-action-icon">↗</span>
                        <small data-count="share">${formatCount(shareCount(post))}</small>
                    </button>

                    <button type="button" class="rv-action ${saved ? "saved" : ""}" data-act="save" aria-label="Save">
                        <span class="rv-action-icon">${saved ? "★" : "☆"}</span>
                        <small>${saved ? "Saved" : "Save"}</small>
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

            /* browser blocked sound: play silently instead of freezing */
            video.muted = true;
            video.play().catch(() => { });
        });
    }
}

function openViewer(postId, openCommentSheet = false) {

    if (!findReel(postId)) {
        return;
    }

    /* make sure the reel is in the list (filters / search) */

    if (!shown.some(post => String(post.id) === String(postId))) {

        activeFilter = "latest";
        searchText = "";

        if (searchInput) {
            searchInput.value = "";
        }

        rlFilters.querySelectorAll(".rl-filter").forEach(item => {
            item.classList.toggle("active", item.dataset.filter === "latest");
        });

        renderGrid();
    }

    const startIndex = shown.findIndex(post => String(post.id) === String(postId));

    if (startIndex < 0) {
        return;
    }

    rvScroller.innerHTML = shown.map(slideHTML).join("");

    rv.hidden = false;
    rv.setAttribute("aria-hidden", "false");

    viewerIsOpen = true;

    document.body.style.overflow = "hidden";

    /* live blue progress bar + pause icon */

    rvScroller.querySelectorAll(".rv-slide").forEach(slide => {

        const video = slide.querySelector("video");
        const bar = slide.querySelector(".rv-progress span");

        let frame = null;

        const tick = () => {

            const duration = video.duration;

            bar.style.width =
                duration && isFinite(duration)
                    ? Math.min(100, (video.currentTime / duration) * 100) + "%"
                    : "0%";

            frame = requestAnimationFrame(tick);
        };

        video.addEventListener("play", () => {
            slide.classList.remove("is-paused");
            if (frame === null) {
                frame = requestAnimationFrame(tick);
            }
        });

        video.addEventListener("pause", () => {

            if (frame !== null) {
                cancelAnimationFrame(frame);
                frame = null;
            }

            slide.classList.add("is-paused");
        });
    });

    rvScroller.scrollTop = startIndex * rvScroller.clientHeight;

    viewerCurrentId = String(shown[startIndex].id);

    watchSlides();

    if (openCommentSheet) {
        openComments(postId);
    }
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

                if (!rvComments.hidden) {
                    renderComments();
                }

                if (video) {
                    playVideo(video);
                }

            } else if (video) {

                video.pause();
            }
        });

    }, { root: rvScroller, threshold: [0, 0.6, 1] });

    rvScroller.querySelectorAll(".rv-slide").forEach(slide => viewerObserver.observe(slide));
}

function closeViewer() {

    if (!viewerIsOpen) {
        return;
    }

    viewerIsOpen = false;

    if (viewerObserver) {
        viewerObserver.disconnect();
        viewerObserver = null;
    }

    rvScroller.querySelectorAll("video").forEach(video => {
        video.pause();
        video.removeAttribute("src");
        video.load();
    });

    rvScroller.innerHTML = "";

    closeComments();

    rv.hidden = true;
    rv.setAttribute("aria-hidden", "true");

    document.body.style.overflow = "";

    viewerCurrentId = null;

    shown.forEach(refreshCard);
}

function stepViewer(direction) {
    rvScroller.scrollBy({ top: direction * rvScroller.clientHeight, behavior: "smooth" });
}

function refreshSlide(post) {

    const slide = rvScroller.querySelector(`.rv-slide[data-id="${CSS.escape(String(post.id))}"]`);

    if (!slide) {
        return;
    }

    const like = slide.querySelector('[data-act="like"]');

    if (like) {
        like.classList.toggle("liked", isLiked(post));
        like.querySelector(".rv-action-icon").textContent = isLiked(post) ? "♥" : "♡";
    }

    const save = slide.querySelector('[data-act="save"]');

    if (save) {
        save.classList.toggle("saved", isSaved(post));
        save.querySelector(".rv-action-icon").textContent = isSaved(post) ? "★" : "☆";
        save.querySelector("small").textContent = isSaved(post) ? "Saved" : "Save";
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
}


/* ---------- clicks inside the viewer ---------- */

rvScroller.addEventListener("click", async event => {

    const button = event.target.closest("[data-act]");

    if (button) {

        const slide = button.closest(".rv-slide");
        const post = findReel(slide?.dataset.id);

        if (!post) {
            return;
        }

        const act = button.dataset.act;

        if (act === "like") {
            await toggleLike(post);
        } else if (act === "comment") {
            viewerCurrentId = String(post.id);
            openComments(post.id);
        } else if (act === "share") {
            await sharePost(post);
        } else if (act === "save") {
            await toggleSave(post);
        }

        return;
    }

    if (event.target.closest(".rv-user")) {
        return;
    }

    /* tap the video = play / pause */

    if (event.target.closest(".rv-stage")) {

        const video = event.target.closest(".rv-stage").querySelector("video");

        if (video) {
            if (video.paused) {
                playVideo(video);
            } else {
                video.pause();
            }
        }

        return;
    }

    /* tap the dark area around = close */

    if (event.target.classList.contains("rv-slide")) {
        closeViewer();
    }
});

rvClose.addEventListener("click", closeViewer);


/* =========================================================
   LIKE (real, same likes table as Home)
========================================================= */

async function toggleLike(post) {

    const userId = String(getUserId());

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
        refreshCard(post);

    } catch (error) {

        console.error("NEXA reel like error:", error);

        showNotification("Could not update the like.");
    }
}


/* =========================================================
   SAVE
========================================================= */

async function toggleSave(post) {

    const userId = String(getUserId());

    const before = [...post.savedBy];

    post.savedBy = isSaved(post)
        ? post.savedBy.filter(id => String(id) !== userId)
        : [...post.savedBy, userId];

    try {

        const { data, error } = await nexaSupabase
            .from("posts")
            .update({ saved_by: post.savedBy })
            .eq("id", post.id)
            .select("id, saved_by")
            .single();

        if (error) {
            throw error;
        }

        post.savedBy = Array.isArray(data.saved_by) ? data.saved_by : post.savedBy;

        refreshSlide(post);

        showNotification(isSaved(post) ? "Reel saved." : "Removed from saved.");

    } catch (error) {

        post.savedBy = before;

        refreshSlide(post);

        console.error("NEXA reel save error:", error);

        showNotification("Could not save this reel.");
    }
}


/* =========================================================
   SHARE
========================================================= */

async function sharePost(post) {

    const url = window.location.origin + window.location.pathname;

    try {

        if (navigator.share) {

            await navigator.share({
                title: "NEXA Reel",
                text: post.text || "Check out this reel on NEXA.",
                url
            });

        } else if (navigator.clipboard) {

            await navigator.clipboard.writeText(url);

            showNotification("Link copied.");
        }

    } catch (error) {

        if (error && error.name === "AbortError") {
            return;
        }

        console.error("NEXA reel share error:", error);

        return;
    }

    try {

        const next = Number(post.shares || 0) + 1;

        const { data, error } = await nexaSupabase
            .from("posts")
            .update({ shares: next })
            .eq("id", post.id)
            .select("shares")
            .single();

        if (error) {
            throw error;
        }

        post.shares = Number(data.shares || next);

        refreshSlide(post);

    } catch (error) {
        console.error("NEXA reel share count error:", error);
    }
}


/* =========================================================
   COMMENTS
========================================================= */

function renderComments() {

    const post = findReel(viewerCurrentId);

    if (!post) {
        return;
    }

    if (!post.comments.length) {
        rvCommentsList.innerHTML = `<div class="rv-comments-empty">No comments yet. Be the first.</div>`;
        return;
    }

    rvCommentsList.innerHTML = post.comments.map(comment => `
        <div class="rv-comment">
            <strong>${escapeHTML(comment.username || comment.userName || comment.authorName || "NEXA User")}</strong>
            <p>${escapeHTML(comment.text || "")}</p>
        </div>
    `).join("");

    rvCommentsList.scrollTop = rvCommentsList.scrollHeight;
}

function openComments(postId) {

    /* also used by the notifications panel */

    if (!viewerIsOpen) {
        openViewer(postId, true);
        return;
    }

    if (postId) {
        viewerCurrentId = String(postId);
    }

    renderComments();

    rvComments.hidden = false;

    setTimeout(() => rvCommentInput.focus(), 80);
}

function closeComments() {

    rvComments.hidden = true;

    rvCommentInput.value = "";
}

rvCommentsClose.addEventListener("click", closeComments);

rvCommentsForm.addEventListener("submit", async event => {

    event.preventDefault();

    const text = rvCommentInput.value.trim();
    const post = findReel(viewerCurrentId);

    if (!text || !post) {
        return;
    }

    const comments = [
        ...post.comments,
        {
            id: Date.now(),
            userId: String(getUserId()),
            username: getUsername(),
            text,
            createdAt: new Date().toISOString()
        }
    ];

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

        rvCommentInput.value = "";

        renderComments();
        refreshSlide(post);

    } catch (error) {

        console.error("NEXA reel comment error:", error);

        showNotification("Could not save your comment.");
    }
});


/* ---------- keyboard ---------- */

document.addEventListener("keydown", event => {

    if (!viewerIsOpen) {
        return;
    }

    const typing = document.activeElement === rvCommentInput;

    if (event.key === "Escape") {

        event.preventDefault();

        if (!rvComments.hidden) {
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

        const slide = rvScroller.querySelector(`.rv-slide[data-id="${CSS.escape(String(viewerCurrentId))}"]`);
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
   UPLOAD A REEL
========================================================= */

function pickReelFile() {

    if (rlFileInput) {
        rlFileInput.value = "";
        rlFileInput.click();
    }
}

rlFileInput?.addEventListener("change", async () => {

    const file = rlFileInput.files?.[0];

    if (!file) {
        return;
    }

    if (!file.type.startsWith("video/")) {
        showNotification("Please choose a video.");
        return;
    }

    const caption = (prompt("Add a caption (optional):") || "").trim();

    try {

        showNotification("Uploading your reel...");

        const extension = (file.name.split(".").pop() || "mp4").toLowerCase();

        const filePath = `posts/${getUserId()}_${Date.now()}.${extension}`;

        const { error: uploadError } = await nexaSupabase
            .storage
            .from("nexa-media")
            .upload(filePath, file, {
                cacheControl: "3600",
                upsert: false,
                contentType: file.type
            });

        if (uploadError) {
            throw uploadError;
        }

        const { data: publicURLData } = nexaSupabase
            .storage
            .from("nexa-media")
            .getPublicUrl(filePath);

        const mediaURL = publicURLData.publicUrl;

        if (!mediaURL) {
            throw new Error("Could not get the uploaded video URL.");
        }

        const { error } = await nexaSupabase
            .from("posts")
            .insert({
                author_id: String(getUserId()),
                author_name: getUsername(),
                author_avatar: getUserAvatar() || getAvatarLetter(getUsername()),
                text: caption,
                media: mediaURL,
                media_type: "reel"
            });

        if (error) {
            throw error;
        }

        showNotification("Your reel is live!");

        await loadReels();

    } catch (error) {

        console.error("NEXA reel upload error:", error);

        showNotification(error.message || "Could not publish your reel.");
    }
});

$("topCreateButton")?.addEventListener("click", pickReelFile);
$("rlUploadButton")?.addEventListener("click", pickReelFile);
$("rlEmptyUpload")?.addEventListener("click", pickReelFile);


/* =========================================================
   LIVE COUNTS
========================================================= */

let syncTimer = null;

async function syncCounts() {

    try {

        const fresh = await fetchReels();

        const knownIds = new Set(reels.map(post => String(post.id)));
        const hasNew = fresh.some(post => !knownIds.has(String(post.id)));

        if (hasNew && !viewerIsOpen) {

            reels = fresh;

            renderGrid();

            return;
        }

        fresh.forEach(update => {

            const post = findReel(update.id);

            if (!post) {
                return;
            }

            post.likes = update.likes;
            post.comments = update.comments;
            post.shares = update.shares;
            post.savedBy = update.savedBy;

            refreshCard(post);

            if (viewerIsOpen) {
                refreshSlide(post);
            }
        });

    } catch (error) {
        console.error("NEXA reels sync error:", error);
    }
}

function syncSoon() {
    clearTimeout(syncTimer);
    syncTimer = setTimeout(syncCounts, 500);
}

try {

    nexaSupabase
        .channel("nexa-reels-live")
        .on("postgres_changes", { event: "*", schema: "public", table: "likes" }, syncSoon)
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "posts" }, syncSoon)
        .subscribe();

} catch (error) {
    console.warn("NEXA reels realtime unavailable:", error);
}

document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
        syncSoon();
    }
});

setInterval(syncCounts, 30000);


/* =========================================================
   START
========================================================= */

updateMiniAvatar();

loadReels();
