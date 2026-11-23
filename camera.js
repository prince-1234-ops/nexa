/* =========================================================
   NEXA CAMERA
   - records reels in clips ("scenes")
   - plays a chosen sound while you record
   - face effects (dog, cat, bunny, crown, glasses, hearts)
     and colour filters
   - Undo clip = go back to the last good scene and continue
   - Restart = throw everything away and start again
   - Post = upload and publish as a reel (with its sound)
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

const canvas = $("camCanvas");
const ctx = canvas.getContext("2d");
const video = $("camVideo");

if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h) {
        this.rect(x, y, w, h);
    };
}

const W = canvas.width;
const H = canvas.height;

const MAX_SECONDS = 60;

const soundParam = new URLSearchParams(window.location.search).get("sound");


/* =========================================================
   STATE
========================================================= */

let facing = "user";
let camStream = null;

let audioCtx = null;
let audioDest = null;
let outStream = null;
let micStream = null;

let sound = null;          /* { id, url, title } */
let soundEl = null;
let maxSeconds = MAX_SECONDS;

let effect = "none";
let colorFilter = "none";
let landmarker = null;
let landmarkerState = "idle";   /* idle | loading | ready | failed */
let lastDetectTime = 0;

let segments = [];         /* { blob, url, duration } */
let recording = false;
let recorder = null;
let chunks = [];
let recStart = 0;
let recMime = "";

let reviewIndex = 0;

let drawInfo = { dx: 0, dy: 0, dw: W, dh: H, mirror: true };


/* =========================================================
   SMALL HELPERS
========================================================= */

function getUserId() {
    return currentUser.id || currentUser._id || currentUser.userId || currentUser.email || "nexa-user";
}

function getUsername() {
    return currentUser.username || currentUser.name || currentUser.email || "NEXA User";
}

function getUserAvatar() {
    return currentUser.profile_picture || currentUser.profilePicture || currentUser.avatar || "";
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

let toastTimer = null;

function toast(text) {

    const element = $("camToast");

    element.textContent = text;
    element.classList.add("show");

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => element.classList.remove("show"), 2600);
}

function showMessage(title, text, retry) {

    $("camMessageTitle").textContent = title;
    $("camMessageText").textContent = text;
    $("camRetry").hidden = !retry;
    $("camMessage").hidden = false;
}

function hideMessage() {
    $("camMessage").hidden = true;
}

function pickMime() {

    if (typeof MediaRecorder === "undefined") {
        return "";
    }

    const list = [
        "video/mp4;codecs=avc1,mp4a.40.2",
        "video/mp4",
        "video/webm;codecs=vp9,opus",
        "video/webm;codecs=vp8,opus",
        "video/webm"
    ];

    return list.find(type => MediaRecorder.isTypeSupported(type)) || "";
}

function fmt(seconds) {

    const total = Math.max(0, Math.floor(seconds));

    return String(Math.floor(total / 60)).padStart(2, "0") + ":" + String(total % 60).padStart(2, "0");
}

function recordedSeconds() {
    return segments.reduce((sum, segment) => sum + segment.duration, 0);
}

function currentSeconds() {

    return recordedSeconds() + (recording ? (performance.now() - recStart) / 1000 : 0);
}


/* =========================================================
   SOUND (the sound someone else made)
========================================================= */

async function loadSound() {

    if (!soundParam) {
        return;
    }

    try {

        const { data, error } = await nexaSupabase
            .from("posts")
            .select("id, media, sound_title, author_name")
            .eq("id", soundParam)
            .maybeSingle();

        if (error || !data || !data.media) {
            throw error || new Error("Sound not found.");
        }

        sound = {
            id: data.id,
            url: getMediaURL(data.media),
            title: data.sound_title || "Original sound · " + (data.author_name || "NEXA")
        };

        soundEl = new Audio();

        soundEl.crossOrigin = "anonymous";
        soundEl.preload = "auto";
        soundEl.src = sound.url;

        soundEl.addEventListener("loadedmetadata", () => {

            if (isFinite(soundEl.duration) && soundEl.duration > 1) {
                maxSeconds = Math.min(MAX_SECONDS, soundEl.duration);
            }
        });

        $("camSound").hidden = false;
        $("camSoundText").textContent = sound.title;

    } catch (error) {

        console.error("NEXA camera sound error:", error);

        toast("Could not load that sound. Recording without it.");

        sound = null;
        soundEl = null;
    }
}


