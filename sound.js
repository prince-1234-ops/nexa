/* =========================================================
   NEXA SOUND PAGE
   Shows the original creator of a sound, every video that
   uses it, and a "Use this sound" button that opens the
   camera with the sound ready to play.

   Needs two columns on the posts table (run sounds.sql once):
   sound_id, sound_title
========================================================= */

if (typeof nexaSupabase === "undefined") {
    throw new Error("NEXA Supabase is not available.");
}

const currentUser = JSON.parse(localStorage.getItem("nexaCurrentUser"));

if (!currentUser) {
    window.location.href = "index.html";
    throw new Error("No NEXA user is logged in.");
}

const $ = id => document.getElementById(id);

const soundId = new URLSearchParams(window.location.search).get("id");

const soundAudio = $("soundAudio");

let rootPost = null;
let rootAuthor = null;
let uses = [];
let profiles = new Map();
let likesByPost = {};


/* ---------- helpers ---------- */

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

    if (/^(https?:|data:|blob:)/.test(value)) {
        return value;
    }

    return "http://localhost:3000/" + value.replace(/^\//, "");
}

function formatCount(number) {

    const value = Number(number || 0);

    if (value >= 1000000) return (value / 1000000).toFixed(1).replace(".0", "") + "M";
    if (value >= 1000) return (value / 1000).toFixed(1).replace(".0", "") + "K";

    return String(value);
}

function letter(name) {
    return String(name || "N").trim().charAt(0).toUpperCase() || "N";
}

function toast(text) {

    const area = $("notificationArea");

    if (!area) {
        return;
    }

    const notice = document.createElement("div");

    notice.className = "nexa-notification";
    notice.textContent = text;

    area.appendChild(notice);

    setTimeout(() => notice.remove(), 3200);
}

function avatarHTML(profile, fallbackName) {

    const picture = profile && profile.profile_picture;

    return picture
        ? `<img src="${escapeHTML(getMediaURL(picture))}" alt="">`
        : escapeHTML(letter((profile && (profile.name || profile.username)) || fallbackName));
}

function nameOf(post) {

    const profile = profiles.get(String(post.author_id));

    return (profile && (profile.name || profile.username)) || post.author_name || "NEXA User";
}


/* ---------- load ---------- */

async function load() {

    const mini = $("miniAvatar");

    const myPicture = currentUser.profile_picture || currentUser.profilePicture || "";

    if (mini) {
        mini.innerHTML = myPicture
            ? `<img src="${escapeHTML(getMediaURL(myPicture))}" alt="">`
            : `<span>${escapeHTML(letter(currentUser.name || currentUser.username))}</span>`;
    }

    if (!soundId) {
        $("soundTitle").textContent = "Sound not found";
        $("soundCount").textContent = "";
        return;
    }

    $("useSoundButton").href = "camera.html?sound=" + encodeURIComponent(soundId);
    $("soundPlayerUse").href = "camera.html?sound=" + encodeURIComponent(soundId);

    try {

        const { data: root, error: rootError } = await nexaSupabase
            .from("posts")
            .select("*")
            .eq("id", soundId)
            .maybeSingle();

        if (rootError) {
            throw rootError;
        }

        if (!root) {
            $("soundTitle").textContent = "Sound not found";
            $("soundCount").textContent = "This video may have been deleted.";
            return;
        }

        rootPost = root;

        /* every video that uses this sound */

        const { data: usesData, error: usesError } = await nexaSupabase
            .from("posts")
            .select("*")
            .eq("sound_id", String(soundId))
            .order("created_at", { ascending: false });

        if (usesError) {

            const note = $("soundNote");

            note.hidden = false;
            note.textContent =
                "To list videos that use a sound, run the one-time setup in sounds.sql in your Supabase SQL editor.";

            console.error("NEXA sound uses error:", usesError);

        } else {

            uses = (usesData || []).filter(post => String(post.id) !== String(root.id));
        }

        const all = [root, ...uses];

        const authorIds = [...new Set(all.map(post => post.author_id).filter(Boolean).map(String))];

        if (authorIds.length) {

            const { data: profileData } = await nexaSupabase
                .from("profiles")
                .select("id, name, username, profile_picture")
                .in("id", authorIds);

            profiles = new Map((profileData || []).map(profile => [String(profile.id), profile]));
        }

        const ids = all.map(post => post.id);

        const { data: likeData } = await nexaSupabase
            .from("likes")
            .select("post_id")
            .in("post_id", ids);

        (likeData || []).forEach(like => {
            likesByPost[String(like.post_id)] = (likesByPost[String(like.post_id)] || 0) + 1;
        });

        render();

    } catch (error) {

        console.error("NEXA sound page error:", error);

        $("soundTitle").textContent = "Could not load this sound";
        $("soundCount").textContent = "";
    }
}


/* ---------- render ---------- */

