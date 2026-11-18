/* =========================================================
   NEXA SHARED SCRIPT  (load AFTER supabase.js)

   1. Red unread-messages badge on the Messages menu item
   2. Messages page: every friend shows their circular profile
      photo + name. Click the photo = profile, box = chat.
   3. Home page: reel viewer fixes (clicking a reel plays it
      properly, live blue progress bar, smooth scrolling).
   4. Home page: notifications (the heart with the blue dot):
      likes, comments and unread messages, plus a red unread
      count on the top-bar message icon.
========================================================= */

(function () {

    let user = null;

    try {
        user = JSON.parse(localStorage.getItem("nexaCurrentUser"));
    } catch (_) { }

    if (!user) {
        return;
    }

    const myId = String(user.id || user._id || user.userId || "");


    /* =====================================================
       LOGOUT
    ===================================================== */

    const logout = document.getElementById("logoutButton");

    if (logout) {
        logout.addEventListener("click", function () {
            localStorage.removeItem("nexaCurrentUser");
            window.location.href = "index.html";
        });
    }


    /* =====================================================
       UNREAD BADGE
    ===================================================== */

    function render(count) {

        count = Number(count) || 0;

        document.querySelectorAll("[data-unread-badge]").forEach(function (badge) {

            if (count > 0) {
                badge.textContent = count > 99 ? "99+" : String(count);
                badge.hidden = false;
                badge.title = count + " unread message" + (count === 1 ? "" : "s");
            } else {
                badge.hidden = true;
            }
        });

        try {
            localStorage.setItem("nexaUnreadCount", String(count));
        } catch (_) { }
    }

    render(localStorage.getItem("nexaUnreadCount") || 0);

    if (typeof nexaSupabase !== "undefined" && myId) {

        const refresh = async function () {

            try {

                const result = await nexaSupabase
                    .from("messages")
                    .select("id", { count: "exact", head: true })
                    .eq("receiver_id", myId)
                    .eq("read", false);

                if (result.error) {
                    throw result.error;
                }

                render(result.count || 0);

            } catch (error) {
                console.error("NEXA unread badge error:", error);
            }
        };

        let timer = null;

        const refreshSoon = function () {
            clearTimeout(timer);
            timer = setTimeout(refresh, 250);
        };

        refresh();

        nexaSupabase
            .channel("nexa-nav-unread-" + myId)
            .on("postgres_changes", {
                event: "*",
                schema: "public",
                table: "messages",
                filter: "receiver_id=eq." + myId
            }, refreshSoon)
            .subscribe();

        document.addEventListener("visibilitychange", function () {
            if (document.visibilityState === "visible") {
                refreshSoon();
            }
        });

        window.addEventListener("pageshow", refreshSoon);

        setInterval(refresh, 30000);
    }


    /* =====================================================
       MESSAGES PAGE — PROFILE PHOTO + NAME
    ===================================================== */

    const conversationsList = document.getElementById("conversationsList");

    if (!conversationsList) {
        return;
    }

    /* ---------- styles ---------- */

    const style = document.createElement("style");

    style.textContent = `
        #conversationsList .conversationButton {
            grid-template-columns: auto minmax(0, 1fr) auto;
            grid-template-areas:
                "avatar name badge"
                "avatar preview badge";
            column-gap: 13px;
            padding: 12px 16px 12px 20px;
        }

        #conversationsList .conversationButton > strong:first-of-type {
            grid-area: name;
            align-self: end;
        }

        #conversationsList .conversationButton > span:not(.nexa-conv-avatar) {
            grid-area: preview;
            align-self: start;
        }

        #conversationsList .conversationButton > .nexa-conv-avatar {
            position: relative;
            grid-area: avatar;
            align-self: center;
            justify-self: start;
            flex: 0 0 auto;
            padding: 0;
            white-space: normal;
            text-overflow: clip;
            display: grid;
            width: 48px;
            height: 48px;
            place-items: center;
            overflow: visible;
            border: 2px solid rgba(126, 204, 255, 0.45);
            border-radius: 50%;
            background: linear-gradient(145deg, #347eae, #142d45);
            color: #fff;
            font-family: "Space Grotesk", sans-serif;
            font-size: 18px;
            font-weight: 700;
            cursor: pointer;
            transition: transform 0.18s ease, box-shadow 0.18s ease;
        }

        #conversationsList .conversationButton > .nexa-conv-avatar:hover {
            transform: scale(1.08);
            box-shadow: 0 0 0 3px rgba(128, 207, 255, 0.28), 0 0 22px rgba(70, 179, 255, 0.45);
        }

        .nexa-conv-avatar img {
            width: 100%;
            height: 100%;
            border-radius: 50%;
            object-fit: cover;
        }

        .nexa-conv-avatar::after {
            position: absolute;
            right: -1px;
            bottom: -1px;
            width: 12px;
            height: 12px;
            border: 2px solid #0d1f31;
            border-radius: 50%;
            content: "";
            background: #4a6479;
        }

        .conversationButton.is-online .nexa-conv-avatar::after {
            background: #59e5b0;
            box-shadow: 0 0 10px rgba(89, 229, 176, 0.7);
        }
    `;

    document.head.appendChild(style);

    /* ---------- helpers ---------- */

    function lookupUser(userId) {

        try {
            if (typeof findUserById === "function") {
                return findUserById(userId) || null;
            }
        } catch (_) { }

        return null;
    }

    function buildAvatar(userId, fallbackName) {

        const person = lookupUser(userId);

        const name = (person && (person.name || person.username)) || fallbackName || "NEXA Member";
        const picture = person && (person.profile_picture || person.profilePicture);

        const avatar = document.createElement("span");

        avatar.className = "nexa-conv-avatar";
        avatar.dataset.userId = String(userId);
        avatar.title = "View " + name + "'s profile";

        if (picture) {

            const image = document.createElement("img");

            image.src = picture;
            image.alt = name;
            image.loading = "lazy";

            /* broken photo → show the first letter instead */
            image.addEventListener("error", function () {
                avatar.textContent = String(name).trim().charAt(0).toUpperCase() || "N";
            });

            avatar.appendChild(image);

        } else {
            avatar.textContent = String(name).trim().charAt(0).toUpperCase() || "N";
        }

        return avatar;
    }

    /* ---------- add a photo to every friend box ---------- */

    function decorateConversations() {

        conversationsList.querySelectorAll(".conversationButton").forEach(function (button) {

            if (button.querySelector(".nexa-conv-avatar")) {
                return;
            }

            const userId = button.dataset.userId;

            if (!userId) {
                return;
            }

            const nameElement = button.querySelector("strong");

            const avatar = buildAvatar(
                userId,
                nameElement ? nameElement.textContent : ""
            );

            button.insertBefore(avatar, button.firstChild);
        });
    }

    new MutationObserver(decorateConversations).observe(conversationsList, {
        childList: true,
        subtree: true
    });

    decorateConversations();

    /* ---------- click the PHOTO -> that person's profile ---------- */

    conversationsList.addEventListener("click", function (event) {

        const avatar = event.target.closest(".nexa-conv-avatar");

        if (!avatar) {
            return;
        }

        /* stop the box from opening the chat */
        event.preventDefault();
        event.stopPropagation();

        window.location.href =
            "profile.html?user=" + encodeURIComponent(avatar.dataset.userId);

    }, true);

})();