/* =========================================================
   CAMERA
========================================================= */

async function startCamera() {

    showMessage("Starting camera…", "Please allow camera and microphone access.", false);

    if (camStream) {
        camStream.getTracks().forEach(track => track.stop());
        camStream = null;
    }

    try {

        camStream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: facing,
                width: { ideal: 1280 },
                height: { ideal: 720 }
            },
            audio: false
        });

        video.srcObject = camStream;

        await video.play();

        hideMessage();

    } catch (error) {

        console.error("NEXA camera error:", error);

        showMessage(
            "Camera not available",
            "Allow camera access in your browser, then try again. The page must be opened with https or localhost.",
            true
        );
    }
}

$("camRetry").addEventListener("click", startCamera);

$("camFlip").addEventListener("click", () => {

    if (recording) {
        toast("Stop recording before flipping the camera.");
        return;
    }

    facing = facing === "user" ? "environment" : "user";

    startCamera();
});


/* =========================================================
   FACE EFFECTS MODEL (loaded the first time you pick one)
========================================================= */

async function loadFaceModel() {

    if (landmarkerState === "loading" || landmarkerState === "ready") {
        return;
    }

    landmarkerState = "loading";

    toast("Loading face effects…");

    try {

        const base = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";

        const vision = await import(base + "/vision_bundle.mjs");

        const fileset = await vision.FilesetResolver.forVisionTasks(base + "/wasm");

        const modelPath =
            "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

        try {

            landmarker = await vision.FaceLandmarker.createFromOptions(fileset, {
                baseOptions: { modelAssetPath: modelPath, delegate: "GPU" },
                runningMode: "VIDEO",
                numFaces: 1
            });

        } catch (_) {

            landmarker = await vision.FaceLandmarker.createFromOptions(fileset, {
                baseOptions: { modelAssetPath: modelPath },
                runningMode: "VIDEO",
                numFaces: 1
            });
        }

        landmarkerState = "ready";

        toast("Face effects ready.");

    } catch (error) {

        console.error("NEXA face model error:", error);

        landmarkerState = "failed";

        toast("Face effects need an internet connection and a newer browser.");
    }
}


/* =========================================================
   DRAWING
========================================================= */

const COLOR_FILTERS = {
    none: "none",
    warm: "sepia(0.35) saturate(1.3) hue-rotate(-10deg)",
    cool: "saturate(1.2) hue-rotate(15deg) brightness(1.05)",
    bw: "grayscale(1)",
    vintage: "sepia(0.6) contrast(1.1) brightness(0.95)",
    neon: "saturate(2) contrast(1.15) hue-rotate(-30deg)",
    soft: "brightness(1.1) contrast(0.92) saturate(1.1)"
};

const TINTS = {
    warm: "rgba(255,160,60,0.18)",
    cool: "rgba(60,140,255,0.18)",
    vintage: "rgba(160,110,50,0.25)",
    neon: "rgba(255,0,200,0.15)",
    soft: "rgba(255,255,255,0.08)"
};

const hasCtxFilter = "filter" in CanvasRenderingContext2D.prototype;

const EMOJI_FONT = "'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif";

function render(now) {

    requestAnimationFrame(render);

    if (video.readyState < 2 || !video.videoWidth) {
        return;
    }

    const vw = video.videoWidth;
    const vh = video.videoHeight;

    const scale = Math.max(W / vw, H / vh);

    const dw = vw * scale;
    const dh = vh * scale;

    const mirror = facing === "user";

    drawInfo = { dx: (W - dw) / 2, dy: (H - dh) / 2, dw, dh, mirror };

    ctx.save();

    if (mirror) {
        ctx.translate(W, 0);
        ctx.scale(-1, 1);
    }

    if (hasCtxFilter) {
        ctx.filter = COLOR_FILTERS[colorFilter] || "none";
    }

    ctx.drawImage(video, drawInfo.dx, drawInfo.dy, dw, dh);

    ctx.restore();

    if (hasCtxFilter) {
        ctx.filter = "none";
    } else if (TINTS[colorFilter]) {
        ctx.fillStyle = TINTS[colorFilter];
        ctx.fillRect(0, 0, W, H);
    }

    if (effect !== "none" && landmarker && landmarkerState === "ready") {

        try {

            const stamp = Math.max(performance.now(), lastDetectTime + 1);

            lastDetectTime = stamp;

            const result = landmarker.detectForVideo(video, stamp);

            if (result.faceLandmarks && result.faceLandmarks[0]) {
                drawFaceEffect(result.faceLandmarks[0], now || performance.now());
            }

        } catch (error) {
            /* a missed frame is fine */
        }
    }

    renderProgress();
}