function tileHTML(post, isOriginal) {

    const profile = profiles.get(String(post.author_id));
    const name = nameOf(post);

    return `
        <button type="button" class="rl-card" data-id="${escapeHTML(post.id)}" title="${escapeHTML(post.text || name)}">

            <video src="${escapeHTML(getMediaURL(post.media))}#t=0.1" muted loop playsinline preload="metadata"></video>

            <span class="rl-shade"></span>

            <span class="rl-play">▶</span>

            ${isOriginal ? `<span class="sound-badge">ORIGINAL</span>` : ""}

            <span class="rl-meta">

                <span class="rl-author">
                    <span class="rl-avatar">${avatarHTML(profile, name)}</span>
                    <span class="rl-name">${escapeHTML(name)}</span>
                </span>

                ${post.text ? `<span class="rl-caption">${escapeHTML(post.text)}</span>` : ""}

                <span class="rl-stats">
                    <span class="rl-stat">♡ <b>${formatCount(likesByPost[String(post.id)] || 0)}</b></span>
                    <span class="rl-stat">💬 <b>${formatCount(Array.isArray(post.comments) ? post.comments.length : 0)}</b></span>
                </span>

            </span>

        </button>
    `;
}

function render() {

    const owner = profiles.get(String(rootPost.author_id));
    const ownerName = nameOf(rootPost);

    $("soundTitle").textContent = rootPost.sound_title || "Original sound";

    $("soundOwnerName").textContent = ownerName;
    $("soundOwnerAvatar").innerHTML = avatarHTML(owner, ownerName);
    $("soundOwner").href = "profile.html?user=" + encodeURIComponent(String(rootPost.author_id));

    const total = uses.length + 1;

    $("soundCount").textContent =
        total === 1 ? "1 video" : formatCount(total) + " videos";

    $("soundUsesCount").textContent = uses.length ? "(" + uses.length + ")" : "";

    $("soundOriginal").innerHTML = tileHTML(rootPost, true);

    $("soundGrid").innerHTML = uses.map(post => tileHTML(post, false)).join("");

    $("soundEmpty").hidden = uses.length > 0 || !$("soundNote").hidden;

    document.querySelectorAll(".sound-grid .rl-card").forEach(card => {

        const video = card.querySelector("video");

        card.addEventListener("mouseenter", () => video.play().catch(() => { }));

        card.addEventListener("mouseleave", () => {
            video.pause();
            try { video.currentTime = 0.1; } catch (_) { }
        });

        card.addEventListener("click", () => {

            const post = [rootPost, ...uses].find(item => String(item.id) === card.dataset.id);

            if (post) {
                openPlayer(post);
            }
        });
    });
}


/* ---------- play the sound ---------- */

let soundPlaying = false;

function setSoundButton(playing) {

    soundPlaying = playing;

    $("soundPlay").textContent = playing ? "⏸ Pause sound" : "▶ Play sound";
    $("soundCoverIcon").textContent = playing ? "❚❚" : "♪";
    $("soundCover").classList.toggle("is-playing", playing);
}

function toggleSound() {

    if (!rootPost) {
        return;
    }

    if (soundPlaying) {
        soundAudio.pause();
        setSoundButton(false);
        return;
    }

    if (!soundAudio.src) {
        soundAudio.src = getMediaURL(rootPost.media);
    }

    soundAudio.play()
        .then(() => setSoundButton(true))
        .catch(() => toast("Could not play this sound."));
}

soundAudio.addEventListener("ended", () => setSoundButton(false));

$("soundPlay").addEventListener("click", toggleSound);
$("soundCover").addEventListener("click", toggleSound);


/* ---------- simple fullscreen player ---------- */

function openPlayer(post) {

    soundAudio.pause();
    setSoundButton(false);

    const video = $("soundPlayerVideo");

    video.src = getMediaURL(post.media);
    video.muted = false;

    $("soundPlayerName").textContent = nameOf(post);
    $("soundPlayerCaption").textContent = post.text || "";

    $("soundPlayer").hidden = false;

    document.body.style.overflow = "hidden";

    video.play().catch(() => {
        video.muted = true;
        video.play().catch(() => { });
    });
}

function closePlayer() {

    const video = $("soundPlayerVideo");

    video.pause();
    video.removeAttribute("src");
    video.load();

    $("soundPlayer").hidden = true;

    document.body.style.overflow = "";
}

$("soundPlayerClose").addEventListener("click", closePlayer);

$("soundPlayer").addEventListener("click", event => {
    if (event.target === $("soundPlayer")) {
        closePlayer();
    }
});

document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !$("soundPlayer").hidden) {
        closePlayer();
    }
});

$("soundBack").addEventListener("click", () => {

    if (window.history.length > 1) {
        window.history.back();
    } else {
        window.location.href = "reels.html";
    }
});

load();