/* =========================================================
   HOME PAGE — REEL VIEWER FIXES
   Runs after home.js has loaded (DOMContentLoaded), and
   replaces only the parts of the viewer that misbehaved.
========================================================= */

(function () {

    function installReelFixes() {

        const viewer = document.getElementById("reelViewer");
        const video = document.getElementById("reelViewerVideo");

        if (!viewer || !video || typeof loadViewerPost !== "function") {
            return;
        }

        const bar = viewer.querySelector(".reel-viewer-progress span");

        /* ---------- styles ---------- */

        const style = document.createElement("style");

        style.textContent = `
            /* The old invisible ▶ button sat on top of the reel and
               swallowed your click, so the viewer never opened. */
            .reel-play-button { display: none !important; }

            .reel-viewer-progress span { transition: none; }
        `;

        document.head.appendChild(style);

        /* no native controls: they fought with tap-to-pause */
        video.controls = false;
        video.removeAttribute("controls");

        /* ---------- live blue progress bar ---------- */

        let frame = null;

        function updateProgress() {

            if (!bar) {
                return;
            }

            const duration = video.duration;

            const percent =
                duration && isFinite(duration)
                    ? Math.min(100, (video.currentTime / duration) * 100)
                    : 0;

            bar.style.width = percent + "%";
        }

        function startProgress() {

            if (frame !== null) {
                return;
            }

            const tick = function () {
                updateProgress();
                frame = requestAnimationFrame(tick);
            };

            frame = requestAnimationFrame(tick);
        }

        function stopProgress() {

            if (frame !== null) {
                cancelAnimationFrame(frame);
                frame = null;
            }

            updateProgress();
        }

        video.addEventListener("play", startProgress);
        video.addEventListener("playing", startProgress);
        video.addEventListener("pause", stopProgress);
        video.addEventListener("ended", stopProgress);
        video.addEventListener("loadedmetadata", updateProgress);
        video.addEventListener("seeked", updateProgress);

        video.addEventListener("emptied", function () {
            stopProgress();
            if (bar) {
                bar.style.width = "0%";
            }
        });

        /* ---------- reliable playback ---------- */

        function startPlayback() {

            if (!viewerIsOpen) {
                return;
            }

            video.muted = false;
            video.volume = 1;

            const attempt = video.play();

            if (attempt && attempt.catch) {

                attempt.catch(function () {

                    /* browser blocked sound: play silently instead of freezing */
                    video.muted = true;
                    video.play().catch(function () { });
                });
            }
        }

        const originalLoadViewerPost = loadViewerPost;

        loadViewerPost = function (post) {

            originalLoadViewerPost(post);

            const type = String((post && post.mediaType) || "").toLowerCase();

            if (type !== "reel" && type !== "video") {
                return;
            }

            video.controls = false;

            if (bar) {
                bar.style.width = "0%";
            }

            /* play right away (inside your click), and again when data arrives */
            startPlayback();

            video.onloadeddata = function () {

                if (
                    viewerIsOpen &&
                    String(selectedViewerPostId) === String(post.id)
                ) {
                    startPlayback();
                }
            };
        };

        /* ---------- closing the viewer: resume the feed ---------- */

        const originalCloseViewer = closeViewer;

        closeViewer = function () {

            originalCloseViewer();

            stopProgress();

            if (typeof attachFeedVideoObservers === "function") {
                attachFeedVideoObservers();
            }
        };

        /* ---------- scrolling: one swipe = one reel ---------- */

        let wheelLock = 0;

        document.addEventListener("wheel", function (event) {

            if (!viewerIsOpen || !viewer.contains(event.target)) {
                return;
            }

            event.preventDefault();
            event.stopImmediatePropagation();

            const now = Date.now();

            /* trackpad momentum keeps firing: stay locked while it does */
            if (now < wheelLock) {
                wheelLock = Math.max(wheelLock, now + 160);
                return;
            }

            if (Math.abs(event.deltaY) < 30) {
                return;
            }

            wheelLock = now + 500;

            if (event.deltaY > 0) {
                showNextViewerPost();
            } else {
                showPreviousViewerPost();
            }

        }, { passive: false, capture: true });

        /* ---------- space bar = play / pause ---------- */

        document.addEventListener("keydown", function (event) {

            if (!viewerIsOpen) {
                return;
            }

            if (event.key === " " || event.code === "Space") {

                event.preventDefault();

                if (video.paused) {
                    video.play().catch(function () { });
                } else {
                    video.pause();
                }
            }
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", installReelFixes);
    } else {
        installReelFixes();
    }

})();


/* =========================================================
   HOME PAGE — NOTIFICATIONS (the heart with the blue dot)
   Shows who liked your posts / stories, who commented, and
   who sent you messages. Click the heart to open the panel.
========================================================= */

(function () {

    function initNotifications() {

        let me = "";

        try {
            const user = JSON.parse(localStorage.getItem("nexaCurrentUser"));
            me = String((user && (user.id || user._id || user.userId)) || "");
        } catch (_) { }

        const bell = document.getElementById("notificationButton");

        if (!bell || !me || typeof nexaSupabase === "undefined") {
            return;
        }

        const dot = bell.querySelector(".notification-dot");


        /* ---------- helpers ---------- */

        const esc = function (value) {
            const element = document.createElement("div");
            element.textContent = String(value == null ? "" : value);
            return element.innerHTML;
        };

        const mediaURL = function (value) {
            return typeof getMediaURL === "function" ? getMediaURL(value) : String(value || "");
        };

        function ago(timestamp) {

            if (!timestamp) {
                return "";
            }

            const date = new Date(timestamp);

            if (Number.isNaN(date.getTime())) {
                return "";
            }

            const seconds = Math.floor(Math.max(0, Date.now() - date.getTime()) / 1000);

            if (seconds < 60) return "Just now";

            const minutes = Math.floor(seconds / 60);

            if (minutes < 60) return minutes + "m";

            const hours = Math.floor(minutes / 60);

            if (hours < 24) return hours + "h";

            const days = Math.floor(hours / 24);

            if (days < 7) return days + "d";

            return date.toLocaleDateString([], { month: "short", day: "numeric" });
        }

        function messagePreview(message) {

            if (message.text) return message.text;

            const type = String(message.media_type || "");

            if (type.startsWith("audio/")) return "🎤 Voice message";
            if (type.startsWith("image/")) return "📷 Photo";
            if (type.startsWith("video/")) return "🎥 Video";
            if (type === "location") return "📍 Location";
            if (type.startsWith("call_missed")) return "📞 Missed call";

            return "New message";
        }


        /* ---------- state ---------- */

        const SEEN_KEY = "nexaNotifSeen_" + me;

        let seen = new Set();

        try {
            seen = new Set(JSON.parse(localStorage.getItem(SEEN_KEY)) || []);
        } catch (_) { }

        let items = [];
        let profiles = new Map();
        let unreadMessages = 0;
        let activeTab = "all";
        let panelOpen = false;
        let highlight = new Set();

        function saveSeen() {

            try {
                localStorage.setItem(SEEN_KEY, JSON.stringify(Array.from(seen).slice(-2000)));
            } catch (_) { }
        }


        /* ---------- styles ---------- */

        const style = document.createElement("style");

        style.textContent = `
            .notification-dot { transition: opacity .2s ease; }

            .topbar-badge {
                position: absolute; top: -5px; right: -5px;
                display: grid; min-width: 18px; height: 18px; place-items: center;
                padding: 0 5px; border: 2px solid #06101b; border-radius: 999px;
                background: linear-gradient(135deg, #ff4d6a, #e11d48); color: #fff;
                font-size: 9px; font-weight: 700; line-height: 1;
                box-shadow: 0 0 12px rgba(255, 77, 106, .55);
            }
            .topbar-badge[hidden] { display: none !important; }

            .nn-backdrop { position: fixed; z-index: 5400; inset: 0; background: rgba(2, 7, 14, .35); }
            .nn-backdrop[hidden], .nn-panel[hidden] { display: none !important; }

            .nn-panel {
                position: fixed; z-index: 5500; top: 76px; right: 24px;
                display: flex; width: min(400px, calc(100vw - 20px)); max-height: min(640px, calc(100vh - 100px));
                flex-direction: column; overflow: hidden;
                border: 1px solid rgba(144, 208, 255, .22); border-radius: 22px;
                background: linear-gradient(145deg, rgba(20, 46, 70, .97), rgba(8, 21, 35, .98));
                box-shadow: 0 30px 90px rgba(0, 0, 0, .6), 0 0 40px rgba(49, 150, 223, .12);
                -webkit-backdrop-filter: blur(24px); backdrop-filter: blur(24px);
                animation: nnIn .22s ease both;
            }
            @keyframes nnIn { from { opacity: 0; transform: translateY(-8px) scale(.98); } to { opacity: 1; transform: none; } }

            .nn-head { display: flex; align-items: center; gap: 10px; padding: 16px 16px 10px 18px; }
            .nn-head > div { flex: 1; min-width: 0; }
            .nn-kicker { color: #8bd5ff; font-size: 9px; font-weight: 700; letter-spacing: .17em; }
            .nn-head h3 { margin: 4px 0 0; font-family: "Space Grotesk", sans-serif; font-size: 19px; font-weight: 600; color: #edf7ff; }
            .nn-msgchip {
                display: inline-flex; align-items: center; gap: 6px; padding: 6px 11px;
                border: 1px solid rgba(255, 130, 147, .4); border-radius: 999px;
                background: rgba(255, 77, 106, .14); color: #ffd1d8; font-size: 11px; font-weight: 600;
            }
            .nn-msgchip[hidden] { display: none; }
            .nn-close {
                width: 34px; height: 34px; border: 1px solid rgba(170, 214, 255, .15); border-radius: 11px;
                background: rgba(136, 196, 255, .07); color: #cfeeff; font-size: 19px; cursor: pointer;
            }

            .nn-tabs { display: flex; gap: 6px; padding: 4px 16px 12px; overflow-x: auto; scrollbar-width: none; }
            .nn-tab {
                flex: 0 0 auto; min-height: 30px; padding: 0 12px; border: 1px solid rgba(170, 214, 255, .14);
                border-radius: 10px; background: rgba(123, 191, 255, .045); color: #bfd0df;
                font-size: 11px; font-weight: 600; cursor: pointer;
            }
            .nn-tab b { margin-left: 5px; color: #8bd5ff; font-weight: 700; }
            .nn-tab.active {
                border-color: rgba(128, 207, 255, .4);
                background: linear-gradient(135deg, rgba(74, 171, 237, .3), rgba(40, 119, 194, .2)); color: #fff;
            }

            .nn-list { flex: 1; overflow-y: auto; padding: 0 8px 10px; scrollbar-width: thin; }

            .nn-item {
                position: relative; display: flex; width: 100%; align-items: center; gap: 12px;
                padding: 11px 10px; border: 0; border-radius: 15px; background: transparent;
                color: #edf7ff; text-align: left; cursor: pointer; transition: background .15s ease;
            }
            .nn-item:hover { background: rgba(136, 196, 255, .08); }
            .nn-item.is-new { background: rgba(60, 150, 225, .12); }

            .nn-avatar {
                position: relative; display: grid; width: 44px; height: 44px; flex: 0 0 auto; place-items: center;
                overflow: visible; border: 2px solid rgba(126, 204, 255, .4); border-radius: 50%;
                background: linear-gradient(145deg, #347eae, #142d45);
                font-family: "Space Grotesk", sans-serif; font-weight: 700; color: #fff;
            }
            .nn-avatar img { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; }
            .nn-type {
                position: absolute; right: -4px; bottom: -4px; display: grid; width: 20px; height: 20px; place-items: center;
                border: 2px solid #0a1a2b; border-radius: 50%; background: #2589e8; font-size: 10px;
            }
            .nn-type.like { background: #ff4d6a; }
            .nn-type.msg { background: #59e5b0; }

            .nn-body { min-width: 0; flex: 1; font-size: 12.5px; line-height: 1.45; color: #cfe3f2; }
            .nn-body strong { color: #fff; }
            .nn-sub { display: block; overflow: hidden; margin-top: 2px; color: #91aabe; font-size: 11.5px; text-overflow: ellipsis; white-space: nowrap; }
            .nn-time { display: block; margin-top: 2px; color: #6f8ca2; font-size: 10px; }

            .nn-thumb {
                display: grid; width: 42px; height: 42px; flex: 0 0 auto; place-items: center; overflow: hidden;
                border: 1px solid rgba(170, 214, 255, .15); border-radius: 10px; background: #07111d; font-size: 15px;
            }
            .nn-thumb img, .nn-thumb video { width: 100%; height: 100%; object-fit: cover; }

            .nn-new-dot {
                width: 9px; height: 9px; flex: 0 0 auto; border-radius: 50%; background: #55baff; box-shadow: 0 0 10px #55baff;
            }

            .nn-count {
                display: grid; min-width: 22px; height: 22px; flex: 0 0 auto; place-items: center; padding: 0 6px;
                border-radius: 999px; background: linear-gradient(135deg, #ff4d6a, #e11d48); color: #fff; font-size: 11px; font-weight: 700;
            }

            .nn-empty { padding: 46px 20px; color: #91aabe; font-size: 12.5px; text-align: center; }

            @keyframes nnFlash {
                0%, 100% { box-shadow: 0 0 0 0 rgba(85, 186, 255, 0); }
                30% { box-shadow: 0 0 0 3px rgba(85, 186, 255, .85), 0 0 36px rgba(85, 186, 255, .5); }
            }
            .nn-flash { animation: nnFlash 2s ease; }

            @media (max-width: 650px) {
                .nn-panel { top: 68px; right: 10px; left: 10px; width: auto; max-height: calc(100vh - 150px); }
            }
        `;

        document.head.appendChild(style);


        /* ---------- red unread count on the top-bar message icon ---------- */

        const topMessages = document.querySelector('.topbar-actions a[href="messages.html"]');

        if (topMessages && !topMessages.querySelector("[data-unread-badge]")) {

            const badge = document.createElement("span");

            badge.className = "topbar-badge";
            badge.setAttribute("data-unread-badge", "");

            const cached = Number(localStorage.getItem("nexaUnreadCount") || 0);

            badge.textContent = cached > 99 ? "99+" : String(cached);
            badge.hidden = cached <= 0;

            topMessages.appendChild(badge);
        }


        /* ---------- panel ---------- */

        const holder = document.createElement("div");

        holder.innerHTML = `
            <div class="nn-backdrop" id="nnBackdrop" hidden></div>

            <section class="nn-panel" id="nnPanel" hidden role="dialog" aria-label="Notifications">

                <header class="nn-head">
                    <div>
                        <span class="nn-kicker">ACTIVITY</span>
                        <h3>Notifications</h3>
                    </div>

                    <a class="nn-msgchip" id="nnMsgChip" href="messages.html" hidden>✉ <b>0</b> unread</a>

                    <button type="button" class="nn-close" id="nnClose" aria-label="Close">×</button>
                </header>

                <div class="nn-tabs" id="nnTabs">
                    <button type="button" class="nn-tab active" data-tab="all">All</button>
                    <button type="button" class="nn-tab" data-tab="like">Likes</button>
                    <button type="button" class="nn-tab" data-tab="comment">Comments</button>
                    <button type="button" class="nn-tab" data-tab="message">Messages</button>
                </div>

                <div class="nn-list" id="nnList"></div>

            </section>
        `;

        while (holder.firstChild) {
            document.body.appendChild(holder.firstChild);
        }

        const backdrop = document.getElementById("nnBackdrop");
        const panel = document.getElementById("nnPanel");
        const list = document.getElementById("nnList");
        const tabs = document.getElementById("nnTabs");
        const chip = document.getElementById("nnMsgChip");


        /* ---------- load everything ---------- */

        async function fetchAll() {

            try {

                const [postsResult, storiesResult, messagesResult] = await Promise.all([

                    nexaSupabase
                        .from("posts")
                        .select("id, text, media, media_type, comments, created_at")
                        .eq("author_id", me)
                        .order("created_at", { ascending: false })
                        .limit(100),

                    nexaSupabase
                        .from("stories")
                        .select("id, media, media_type, likes, comments, created_at")
                        .eq("user_id", me)
                        .order("created_at", { ascending: false })
                        .limit(50),

                    nexaSupabase
                        .from("messages")
                        .select("id, sender_id, text, media_type, timestamp")
                        .eq("receiver_id", me)
                        .eq("read", false)
                        .order("timestamp", { ascending: false })
                        .limit(300)
                ]);

                const myPosts = postsResult.data || [];
                const myStories = storiesResult.data || [];
                const unread = messagesResult.data || [];

                const next = [];

                /* likes on my posts */

                if (myPosts.length) {

                    const likesResult = await nexaSupabase
                        .from("likes")
                        .select("*")
                        .in("post_id", myPosts.map(post => post.id));

                    const postById = new Map(myPosts.map(post => [String(post.id), post]));

                    (likesResult.data || []).forEach(like => {

                        if (String(like.user_id) === me) {
                            return;
                        }

                        const post = postById.get(String(like.post_id));

                        if (!post) {
                            return;
                        }

                        next.push({
                            key: "like:" + like.post_id + ":" + like.user_id,
                            type: "like",
                            userId: String(like.user_id),
                            time: like.created_at || null,
                            order: Number(like.id) || 0,
                            post
                        });
                    });
                }

                /* comments on my posts */

                myPosts.forEach(post => {

                    (Array.isArray(post.comments) ? post.comments : []).forEach(comment => {

                        if (!comment || String(comment.userId) === me) {
                            return;
                        }

                        next.push({
                            key: "comment:" + post.id + ":" + (comment.id || comment.createdAt),
                            type: "comment",
                            userId: String(comment.userId || ""),
                            name: comment.username,
                            time: comment.createdAt || null,
                            order: Number(comment.id) || 0,
                            text: comment.text || "",
                            post
                        });
                    });
                });

                /* likes + comments on my stories */

                myStories.forEach(story => {

                    (Array.isArray(story.likes) ? story.likes : []).forEach(userId => {

                        if (String(userId) === me) {
                            return;
                        }

                        next.push({
                            key: "slike:" + story.id + ":" + userId,
                            type: "like",
                            userId: String(userId),
                            time: null,
                            order: 0,
                            story
                        });
                    });

                    (Array.isArray(story.comments) ? story.comments : []).forEach(comment => {

                        if (!comment || String(comment.userId) === me) {
                            return;
                        }

                        next.push({
                            key: "scomment:" + story.id + ":" + (comment.id || comment.createdAt),
                            type: "comment",
                            userId: String(comment.userId || ""),
                            name: comment.username,
                            time: comment.createdAt || null,
                            order: Number(comment.id) || 0,
                            text: comment.text || "",
                            story
                        });
                    });
                });

                /* unread messages, one row per sender */

                const bySender = new Map();

                unread.forEach(message => {

                    const sender = String(message.sender_id);

                    if (!bySender.has(sender)) {
                        bySender.set(sender, { count: 0, latest: message });
                    }

                    bySender.get(sender).count++;
                });

                bySender.forEach((info, sender) => {

                    next.push({
                        key: "msg:" + sender + ":" + info.latest.id,
                        type: "message",
                        userId: sender,
                        time: info.latest.timestamp,
                        order: 0,
                        count: info.count,
                        text: messagePreview(info.latest)
                    });
                });

                unreadMessages = unread.length;

                /* names + photos */

                const ids = Array.from(new Set(next.map(item => item.userId).filter(Boolean)));

                if (ids.length) {

                    const profileResult = await nexaSupabase
                        .from("profiles")
                        .select("id, name, username, profile_picture")
                        .in("id", ids);

                    profiles = new Map((profileResult.data || []).map(profile => [String(profile.id), profile]));
                }

                next.sort((a, b) => {

                    const timeA = a.time ? Date.parse(a.time) : 0;
                    const timeB = b.time ? Date.parse(b.time) : 0;

                    if (timeA !== timeB) {
                        return timeB - timeA;
                    }

                    return (b.order || 0) - (a.order || 0);
                });

                items = next;

                /* new items that arrive while the panel is open */

                if (panelOpen) {

                    items.forEach(item => {
                        if (!seen.has(item.key)) {
                            highlight.add(item.key);
                        }
                    });

                    markAllSeen();
                    render();
                }

                updateDot();

            } catch (error) {
                console.error("NEXA notifications error:", error);
            }
        }


        /* ---------- blue dot ---------- */

        function unseenCount() {
            return items.filter(item => !seen.has(item.key)).length;
        }

        function updateDot() {

            const count = unseenCount();

            if (dot) {
                dot.style.display = count > 0 ? "" : "none";
            }

            bell.title = count > 0
                ? count + " new notification" + (count === 1 ? "" : "s")
                : "Notifications";
        }

        function markAllSeen() {

            items.forEach(item => seen.add(item.key));

            saveSeen();

            updateDot();
        }


        /* ---------- render ---------- */

        function render() {

            const counts = { all: items.length, like: 0, comment: 0, message: 0 };

            items.forEach(item => { counts[item.type]++; });

            tabs.querySelectorAll(".nn-tab").forEach(tab => {

                const key = tab.dataset.tab;

                tab.classList.toggle("active", key === activeTab);

                const label = { all: "All", like: "Likes", comment: "Comments", message: "Messages" }[key];

                tab.innerHTML = label + (counts[key] ? "<b>" + counts[key] + "</b>" : "");
            });

            chip.hidden = unreadMessages <= 0;
            chip.querySelector("b").textContent = unreadMessages > 99 ? "99+" : String(unreadMessages);

            const visible = items.filter(item => activeTab === "all" || item.type === activeTab);

            if (!visible.length) {

                list.innerHTML = `<div class="nn-empty">You're all caught up.<br>Likes, comments and messages will show here.</div>`;

                return;
            }

            list.innerHTML = visible.map(item => {

                const profile = profiles.get(item.userId);

                const name = (profile && (profile.name || profile.username)) || item.name || "Someone";

                const avatar = profile && profile.profile_picture
                    ? `<img src="${esc(mediaURL(profile.profile_picture))}" alt="${esc(name)}">`
                    : esc(name.trim().charAt(0).toUpperCase() || "N");

                let line = "";
                let sub = "";
                let badge = "❤";
                let badgeClass = "like";

                const target = item.post ? "post" : "story";

                if (item.type === "like") {

                    line = `<strong>${esc(name)}</strong> liked your ${target}.`;

                } else if (item.type === "comment") {

                    line = `<strong>${esc(name)}</strong> commented on your ${target}.`;
                    sub = item.text;
                    badge = "💬";
                    badgeClass = "";

                } else {

                    line = `<strong>${esc(name)}</strong> sent you ${item.count} message${item.count === 1 ? "" : "s"}.`;
                    sub = item.text;
                    badge = "✉";
                    badgeClass = "msg";
                }

                let thumb = "";

                if (item.post && item.post.media) {

                    const type = String(item.post.media_type || "").toLowerCase();

                    thumb = type === "video" || type === "reel"
                        ? `<span class="nn-thumb">▶</span>`
                        : `<span class="nn-thumb"><img src="${esc(mediaURL(item.post.media))}" alt="" loading="lazy"></span>`;

                } else if (item.story && item.story.media) {

                    thumb = String(item.story.media_type || "").startsWith("video")
                        ? `<span class="nn-thumb">▶</span>`
                        : `<span class="nn-thumb"><img src="${esc(mediaURL(item.story.media))}" alt="" loading="lazy"></span>`;
                }

                const isNew = highlight.has(item.key);

                return `
                    <button type="button" class="nn-item ${isNew ? "is-new" : ""}" data-key="${esc(item.key)}">
                        <span class="nn-avatar">${avatar}<span class="nn-type ${badgeClass}">${badge}</span></span>
                        <span class="nn-body">
                            ${line}
                            ${sub ? `<span class="nn-sub">${esc(sub)}</span>` : ""}
                            <span class="nn-time">${esc(ago(item.time))}</span>
                        </span>
                        ${item.type === "message" ? `<span class="nn-count">${item.count}</span>` : thumb}
                        ${isNew ? `<span class="nn-new-dot"></span>` : ""}
                    </button>
                `;
            }).join("");
        }


        /* ---------- open / close ---------- */

        function openPanel() {

            panelOpen = true;

            highlight = new Set(items.filter(item => !seen.has(item.key)).map(item => item.key));

            panel.hidden = false;
            backdrop.hidden = false;

            render();

            markAllSeen();

            fetchAll();
        }

        function closePanel() {

            panelOpen = false;

            panel.hidden = true;
            backdrop.hidden = true;

            highlight = new Set();
        }

        document.addEventListener("click", function (event) {

            if (!event.target.closest("#notificationButton")) {
                return;
            }

            /* take over from the old "You're all caught up" toast */
            event.preventDefault();
            event.stopPropagation();

            if (panelOpen) {
                closePanel();
            } else {
                openPanel();
            }

        }, true);

        backdrop.addEventListener("click", closePanel);
        document.getElementById("nnClose").addEventListener("click", closePanel);

        document.addEventListener("keydown", function (event) {
            if (event.key === "Escape" && panelOpen) {
                closePanel();
            }
        });

        tabs.addEventListener("click", function (event) {

            const tab = event.target.closest("[data-tab]");

            if (!tab) {
                return;
            }

            activeTab = tab.dataset.tab;

            render();
        });


        /* ---------- click a notification ---------- */

        list.addEventListener("click", function (event) {

            const row = event.target.closest("[data-key]");

            if (!row) {
                return;
            }

            const item = items.find(entry => entry.key === row.dataset.key);

            if (!item) {
                return;
            }

            closePanel();

            if (item.type === "message") {
                window.location.href = "messages.html?user=" + encodeURIComponent(item.userId);
                return;
            }

            if (item.story) {

                if (typeof openStory === "function") {
                    openStory(item.story.id);
                }

                return;
            }

            if (item.post) {

                if (item.type === "comment" && typeof openComments === "function") {
                    openComments(item.post.id);
                    return;
                }

                const card = document.querySelector('article[data-id="' + CSS.escape(String(item.post.id)) + '"]');

                if (card) {

                    card.scrollIntoView({ behavior: "smooth", block: "center" });

                    card.classList.remove("nn-flash");

                    void card.offsetWidth;

                    card.classList.add("nn-flash");

                    setTimeout(function () { card.classList.remove("nn-flash"); }, 2200);
                }
            }
        });


        /* ---------- keep it live ---------- */

        let timer = null;

        function refreshSoon() {
            clearTimeout(timer);
            timer = setTimeout(fetchAll, 400);
        }

        try {

            nexaSupabase
                .channel("nexa-notifications-" + me)
                .on("postgres_changes", { event: "INSERT", schema: "public", table: "likes" }, refreshSoon)
                .on("postgres_changes", { event: "UPDATE", schema: "public", table: "posts", filter: "author_id=eq." + me }, refreshSoon)
                .on("postgres_changes", { event: "UPDATE", schema: "public", table: "stories", filter: "user_id=eq." + me }, refreshSoon)
                .on("postgres_changes", { event: "*", schema: "public", table: "messages", filter: "receiver_id=eq." + me }, refreshSoon)
                .subscribe();

        } catch (error) {
            console.warn("NEXA notifications realtime unavailable:", error);
        }

        document.addEventListener("visibilitychange", function () {
            if (document.visibilityState === "visible") {
                refreshSoon();
            }
        });

        setInterval(fetchAll, 30000);

        updateDot();

        fetchAll();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initNotifications);
    } else {
        initNotifications();
    }

})();
