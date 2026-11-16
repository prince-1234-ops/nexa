/* =========================================================
   NEXA SHARED SCRIPT  (load AFTER supabase.js)

   1. Red unread-messages badge on the Messages menu item
   2. Messages page: every friend shows their circular profile
      photo + name. Click the photo = profile, box = chat.
   3. Home page: reel viewer fixes (clicking a reel plays it
      properly, live blue progress bar, smooth scrolling).
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