function drawFaceEffect(lm, time) {

    const { dx, dy, dw, dh, mirror } = drawInfo;

    const P = index => {

        const point = lm[index];

        let x = dx + point.x * dw;

        if (mirror) {
            x = W - x;
        }

        return { x, y: dy + point.y * dh };
    };

    const eyeA = P(33);
    const eyeB = P(263);

    const left = eyeA.x < eyeB.x ? eyeA : eyeB;
    const right = eyeA.x < eyeB.x ? eyeB : eyeA;

    const angle = Math.atan2(right.y - left.y, right.x - left.x);

    const edgeA = P(234);
    const edgeB = P(454);

    const fw = Math.hypot(edgeB.x - edgeA.x, edgeB.y - edgeA.y);

    const top = P(10);
    const nose = P(1);
    const lipTop = P(13);
    const lipBottom = P(14);

    const mouthOpen = Math.hypot(lipTop.x - lipBottom.x, lipTop.y - lipBottom.y) / fw > 0.06;

    const at = (point, draw) => {
        ctx.save();
        ctx.translate(point.x, point.y);
        ctx.rotate(angle);
        draw();
        ctx.restore();
    };

    const emoji = (text, size) => {
        ctx.font = size + "px " + EMOJI_FONT;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(text, 0, 0);
    };

    if (effect === "dog") {

        at(top, () => {

            [-1, 1].forEach(side => {

                ctx.save();
                ctx.translate(side * fw * 0.43, fw * 0.1);
                ctx.rotate(side * 0.35);

                ctx.fillStyle = "#8b5a2b";
                ctx.beginPath();
                ctx.ellipse(0, fw * 0.12, fw * 0.14, fw * 0.28, 0, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = "#5e3a1a";
                ctx.beginPath();
                ctx.ellipse(0, fw * 0.14, fw * 0.08, fw * 0.2, 0, 0, Math.PI * 2);
                ctx.fill();

                ctx.restore();
            });
        });

        at(nose, () => {

            ctx.fillStyle = "#111";
            ctx.beginPath();
            ctx.ellipse(0, 0, fw * 0.085, fw * 0.06, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = "rgba(255,255,255,0.55)";
            ctx.beginPath();
            ctx.ellipse(-fw * 0.025, -fw * 0.02, fw * 0.025, fw * 0.015, 0, 0, Math.PI * 2);
            ctx.fill();
        });

        if (mouthOpen) {

            at(lipBottom, () => {

                ctx.fillStyle = "#ff6f8f";
                ctx.beginPath();
                ctx.roundRect(-fw * 0.07, 0, fw * 0.14, fw * 0.2, fw * 0.07);
                ctx.fill();

                ctx.strokeStyle = "#d94a6d";
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(0, fw * 0.02);
                ctx.lineTo(0, fw * 0.14);
                ctx.stroke();
            });
        }
    }

    if (effect === "cat") {

        at(top, () => {

            [-1, 1].forEach(side => {

                ctx.fillStyle = "#3a3a46";
                ctx.beginPath();
                ctx.moveTo(side * fw * 0.14, fw * 0.14);
                ctx.lineTo(side * fw * 0.46, fw * 0.1);
                ctx.lineTo(side * fw * 0.36, -fw * 0.26);
                ctx.closePath();
                ctx.fill();

                ctx.fillStyle = "#ff9fb8";
                ctx.beginPath();
                ctx.moveTo(side * fw * 0.2, fw * 0.1);
                ctx.lineTo(side * fw * 0.4, fw * 0.08);
                ctx.lineTo(side * fw * 0.35, -fw * 0.15);
                ctx.closePath();
                ctx.fill();
            });
        });

        at(nose, () => {

            ctx.fillStyle = "#ff7fa3";
            ctx.beginPath();
            ctx.moveTo(-fw * 0.05, -fw * 0.02);
            ctx.lineTo(fw * 0.05, -fw * 0.02);
            ctx.lineTo(0, fw * 0.04);
            ctx.closePath();
            ctx.fill();

            ctx.strokeStyle = "rgba(255,255,255,0.9)";
            ctx.lineWidth = 3;
            ctx.lineCap = "round";

            [-1, 1].forEach(side => {
                [-0.06, 0.02, 0.1].forEach(k => {
                    ctx.beginPath();
                    ctx.moveTo(side * fw * 0.14, fw * 0.03);
                    ctx.lineTo(side * fw * 0.55, fw * 0.03 + fw * k);
                    ctx.stroke();
                });
            });
        });
    }

    if (effect === "bunny") {

        at(top, () => {

            [-1, 1].forEach(side => {

                ctx.save();
                ctx.translate(side * fw * 0.2, -fw * 0.36);
                ctx.rotate(side * 0.12);

                ctx.fillStyle = "#f4eff7";
                ctx.beginPath();
                ctx.ellipse(0, 0, fw * 0.1, fw * 0.37, 0, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = "#ffb3c8";
                ctx.beginPath();
                ctx.ellipse(0, fw * 0.02, fw * 0.055, fw * 0.28, 0, 0, Math.PI * 2);
                ctx.fill();

                ctx.restore();
            });
        });

        at(nose, () => {

            ctx.fillStyle = "#ff8fb0";
            ctx.beginPath();
            ctx.arc(0, 0, fw * 0.04, 0, Math.PI * 2);
            ctx.fill();
        });

        {

            at(lipTop, () => {

                ctx.fillStyle = "#fff";
                ctx.strokeStyle = "rgba(0,0,0,0.25)";
                ctx.lineWidth = 2;

                [-1, 1].forEach(side => {
                    ctx.beginPath();
                    ctx.roundRect(side === -1 ? -fw * 0.058 : fw * 0.004, fw * 0.012, fw * 0.054, fw * 0.075, 6);
                    ctx.fill();
                    ctx.stroke();
                });
            });
        }
    }

    if (effect === "crown") {

        at(top, () => {
            ctx.fillStyle = "#fff";
            ctx.translate(0, -fw * 0.1);
            emoji("👑", fw * 0.9);
        });
    }

    if (effect === "glasses") {

        const middle = { x: (left.x + right.x) / 2, y: (left.y + right.y) / 2 };

        const gap = Math.hypot(right.x - left.x, right.y - left.y);

        at(middle, () => {
            ctx.fillStyle = "#fff";
            emoji("🕶️", gap * 2.25);
        });
    }

    if (effect === "hearts") {

        at(top, () => {

            ctx.fillStyle = "#fff";

            for (let i = 0; i < 6; i++) {

                const phase = time * 0.0022 + (i * Math.PI * 2) / 6;

                ctx.save();
                ctx.translate(Math.cos(phase) * fw * 0.75, Math.sin(phase) * fw * 0.3 - fw * 0.2);
                ctx.globalAlpha = 0.75 + Math.sin(phase * 2) * 0.25;
                emoji(i % 2 ? "💖" : "❤️", fw * (0.16 + (i % 3) * 0.03));
                ctx.restore();
            }
        });
    }
}


/* =========================================================
   EFFECTS + FILTERS TRAY
========================================================= */

const EFFECTS = [
    { id: "none", icon: "🚫", label: "None" },
    { id: "dog", icon: "🐶", label: "Dog" },
    { id: "cat", icon: "🐱", label: "Cat" },
    { id: "bunny", icon: "🐰", label: "Bunny" },
    { id: "crown", icon: "👑", label: "Crown" },
    { id: "glasses", icon: "🕶️", label: "Cool" },
    { id: "hearts", icon: "💖", label: "Hearts" }
];

const FILTERS = [
    { id: "none", icon: "⭕", label: "Normal" },
    { id: "warm", icon: "🌅", label: "Warm" },
    { id: "cool", icon: "❄️", label: "Cool" },
    { id: "bw", icon: "⚫", label: "B&W" },
    { id: "vintage", icon: "📷", label: "Vintage" },
    { id: "neon", icon: "🌈", label: "Neon" },
    { id: "soft", icon: "☁️", label: "Soft" }
];

let trayMode = null;

function openTray(mode) {

    if (trayMode === mode) {
        closeTray();
        return;
    }

    trayMode = mode;

    const list = mode === "effects" ? EFFECTS : FILTERS;
    const selected = mode === "effects" ? effect : colorFilter;

    $("camTrayTitle").textContent = mode === "effects" ? "Face effects" : "Colour filters";

    $("camTrayRow").innerHTML = list.map(item => `
        <button type="button" class="cam-chip ${item.id === selected ? "selected" : ""}" data-id="${item.id}">
            <span>${item.icon}</span>
            <small>${item.label}</small>
        </button>
    `).join("");

    $("camTray").hidden = false;

    $("camEffectsButton").classList.toggle("active", mode === "effects");
    $("camFiltersButton").classList.toggle("active", mode === "filters");
}

function closeTray() {

    trayMode = null;

    $("camTray").hidden = true;

    $("camEffectsButton").classList.remove("active");
    $("camFiltersButton").classList.remove("active");
}

$("camEffectsButton").addEventListener("click", () => openTray("effects"));
$("camFiltersButton").addEventListener("click", () => openTray("filters"));

$("camTrayRow").addEventListener("click", event => {

    const chip = event.target.closest("[data-id]");

    if (!chip) {
        return;
    }

    const id = chip.dataset.id;

    if (trayMode === "effects") {

        effect = id;

        if (id !== "none") {
            loadFaceModel();
        }

        $("camEffectsButton").querySelector("span").textContent =
            id === "none" ? "🐶" : EFFECTS.find(item => item.id === id).icon;

    } else {

        colorFilter = id;
    }

    $("camTrayRow").querySelectorAll(".cam-chip").forEach(item => {
        item.classList.toggle("selected", item === chip);
    });
});

/* tap the picture to close the tray */

canvas.addEventListener("click", closeTray);


/* =========================================================
   AUDIO GRAPH (sound or microphone -> recording)
========================================================= */

async function ensureAudio() {

    if (!audioCtx) {

        const AudioContextClass = window.AudioContext || window.webkitAudioContext;

        audioCtx = new AudioContextClass();

        audioDest = audioCtx.createMediaStreamDestination();

        if (soundEl) {

            /* the sound is heard by you AND recorded into the video */

            const source = audioCtx.createMediaElementSource(soundEl);

            source.connect(audioDest);
            source.connect(audioCtx.destination);

        } else {

            try {

                micStream = await navigator.mediaDevices.getUserMedia({ audio: true });

                audioCtx.createMediaStreamSource(micStream).connect(audioDest);

            } catch (error) {

                console.warn("NEXA camera: no microphone.", error);

                toast("No microphone: your reel will have no sound.");
            }
        }

        outStream = new MediaStream([
            ...canvas.captureStream(30).getVideoTracks(),
            ...audioDest.stream.getAudioTracks()
        ]);
    }

    if (audioCtx.state === "suspended") {
        await audioCtx.resume();
    }
}


/* =========================================================
   RECORDING IN CLIPS
========================================================= */

async function startClip() {

    if (recording) {
        return;
    }

    if (recordedSeconds() >= maxSeconds - 0.3) {
        toast("You reached the maximum length.");
        return;
    }

    if (!camStream) {
        toast("Camera is not ready yet.");
        return;
    }

    recMime = pickMime();

    if (!recMime && typeof MediaRecorder === "undefined") {
        toast("This browser cannot record video.");
        return;
    }

    closeTray();

    await ensureAudio();

    chunks = [];

    recorder = new MediaRecorder(outStream, recMime ? { mimeType: recMime, videoBitsPerSecond: 3500000 } : undefined);

    recorder.ondataavailable = event => {
        if (event.data && event.data.size) {
            chunks.push(event.data);
        }
    };

    recorder.onstop = () => {

        const duration = (performance.now() - recStart) / 1000;

        const blob = new Blob(chunks, { type: recorder.mimeType || recMime || "video/webm" });

        if (duration >= 0.5 && blob.size > 0) {

            segments.push({ blob, url: URL.createObjectURL(blob), duration });

        } else {

            toast("Clip too short, it was not saved.");
        }

        recording = false;

        updateButtons();
    };

    /* the sound continues exactly where the last good clip ended */

    if (soundEl) {

        try {
            soundEl.currentTime = recordedSeconds();
        } catch (_) { }

        soundEl.play().catch(() => toast("Could not play the sound."));
    }

    recStart = performance.now();

    recorder.start(200);

    recording = true;

    updateButtons();
}

function stopClip() {

    if (!recording || !recorder) {
        return;
    }

    if (soundEl) {
        soundEl.pause();
    }

    if (recorder.state !== "inactive") {
        recorder.stop();
    }
}

$("camRecord").addEventListener("click", () => {

    if (recording) {
        stopClip();
    } else {
        startClip();
    }
});

$("camUndo").addEventListener("click", () => {

    if (recording || !segments.length) {
        return;
    }

    const removed = segments.pop();

    URL.revokeObjectURL(removed.url);

    toast("Last clip removed. Continue from the previous scene.");

    updateButtons();
});

$("camRestart").addEventListener("click", () => {

    if (recording) {
        stopClip();
    }

    if (!segments.length) {
        return;
    }

    if (!confirm("Start again? All recorded clips will be removed.")) {
        return;
    }

    segments.forEach(segment => URL.revokeObjectURL(segment.url));

    segments = [];

    if (soundEl) {
        try { soundEl.currentTime = 0; } catch (_) { }
    }

    updateButtons();
});

function updateButtons() {

    const hasClips = segments.length > 0;

    $("camRecord").classList.toggle("recording", recording);

    $("camUndo").disabled = recording || !hasClips;
    $("camRestart").disabled = !hasClips && !recording;
    $("camNext").disabled = !hasClips;
}

function renderProgress() {

    const total = maxSeconds;

    let html = segments
        .map(segment => `<i style="width:${(segment.duration / total) * 100}%"></i>`)
        .join("");

    if (recording) {

        const live = (performance.now() - recStart) / 1000;

        html += `<i class="live" style="width:${(live / total) * 100}%"></i>`;

        if (currentSeconds() >= maxSeconds) {
            stopClip();
        }
    }

    const bar = $("camProgress");

    if (bar.dataset.html !== html) {
        bar.innerHTML = html;
        bar.dataset.html = html;
    }

    $("camTime").textContent = fmt(currentSeconds());
}


/* =========================================================
   REVIEW
========================================================= */

function playReview() {

    const player = $("camReviewVideo");

    if (!segments.length) {
        return;
    }

    reviewIndex = reviewIndex % segments.length;

    player.src = segments[reviewIndex].url;

    player.play().catch(() => { });
}

$("camReviewVideo").addEventListener("ended", () => {

    reviewIndex = (reviewIndex + 1) % segments.length;

    playReview();
});

$("camNext").addEventListener("click", () => {

    if (recording) {
        stopClip();
    }

    /* wait a moment so the last clip is saved */

    setTimeout(() => {

        if (!segments.length) {
            return;
        }

        reviewIndex = 0;

        $("camReviewNote").textContent =
            segments.length + (segments.length === 1 ? " clip" : " clips") +
            " · " + fmt(recordedSeconds()) +
            (sound ? " · " + sound.title : "");

        $("camReview").hidden = false;

        playReview();

    }, 300);
});

$("camBack").addEventListener("click", () => {

    const player = $("camReviewVideo");

    player.pause();
    player.removeAttribute("src");

    $("camReview").hidden = true;
});


/* =========================================================
   JOIN CLIPS INTO ONE VIDEO (only when there is more than one)
========================================================= */

async function mergeSegments(list, onProgress) {

    const mergeCanvas = document.createElement("canvas");

    mergeCanvas.width = W;
    mergeCanvas.height = H;

    const mergeCtx = mergeCanvas.getContext("2d");

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;

    const mergeAudio = new AudioContextClass();

    await mergeAudio.resume();

    const destination = mergeAudio.createMediaStreamDestination();

    const stream = new MediaStream([
        ...mergeCanvas.captureStream(30).getVideoTracks(),
        ...destination.stream.getAudioTracks()
    ]);

    const mime = pickMime();

    const mergeRecorder = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: 3500000 } : undefined);

    const parts = [];

    mergeRecorder.ondataavailable = event => {
        if (event.data && event.data.size) {
            parts.push(event.data);
        }
    };

    const finished = new Promise(resolve => {
        mergeRecorder.onstop = resolve;
    });

    mergeRecorder.start(250);

    const total = list.reduce((sum, segment) => sum + segment.duration, 0);

    let done = 0;

    for (const segment of list) {

        const element = document.createElement("video");

        element.src = segment.url;
        element.playsInline = true;

        mergeAudio.createMediaElementSource(element).connect(destination);

        await new Promise((resolve, reject) => {

            let frame = null;

            const draw = () => {

                mergeCtx.drawImage(element, 0, 0, W, H);

                onProgress(Math.min(1, (done + element.currentTime) / total));

                frame = requestAnimationFrame(draw);
            };

            element.onended = () => {
                cancelAnimationFrame(frame);
                resolve();
            };

            element.onerror = () => {
                cancelAnimationFrame(frame);
                reject(new Error("Could not read a clip."));
            };

            element.play().then(() => {
                frame = requestAnimationFrame(draw);
            }).catch(reject);
        });

        done += segment.duration;
    }

    mergeRecorder.stop();

    await finished;

    try { mergeAudio.close(); } catch (_) { }

    return new Blob(parts, { type: mergeRecorder.mimeType || mime || "video/webm" });
}


/* =========================================================
   POST
========================================================= */

function setBusy(visible, title, text) {

    $("camBusy").hidden = !visible;

    if (title) {
        $("camBusyTitle").textContent = title;
    }

    if (text !== undefined) {
        $("camBusyText").textContent = text;
    }
}

$("camPost").addEventListener("click", async () => {

    if (!segments.length) {
        return;
    }

    const caption = $("camCaption").value.trim();

    $("camReviewVideo").pause();

    $("camPost").disabled = true;

    try {

        let blob;

        if (segments.length === 1) {

            blob = segments[0].blob;

        } else {

            setBusy(true, "Joining your clips…", "This takes about as long as your video. Keep this page open.");

            blob = await mergeSegments(segments, progress => {
                $("camBusyText").textContent = Math.round(progress * 100) + "% — keep this page open.";
            });
        }

        setBusy(true, "Posting your reel…", "Uploading…");

        const extension = (blob.type || "").includes("mp4") ? "mp4" : "webm";

        const path = `posts/${getUserId()}_${Date.now()}.${extension}`;

        const { error: uploadError } = await nexaSupabase
            .storage
            .from("nexa-media")
            .upload(path, blob, {
                cacheControl: "3600",
                upsert: false,
                contentType: blob.type || "video/webm"
            });

        if (uploadError) {
            throw uploadError;
        }

        const { data: urlData } = nexaSupabase.storage.from("nexa-media").getPublicUrl(path);

        const payload = {
            author_id: String(getUserId()),
            author_name: getUsername(),
            author_avatar: getUserAvatar() || String(getUsername()).charAt(0).toUpperCase(),
            text: caption,
            media: urlData.publicUrl,
            media_type: "reel"
        };

        if (sound) {
            payload.sound_id = String(sound.id);
            payload.sound_title = sound.title;
        }

        let { error } = await nexaSupabase.from("posts").insert(payload);

        /* the sound columns do not exist yet: post anyway */

        if (error && /sound_/.test(String(error.message || "") + String(error.details || ""))) {

            delete payload.sound_id;
            delete payload.sound_title;

            ({ error } = await nexaSupabase.from("posts").insert(payload));

            toast("Posted. Run sounds.sql in Supabase so sounds can be linked.");
        }

        if (error) {
            throw error;
        }

        setBusy(true, "Your reel is live!", "Taking you to Reels…");

        setTimeout(() => { window.location.href = "reels.html"; }, 900);

    } catch (error) {

        console.error("NEXA camera post error:", error);

        setBusy(false);

        $("camPost").disabled = false;

        toast(error.message || "Could not post your reel.");
    }
});


/* =========================================================
   CLOSE + CLEAN UP
========================================================= */

$("camClose").addEventListener("click", () => {

    if (segments.length && !confirm("Leave the camera? Your clips will be lost.")) {
        return;
    }

    if (window.history.length > 1) {
        window.history.back();
    } else {
        window.location.href = "reels.html";
    }
});

window.addEventListener("pagehide", () => {

    if (camStream) {
        camStream.getTracks().forEach(track => track.stop());
    }

    if (micStream) {
        micStream.getTracks().forEach(track => track.stop());
    }
});


/* =========================================================
   START
========================================================= */

(async function start() {

    updateButtons();

    requestAnimationFrame(render);

    await loadSound();

    await startCamera();

})();
