/* =========================================================
   NEXA MESSAGES
   Supabase + Messaging + Voice Notes + Location + Calls

   FIXES IN THIS VERSION
   ----------------------------------------------------------
   1. MEDIA NEVER LOADED (the main bug):
      loadConversationMedia() used to filter by
      `.eq("conversation_id", conversationId)`. But
      loadConversation() intentionally does NOT trust
      conversation_id when loading text (see its comments) —
      it loads by sender/receiver pair instead, because rows
      in the DB don't reliably share one consistent
      conversation_id. So the media query was filtering on a
      column that often didn't match anything, silently
      returned 0 rows, and every photo/video/voice note sat
      on "Loading…" forever. Fixed by fetching media with
      `.in("id", messageIds)` using the exact message ids
      already on screen — same source of truth as the text.

   2. ONLINE STATUS NOT LIVE IN THE OPEN CHAT:
      Presence updates used to refresh the sidebar only.
      If you were already chatting with someone and they
      came online/offline, the chat header never updated.
      Fixed by re-running updateChatHeader() for the open
      conversation whenever presence changes, plus a
      periodic re-track so presence doesn't silently expire.

   3. Small polish: message fade/slide-in animation, a
      shimmer effect on "loading" media placeholders instead
      of flat text, a pulsing dot on online avatars, a glow
      on the live recording waveform, and smooth scrolling.
========================================================= */


/* =========================================================
   SUPABASE
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
   DOM
========================================================= */

const conversationsList = document.getElementById("conversationsList");
const chatSection = document.getElementById("chatSection");
const newMessageButton = document.getElementById("newMessageButton");
const emptyNewMessageButton = document.getElementById("emptyNewMessageButton");
const chatWith = document.getElementById("chatWith");
const messagesContainer = document.getElementById("messagesContainer");
const emptyChatState = document.getElementById("emptyChatState");
const messageForm = document.getElementById("messageForm");
const messageInput = document.getElementById("messageInput");
const mediaInput = document.getElementById("mediaInput");
const normalComposer = document.getElementById("normalComposer");
const voiceComposer = document.getElementById("voiceComposer");
const recordButton = document.getElementById("recordButton");
const stopButton = document.getElementById("stopButton");
const recordingStatus = document.getElementById("recordingStatus");
const voicePreview = document.getElementById("voicePreview");
const voicePlayButton = document.getElementById("voicePlayButton");
const cancelVoiceButton = document.getElementById("cancelVoiceButton");
const sendVoiceButton = document.getElementById("sendVoiceButton");
const voiceDuration = document.getElementById("voiceDuration");
const voiceWaveform = document.getElementById("voiceWaveform");
const locationButton = document.getElementById("locationButton");
const locationStatus = document.getElementById("locationStatus");
const voiceCallButton = document.getElementById("voiceCallButton");
const videoCallButton = document.getElementById("videoCallButton");
const endCallButton = document.getElementById("endCallButton");
const callStatus = document.getElementById("callStatus");
const incomingCall = document.getElementById("incomingCall");
const incomingCaller = document.getElementById("incomingCaller");
const acceptCallButton = document.getElementById("acceptCallButton");
const declineCallButton = document.getElementById("declineCallButton");
const remoteCallArea = document.getElementById("remoteCallArea");
const remoteAudio = document.getElementById("remoteAudio");
const groupRemoteAudio = document.getElementById("groupRemoteAudio");
const remoteVideo = document.getElementById("remoteVideo");
const conversationSearch = document.getElementById("conversationSearch");
const conversationFilterButtons = document.querySelectorAll(".conversation-filter");
const sidebarCount = document.querySelector(".sidebar-count");
const backToConversations = document.getElementById("backToConversations");
const chatCloseButton = document.querySelector(".chat-close-button");
/* =========================================================
   UNIFIED COMPOSER STATE
========================================================= */

const composerBox =
    document.getElementById("composerBox");


function updateComposerTypingState() {

    if (!composerBox || !messageInput) {
        return;
    }

    /*
     * Only switch to typing mode when there is actual text.
     * This keeps the normal buttons visible when the box is
     * empty.
     */
    const hasText =
        messageInput.value.trim().length > 0;

    composerBox.classList.toggle(
        "is-typing",
        hasText
    );
}


/*
 * Real typing
 */
if (messageInput) {

    messageInput.addEventListener(
        "input",
        updateComposerTypingState
    );

    messageInput.addEventListener(
        "paste",
        () => {
            setTimeout(
                updateComposerTypingState,
                0
            );
        }
    );
}


/*
 * Return to normal after sending.
 */
function resetComposerAfterSend() {

    if (messageInput) {
        messageInput.value = "";
    }

    if (mediaInput) {
        mediaInput.value = "";
    }

    if (composerBox) {
        composerBox.classList.remove(
            "is-typing"
        );
    }
}


/* =========================================================
   STATE
========================================================= */

let users = [];
let selectedFriend = null;
let messages = [];
/* =========================================================
   GROUP CHAT STATE
========================================================= */

let groups = [];
let selectedGroup = null;
let messagesLoaded = false;
let loadingMessagesPromise = null;

/*
 * NEXA FIX: media loading is now tracked per conversation
 * key (friend id), not per DB conversation_id, since the DB
 * column isn't trustworthy. This also lets us skip refetching
 * media we already have when a chat is simply reopened.
 */
let mediaLoadingKey = null;
let mediaLoadedKeys = new Set();

let activeConversationFilter = "all";
let onlineUserIds = new Set();
let presenceChannel = null;
let presenceHeartbeatTimer = null;
let messagesRealtimeChannel = null;
let callRealtimeChannel = null;
let activeCall = null;
let nexaIncomingRingtoneContext = null;
let nexaIncomingRingtoneOscillator = null;
let nexaIncomingRingtoneGain = null;
let nexaIncomingRingtoneTimer = null;
let nexaIncomingRingtonePlaying = false;
let peerConnection = null;
let localStream = null;
let remoteStream = null;
let pendingIceCandidates = [];
let callInProgress = false;
let callAnswered = false;
let missedCallBeingSaved = false;


/* =========================================================
   GROUP CALL STATE
========================================================= */

let groupCallMembers = [];
let groupCallParticipants = new Set();
let groupPeerConnections = new Map();
let groupRemoteStreams = new Map();
let activeGroupCall = null;
let groupAudioContext = null;
let groupAudioSources = new Map();

/* =========================================================
   RESET GROUP CALL STATE
   Starts every new group call from a completely clean state.
========================================================= */

function resetGroupCallState() {

    /* Close any old WebRTC connections */
    if (groupPeerConnections.size) {

        groupPeerConnections.forEach(connection => {

            try {
                connection.close();
            } catch (_) { }

        });

        groupPeerConnections.clear();
    }


    /* Stop old local tracks */
    if (localStream) {

        localStream.getTracks().forEach(track => {

            try {
                track.stop();
            } catch (_) { }

        });

        localStream = null;
    }


    /* Clear remote streams */
    groupRemoteStreams.clear();

    /* Clear connected participants */
    groupCallParticipants.clear();

    /* Clear member list */
    groupCallMembers = [];


    /* Reset active group call */
    activeGroupCall = null;


    /* Reset call state */
    callInProgress = false;
    callAnswered = false;


    /* Clear pending ICE */
    pendingIceCandidates = [];


    /* Stop old group audio routing */
    groupAudioSources.forEach(source => {

        try {
            source.disconnect();
        } catch (_) { }

    });

    groupAudioSources.clear();


    /* Remove generated group media elements */
    document
        .querySelectorAll(
            'audio[id^="nexa-group-audio-"]'
        )
        .forEach(audio => {

            try {
                audio.pause();
            } catch (_) { }

            audio.srcObject = null;
            audio.remove();

        });


    document
        .querySelectorAll(
            'video[id^="nexa-group-video-"]'
        )
        .forEach(video => {

            try {
                video.pause();
            } catch (_) { }

            video.srcObject = null;
            video.remove();

        });


    /* Reset UI */
    if (incomingCall) {
        incomingCall.style.display = "none";
    }

    if (endCallButton) {
        endCallButton.style.display = "none";
    }

    if (callStatus) {
        callStatus.textContent = "";
    }

    if (remoteCallArea) {
        remoteCallArea.style.display = "none";
    }


    console.log(
        "NEXA GROUP CALL STATE RESET"
    );
}

async function ensureGroupAudioContext() {

    const AudioContextClass =
        window.AudioContext ||
        window.webkitAudioContext;

    if (!AudioContextClass) {
        return null;
    }

    if (!groupAudioContext) {
        groupAudioContext =
            new AudioContextClass();
    }

    if (
        groupAudioContext.state ===
        "suspended"
    ) {
        try {
            await groupAudioContext.resume();
        } catch (error) {
            console.warn(
                "NEXA group audio context resume error:",
                error
            );
        }
    }

    return groupAudioContext;
}

/* =========================================================
   ACTIVE CALL VISUAL STATE
========================================================= */

let callTimer = null;
let callStartedAt = null;

let remoteAudioContext = null;
let remoteAnalyser = null;
let remoteAudioSource = null;
let remoteVoiceAnimationFrame = null;


/* =========================================================
   NEXA INCOMING CALL RINGTONE
========================================================= */

function startNexaIncomingRingtone() {

    stopNexaIncomingRingtone();

    try {

        const AudioContextClass =
            window.AudioContext ||
            window.webkitAudioContext;

        if (!AudioContextClass) {
            return;
        }

        if (!nexaIncomingRingtoneContext) {

            nexaIncomingRingtoneContext =
                new AudioContextClass();

        }

        if (
            nexaIncomingRingtoneContext.state ===
            "suspended"
        ) {

            nexaIncomingRingtoneContext.resume()
                .catch(() => { });

        }

        const context =
            nexaIncomingRingtoneContext;

        nexaIncomingRingtoneGain =
            context.createGain();

        nexaIncomingRingtoneGain.gain.value =
            0.035;

        nexaIncomingRingtoneGain.connect(
            context.destination
        );

        nexaIncomingRingtonePlaying =
            true;

        const ringOnce = () => {

            if (
                !nexaIncomingRingtonePlaying
            ) {
                return;
            }

            const oscillator =
                context.createOscillator();

            oscillator.type =
                "sine";

            oscillator.frequency.setValueAtTime(
                523.25,
                context.currentTime
            );

            oscillator.frequency.setValueAtTime(
                659.25,
                context.currentTime + 0.18
            );

            oscillator.frequency.setValueAtTime(
                783.99,
                context.currentTime + 0.36
            );

            oscillator.connect(
                nexaIncomingRingtoneGain
            );

            oscillator.start();

            oscillator.stop(
                context.currentTime + 0.5
            );

            nexaIncomingRingtoneOscillator =
                oscillator;
        };

        ringOnce();

        nexaIncomingRingtoneTimer =
            setInterval(
                ringOnce,
                1800
            );

    } catch (error) {

        console.warn(
            "NEXA incoming ringtone unavailable:",
            error
        );
    }
}


function stopNexaIncomingRingtone() {

    nexaIncomingRingtonePlaying =
        false;

    if (nexaIncomingRingtoneTimer) {

        clearInterval(
            nexaIncomingRingtoneTimer
        );

        nexaIncomingRingtoneTimer =
            null;
    }

    if (
        nexaIncomingRingtoneOscillator
    ) {

        try {
            nexaIncomingRingtoneOscillator.stop();
        } catch (_) { }

        nexaIncomingRingtoneOscillator =
            null;
    }

    if (nexaIncomingRingtoneGain) {

        try {
            nexaIncomingRingtoneGain.disconnect();
        } catch (_) { }

        nexaIncomingRingtoneGain =
            null;
    }
}


/* =========================================================
   CALL USER PROFILE
========================================================= */

function getActiveCallUser() {

    if (!activeCall) return null;

    const currentId = String(currentUser.id);

    const otherUserId =
        String(activeCall.callerId) === currentId
            ? String(activeCall.receiverId)
            : String(activeCall.callerId);

    if (selectedFriend && String(selectedFriend.id) === otherUserId) {
        return selectedFriend;
    }

    const found = findUserById(otherUserId);

    if (found) {
        return found;
    }

    return {
        id: otherUserId,
        name: activeCall.callerName || "NEXA Member",
        username: "",
        profile_picture: ""
    };
}


/* =========================================================
   BUILD ACTIVE CALL SCREEN
========================================================= */

function ensureActiveCallScreen() {

    if (!remoteCallArea) return null;

    let screen =
        document.getElementById("nexaActiveCallScreen");

    if (screen) return screen;

    screen = document.createElement("div");

    screen.id = "nexaActiveCallScreen";
    screen.className = "nexa-active-call-screen";

    screen.innerHTML = `
        <div class="nexa-active-call-kicker">
            NEXA VOICE CALL
        </div>

        <div class="nexa-call-avatar-stage">

            <span class="nexa-call-ring nexa-call-ring-four"></span>
            <span class="nexa-call-ring nexa-call-ring-three"></span>
            <span class="nexa-call-ring nexa-call-ring-two"></span>
            <span class="nexa-call-ring nexa-call-ring-one"></span>

            <div
                id="nexaCallAvatar"
                class="nexa-call-avatar"
            >
                N
            </div>

        </div>

        <div
            id="nexaCallName"
            class="nexa-call-name"
        >
            NEXA Member
        </div>

        <div
            id="nexaCallStatus"
            class="nexa-call-status"
        >
            Connecting...
        </div>

        <div
            id="nexaCallTimer"
            class="nexa-call-timer"
        >
            00:00
        </div>
    `;

    remoteCallArea.appendChild(screen);

    return screen;
}


/* =========================================================
   GROUP CALL PARTICIPANT SCREEN
========================================================= */

function ensureGroupCallScreen() {

    let screen =
        document.getElementById(
            "nexaGroupCallScreen"
        );

    if (screen) {
        return screen;
    }

    if (!remoteCallArea) {
        return null;
    }

    screen =
        document.createElement("div");

    screen.id =
        "nexaGroupCallScreen";

    screen.className =
        "nexa-group-call-screen";

    screen.innerHTML = `
        <div class="nexa-group-call-kicker">
            NEXA GROUP CALL
        </div>

        <div
            id="nexaGroupCallParticipants"
            class="nexa-group-call-participants"
        ></div>

        <div
            id="nexaGroupCallStatus"
            class="nexa-group-call-status"
        >
            Connecting...
        </div>
    `;

    remoteCallArea.appendChild(
        screen
    );

    return screen;
}


/* =========================================================
   RENDER GROUP CALL PARTICIPANTS
========================================================= */

function renderGroupCallParticipants() {

    const screen =
        ensureGroupCallScreen();

    if (!screen) {
        return;
    }

    const container =
        document.getElementById(
            "nexaGroupCallParticipants"
        );

    if (!container) {
        return;
    }


    const memberIds = new Set();

    groupCallMembers.forEach(
        member => {

            memberIds.add(
                String(member.id)
            );
        }
    );

    groupCallParticipants.forEach(
        memberId => {

            memberIds.add(
                String(memberId)
            );
        }
    );

    /*
     * Always show yourself too.
     */
    memberIds.add(
        String(currentUser.id)
    );

    memberIds.forEach(
        memberId => {

            const member =
                String(memberId) ===
                    String(currentUser.id)

                    ? currentUser

                    : findUserById(
                        memberId
                    );

            const name =
                member?.name ||
                member?.username ||
                "NEXA Member";

            const picture =
                member?.profile_picture ||
                member?.profilePicture ||
                "";

            const online =
                String(memberId) ===
                    String(currentUser.id)
                    ? true
                    : isUserOnline(
                        memberId
                    );

            const connected =
                String(memberId) ===
                    String(currentUser.id)
                    ? true
                    : groupCallParticipants.has(
                        String(memberId)
                    );

            const existingCard =
                container.querySelector(
                    '.nexa-group-call-participant[data-user-id="' +
                    String(memberId) +
                    '"]'
                );

            if (existingCard) {
                return;
            }

            const card =
                document.createElement("div");



            card.className =
                "nexa-group-call-participant";

            card.dataset.userId =
                String(memberId);

            let visualContent = "";

            if (
                activeGroupCall &&
                activeGroupCall.callType === "video"
            ) {

                visualContent = `
        <video
            id="nexa-group-video-${escapeHTML(
                    String(memberId)
                )}"
            class="nexa-group-call-video"
            autoplay
            playsinline
        ></video>
    `;

            } else {

                visualContent =
                    picture
                        ? `
                <img
                    src="${escapeHTML(
                            picture
                        )}"
                    alt="${escapeHTML(
                            name
                        )}"
                >
              `
                        : `
                <span>
                    ${escapeHTML(
                            String(name)
                                .trim()
                                .charAt(0)
                                .toUpperCase() ||
                            "N"
                        )}
                </span>
              `;
            }

            card.innerHTML = `

             <div
    class="nexa-group-call-avatar
    ${connected ? "is-connected" : ""}
    ${online ? "is-online" : "is-offline"}"
>
    ${visualContent}

    <span
        class="nexa-group-call-online-dot"
    ></span>

    <span
        class="nexa-group-call-speaking-ring"
    ></span>
</div>

                <strong>
                    ${escapeHTML(
                name
            )}
                </strong>

                <small
                    class="nexa-group-call-member-status"
                >
                    ${String(memberId) ===
                    String(currentUser.id)

                    ? "You"

                    : connected
                        ? "Connected"
                        : online
                            ? "Online"
                            : "Offline"
                }
                </small>
            `;

            container.appendChild(
                card
            );



            if (
                activeGroupCall &&
                activeGroupCall.callType === "video"
            ) {

                const video =
                    card.querySelector(
                        ".nexa-group-call-video"
                    );

                const stream =
                    groupRemoteStreams.get(
                        String(memberId)
                    );

                if (
                    video &&
                    stream &&
                    video.srcObject !== stream
                ) {

                    video.srcObject =
                        stream;

                    video.play().catch(
                        error => {

                            console.error(
                                "NEXA group video playback error:",
                                error
                            );

                        }
                    );
                }
            }



        }
    );

    screen.style.display =
        "flex";

    if (remoteCallArea) {
        remoteCallArea.style.display =
            "block";
    }

    updateGroupCallStatusText();
}

/* =========================================================
   UPDATE GROUP CALL STATUS
========================================================= */

function updateGroupCallStatusText() {

    const status =
        document.getElementById(
            "nexaGroupCallStatus"
        );

    if (!status) {
        return;
    }

    const total =
        groupCallMembers.length;

    const connected =
        groupCallParticipants.size;

    if (!total) {

        status.textContent =
            "Group call";

        return;
    }

    status.textContent =
        connected +
        " of " +
        total +
        " members connected";
}


/* =========================================================
   SHOW ACTIVE CALL SCREEN
========================================================= */

function showActiveCallScreen() {

    const screen = ensureActiveCallScreen();

    if (!screen) return;

    const user = getActiveCallUser();

    const avatar =
        document.getElementById("nexaCallAvatar");

    const name =
        document.getElementById("nexaCallName");

    const status =
        document.getElementById("nexaCallStatus");

    if (name) {
        name.textContent =
            user?.name ||
            user?.username ||
            activeCall?.callerName ||
            "NEXA Member";
    }

    const profilePicture =
        user?.profile_picture ||
        user?.profilePicture ||
        "";

    if (avatar) {

        if (profilePicture) {

            avatar.innerHTML = `
                <img
                    src="${escapeHTML(profilePicture)}"
                    alt="${escapeHTML(
                user?.name ||
                user?.username ||
                "NEXA Member"
            )}"
                >
            `;

        } else {

            const displayName =
                user?.name ||
                user?.username ||
                activeCall?.callerName ||
                "N";

            avatar.textContent =
                String(displayName)
                    .trim()
                    .charAt(0)
                    .toUpperCase() || "N";
        }
    }

    if (status) {
        status.textContent = "Connected";
    }

    screen.style.display = "flex";

    if (remoteCallArea) {
        remoteCallArea.style.display = "block";
    }

    if (remoteAudio) {
        remoteAudio.style.display = "block";
    }

    startCallTimer();
}


/* =========================================================
   CALL TIMER
========================================================= */

function startCallTimer() {

    stopCallTimer();

    callStartedAt = Date.now();

    callTimer = setInterval(() => {

        if (!callStartedAt) return;

        const elapsed =
            Math.floor(
                (Date.now() - callStartedAt) / 1000
            );

        const minutes =
            Math.floor(elapsed / 60);

        const seconds =
            elapsed % 60;

        const timer =
            document.getElementById("nexaCallTimer");

        if (timer) {
            timer.textContent =
                String(minutes).padStart(2, "0") +
                ":" +
                String(seconds).padStart(2, "0");
        }

    }, 250);
}


function stopCallTimer() {

    if (callTimer) {
        clearInterval(callTimer);
        callTimer = null;
    }

    callStartedAt = null;
}


/* =========================================================
   REMOTE SPEAKING VISUALIZER
========================================================= */

async function startRemoteSpeakingVisualizer(stream) {

    stopRemoteSpeakingVisualizer();

    if (!stream) return;

    const AudioContextClass =
        window.AudioContext ||
        window.webkitAudioContext;

    if (!AudioContextClass) return;

    try {

        remoteAudioContext =
            new AudioContextClass();

        if (
            remoteAudioContext.state === "suspended"
        ) {
            await remoteAudioContext.resume();
        }

        remoteAudioSource =
            remoteAudioContext
                .createMediaStreamSource(stream);

        remoteAnalyser =
            remoteAudioContext
                .createAnalyser();

        remoteAnalyser.fftSize = 256;
        remoteAnalyser.smoothingTimeConstant = 0.82;

        remoteAudioSource.connect(
            remoteAnalyser
        );

        const dataArray =
            new Uint8Array(
                remoteAnalyser.fftSize
            );

        const animate = () => {

            if (
                !remoteAnalyser ||
                !activeCall
            ) {
                remoteVoiceAnimationFrame = null;
                return;
            }

            remoteAnalyser.getByteTimeDomainData(
                dataArray
            );

            let sum = 0;

            for (
                let i = 0;
                i < dataArray.length;
                i++
            ) {

                const sample =
                    (dataArray[i] - 128) / 128;

                sum += sample * sample;
            }

            const rms =
                Math.sqrt(
                    sum / dataArray.length
                );

            const level =
                Math.min(
                    0.20,
                    Math.pow(rms * 7, 0.7) * 0.20
                );

            const speaking =
                rms > 0.025;

            const screen =
                document.getElementById(
                    "nexaActiveCallScreen"
                );

            const avatar =
                document.getElementById(
                    "nexaCallAvatar"
                );

            if (screen) {
                screen.style.setProperty(
                    "--call-level",
                    String(level)
                );
            }

            if (avatar) {

                avatar.classList.toggle(
                    "is-speaking",
                    speaking
                );

                if (speaking) {

                    avatar.style.transform =
                        `scale(${1 + level * 0.7})`;

                } else {

                    avatar.style.transform =
                        "scale(1)";
                }
            }

            remoteVoiceAnimationFrame =
                requestAnimationFrame(animate);
        };

        animate();

    } catch (error) {

        console.warn(
            "NEXA remote voice visualizer unavailable:",
            error
        );
    }
}


function stopRemoteSpeakingVisualizer() {

    if (remoteVoiceAnimationFrame !== null) {

        cancelAnimationFrame(
            remoteVoiceAnimationFrame
        );

        remoteVoiceAnimationFrame = null;
    }

    if (remoteAudioSource) {

        try {
            remoteAudioSource.disconnect();
        } catch (_) { }

        remoteAudioSource = null;
    }

    remoteAnalyser = null;

    if (remoteAudioContext) {

        try {

            if (
                remoteAudioContext.state !==
                "closed"
            ) {
                remoteAudioContext.close();
            }

        } catch (_) { }

        remoteAudioContext = null;
    }

    const screen =
        document.getElementById(
            "nexaActiveCallScreen"
        );

    const avatar =
        document.getElementById(
            "nexaCallAvatar"
        );

    if (screen) {
        screen.style.setProperty(
            "--call-level",
            "0"
        );
    }

    if (avatar) {
        avatar.classList.remove("is-speaking");
        avatar.style.transform = "scale(1)";
    }
}


/* =========================================================
   VOICE RECORDER STATE
========================================================= */

let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;
let recordedVoiceBlob = null;
let recordedVoiceMimeType = "audio/webm";
let voiceRecordingStartedAt = null;
let voiceTimer = null;
let voiceAnimationFrame = null;
let audioContext = null;
let analyser = null;
let microphoneSource = null;
let microphoneStream = null;
let voicePreviewUrl = null;
let previewAudioElement = null;


/* =========================================================
   WEBRTC
========================================================= */

const rtcConfiguration = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" }
    ]
};


/* =========================================================
   COOL FACTOR: injected animation styles
   The page only ships JS to us, so the safest way to add
   real motion without needing a separate CSS deploy is to
   inject one small <style> tag once at startup. Everything
   here is additive — it only styles classes this file adds,
   so it can't clash with existing page styles.
========================================================= */

function injectNexaAnimationStyles() {

    if (document.getElementById("nexa-anim-styles")) {
        return;
    }

    const style = document.createElement("style");
    style.id = "nexa-anim-styles";
    style.textContent = `
        #messagesContainer {
            scroll-behavior: smooth;
        }

        @keyframes nexaMessageIn {
            from { opacity: 0; transform: translateY(10px) scale(0.98); }
            to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .nexa-message {
            animation: nexaMessageIn 0.28s cubic-bezier(0.2, 0.7, 0.3, 1) both;
        }

        @keyframes nexaShimmer {
            0%   { background-position: -200px 0; }
            100% { background-position: 200px 0; }
        }
        .nexa-media-loading {
            position: relative;
            overflow: hidden;
            background: linear-gradient(90deg, rgba(120,120,120,0.08) 25%, rgba(120,120,120,0.18) 37%, rgba(120,120,120,0.08) 63%);
            background-size: 400px 100%;
            animation: nexaShimmer 1.4s ease-in-out infinite;
            border-radius: 10px;
        }

        @keyframes nexaPulseDot {
            0%   { box-shadow: 0 0 0 0 rgba(46, 204, 113, 0.55); }
            70%  { box-shadow: 0 0 0 6px rgba(46, 204, 113, 0); }
            100% { box-shadow: 0 0 0 0 rgba(46, 204, 113, 0); }
        }
        .chat-avatar-online {
            display: inline-block;
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background: #2ecc71;
            animation: nexaPulseDot 1.8s ease-out infinite;
        }
        .is-offline .chat-avatar-online {
            background: #9a9a9a;
            animation: none;
            box-shadow: none;
        }

        .conversationButton.is-online strong::after {
            content: "";
            display: inline-block;
            width: 7px;
            height: 7px;
            margin-left: 6px;
            border-radius: 50%;
            background: #2ecc71;
            animation: nexaPulseDot 1.8s ease-out infinite;
            vertical-align: middle;
        }

        @keyframes nexaRecordGlow {
            0%, 100% { box-shadow: 0 0 0 0 rgba(231, 76, 60, 0.35); }
            50%      { box-shadow: 0 0 0 8px rgba(231, 76, 60, 0); }
        }
        .is-recording #voiceWaveform,
        .is-recording .voice-composer-button#stopButton {
            animation: nexaRecordGlow 1.4s ease-in-out infinite;
            border-radius: 10px;
        }

        .voice-wave-bar {
            display: inline-block;
            width: 3px;
            margin: 0 1px;
            border-radius: 2px;
            background: currentColor;
            transition: height 0.08s linear;
            vertical-align: middle;
        }

        @keyframes nexaBadgePop {
            0%   { transform: scale(0.4); opacity: 0; }
            60%  { transform: scale(1.15); opacity: 1; }
            100% { transform: scale(1); }
        }
        .conversationButton strong:last-child {
            animation: nexaBadgePop 0.25s ease-out both;
        }

        .conversationButton {
            transition: background-color 0.15s ease, transform 0.1s ease;
        }
        .conversationButton:active {
            transform: scale(0.98);
        }

        .nexa-voice-play, .voice-composer-button {
            transition: transform 0.12s ease;
        }
        .nexa-voice-play:active, .voice-composer-button:active {
            transform: scale(0.88);
        }
        /* =====================================================
           GROUP CALL SCREEN
        ===================================================== */

        .nexa-group-call-screen {
            position: absolute;
            inset: 0;
            z-index: 20;
            display: none;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 22px;
            padding: 32px;
            overflow-y: auto;
            background:
                radial-gradient(
                    circle at center,
                    rgba(212, 175, 55, 0.08),
                    rgba(0, 0, 0, 0.96) 58%
                );
            color: #f5f0df;
        }

        .nexa-group-call-kicker {
            font-size: 11px;
            letter-spacing: 0.28em;
            text-transform: uppercase;
            color: #d4af37;
            font-weight: 700;
        }

        .nexa-group-call-participants {
            width: min(900px, 100%);
            display: grid;
            grid-template-columns:
                repeat(auto-fit, minmax(145px, 1fr));
            gap: 24px;
            align-items: stretch;
            justify-items: center;
        }

        .nexa-group-call-participant {
            width: 145px;
            min-height: 175px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 10px;
            padding: 18px 12px;
            border: 1px solid rgba(212, 175, 55, 0.18);
            border-radius: 22px;
            background: rgba(255, 255, 255, 0.04);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            box-shadow:
                0 12px 35px rgba(0, 0, 0, 0.35);
        }

        .nexa-group-call-participant > strong {
            max-width: 120px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            font-size: 14px;
        }

        .nexa-group-call-member-status {
            font-size: 11px;
            color: #8f8878;
        }

        .nexa-group-call-avatar {
            position: relative;
            width: 82px;
            height: 82px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: visible;
            background:
                linear-gradient(
                    145deg,
                    #2a261d,
                    #0e0e0e
                );
            border: 2px solid rgba(212, 175, 55, 0.35);
            color: #d4af37;
            font-size: 28px;
            font-weight: 700;
        }

        .nexa-group-call-avatar img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            border-radius: 50%;
        }

            .nexa-group-call-avatar .nexa-group-call-video {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 50%;
    display: block;
    background: #000;
}

        .nexa-group-call-online-dot {
            position: absolute;
            right: 2px;
            bottom: 4px;
            width: 13px;
            height: 13px;
            border-radius: 50%;
            border: 2px solid #090909;
            background: #777;
        }

        .nexa-group-call-avatar.is-online
        .nexa-group-call-online-dot {
            background: #2ecc71;
            box-shadow: 0 0 12px rgba(46, 204, 113, 0.65);
        }

        .nexa-group-call-avatar.is-offline
        .nexa-group-call-online-dot {
            background: #777;
            box-shadow: none;
        }

        .nexa-group-call-avatar.is-connected {
            border-color: #d4af37;
            box-shadow:
                0 0 24px rgba(212, 175, 55, 0.18);
        }

        .nexa-group-call-speaking-ring {
            position: absolute;
            inset: -8px;
            border-radius: 50%;
            border: 2px solid transparent;
            pointer-events: none;
        }

        .nexa-group-call-avatar.is-speaking
        .nexa-group-call-speaking-ring {
            border-color: #2ecc71;
            animation: nexaGroupSpeakingPulse 1s ease-in-out infinite;
        }

        @keyframes nexaGroupSpeakingPulse {
            0%, 100% {
                transform: scale(1);
                opacity: 0.55;
            }

            50% {
                transform: scale(1.12);
                opacity: 1;
            }
        }

        .nexa-group-call-avatar.is-speaking {
            transform: scale(1.04);
        }

        .nexa-group-call-status {
            font-size: 13px;
            color: #b8ae9a;
            text-align: center;
        }

        @media (max-width: 700px) {

            .nexa-group-call-screen {
                padding: 20px 14px;
            }

            .nexa-group-call-participants {
                grid-template-columns:
                    repeat(2, minmax(120px, 1fr));
                gap: 14px;
            }

            .nexa-group-call-participant {
                width: 120px;
                min-height: 155px;
            }

            .nexa-group-call-avatar {
                width: 70px;
                height: 70px;
                font-size: 23px;
            }
        }

    `;

    document.head.appendChild(style);
}

injectNexaAnimationStyles();


/* =========================================================
   INITIAL UI
========================================================= */

if (chatSection) chatSection.style.display = "none";
if (emptyChatState) emptyChatState.style.display = "grid";
if (incomingCall) incomingCall.style.display = "none";
if (voiceComposer) voiceComposer.hidden = true;
if (stopButton) stopButton.disabled = true;
if (voicePlayButton) voicePlayButton.disabled = true;
if (sendVoiceButton) sendVoiceButton.disabled = true;
if (endCallButton) endCallButton.style.display = "none";


/* =========================================================
   HELPERS
========================================================= */

function escapeHTML(value) {
    const element = document.createElement("div");
    element.textContent = String(value ?? "");
    return element.innerHTML;
}

function formatTime(timestamp) {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function createMessageId() {
    return Date.now() + "-" + Math.random().toString(36).slice(2, 10);
}

function createConversationId(user1, user2) {
    return [String(user1.id), String(user2.id)].sort().join("_");
}

function findUserById(userId) {
    return users.find(user => String(user.id) === String(userId));
}

function normalizeFriends(value) {
    if (Array.isArray(value)) return value;

    if (typeof value === "string") {
        const trimmed = value.trim();
        if (!trimmed) return [];
        try {
            const parsed = JSON.parse(trimmed);
            return Array.isArray(parsed) ? parsed : [];
        } catch (_) {
            return trimmed.split(",").map(id => id.trim()).filter(Boolean);
        }
    }

    return [];
}

function getFriendIds() {
    return normalizeFriends(currentUser.friends)
        .map(friend => (typeof friend === "object" ? friend?.id : friend))
        .filter(id => id !== undefined && id !== null && String(id).trim() !== "")
        .map(id => String(id));
}


/* =========================================================
   USERS — FAST PROFILE LOADING
========================================================= */

async function getUsers() {

    try {

        const localUser = JSON.parse(localStorage.getItem("nexaCurrentUser")) || {};
        const storedFriends = normalizeFriends(localUser.friends);

        const friendIds = storedFriends
            .map(friend => (typeof friend === "object" ? friend?.id : friend))
            .filter(id => id !== undefined && id !== null)
            .map(id => String(id));

        const profileColumns = ["id", "name", "username", "profile_picture", "created_at"].join(",");

        const currentUserPromise = nexaSupabase
            .from("profiles")
            .select(profileColumns)
            .eq("id", String(currentUser.id))
            .maybeSingle();

        const friendsPromise = friendIds.length
            ? nexaSupabase.from("profiles").select(profileColumns).in("id", friendIds)
            : Promise.resolve({ data: [], error: null });

        const [currentResult, friendsResult] = await Promise.all([currentUserPromise, friendsPromise]);

        if (currentResult.error) throw currentResult.error;
        if (friendsResult.error) throw friendsResult.error;

        const freshCurrentUser = currentResult.data;
        const friendProfiles = Array.isArray(friendsResult.data) ? friendsResult.data : [];

        users = [freshCurrentUser, ...friendProfiles]
            .filter(Boolean)
            .filter((user, index, array) => array.findIndex(other => String(other.id) === String(user.id)) === index);

        currentUser.friends = storedFriends;

        if (freshCurrentUser) {
            currentUser.name = freshCurrentUser.name ?? currentUser.name;
            currentUser.username = freshCurrentUser.username ?? currentUser.username;
            currentUser.profilePicture = freshCurrentUser.profile_picture || currentUser.profilePicture || "";
        }

        localStorage.setItem("nexaCurrentUser", JSON.stringify(currentUser));

        console.log("NEXA friend profiles loaded:", friendProfiles.length);

        return users;

    } catch (error) {

        console.error("NEXA profile loading error:", error);

        try {
            const stored = JSON.parse(localStorage.getItem("nexaCurrentUser"));
            if (stored) Object.assign(currentUser, stored);
        } catch (_) { }

        const localFriends = normalizeFriends(currentUser.friends);

        users = localFriends
            .filter(friend => typeof friend === "object")
            .map(friend => ({
                id: friend.id,
                name: friend.name || "NEXA Member",
                username: friend.username || "",
                profile_picture: friend.profile_picture || friend.profilePicture || ""
            }));

        return users;
    }
}


/* =========================================================
   CACHE
========================================================= */

function getCachedMessages() {
    try {
        const saved = JSON.parse(localStorage.getItem("nexaMessages"));
        return Array.isArray(saved) ? saved : [];
    } catch (_) {
        return [];
    }
}

function saveCachedMessages() {
    try {
        const lightweightMessages = messages.map(message => ({
            id: message.id,
            conversationId: message.conversationId,
            senderId: message.senderId,
            receiverId: message.receiverId,
            text: message.text || "",
            media: null,
            mediaType: message.mediaType || null,
            latitude: message.latitude ?? null,
            longitude: message.longitude ?? null,
            timestamp: message.timestamp,
            read: Boolean(message.read),
            groupId: message.groupId || null,
        }));

        localStorage.setItem("nexaMessages", JSON.stringify(lightweightMessages));

    } catch (error) {
        console.warn("NEXA message cache skipped:", error);
    }
}


/* =========================================================
   LOAD LIGHTWEIGHT MESSAGE METADATA — NO MEDIA COLUMN
========================================================= */

async function loadMessagesFromServer(force = false) {

    if (messagesLoaded && !force) {
        return messages;
    }

    if (loadingMessagesPromise) {
        return loadingMessagesPromise;
    }

    loadingMessagesPromise = (async () => {

        try {

            const currentId = String(currentUser.id);

            const { data, error } = await nexaSupabase
                .from("messages")
                .select(`
                    id, conversation_id, sender_id, receiver_id,
                    text, media_type, latitude, longitude, timestamp, read
                `)
                .or(`sender_id.eq.${currentId},receiver_id.eq.${currentId}`)
                .order("timestamp", { ascending: true });

            if (error) throw error;

            messages = Array.isArray(data)
                ? data.map(message => ({
                    id: message.id,
                    conversationId: message.conversation_id,
                    senderId: message.sender_id,
                    receiverId: message.receiver_id,
                    text: message.text || "",
                    media: null,
                    mediaType: message.media_type || null,
                    latitude: message.latitude ?? null,
                    longitude: message.longitude ?? null,
                    timestamp: message.timestamp,
                    read: Boolean(message.read),
                    groupId: message.group_id || null
                }))
                : [];

            messagesLoaded = true;

            saveCachedMessages();

            console.log("NEXA message metadata loaded:", messages.length);

            return messages;

        } catch (error) {

            console.error("NEXA message metadata error:", error);

            messages = getCachedMessages();

            return messages;

        } finally {

            loadingMessagesPromise = null;
        }

    })();

    return loadingMessagesPromise;
}


/* =========================================================
   LOAD MEDIA FOR ONE CONVERSATION

   NEXA FIX (the main bug): this used to filter by
   `.eq("conversation_id", conversationId)`, but the text
   loader above deliberately does NOT trust conversation_id
   (see loadConversation() below — same issue, same fix
   philosophy). That mismatch meant this query usually
   matched zero rows, so media never arrived and bubbles
   stayed on "Loading…" forever.

   Fixed: pass in the exact message ids currently on screen
   for this conversation and fetch by `.in("id", messageIds)`.
   That's the same source of truth the text used, so it can
   never disagree with what's rendered.
========================================================= */

async function loadConversationMedia(friendKey, messageIds) {

    if (!friendKey || !Array.isArray(messageIds) || !messageIds.length) {
        return;
    }

    if (mediaLoadingKey === friendKey) {
        return;
    }

    mediaLoadingKey = friendKey;

    try {

        const { data, error } = await nexaSupabase
            .from("messages")
            .select(`id, media`)
            .in("id", messageIds);

        if (error) throw error;

        if (!Array.isArray(data)) return;

        const mediaMap = new Map();

        data.forEach(row => {
            mediaMap.set(String(row.id), row.media || null);
        });

        messages = messages.map(message => {
            const key = String(message.id);
            if (mediaMap.has(key)) {
                return { ...message, media: mediaMap.get(key) };
            }
            return message;
        });

        mediaLoadedKeys.add(friendKey);

        /*
         * Only re-render if the user is still looking at this
         * same conversation — they may have switched chats
         * while the fetch was in flight.
         */

        if (selectedFriend && String(selectedFriend.id) === String(friendKey)) {
            renderCurrentConversation(true);
        }

    } catch (error) {

        console.error("NEXA conversation media loading error:", error);

    } finally {

        mediaLoadingKey = null;
    }
}


/* =========================================================
   ADD MESSAGE
========================================================= */

function addMessage(message) {

    if (!message) return;

    const index = messages.findIndex(existing => String(existing.id) === String(message.id));

    if (index !== -1) {
        messages[index] = { ...messages[index], ...message };
        saveCachedMessages();
        return;
    }

    messages.push(message);

    saveCachedMessages();
}


/* =========================================================
   SAVE MESSAGE TO SUPABASE
   Private chat OR group chat
========================================================= */

async function sendMessageToServer(message) {

    if (!message) return false;

    try {

        const payload = {
            id: String(message.id),

            conversation_id:
                message.conversationId
                    ? String(message.conversationId)
                    : null,

            group_id:
                message.groupId
                    ? String(message.groupId)
                    : null,

            sender_id:
                String(message.senderId),

            receiver_id:
                message.receiverId
                    ? String(message.receiverId)
                    : null,

            text:
                message.text || "",

            media:
                message.media || null,

            media_type:
                message.mediaType || null,

            latitude:
                message.latitude ?? null,

            longitude:
                message.longitude ?? null,

            timestamp:
                message.timestamp ||
                new Date().toISOString(),

            read:
                Boolean(message.read)
        };

        const { error } =
            await nexaSupabase
                .from("messages")
                .insert(payload);

        if (error) {
            console.error(
                "NEXA Supabase message save error:",
                error
            );

            throw error;
        }

        return true;

    } catch (error) {

        console.error(
            "NEXA Supabase message save error:",
            error
        );

        return false;
    }
}


/* =========================================================
   MESSAGES REALTIME
========================================================= */

function subscribeToMessages() {

    if (messagesRealtimeChannel) {
        nexaSupabase.removeChannel(messagesRealtimeChannel);
    }

    messagesRealtimeChannel = nexaSupabase
        .channel("nexa-messages-" + currentUser.id)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, async payload => {
            const message = payload.new;
            if (!message) return;

            const currentId = String(currentUser.id);



            const isGroupMessage =
                Boolean(message.group_id);

            const belongsToUser =
                String(message.sender_id) === currentId ||
                String(message.receiver_id) === currentId ||
                isGroupMessage;

            if (!belongsToUser) {
                return;
            }

            const frontendMessage = {
                id: message.id,

                conversationId:
                    message.conversation_id,

                groupId:
                    message.group_id || null,

                senderId:
                    String(message.sender_id),

                receiverId:
                    message.receiver_id
                        ? String(message.receiver_id)
                        : null,

                text:
                    message.text || "",

                media:
                    message.media || null,

                mediaType:
                    message.media_type || null,

                latitude:
                    message.latitude ?? null,

                longitude:
                    message.longitude ?? null,

                timestamp:
                    message.timestamp,

                read:
                    Boolean(message.read)
            };

            addMessage(frontendMessage);

            if (isGroupMessage) {

                addMessage(frontendMessage);


                if (
                    selectedGroup &&
                    String(message.group_id) ===
                    String(selectedGroup.id)
                ) {

                    renderGroupConversation(
                        getCurrentGroupMessages()
                    );

                    await markGroupAsRead(
                        message.group_id
                    );

                    if (messagesContainer) {
                        messagesContainer.scrollTop =
                            messagesContainer.scrollHeight;
                    }

                }


                await loadMyGroups();

                displayConversations(
                    getConversationSearchValue()
                );

                return;
            }


            displayConversations(getConversationSearchValue());
        })
        .on("postgres_changes", {
            event: "UPDATE",
            schema: "public",
            table: "messages"
        }, payload => {
            const updated = payload.new;

            if (!updated) return;

            const localMessage =
                messages.find(
                    message =>
                        String(message.id) ===
                        String(updated.id)
                );

            if (!localMessage) return;

            localMessage.read = Boolean(updated.read);

            saveCachedMessages();

            /*
             * If this is the currently open conversation,
             * immediately turn ✓ into ✓✓.
             */
            if (selectedFriend) {
                const senderId = String(localMessage.senderId);
                const receiverId = String(localMessage.receiverId);
                const currentId = String(currentUser.id);

                const belongsToOpenChat =
                    (
                        senderId === currentId &&
                        receiverId === String(selectedFriend.id)
                    ) ||
                    (
                        receiverId === currentId &&
                        senderId === String(selectedFriend.id)
                    );

                if (belongsToOpenChat) {
                    renderCurrentConversation(true);
                }
            }

            displayConversations(getConversationSearchValue());
        })
        .subscribe(status => {
            console.log("NEXA Messages Realtime:", status);
        });
}


/* =========================================================
   MARK SINGLE MESSAGE READ
========================================================= */

async function markSingleMessageRead(messageId) {

    try {

        await nexaSupabase
            .from("messages")
            .update({ read: true })
            .eq("id", String(messageId))
            .eq("receiver_id", String(currentUser.id));

        const localMessage = messages.find(message => String(message.id) === String(messageId));
        if (localMessage) localMessage.read = true;

        saveCachedMessages();

        displayConversations(getConversationSearchValue());

    } catch (error) {
        console.error("NEXA single message read error:", error);
    }
}


/* =========================================================
   FILE READER
========================================================= */

function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error("Could not read file."));
        reader.readAsDataURL(file);
    });
}


/* =========================================================
   SEND TEXT / MEDIA
   PRIVATE CHAT + GROUP CHAT
========================================================= */

async function sendTextOrMediaMessage() {

    /*
     * We need either a friend OR a group.
     */
    if (!selectedFriend && !selectedGroup) {
        alert("Open a conversation first.");
        return;
    }

    const text =
        messageInput
            ? messageInput.value.trim()
            : "";

    const mediaFile =
        mediaInput &&
            mediaInput.files
            ? mediaInput.files[0]
            : null;

    if (!text && !mediaFile) {
        return;
    }

    let mediaData = null;

    if (mediaFile) {

        try {

            mediaData =
                await readFileAsDataURL(
                    mediaFile
                );

        } catch (error) {

            console.error(
                "NEXA media reading error:",
                error
            );

            return;
        }
    }


    /* =====================================================
       GROUP MESSAGE
    ===================================================== */

    if (selectedGroup) {

        const newMessage = {

            id:
                createMessageId(),

            conversationId:
                null,

            groupId:
                String(selectedGroup.id),

            senderId:
                String(currentUser.id),

            receiverId:
                null,

            text:
                text,

            media:
                mediaData,

            mediaType:
                mediaFile
                    ? mediaFile.type
                    : null,

            timestamp:
                new Date().toISOString(),

            read:
                true
        };


        const saved =
            await sendMessageToServer(
                newMessage
            );


        if (!saved) {

            alert(
                "Group message could not be saved."
            );

            return;
        }


        addMessage(newMessage);

        playNexaSendSound();

        resetComposerAfterSend();

        renderGroupConversation(
            getCurrentGroupMessages()
        );

        if (messagesContainer) {
            messagesContainer.scrollTop =
                messagesContainer.scrollHeight;
        }

        return;
    }


    /* =====================================================
       PRIVATE MESSAGE
    ===================================================== */

    if (selectedFriend) {

        const newMessage = {

            id:
                createMessageId(),

            conversationId:
                createConversationId(
                    currentUser,
                    selectedFriend
                ),

            groupId:
                null,

            senderId:
                String(currentUser.id),

            receiverId:
                String(selectedFriend.id),

            text:
                text,

            media:
                mediaData,

            mediaType:
                mediaFile
                    ? mediaFile.type
                    : null,

            timestamp:
                new Date().toISOString(),

            read:
                false
        };


        const saved =
            await sendMessageToServer(
                newMessage
            );


        if (!saved) {

            alert(
                "Message could not be saved."
            );

            return;
        }


        addMessage(newMessage);

        playNexaSendSound();

        resetComposerAfterSend();

        renderCurrentConversation(
            true
        );

        displayConversations(
            getConversationSearchValue()
        );

        if (messageInput) {
            messageInput.focus();
        }
    }
}


/* =========================================================
   MESSAGE FORM SUBMIT
========================================================= */

if (messageForm) {

    messageForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();

            if (isRecording) {
                return;
            }

            await sendTextOrMediaMessage();
        }
    );

}


/* =========================================================
   NEXA MESSAGE SEND SOUND
========================================================= */

let nexaSendAudioContext = null;

function playNexaSendSound() {

    try {

        const AudioContextClass =
            window.AudioContext ||
            window.webkitAudioContext;

        if (!AudioContextClass) return;

        if (!nexaSendAudioContext) {
            nexaSendAudioContext =
                new AudioContextClass();
        }

        if (nexaSendAudioContext.state === "suspended") {
            nexaSendAudioContext.resume();
        }

        const now =
            nexaSendAudioContext.currentTime;

        const oscillator =
            nexaSendAudioContext.createOscillator();

        const gain =
            nexaSendAudioContext.createGain();

        oscillator.type = "sine";

        /*
         * Small royal NEXA notification tone.
         */
        oscillator.frequency.setValueAtTime(
            720,
            now
        );

        oscillator.frequency.exponentialRampToValueAtTime(
            960,
            now + 0.07
        );

        gain.gain.setValueAtTime(
            0,
            now
        );

        gain.gain.linearRampToValueAtTime(
            0.055,
            now + 0.015
        );

        gain.gain.exponentialRampToValueAtTime(
            0.001,
            now + 0.12
        );

        oscillator.connect(gain);
        gain.connect(nexaSendAudioContext.destination);

        oscillator.start(now);
        oscillator.stop(now + 0.13);

    } catch (error) {

        console.warn(
            "NEXA send sound unavailable:",
            error
        );
    }
}


/* =========================================================
   EMOJI PICKER
========================================================= */

const emojiButton = document.getElementById("emojiButton");
const emojiPicker = document.getElementById("emojiPicker");
const emojiList = document.getElementById("emojiList");
const emojiSearch = document.getElementById("emojiSearch");
const emojiCategories = document.getElementById("emojiCategories");

const emojiData = {
    Smileys: ["😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😗", "😙", "😚", "😋", "😛", "😝", "😜", "🤪", "🤨", "🧐", "🤓", "😎", "🥸", "🤩", "🥳", "😏", "😒", "😞", "😔", "😟", "😕", "🙁", "☹️", "😣", "😖", "😫", "😩", "🥺", "😢", "😭", "😤", "😠", "😡", "🤬", "🤯", "😳", "🥵", "🥶", "😱", "😨", "😰", "😥", "😓", "🤗", "🤔", "🫣", "🤭", "🤫", "🤥", "😶", "😐", "😑", "😬", "🙄", "😯", "😦", "😧", "😮", "😲", "🥱", "😴", "🤤", "😪", "😵", "🤐", "🥴", "🤢", "🤮", "🤧", "😷", "🤒", "🤕", "🤑", "🤠", "😈", "👿", "👹", "👺", "🤡", "💩", "👻", "💀", "☠️", "👽", "👾", "🤖", "🎃"],
    Love: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "💟", "💌", "💋", "😍", "🥰", "😘", "😻", "🌹", "🌷", "🌺", "🌸", "💐", "❤️‍🔥"],
    Gestures: ["👍", "👎", "👌", "✌️", "🤞", "🤟", "🤘", "🤙", "👈", "👉", "👆", "👇", "☝️", "✋", "🤚", "🖐️", "🖖", "👋", "🤏", "💪", "👏", "🙌", "👐", "🤲", "🙏", "✍️", "💅", "🤝", "👊", "✊", "🤌", "🫶"],
    People: ["👶", "🧒", "👦", "👧", "🧑", "👱", "👨", "👩", "🧔", "👴", "👵", "🙍", "🙎", "🙅", "🙆", "💁", "🙋", "🧏", "🙇", "🤦", "🤷", "👮", "🕵️", "💂", "🥷", "👷", "🤴", "👸", "👳", "👲", "🧕", "🤵", "👰", "🤰", "🧘", "🏃", "🚶", "💃", "🕺", "👯"],
    Animals: ["🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "🐮", "🐷", "🐸", "🐵", "🙈", "🙉", "🙊", "🐒", "🐔", "🐧", "🐦", "🐤", "🐣", "🦆", "🦅", "🦉", "🐺", "🐗", "🐴", "🦄", "🐝", "🐛", "🦋", "🐌", "🐞", "🐜", "🕷️", "🐢", "🐍", "🦎", "🦂", "🐙", "🦑", "🦀", "🐠", "🐟", "🐡", "🐬", "🐳", "🐋", "🦈", "🐊", "🐘", "🦏", "🦛", "🦒", "🦘", "🦬", "🐄", "🐎", "🐖", "🐑", "🦙"],
    Food: ["🍏", "🍎", "🍐", "🍊", "🍋", "🍌", "🍉", "🍇", "🍓", "🫐", "🍈", "🍒", "🍑", "🥭", "🍍", "🥥", "🥝", "🍅", "🥑", "🍆", "🥔", "🥕", "🌽", "🌶️", "🥒", "🥬", "🥦", "🧄", "🧅", "🍞", "🥐", "🥨", "🧀", "🥚", "🍳", "🧇", "🥞", "🥓", "🍔", "🍟", "🍕", "🌭", "🌮", "🌯", "🥗", "🍿", "🍩", "🍪", "🎂", "🍰", "🍫", "🍬", "🍭", "🍮", "☕", "🧃"],
    Activities: ["⚽", "🏀", "🏈", "⚾", "🥎", "🎾", "🏐", "🏉", "🥏", "🎱", "🏓", "🏸", "🥅", "⛳", "🏹", "🎣", "🥊", "🥋", "🎽", "🛹", "🛷", "⛸️", "🎿", "🏂", "🏋️", "🤼", "🤸", "⛹️", "🤺", "🏇", "🧘", "🏄", "🎮", "🕹️", "🎲", "🎯", "🎳", "🎭", "🎨", "🎬", "🎤", "🎧", "🎷", "🎸", "🎹", "🥁", "🎺", "🎻"],
    Travel: ["🚗", "🚕", "🚙", "🚌", "🚎", "🏎️", "🚓", "🚑", "🚒", "🚐", "🛻", "🚚", "🚛", "🚜", "🏍️", "🛵", "🚲", "✈️", "🚁", "🚂", "🚆", "🚇", "🚊", "🚉", "🚢", "⛵", "🚤", "🛥️", "🗺️", "🗿", "🗽", "🗼", "🏰", "🏯", "🏟️", "🎡", "🎢", "🌋", "🏖️", "🏝️"],
    Objects: ["⌚", "📱", "💻", "⌨️", "🖥️", "🖨️", "📷", "📸", "📹", "🎥", "📺", "☎️", "📞", "🔋", "🔌", "💡", "🔦", "🕯️", "📚", "📖", "✏️", "📝", "📌", "📎", "✂️", "🔒", "🔑", "🔨", "⚙️", "🧰", "🎁", "🎈", "🎉", "🎊", "📦", "💰", "💎", "👑", "🪄", "🔮"],
    Symbols: ["❤️", "⭐", "🌟", "✨", "⚡", "🔥", "💥", "💫", "❄️", "☀️", "🌙", "☁️", "☔", "✅", "❌", "⭕", "❗", "❓", "‼️", "⁉️", "💯", "♾️", "➕", "➖", "✖️", "➗", "✔️", "☑️", "🔴", "🟠", "🟡", "🟢", "🔵", "🟣", "⚫", "⚪", "🟤", "🔔", "🔕", "🚨"]
};

let currentEmojiCategory = "Smileys";

function renderEmojiCategories() {

    if (!emojiCategories) return;

    emojiCategories.innerHTML = "";

    Object.keys(emojiData).forEach(category => {

        const button = document.createElement("button");
        button.type = "button";
        button.className = "emoji-category-button";

        if (category === currentEmojiCategory) button.classList.add("active");

        button.textContent = emojiData[category][0];
        button.title = category;

        button.addEventListener("click", () => {
            currentEmojiCategory = category;
            renderEmojiCategories();
            renderEmojiList(emojiData[category]);
        });

        emojiCategories.appendChild(button);
    });
}

function renderEmojiList(emojiArray) {

    if (!emojiList) return;

    emojiList.innerHTML = "";

    emojiArray.forEach(emoji => {

        const button = document.createElement("button");
        button.type = "button";
        button.className = "emoji-option";
        button.textContent = emoji;

        button.addEventListener("click", () => insertEmoji(emoji));

        emojiList.appendChild(button);
    });
}

function insertEmoji(emoji) {

    if (!messageInput) return;

    const start = messageInput.selectionStart ?? messageInput.value.length;
    const end = messageInput.selectionEnd ?? messageInput.value.length;

    messageInput.value =
        messageInput.value.substring(0, start) + emoji + messageInput.value.substring(end);

    const newPosition = start + emoji.length;

    messageInput.focus();
    messageInput.setSelectionRange(newPosition, newPosition);
}

if (emojiButton) {
    emojiButton.addEventListener("click", event => {

        event.stopPropagation();

        if (!emojiPicker) return;

        emojiPicker.classList.toggle("open");

        if (emojiPicker.classList.contains("open")) {
            renderEmojiCategories();
            renderEmojiList(emojiData[currentEmojiCategory]);
        }
    });
}

if (emojiSearch) {
    emojiSearch.addEventListener("input", () => {

        const query = emojiSearch.value.trim().toLowerCase();

        if (!query) {
            renderEmojiList(emojiData[currentEmojiCategory]);
            return;
        }

        let results = [];

        Object.keys(emojiData).forEach(category => {
            if (category.toLowerCase().includes(query)) {
                results = results.concat(emojiData[category]);
            }
        });

        if (!results.length) {
            results = Object.values(emojiData).flat();
        }

        renderEmojiList([...new Set(results)]);
    });
}

document.addEventListener("click", event => {
    if (
        emojiPicker &&
        emojiPicker.classList.contains("open") &&
        !emojiPicker.contains(event.target) &&
        !(emojiButton && emojiButton.contains(event.target))
    ) {
        emojiPicker.classList.remove("open");
    }
});


/* =========================================================
   VOICE RECORDER
========================================================= */

function getSupportedAudioMimeType() {

    const types = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/ogg;codecs=opus",
        "audio/ogg"
    ];

    for (const type of types) {
        if (
            window.MediaRecorder &&
            typeof MediaRecorder.isTypeSupported === "function" &&
            MediaRecorder.isTypeSupported(type)
        ) {
            return type;
        }
    }

    return "";
}

function formatVoiceTime(seconds) {

    const total = Math.max(0, Math.floor(seconds));
    const minutes = Math.floor(total / 60);
    const secondsPart = total % 60;

    return String(minutes).padStart(2, "0") + ":" + String(secondsPart).padStart(2, "0");
}


function ensureVoiceControls() {

    if (!voiceComposer) return;

    let playButton = document.getElementById("voicePlayButton");
    let sendButton = document.getElementById("sendVoiceButton");

    if (!playButton) {
        playButton = document.createElement("button");
        playButton.type = "button";
        playButton.id = "voicePlayButton";
        playButton.className = "voice-composer-button voice-play-button";
        playButton.textContent = "▶";
        playButton.disabled = true;
        playButton.title = "Play voice note";
        playButton.setAttribute("aria-label", "Play voice note");
        voiceComposer.appendChild(playButton);
    }

    if (!sendButton) {
        sendButton = document.createElement("button");
        sendButton.type = "button";
        sendButton.id = "sendVoiceButton";
        sendButton.className = "voice-composer-button voice-send-button";
        sendButton.textContent = "➤";
        sendButton.disabled = true;
        sendButton.title = "Send voice note";
        sendButton.setAttribute("aria-label", "Send voice note");
        voiceComposer.appendChild(sendButton);
    }

    return { playButton, sendButton };
}

function createLiveWaveform() {

    if (!voiceWaveform) return;

    voiceWaveform.innerHTML = "";

    const barCount = 48;

    for (let i = 0; i < barCount; i++) {
        const bar = document.createElement("span");
        bar.className = "voice-wave-bar";
        bar.style.height = "4px";
        bar._height = 4;
        voiceWaveform.appendChild(bar);
    }
}

function resetWaveform() {

    if (!voiceWaveform) return;

    Array.from(voiceWaveform.children).forEach(bar => {
        bar.style.height = "4px";
        bar._height = 4;
    });
}

function showRecordingUI() {

    if (messageForm) {
        messageForm.classList.add("is-recording");
        messageForm.classList.remove("is-recorded");
    }

    if (normalComposer) normalComposer.style.display = "none";

    if (voiceComposer) {
        voiceComposer.hidden = false;
        voiceComposer.style.display = "flex";
    }

    if (recordButton) recordButton.disabled = true;
    if (stopButton) stopButton.disabled = false;
    if (voicePlayButton) voicePlayButton.disabled = true;
    if (sendVoiceButton) sendVoiceButton.disabled = true;
    if (recordingStatus) recordingStatus.textContent = "Recording…";
    if (voiceDuration) voiceDuration.textContent = "00:00";

    createLiveWaveform();
}

function showVoicePreviewUI() {

    if (messageForm) {
        messageForm.classList.remove("is-recording");
        messageForm.classList.add("is-recorded");
    }

    if (normalComposer) normalComposer.style.display = "none";

    if (voiceComposer) {
        voiceComposer.hidden = false;
        voiceComposer.style.display = "flex";
    }

    if (recordButton) recordButton.disabled = true;
    if (stopButton) stopButton.disabled = true;
    if (voicePlayButton) voicePlayButton.disabled = !recordedVoiceBlob;
    if (sendVoiceButton) sendVoiceButton.disabled = !recordedVoiceBlob;
    if (recordingStatus) recordingStatus.textContent = "Voice note ready";
}

function showNormalComposer() {

    if (messageForm) {
        messageForm.classList.remove("is-recording");
        messageForm.classList.remove("is-recorded");
    }

    if (composerBox) {
        composerBox.classList.remove("is-typing");
    }

    if (voiceComposer) {
        voiceComposer.hidden = true;
        voiceComposer.style.display = "";
    }

    if (normalComposer) {
        normalComposer.style.display = "flex";
    }

    if (recordButton) recordButton.disabled = false;
    if (stopButton) stopButton.disabled = true;
    if (voicePlayButton) voicePlayButton.disabled = true;
    if (sendVoiceButton) sendVoiceButton.disabled = true;
    if (recordingStatus) recordingStatus.textContent = "";
    if (voiceDuration) voiceDuration.textContent = "00:00";
    if (voiceWaveform) voiceWaveform.innerHTML = "";
}

function stopWaveformAnimation() {
    if (voiceAnimationFrame !== null) {
        cancelAnimationFrame(voiceAnimationFrame);
        voiceAnimationFrame = null;
    }
}

function stopVoiceTimer() {
    if (voiceTimer) {
        clearInterval(voiceTimer);
        voiceTimer = null;
    }
}

function releaseMicrophone() {

    if (microphoneStream) {
        microphoneStream.getTracks().forEach(track => {
            try { track.stop(); } catch (_) { }
        });
        microphoneStream = null;
    }

    if (microphoneSource) {
        try { microphoneSource.disconnect(); } catch (_) { }
        microphoneSource = null;
    }

    analyser = null;

    if (audioContext) {
        try {
            if (audioContext.state !== "closed") audioContext.close();
        } catch (_) { }
        audioContext = null;
    }
}

function startVoiceTimer() {

    stopVoiceTimer();

    voiceRecordingStartedAt = Date.now();

    voiceTimer = setInterval(() => {

        if (!isRecording || !voiceRecordingStartedAt) return;

        const elapsed = (Date.now() - voiceRecordingStartedAt) / 1000;

        if (voiceDuration) voiceDuration.textContent = formatVoiceTime(elapsed);

    }, 200);
}


function updateLiveWaveform() {

    if (!isRecording || !analyser || !voiceWaveform) {
        voiceAnimationFrame = null;
        return;
    }

    const bars = Array.from(voiceWaveform.children);

    if (!bars.length) {
        voiceAnimationFrame = requestAnimationFrame(updateLiveWaveform);
        return;
    }

    const bufferLength = analyser.fftSize;
    const dataArray = new Uint8Array(bufferLength);

    analyser.getByteTimeDomainData(dataArray);

    let sumSquares = 0;

    for (let i = 0; i < bufferLength; i++) {
        const sample = (dataArray[i] - 128) / 128;
        sumSquares += sample * sample;
    }

    const rms = Math.sqrt(sumSquares / bufferLength);
    const volume = Math.min(1, Math.pow(rms * 6, 0.75));
    const barCount = bars.length;

    bars.forEach((bar, index) => {

        const center = Math.abs((index - (barCount - 1) / 2) / ((barCount - 1) / 2));
        const centerFactor = 1 - center * 0.35;

        const sampleIndex = Math.floor((index / barCount) * (bufferLength - 1));
        const sample = Math.abs((dataArray[sampleIndex] - 128) / 128);

        const soundFactor = Math.min(1, (volume * 0.72) + (sample * 0.90));
        const targetHeight = 4 + (soundFactor * 30 * centerFactor);

        const previousHeight = Number(bar._height || 4);
        const smoothHeight = previousHeight + (targetHeight - previousHeight) * 0.35;

        bar._height = smoothHeight;
        bar.style.height = smoothHeight + "px";
    });

    voiceAnimationFrame = requestAnimationFrame(updateLiveWaveform);
}


function getVoicePreviewAudio() {

    if (voicePreview && voicePreview instanceof HTMLAudioElement) {
        return voicePreview;
    }

    if (previewAudioElement) return previewAudioElement;

    previewAudioElement = document.createElement("audio");
    previewAudioElement.id = "nexaVoicePreviewAudio";
    previewAudioElement.preload = "metadata";
    previewAudioElement.style.display = "none";

    document.body.appendChild(previewAudioElement);

    return previewAudioElement;
}

function prepareVoicePreview() {

    if (!recordedVoiceBlob) return;

    const audio = getVoicePreviewAudio();
    if (!audio) return;

    if (voicePreviewUrl) URL.revokeObjectURL(voicePreviewUrl);

    voicePreviewUrl = URL.createObjectURL(recordedVoiceBlob);

    audio.src = voicePreviewUrl;
    audio.load();

    if (voicePlayButton) voicePlayButton.disabled = false;
    if (sendVoiceButton) sendVoiceButton.disabled = false;
}

function resetVoiceRecording() {

    isRecording = false;

    stopVoiceTimer();
    stopWaveformAnimation();
    releaseMicrophone();

    if (mediaRecorder && mediaRecorder.state !== "inactive") {
        try {
            mediaRecorder.onstop = null;
            mediaRecorder.stop();
        } catch (_) { }
    }

    mediaRecorder = null;
    audioChunks = [];
    recordedVoiceBlob = null;
    recordedVoiceMimeType = "audio/webm";
    voiceRecordingStartedAt = null;

    if (voicePreviewUrl) {
        URL.revokeObjectURL(voicePreviewUrl);
        voicePreviewUrl = null;
    }

    const audio = getVoicePreviewAudio();

    if (audio) {
        try { audio.pause(); } catch (_) { }
        audio.removeAttribute("src");
        audio.load();
    }

    resetWaveform();
    showNormalComposer();
}


async function startVoiceRecording() {

    if (!selectedFriend && !selectedGroup) {
        alert("Open a conversation first.");
        return;
    }

    if (isRecording) return;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert("Your browser does not support microphone recording.");
        return;
    }

    if (typeof MediaRecorder === "undefined") {
        alert("Your browser does not support voice recording.");
        return;
    }

    try {

        resetVoiceRecording();

        microphoneStream = await navigator.mediaDevices.getUserMedia({
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            }
        });

        const AudioContextClass = window.AudioContext || window.webkitAudioContext;

        if (!AudioContextClass) throw new Error("Web Audio API is not supported.");

        audioContext = new AudioContextClass();

        if (audioContext.state === "suspended") await audioContext.resume();

        microphoneSource = audioContext.createMediaStreamSource(microphoneStream);
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.78;

        microphoneSource.connect(analyser);

        recordedVoiceMimeType = getSupportedAudioMimeType();

        const recorderOptions = recordedVoiceMimeType ? { mimeType: recordedVoiceMimeType } : {};

        mediaRecorder = new MediaRecorder(microphoneStream, recorderOptions);

        audioChunks = [];
        recordedVoiceBlob = null;

        mediaRecorder.ondataavailable = event => {
            if (event.data && event.data.size > 0) audioChunks.push(event.data);
        };

        mediaRecorder.onerror = event => {
            console.error("NEXA MediaRecorder error:", event.error);
            resetVoiceRecording();
        };

        mediaRecorder.onstop = () => {

            const mimeType = recordedVoiceMimeType || mediaRecorder?.mimeType || "audio/webm";

            if (!audioChunks.length) {
                resetVoiceRecording();
                return;
            }

            recordedVoiceBlob = new Blob(audioChunks, { type: mimeType });

            stopWaveformAnimation();
            stopVoiceTimer();
            releaseMicrophone();

            mediaRecorder = null;
            audioChunks = [];

            prepareVoicePreview();
            showVoicePreviewUI();
        };

        mediaRecorder.start(100);

        isRecording = true;

        showRecordingUI();
        startVoiceTimer();
        stopWaveformAnimation();
        updateLiveWaveform();

        console.log("NEXA voice recording started.");

    } catch (error) {

        console.error("NEXA microphone error:", error);

        isRecording = false;
        releaseMicrophone();
        mediaRecorder = null;
        audioChunks = [];

        alert("NEXA could not access your microphone. Please allow microphone access and try again.");
    }
}


function stopVoiceRecording() {

    if (!mediaRecorder || !isRecording) return;

    isRecording = false;

    stopVoiceTimer();
    stopWaveformAnimation();

    if (recordingStatus) recordingStatus.textContent = "Preparing voice note…";
    if (stopButton) stopButton.disabled = true;

    try {
        if (mediaRecorder.state !== "inactive") mediaRecorder.stop();
    } catch (error) {
        console.error("NEXA stop recording error:", error);
        resetVoiceRecording();
    }
}


if (recordButton) {
    recordButton.addEventListener("click", event => {
        event.preventDefault();
        startVoiceRecording();
    });
}

if (stopButton) {
    stopButton.addEventListener("click", event => {
        event.preventDefault();
        stopVoiceRecording();
    });
}

if (cancelVoiceButton) {
    cancelVoiceButton.addEventListener("click", event => {
        event.preventDefault();
        resetVoiceRecording();
    });
}

const ensuredVoiceControls = ensureVoiceControls();
const actualVoicePlayButton = ensuredVoiceControls?.playButton || voicePlayButton;
const actualSendVoiceButton = ensuredVoiceControls?.sendButton || sendVoiceButton;

if (actualVoicePlayButton) {
    actualVoicePlayButton.addEventListener("click", event => {

        event.preventDefault();

        const audio = getVoicePreviewAudio();
        if (!audio) return;

        if (audio.paused) {
            audio.play()
                .then(() => { actualVoicePlayButton.textContent = "⏸"; })
                .catch(error => console.error("NEXA preview playback error:", error));
        } else {
            audio.pause();
            actualVoicePlayButton.textContent = "▶";
        }
    });
}

document.addEventListener("ended", event => {

    const audio = event.target;
    if (!(audio instanceof HTMLAudioElement)) return;

    if (audio === getVoicePreviewAudio()) {
        if (actualVoicePlayButton) actualVoicePlayButton.textContent = "▶";
    }

    if (audio.classList.contains("nexa-hidden-audio")) {
        updateVoicePlayButton(audio, false);
    }
}, true);


if (actualSendVoiceButton) {
    actualSendVoiceButton.addEventListener("click", async event => {

        event.preventDefault();

        if (
            !recordedVoiceBlob ||
            (!selectedFriend && !selectedGroup)
        ) {
            return;
        }

        actualSendVoiceButton.disabled = true;

        try {

            const audioData = await readFileAsDataURL(recordedVoiceBlob);
            const newMessage = {

                id: createMessageId(),

                conversationId:
                    selectedGroup
                        ? null
                        : createConversationId(
                            currentUser,
                            selectedFriend
                        ),

                groupId:
                    selectedGroup
                        ? String(selectedGroup.id)
                        : null,

                senderId:
                    String(currentUser.id),

                receiverId:
                    selectedGroup
                        ? null
                        : String(selectedFriend.id),

                text: "",

                media:
                    audioData,

                mediaType:
                    recordedVoiceMimeType ||
                    recordedVoiceBlob.type ||
                    "audio/webm",

                timestamp:
                    new Date().toISOString(),

                read:
                    selectedGroup
                        ? true
                        : false
            };

            const saved = await sendMessageToServer(newMessage);

            if (!saved) {
                alert("Message could not be saved.");
                return;
            }

            playNexaSendSound();

            addMessage(newMessage);

            playNexaSendSound();

            resetVoiceRecording();

            if (selectedGroup) {

                renderGroupConversation(
                    getCurrentGroupMessages()
                );

                if (messagesContainer) {
                    messagesContainer.scrollTop =
                        messagesContainer.scrollHeight;
                }

            } else {

                renderCurrentConversation(true);

                displayConversations(
                    getConversationSearchValue()
                );
            }

        } catch (error) {

            console.error("NEXA voice send error:", error);
            alert("Something went wrong while sending the voice message.");
            actualSendVoiceButton.disabled = false;
        }
    });
}


function voiceMessageWaveform(messageId) {

    const source = String(messageId || "");
    let hash = 0;

    for (let i = 0; i < source.length; i++) {
        hash = ((hash << 5) - hash + source.charCodeAt(i)) | 0;
    }

    const bars = [];

    for (let i = 0; i < 34; i++) {
        hash = (hash * 1664525 + 1013904223) | 0;
        const value = Math.abs(hash % 100);
        const height = 20 + value * 0.72;
        bars.push(`<span style="height:${height}%"></span>`);
    }

    return bars.join("");
}


function getVoiceButtonForAudio(audio) {

    if (!audio) return null;

    const buttons = document.querySelectorAll(".nexa-voice-play");

    for (const button of buttons) {
        if (button.dataset.audioId === audio.id) return button;
    }

    return null;
}

function updateVoicePlayButton(audio, forceState = null) {

    const button = getVoiceButtonForAudio(audio);
    if (!button) return;

    const playing = forceState !== null ? forceState : !audio.paused;

    button.textContent = playing ? "⏸" : "▶";

    const voiceMessage = button.closest(".nexa-voice-message");
    if (voiceMessage) voiceMessage.classList.toggle("is-playing", playing);
}

function stopOtherVoiceMessages(currentAudio) {

    document.querySelectorAll(".nexa-hidden-audio").forEach(audio => {

        if (audio === currentAudio) return;

        audio.pause();
        audio.currentTime = 0;

        updateVoicePlayButton(audio, false);
    });
}

document.addEventListener("click", event => {

    const playButton = event.target.closest(".nexa-voice-play");
    if (!playButton) return;

    const audioId = playButton.dataset.audioId;
    if (!audioId) return;

    const audio = document.getElementById(audioId);
    if (!audio) return;

    stopOtherVoiceMessages(audio);

    if (audio.paused) {
        audio.play()
            .then(() => updateVoicePlayButton(audio, true))
            .catch(error => console.error("NEXA voice playback error:", error));
    } else {
        audio.pause();
        updateVoicePlayButton(audio, false);
    }
});

document.addEventListener("loadedmetadata", event => {

    const audio = event.target;
    if (!(audio instanceof HTMLAudioElement)) return;
    if (!audio.classList.contains("nexa-hidden-audio")) return;

    const durationElement = document.getElementById(audio.id + "-duration");
    if (!durationElement) return;

    const totalSeconds = Math.floor(audio.duration || 0);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    durationElement.textContent = minutes + ":" + String(seconds).padStart(2, "0");

}, true);

document.addEventListener("play", event => {

    const audio = event.target;
    if (!(audio instanceof HTMLAudioElement)) return;

    if (audio.classList.contains("nexa-hidden-audio")) {
        stopOtherVoiceMessages(audio);
        updateVoicePlayButton(audio, true);
    }
}, true);

document.addEventListener("pause", event => {

    const audio = event.target;
    if (!(audio instanceof HTMLAudioElement)) return;

    if (audio.classList.contains("nexa-hidden-audio")) {
        updateVoicePlayButton(audio, false);
    }
}, true);

document.addEventListener("timeupdate", event => {

    const audio = event.target;
    if (!(audio instanceof HTMLAudioElement)) return;
    if (!audio.classList.contains("nexa-hidden-audio")) return;

    const durationElement = document.getElementById(audio.id + "-duration");
    if (!durationElement) return;

    const seconds = Math.floor(audio.currentTime || 0);
    const minutes = Math.floor(seconds / 60);
    const remaining = seconds % 60;

    durationElement.textContent = minutes + ":" + String(remaining).padStart(2, "0");
});


/* =========================================================
   LOCATION
========================================================= */

function handleLocationError(error) {

    console.error("NEXA location error:", error);

    if (!locationStatus) return;

    if (error && error.code === error.PERMISSION_DENIED) {
        locationStatus.textContent = "📍 Location permission is blocked. Allow Location for NEXA in your browser.";
        return;
    }

    if (error && error.code === error.POSITION_UNAVAILABLE) {
        locationStatus.textContent = "📍 Your location could not be detected.";
        return;
    }

    if (error && error.code === error.TIMEOUT) {
        locationStatus.textContent = "📍 Location request timed out. Try again.";
        return;
    }

    locationStatus.textContent = "📍 Could not get your location.";
}

if (locationButton) {
    locationButton.addEventListener("click", event => {

        event.preventDefault();

        if (!selectedFriend && !selectedGroup) {

            if (locationStatus) {
                locationStatus.textContent =
                    "Open a conversation first.";
            }

            return;
        }

        if (!navigator.geolocation) {
            if (locationStatus) locationStatus.textContent = "Location is not supported.";
            return;
        }

        if (locationStatus) locationStatus.textContent = "📍 Getting location…";

        navigator.geolocation.getCurrentPosition(

            async position => {

                const newMessage = {

                    id:
                        createMessageId(),

                    conversationId:
                        selectedGroup
                            ? null
                            : createConversationId(
                                currentUser,
                                selectedFriend
                            ),

                    groupId:
                        selectedGroup
                            ? String(selectedGroup.id)
                            : null,

                    senderId:
                        String(currentUser.id),

                    receiverId:
                        selectedGroup
                            ? null
                            : String(selectedFriend.id),

                    text:
                        "📍 Location shared",

                    media:
                        null,

                    mediaType:
                        "location",

                    latitude:
                        position.coords.latitude,

                    longitude:
                        position.coords.longitude,

                    timestamp:
                        new Date().toISOString(),

                    read:
                        selectedGroup
                            ? true
                            : false
                };

                const saved = await sendMessageToServer(newMessage);

                if (!saved) {
                    if (locationStatus) locationStatus.textContent = "Could not send location.";
                    return;
                }
                playNexaSendSound();

                if (locationStatus) {
                    locationStatus.textContent =
                        "📍 Location sent.";
                }

                playNexaSendSound();

                addMessage(newMessage);

                if (selectedGroup) {

                    renderGroupConversation(
                        getCurrentGroupMessages()
                    );

                    if (messagesContainer) {
                        messagesContainer.scrollTop =
                            messagesContainer.scrollHeight;
                    }

                } else {

                    renderCurrentConversation(true);

                    displayConversations(
                        getConversationSearchValue()
                    );
                }
            },

            handleLocationError,

            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    });
}


/* =========================================================
   PRESENCE / ONLINE STATUS

   NEXA FIX: presence changes used to only refresh the
   sidebar. Now, if the chat you currently have open belongs
   to a friend whose presence just changed, the chat header
   (avatar dot + "Online"/"Offline" label) updates live too.
   A periodic re-track is also added since some Supabase
   presence setups silently drop a stale client if it never
   re-announces itself.
========================================================= */

function isUserOnline(userId) {
    return onlineUserIds.has(String(userId));
}

function refreshOnlineUsers() {

    if (!presenceChannel) return;

    const state = presenceChannel.presenceState();
    const nextOnlineUsers = new Set();

    Object.keys(state).forEach(key => {
        nextOnlineUsers.add(String(key));
    });

    onlineUserIds = nextOnlineUsers;

    updateVisibleConversationUI();

    /*
     * Live-update the open chat's header, not just the list.
     */
    if (selectedFriend) {

        updateChatHeader(
            selectedFriend
        );

    } else if (selectedGroup) {

        updateGroupHeader(
            selectedGroup
        );
    }
}

async function subscribeToPresence() {

    if (presenceChannel) {
        try { await presenceChannel.untrack(); } catch (_) { }
        await nexaSupabase.removeChannel(presenceChannel);
        presenceChannel = null;
    }

    if (presenceHeartbeatTimer) {
        clearInterval(presenceHeartbeatTimer);
        presenceHeartbeatTimer = null;
    }

    presenceChannel = nexaSupabase.channel("nexa-online-presence", {
        config: { presence: { key: String(currentUser.id) } }
    });

    const trackPresence = async () => {
        try {
            await presenceChannel.track({
                userId: String(currentUser.id),
                online_at: new Date().toISOString()
            });
        } catch (error) {
            console.error("NEXA presence track error:", error);
        }
    };

    presenceChannel
        .on("presence", { event: "sync" }, refreshOnlineUsers)
        .on("presence", { event: "join" }, refreshOnlineUsers)
        .on("presence", { event: "leave" }, refreshOnlineUsers)
        .subscribe(async status => {

            console.log("NEXA Presence:", status);

            if (status === "SUBSCRIBED") {

                await trackPresence();

                /*
                 * Re-announce presence periodically so this
                 * client doesn't quietly drop off as "offline"
                 * to everyone else after a long idle stretch.
                 */
                presenceHeartbeatTimer = setInterval(trackPresence, 25000);
            }
        });
}

/*
 * Re-track presence when the tab regains focus/visibility —
 * covers laptops sleeping, phones locking, tab switching,
 * so "online" reflects reality quickly when someone comes
 * back rather than waiting for the next heartbeat tick.
 */
document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && presenceChannel) {
        presenceChannel.track({
            userId: String(currentUser.id),
            online_at: new Date().toISOString()
        }).catch(() => { });
    }
});


/* =========================================================
   SEARCH / FILTER
========================================================= */

function getConversationSearchValue() {
    return conversationSearch ? conversationSearch.value.trim().toLowerCase() : "";
}

function updateConversationFilterButtons() {

    conversationFilterButtons.forEach(button => {

        const label = button.textContent.trim().toLowerCase();

        button.classList.toggle("active", label === activeConversationFilter);
    });
}

function updateVisibleConversationUI() {
    displayConversations(getConversationSearchValue());
}

conversationFilterButtons.forEach(button => {
    button.addEventListener("click", () => {

        const filter = button.textContent.trim().toLowerCase();

        if (filter === "all" || filter === "unread" || filter === "online") {
            activeConversationFilter = filter;
        }

        updateConversationFilterButtons();
        displayConversations(getConversationSearchValue());
    });
});

if (conversationSearch) {
    conversationSearch.addEventListener("input", () => {
        displayConversations(getConversationSearchValue());
    });
}

/* =========================================================
   LOAD MY GROUPS
   Includes:
   - group data
   - last message preview
   - unread count
   - online presence
========================================================= */

async function loadMyGroups() {

    try {

        const currentId =
            String(currentUser.id);

        const { data: memberships, error: membershipError } =
            await nexaSupabase
                .from("group_members")
                .select("group_id")
                .eq("user_id", currentId);

        if (membershipError) {
            throw membershipError;
        }

        const groupIds =
            (memberships || [])
                .map(row => String(row.group_id));

        if (!groupIds.length) {

            groups = [];

            return;
        }




        /* -----------------------------------------------------
           GROUPS
        ----------------------------------------------------- */

        const { data: groupRows, error: groupError } =
            await nexaSupabase
                .from("groups")
                .select(`
                    id,
                    name,
                    description,
                    group_picture,
                    created_by,
                    created_at
                `)
                .in("id", groupIds)
                .order("created_at", {
                    ascending: false
                });

        if (groupError) {
            throw groupError;
        }


        /* -----------------------------------------------------
           GROUP MEMBERS
        ----------------------------------------------------- */

        const { data: memberRows, error: memberError } =
            await nexaSupabase
                .from("group_members")
                .select("group_id, user_id")
                .in("group_id", groupIds);

        if (memberError) {
            throw memberError;
        }


        /* -----------------------------------------------------
           GROUP READ STATES
        ----------------------------------------------------- */

        const { data: readRows, error: readError } =
            await nexaSupabase
                .from("group_reads")
                .select("group_id, last_read_at")
                .eq("user_id", currentId)
                .in("group_id", groupIds);

        if (readError) {
            throw readError;
        }


        const readMap = new Map();

        (readRows || []).forEach(row => {

            readMap.set(
                String(row.group_id),
                row.last_read_at
            );

        });


        /* -----------------------------------------------------
           RECENT GROUP MESSAGES
        ----------------------------------------------------- */

        const { data: groupMessages, error: messageError } =
            await nexaSupabase
                .from("messages")
                .select(`
                    id,
                    group_id,
                    sender_id,
                    text,
                    media_type,
                    timestamp
                `)
                .in("group_id", groupIds)
                .order("timestamp", {
                    ascending: false
                })
                .limit(300);

        if (messageError) {
            throw messageError;
        }


        /* -----------------------------------------------------
           BUILD GROUP UI DATA
        ----------------------------------------------------- */

        groups =
            (groupRows || []).map(group => {

                const groupId =
                    String(group.id);

                const members =
                    (memberRows || [])
                        .filter(member =>
                            String(member.group_id) ===
                            groupId
                        );

                const memberIds =
                    members.map(member =>
                        String(member.user_id)
                    );


                const onlineMemberExists =
                    memberIds.some(memberId =>
                        memberId !== currentId &&
                        isUserOnline(memberId)
                    );


                const groupMessagesForGroup =
                    (groupMessages || [])
                        .filter(message =>
                            String(message.group_id) ===
                            groupId
                        );


                const lastMessage =
                    groupMessagesForGroup[0] ||
                    null;


                const lastReadAt =
                    readMap.get(groupId) ||
                    group.created_at;


                const unreadCount =
                    groupMessagesForGroup.filter(message =>

                        String(message.sender_id) !== currentId &&

                        new Date(message.timestamp) >
                        new Date(lastReadAt)

                    ).length;


                let preview =
                    "Group conversation";


                if (lastMessage) {

                    if (lastMessage.text) {

                        preview =
                            lastMessage.text;

                    } else if (
                        lastMessage.media_type ===
                        "location"
                    ) {

                        preview =
                            "📍 Location";

                    } else if (
                        String(
                            lastMessage.media_type || ""
                        ).startsWith("audio/")
                    ) {

                        preview =
                            "🎤 Voice message";

                    } else if (
                        String(
                            lastMessage.media_type || ""
                        ).startsWith("image/")
                    ) {

                        preview =
                            "📷 Photo";

                    } else if (
                        String(
                            lastMessage.media_type || ""
                        ).startsWith("video/")
                    ) {

                        preview =
                            "🎥 Video";
                    }
                }


                return {

                    ...group,

                    memberCount:
                        members.length,

                    online:
                        onlineMemberExists,

                    unreadCount,

                    lastMessage,

                    preview
                };

            });


        console.log(
            "NEXA groups loaded:",
            groups
        );

    } catch (error) {

        console.error(
            "NEXA group loading error:",
            error
        );

        groups = [];
    }
}


/* =========================================================
   DISPLAY CONVERSATIONS
========================================================= */

async function displayConversations(search = "") {

    if (!users.length) {
        await getUsers();
    }

    await loadMyGroups();

    if (!conversationsList) return;

    conversationsList.innerHTML = "";

    const friendIds = getFriendIds();
    const searchText = String(search || "").trim().toLowerCase();

    const filteredFriends = friendIds
        .map(friendId => findUserById(friendId))
        .filter(Boolean)
        .filter(friend => {

            if (searchText) {

                const name = String(friend.name || "").toLowerCase();
                const username = String(friend.username || "").toLowerCase();

                if (!name.includes(searchText) && !username.includes(searchText)) {
                    return false;
                }
            }

            if (activeConversationFilter === "online") {
                return isUserOnline(friend.id);
            }

            if (activeConversationFilter === "unread") {

                const conversationId = createConversationId(currentUser, friend);

                return messages.some(message =>
                    String(message.conversationId) === String(conversationId) &&
                    String(message.receiverId) === String(currentUser.id) &&
                    !message.read
                );
            }

            return true;
        });

    if (sidebarCount) sidebarCount.textContent = String(filteredFriends.length);

    if (!filteredFriends.length) {

        const emptyText =
            activeConversationFilter === "online" ? "No friends are online right now." :
                activeConversationFilter === "unread" ? "No unread conversations." :
                    searchText ? "No conversations found." :
                        "Add friends to start chatting.";

        conversationsList.innerHTML = `<p>${escapeHTML(emptyText)}</p>`;
    }

    filteredFriends.forEach(friend => {

        const conversationId = createConversationId(currentUser, friend);

        const conversation = messages
            .filter(message => String(message.conversationId) === String(conversationId))
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        const lastMessage = conversation[conversation.length - 1];

        const unread = conversation.filter(message =>
            String(message.receiverId) === String(currentUser.id) && !message.read
        ).length;

        let preview = "Start a conversation";

        if (lastMessage) {
            if (lastMessage.mediaType === "call_missed_voice") {
                preview = "📞 Missed voice call";
            } else if (lastMessage.mediaType === "call_missed_video") {
                preview = "📹 Missed video call";
            } else if (lastMessage.text) {
                preview = lastMessage.text;
            } else if (lastMessage.mediaType === "location") {
                preview = "📍 Location";
            } else if (String(lastMessage.mediaType || "").startsWith("audio/")) {
                preview = "🎤 Voice message";
            } else if (String(lastMessage.mediaType || "").startsWith("image/")) {
                preview = "📷 Photo";
            } else if (String(lastMessage.mediaType || "").startsWith("video/")) {
                preview = "🎥 Video";
            }
        }

        const online = isUserOnline(friend.id);

        const conversationBox = document.createElement("div");

        conversationBox.innerHTML = `
            <button
                type="button"
                class="conversationButton ${online ? "is-online" : "is-offline"}"
                data-user-id="${escapeHTML(String(friend.id))}"
            >
                <strong>${escapeHTML(friend.name || "NEXA Member")}</strong>
                <span>${escapeHTML(preview)}</span>
                ${unread > 0 ? `<strong>🔴 ${unread}</strong>` : ""}
            </button>
        `;

        const button = conversationBox.querySelector(".conversationButton");

        if (button) {
            button.addEventListener("click", () => openChat(friend));
        }

        conversationsList.appendChild(conversationBox);



    });

    /* =========================================================
       DISPLAY GROUPS
    ========================================================= */

    const groupSearchText =
        String(search || "")
            .trim()
            .toLowerCase();


    const visibleGroups =
        groups.filter(group => {

            if (!groupSearchText) {
                return true;
            }

            const name =
                String(group.name || "")
                    .toLowerCase();

            const description =
                String(group.description || "")
                    .toLowerCase();

            return (
                name.includes(groupSearchText) ||
                description.includes(groupSearchText)
            );

        });


    if (visibleGroups.length) {

        const heading =
            document.createElement("div");

        heading.className =
            "messages-group-section-heading";

        heading.textContent =
            "Groups";

        conversationsList.appendChild(
            heading
        );


        visibleGroups.forEach(group => {

            const wrapper =
                document.createElement("div");


            const picture =
                group.group_picture || "";


            const avatar =
                picture

                    ? `
                    <img
                        src="${escapeHTML(
                        picture
                    )}"
                        alt="${escapeHTML(
                        group.name ||
                        "Group"
                    )}"
                    >
                  `

                    : `
                    <span class="group-conversation-icon">
                        👥
                    </span>
                  `;


            const unread =
                Number(
                    group.unreadCount || 0
                );


            wrapper.innerHTML = `

            <button
                type="button"
                class="
                    groupConversationButton
                    ${group.online ? "is-online" : "is-offline"}
                "
                data-group-id="${escapeHTML(
                String(group.id)
            )}"
            >

                <span
                    class="groupConversationAvatar"
                >

                    ${avatar}

                    <span
                        class="group-online-dot"
                    ></span>

                </span>


                <span
                    class="groupConversationText"
                >

                    <strong>
                        ${escapeHTML(
                group.name ||
                "NEXA Group"
            )}
                    </strong>

                    <small>
                        ${escapeHTML(
                group.preview ||
                "Group conversation"
            )}
                    </small>

                </span>


                ${unread > 0

                    ? `
                            <span
                                class="group-unread-count"
                            >
                                ${unread > 99
                        ? "99+"
                        : unread}
                            </span>
                          `

                    : ""
                }

            </button>
        `;


            const button =
                wrapper.querySelector(
                    ".groupConversationButton"
                );


            if (button) {

                button.addEventListener(
                    "click",
                    () => openGroup(group)
                );

            }


            conversationsList.appendChild(
                wrapper
            );

        });
    }

}



/* =========================================================
   OPEN CHAT
========================================================= */

async function openChat(friend) {

    if (!friend) return;

    selectedFriend = friend;
    selectedGroup = null;

    localStorage.removeItem(
        "nexaActiveGroup"
    );

    localStorage.setItem(
        "nexaActiveConversation",
        String(friend.id)
    );

    if (chatSection) chatSection.style.display = "flex";
    if (emptyChatState) emptyChatState.style.display = "none";
    if (chatWith) chatWith.textContent = friend.name || "NEXA Member";

    updateChatHeader(friend);

    const shell = document.querySelector(".messages-shell");
    if (shell) shell.classList.add("chat-open");

    await loadConversation();
    await markMessagesAsRead(friend);

    if (messageInput) {
        setTimeout(() => messageInput.focus(), 80);
    }
}


/* =========================================================
   OPEN GROUP CHAT
========================================================= */

async function openGroup(group) {

    if (!group) return;

    selectedGroup = group;
    selectedFriend = null;

    localStorage.setItem(
        "nexaActiveGroup",
        String(group.id)
    );

    localStorage.removeItem(
        "nexaActiveConversation"
    );

    const shell =
        document.querySelector(
            ".messages-shell"
        );

    if (shell) {
        shell.classList.add("chat-open");
    }

    if (chatSection) {
        chatSection.style.display = "flex";
    }

    if (emptyChatState) {
        emptyChatState.style.display = "none";
    }

    await updateGroupHeader(group);

    await loadGroupConversation(group);

    /*
     * Opening the group means the user has now seen
     * the messages. Save that read position.
     */
    await markGroupAsRead(group.id);

    /*
     * Refresh the sidebar so the red unread number
     * disappears immediately.
     */
    await displayConversations(
        getConversationSearchValue()
    );

    if (messagesContainer) {
        messagesContainer.scrollTop =
            messagesContainer.scrollHeight;
    }
}

/* =========================================================
   MARK GROUP AS READ
========================================================= */

async function markGroupAsRead(groupId) {

    if (!groupId) return;

    const now =
        new Date().toISOString();

    try {

        const { error } =
            await nexaSupabase
                .from("group_reads")
                .upsert(
                    {
                        group_id:
                            String(groupId),

                        user_id:
                            String(currentUser.id),

                        last_read_at:
                            now
                    },
                    {
                        onConflict:
                            "group_id,user_id"
                    }
                );

        if (error) {
            throw error;
        }

    } catch (error) {

        console.error(
            "NEXA group read-state error:",
            error
        );
    }
}

/* =========================================================
   GROUP ONLINE STATUS
========================================================= */

async function getGroupOnlineStatus(groupId) {

    if (!groupId) {

        return {
            online: false,
            onlineCount: 0,
            memberCount: 0
        };
    }

    try {

        const { data, error } =
            await nexaSupabase
                .from("group_members")
                .select("user_id")
                .eq(
                    "group_id",
                    String(groupId)
                );

        if (error) {
            throw error;
        }

        const memberIds =
            Array.isArray(data)
                ? data.map(member =>
                    String(member.user_id)
                )
                : [];


        const onlineMembers =
            memberIds.filter(userId =>
                userId !== String(currentUser.id) &&
                isUserOnline(userId)
            );


        return {

            online:
                onlineMembers.length > 0,

            onlineCount:
                onlineMembers.length,

            memberCount:
                memberIds.length
        };

    } catch (error) {

        console.error(
            "NEXA group presence error:",
            error
        );

        return {
            online: false,
            onlineCount: 0,
            memberCount: 0
        };
    }
}

/* =========================================================
   LOAD GROUP CALL MEMBERS
========================================================= */

async function loadGroupCallMembers(groupId) {

    if (!groupId) {
        groupCallMembers = [];
        return [];
    }

    try {

        const { data, error } =
            await nexaSupabase
                .from("group_members")
                .select("user_id")
                .eq(
                    "group_id",
                    String(groupId)
                );

        if (error) {
            throw error;
        }

        const memberIds =
            (data || [])
                .map(member =>
                    String(member.user_id)
                )
                .filter(userId =>
                    userId !==
                    String(currentUser.id)
                );

        groupCallMembers =
            memberIds
                .map(userId =>
                    findUserById(userId)
                )
                .filter(Boolean);

        return groupCallMembers;

    } catch (error) {

        console.error(
            "NEXA group call members error:",
            error
        );

        groupCallMembers = [];

        return [];
    }
}

/* =========================================================
   GROUP HEADER
========================================================= */
async function updateGroupHeader(group) {

    if (!group) return;

    const chatAvatar =
        document.getElementById("chatAvatar");

    const status =
        document.getElementById("chatOnlineStatus");

    /*
     * Check the real presence of the group's members.
     * We only need to know whether AT LEAST ONE member
     * other than the current user is online.
     */
    let isOnline = false;

    try {

        const onlineInfo =
            await getGroupOnlineStatus(group.id);

        isOnline =
            Boolean(onlineInfo?.online);

    } catch (error) {

        console.error(
            "NEXA group header presence error:",
            error
        );
    }


    /* =====================================================
       GROUP AVATAR
    ===================================================== */

    if (chatAvatar) {

        const picture =
            group.group_picture || "";

        if (picture) {

            chatAvatar.innerHTML = `
                <img
                    src="${escapeHTML(picture)}"
                    alt="${escapeHTML(
                group.name || "Group"
            )}"
                >

                <span class="chat-avatar-online"></span>
            `;

        } else {

            chatAvatar.innerHTML = `
                <span class="chat-avatar-letter">
                    👥
                </span>

                <span class="chat-avatar-online"></span>
            `;
        }


        chatAvatar.classList.toggle(
            "is-online",
            isOnline
        );

        chatAvatar.classList.toggle(
            "is-offline",
            !isOnline
        );
    }


    /* =====================================================
       GROUP NAME
    ===================================================== */

    if (chatWith) {

        chatWith.textContent =
            group.name || "NEXA Group";
    }


    /* =====================================================
       GROUP ONLINE STATUS
    ===================================================== */

    if (status) {

        status.textContent =
            isOnline
                ? "Online"
                : "Offline";

        status.style.color =
            isOnline
                ? "var(--nexa-green)"
                : "#7b7261";
    }
}

/* =========================================================
   LOAD GROUP CONVERSATION
========================================================= */

async function loadGroupConversation(group) {

    if (!group || !messagesContainer) {
        return;
    }

    try {

        const { data, error } =
            await nexaSupabase
                .from("messages")
                .select(`
    id,
    conversation_id,
    group_id,
    sender_id,
    receiver_id,
    text,
    media,
    media_type,
    latitude,
    longitude,
    timestamp,
    read
`)
                .eq(
                    "group_id",
                    String(group.id)
                )
                .order("timestamp", {
                    ascending: true
                });

        if (error) {
            throw error;
        }


        const groupMessages =
            Array.isArray(data)
                ? data.map(message => ({

                    id:
                        message.id,

                    conversationId:
                        message.conversation_id,

                    groupId:
                        String(message.group_id),

                    senderId:
                        String(message.sender_id),

                    receiverId:
                        message.receiver_id
                            ? String(message.receiver_id)
                            : null,

                    text:
                        message.text || "",

                    media:
                        message.media || null,

                    mediaType:
                        message.media_type || null,

                    latitude:
                        message.latitude ?? null,

                    longitude:
                        message.longitude ?? null,

                    timestamp:
                        message.timestamp,

                    read:
                        Boolean(message.read)

                }))
                : [];


        /* =====================================================
           IMPORTANT FIX

           Put the loaded group messages into the main
           messages array so that sending a new message,
           location or voice note does NOT erase the history.
        ===================================================== */

        messages =
            messages.filter(message =>
                String(message.groupId || "") !==
                String(group.id)
            );


        messages.push(...groupMessages);


        saveCachedMessages();


        renderGroupConversation(
            getCurrentGroupMessages()
        );


        if (messagesContainer) {
            messagesContainer.scrollTop =
                messagesContainer.scrollHeight;
        }


        console.log(
            "NEXA group restored:",
            group.name,
            "| Messages:",
            groupMessages.length
        );

    } catch (error) {

        console.error(
            "NEXA group conversation error:",
            error
        );

        messagesContainer.innerHTML = `
            <p>
                Could not load this group conversation.
            </p>
        `;
    }
}

/* =========================================================
   CURRENT GROUP MESSAGES
========================================================= */

function getCurrentGroupMessages() {

    if (!selectedGroup) {
        return [];
    }

    return messages
        .filter(message =>
            String(message.groupId || "") ===
            String(selectedGroup.id)
        )
        .sort(
            (a, b) =>
                new Date(a.timestamp) -
                new Date(b.timestamp)
        );
}

/* =========================================================
   RENDER GROUP CONVERSATION
========================================================= */

function renderGroupConversation(groupMessages) {

    if (!messagesContainer) return;

    messagesContainer.innerHTML = "";

    if (!groupMessages.length) {

        messagesContainer.innerHTML = `
            <p>
                No messages yet. Say hello to the group!
            </p>
        `;

        return;
    }

    groupMessages.forEach(message => {

        const messageElement =
            document.createElement("div");

        const isMine =
            String(message.senderId) ===
            String(currentUser.id);

        const senderUser =
            findUserById(
                message.senderId
            );

        const senderName =
            isMine
                ? "You"
                : (
                    senderUser?.name ||
                    senderUser?.username ||
                    "NEXA Member"
                );

        messageElement.className =
            "nexa-message " +
            (isMine
                ? "sent"
                : "received");

        let mediaHTML = "";


        /* -------------------------------------------------
           IMAGE
        ------------------------------------------------- */

        if (
            message.mediaType &&
            message.mediaType.startsWith("image/")
        ) {

            mediaHTML = message.media
                ? `
                    <div class="nexa-message-media">
                        <img
                            src="${escapeHTML(message.media)}"
                            alt="Shared image"
                            loading="lazy"
                        >
                    </div>
                  `
                : `
                    <div class="nexa-message-media nexa-media-loading">
                        <span>📷 Loading photo…</span>
                    </div>
                  `;
        }


        /* -------------------------------------------------
           VIDEO
        ------------------------------------------------- */

        else if (
            message.mediaType &&
            message.mediaType.startsWith("video/")
        ) {

            mediaHTML = message.media
                ? `
                    <div class="nexa-message-media">
                        <video
                            src="${escapeHTML(message.media)}"
                            controls
                            preload="metadata"
                        ></video>
                    </div>
                  `
                : `
                    <div class="nexa-message-media nexa-media-loading">
                        <span>🎥 Loading video…</span>
                    </div>
                  `;
        }


        /* -------------------------------------------------
           VOICE
        ------------------------------------------------- */

        else if (
            message.mediaType &&
            message.mediaType.startsWith("audio/")
        ) {

            if (message.media) {

                const voiceId =
                    "voice-" +
                    String(message.id)
                        .replace(
                            /[^a-zA-Z0-9_-]/g,
                            ""
                        );

                mediaHTML = `
                    <div class="nexa-voice-message">

                        <button
                            type="button"
                            class="nexa-voice-play"
                            data-audio-id="${escapeHTML(voiceId)}"
                            aria-label="Play voice message"
                        >
                            ▶
                        </button>

                        <div class="nexa-voice-center">

                            <div
                                class="nexa-voice-wave"
                                aria-hidden="true"
                            >
                                ${voiceMessageWaveform(
                    message.id
                )}
                            </div>

                            <div class="nexa-voice-bottom">

                                <span class="nexa-voice-label">
                                    Voice message
                                </span>

                                <span
                                    class="nexa-voice-duration"
                                    id="${escapeHTML(
                    voiceId
                )}-duration"
                                >
                                    0:00
                                </span>

                            </div>

                        </div>

                        <audio
                            id="${escapeHTML(voiceId)}"
                            class="nexa-hidden-audio"
                            preload="metadata"
                        >
                            <source
                                src="${escapeHTML(message.media)}"
                                type="${escapeHTML(message.mediaType)}"
                            >
                        </audio>

                    </div>
                `;

            } else {

                mediaHTML = `
                    <div class="nexa-voice-message nexa-media-loading">
                        <span>🎤 Loading voice message…</span>
                    </div>
                `;
            }
        }


        /* -------------------------------------------------
           LOCATION
        ------------------------------------------------- */

        if (message.mediaType === "location") {

            const latitude =
                Number(message.latitude);

            const longitude =
                Number(message.longitude);

            const mapURL =
                "https://www.google.com/maps?q=" +
                encodeURIComponent(
                    latitude + "," + longitude
                );

            mediaHTML = `
                <div class="locationMessage">

                    <strong>
                        📍 Location shared
                    </strong>

                    <a
                        href="${mapURL}"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        View Location
                    </a>

                </div>
            `;
        }


        /* -------------------------------------------------
           TEXT
        ------------------------------------------------- */

        const textHTML =
            message.text
                ? `
                    <p class="nexa-message-text">
                        ${escapeHTML(message.text)}
                    </p>
                  `
                : "";


        /* -------------------------------------------------
           TICKS
        ------------------------------------------------- */

        const readTicks =
            isMine
                ? (
                    message.read
                        ? `
                            <span class="nexa-message-ticks is-read">
                                ✓✓
                            </span>
                          `
                        : `
                            <span class="nexa-message-ticks">
                                ✓
                            </span>
                          `
                )
                : "";


        /* -------------------------------------------------
           FINAL BUBBLE
        ------------------------------------------------- */

        messageElement.innerHTML = `

            <div class="nexa-message-bubble">

                ${!isMine
                ? `
                            <div class="nexa-message-sender">
                                ${escapeHTML(senderName)}
                            </div>
                          `
                : ""
            }

                ${textHTML}

                ${mediaHTML}

                <small class="nexa-message-time">

                    ${formatTime(
                message.timestamp
            )}

                    ${readTicks}

                </small>

            </div>
        `;

        messagesContainer.appendChild(
            messageElement
        );
    });


    messagesContainer.scrollTop =
        messagesContainer.scrollHeight;
}


/* =========================================================
   UPDATE CHAT HEADER
========================================================= */

function updateChatHeader(friend) {

    const chatAvatar = document.getElementById("chatAvatar");

    if (chatAvatar) {

        const profilePicture = friend.profile_picture || friend.profilePicture || "";

        if (profilePicture) {

            chatAvatar.innerHTML = `
                <img src="${escapeHTML(profilePicture)}" alt="${escapeHTML(friend.name || "NEXA Member")}">
                <span class="chat-avatar-online"></span>
            `;

        } else {

            const firstLetter = String(friend.name || "U").trim().charAt(0).toUpperCase();

            chatAvatar.innerHTML = `
                <span class="chat-avatar-letter">${escapeHTML(firstLetter)}</span>
                <span class="chat-avatar-online"></span>
            `;
        }
    }

    const online = isUserOnline(friend.id);

    const chatOnlineStatus = document.getElementById("chatOnlineStatus");

    if (chatOnlineStatus) {
        chatOnlineStatus.textContent = online ? "Online" : "Offline";
        chatOnlineStatus.style.color = online ? "var(--nexa-green)" : "#7b7261";
    }

    if (chatAvatar) {
        chatAvatar.classList.toggle("is-online", online);
        chatAvatar.classList.toggle("is-offline", !online);
    }
}


/* =========================================================
   MARK CONVERSATION READ
========================================================= */

async function markMessagesAsRead(friend) {

    if (!friend) return;

    const conversationId = createConversationId(currentUser, friend);

    const unreadMessages = messages.filter(message =>
        String(message.conversationId) === String(conversationId) &&
        String(message.receiverId) === String(currentUser.id) &&
        !message.read
    );

    if (!unreadMessages.length) return;

    try {

        const { error } = await nexaSupabase
            .from("messages")
            .update({ read: true })
            .eq("conversation_id", conversationId)
            .eq("receiver_id", String(currentUser.id))
            .eq("read", false);

        if (error) throw error;

        messages.forEach(message => {
            if (
                String(message.conversationId) === String(conversationId) &&
                String(message.receiverId) === String(currentUser.id)
            ) {
                message.read = true;
            }
        });

        saveCachedMessages();

        displayConversations(getConversationSearchValue());

    } catch (error) {
        console.error("NEXA mark conversation read error:", error);
    }
}


/* =========================================================
   LOAD EXISTING CONVERSATION

   Load directly by sender + receiver — NOT by conversation_id
   (see notes at the top of the file for why).

   Step 1 — fetch the conversation WITHOUT the "media" column
            and render it immediately, so the chat opens
            instantly even with a long history of photos,
            videos, and voice notes.
   Step 2 — in the background, fetch the real media bytes for
            exactly those message ids, then quietly re-render
            so images/audio/video fade in once they arrive.
========================================================= */

async function loadConversation() {

    if (!selectedFriend || !messagesContainer) return;

    const currentId = String(currentUser.id);
    const friendId = String(selectedFriend.id);

    try {

        const { data, error } = await nexaSupabase
            .from("messages")
            .select(`
    id,
    conversation_id,
    sender_id,
    receiver_id,
    text,
    media,
    media_type,
    latitude,
    longitude,
    timestamp,
    read
`)
            .or(`and(sender_id.eq.${currentId},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${currentId})`)
            .order("timestamp", { ascending: true });

        if (error) throw error;

        const conversationMessages = Array.isArray(data)
            ? data.map(message => ({
                id: message.id,
                conversationId: message.conversation_id,
                senderId: String(message.sender_id),
                receiverId: String(message.receiver_id),
                text: message.text || "",
                media: message.media || null,
                mediaType: message.media_type || null,
                latitude: message.latitude ?? null,
                longitude: message.longitude ?? null,
                timestamp: message.timestamp,
                read: Boolean(message.read)
            }))
            : [];

        messages = messages.filter(message => {

            const sender = String(message.senderId);
            const receiver = String(message.receiverId);

            const belongsToThisChat =
                (sender === currentId && receiver === friendId) ||
                (sender === friendId && receiver === currentId);

            return !belongsToThisChat;
        });

        messages.push(...conversationMessages);

        saveCachedMessages();

        renderCurrentConversation();

        console.log(
            "NEXA restored conversation with:",
            selectedFriend.name,
            "| Messages:",
            conversationMessages.length
        );

        /*
         * Fetch the real media for exactly these message ids.
         * Skip refetching if we already pulled media for this
         * friend and nothing new needs it.
         */


    } catch (error) {

        console.error("NEXA conversation restore error:", error);

        renderCurrentConversation();
    }
}


/* =========================================================
   RENDER CURRENT CONVERSATION
========================================================= */

function renderCurrentConversation(preserveScroll = false) {

    if (!selectedFriend || !messagesContainer) return;

    const oldScrollHeight = messagesContainer.scrollHeight;
    const oldScrollTop = messagesContainer.scrollTop;

    const currentId = String(currentUser.id);
    const friendId = String(selectedFriend.id);

    const conversation = messages
        .filter(message => {

            const senderId = String(message.senderId);
            const receiverId = String(message.receiverId);

            return (
                (senderId === currentId && receiverId === friendId) ||
                (senderId === friendId && receiverId === currentId)
            );
        })
        .sort(
            (a, b) =>
                new Date(a.timestamp) -
                new Date(b.timestamp)
        );

    messagesContainer.innerHTML = "";

    if (!conversation.length) {
        messagesContainer.innerHTML = `<p>No messages yet. Say hello!</p>`;
        return;
    }

    conversation.forEach(renderMessage);

    if (preserveScroll) {
        const newScrollHeight = messagesContainer.scrollHeight;
        messagesContainer.scrollTop = oldScrollTop + (newScrollHeight - oldScrollHeight);
    } else {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
}


/* =========================================================
   RENDER MESSAGE

   While media hasn't arrived yet (message.media is still
   null right after loadConversation() but before
   loadConversationMedia() resolves), image/video/voice
   bubbles show an animated shimmer placeholder instead of
   blank space or dead text, driven purely by mediaType.
========================================================= */

function renderMessage(message) {

    if (!messagesContainer) return;

    const messageElement = document.createElement("div");

    const isMine = String(message.senderId) === String(currentUser.id);
    const sender = isMine ? "You" : (selectedFriend?.name || "User");

    messageElement.className = "nexa-message " + (isMine ? "sent" : "received");

    let mediaHTML = "";

    /* =========================================================
   MISSED CALL MESSAGE
========================================================= */

    if (
        message.mediaType === "call_missed_voice" ||
        message.mediaType === "call_missed_video"
    ) {

        const isVideo =
            message.mediaType === "call_missed_video";

        const isMine =
            String(message.senderId) ===
            String(currentUser.id);

        const otherName =
            selectedFriend?.name ||
            selectedFriend?.username ||
            "NEXA Member";

        mediaHTML = `
        <div class="nexa-missed-call">
            <div class="nexa-missed-call-icon">
                ${isVideo ? "📹" : "📞"}
            </div>

            <div class="nexa-missed-call-content">

                <strong>
                    ${isMine
                ? "Call not answered"
                : "Missed call"}
                </strong>

                <span>
                    ${isMine
                ? `No answer from ${escapeHTML(otherName)}`
                : isVideo
                    ? "Missed video call"
                    : "Missed voice call"}
                </span>

            </div>
        </div>
    `;
    }

    if (message.mediaType && message.mediaType.startsWith("image/")) {

        mediaHTML = message.media
            ? `
                <div class="nexa-message-media">
                    <img src="${message.media}" alt="Shared image" loading="lazy">
                </div>
              `
            : `
                <div class="nexa-message-media nexa-media-loading">
                    <span>📷 Loading photo…</span>
                </div>
              `;

    } else if (message.mediaType && message.mediaType.startsWith("video/")) {

        mediaHTML = message.media
            ? `
                <div class="nexa-message-media">
                    <video src="${message.media}" controls preload="metadata"></video>
                </div>
              `
            : `
                <div class="nexa-message-media nexa-media-loading">
                    <span>🎥 Loading video…</span>
                </div>
              `;

    } else if (message.mediaType && message.mediaType.startsWith("audio/")) {

        if (message.media) {

            const voiceId = "voice-" + String(message.id).replace(/[^a-zA-Z0-9_-]/g, "");

            mediaHTML = `
                <div class="nexa-voice-message">

                    <button type="button" class="nexa-voice-play" data-audio-id="${escapeHTML(voiceId)}" aria-label="Play voice message">
                        ▶
                    </button>

                    <div class="nexa-voice-center">

                        <div class="nexa-voice-wave" aria-hidden="true">
                            ${voiceMessageWaveform(message.id)}
                        </div>

                        <div class="nexa-voice-bottom">
                            <span class="nexa-voice-label">Voice message</span>
                            <span class="nexa-voice-duration" id="${escapeHTML(voiceId)}-duration">0:00</span>
                        </div>

                    </div>

                    <audio id="${escapeHTML(voiceId)}" class="nexa-hidden-audio" preload="metadata">
                        <source src="${message.media}" type="${escapeHTML(message.mediaType)}">
                    </audio>

                </div>
            `;

        } else {

            mediaHTML = `
                <div class="nexa-voice-message nexa-media-loading">
                    <span>🎤 Loading voice message…</span>
                </div>
            `;
        }
    }

    if (message.mediaType === "location") {

        const latitude = Number(message.latitude);
        const longitude = Number(message.longitude);

        const mapURL = "https://www.google.com/maps?q=" + encodeURIComponent(latitude + "," + longitude);

        mediaHTML = `
            <div class="locationMessage">
                <strong>📍 Location shared</strong>
                <a href="${mapURL}" target="_blank" rel="noopener noreferrer">View Location</a>
            </div>
        `;
    }

    const textHTML = message.text
        ? `<p class="nexa-message-text">${escapeHTML(message.text)}</p>`
        : "";

    const readTicks =
        isMine
            ? (
                message.read
                    ? `<span class="nexa-message-ticks is-read">✓✓</span>`
                    : `<span class="nexa-message-ticks">✓</span>`
            )
            : "";

    messageElement.innerHTML = `
        <div class="nexa-message-bubble">
            <div class="nexa-message-sender">${escapeHTML(sender)}</div>
            ${textHTML}
            ${mediaHTML}
            <small class="nexa-message-time">
    ${formatTime(message.timestamp)}
    ${readTicks}
</small>
        </div>
    `;

    messagesContainer.appendChild(messageElement);
}


/* =========================================================
   WEBRTC
========================================================= */

function createPeerConnection(otherUserId) {

    const connection =
        new RTCPeerConnection(
            rtcConfiguration
        );

    const targetUserId =
        String(otherUserId);


    /* =====================================================
       ICE CANDIDATES
    ===================================================== */

    connection.onicecandidate = event => {

        if (!event.candidate) {
            return;
        }

        const callId =
            activeGroupCall
                ? activeGroupCall.callId
                : activeCall
                    ? activeCall.callId
                    : Date.now();

        if (activeGroupCall) {

            sendGroupCallSignal(
                targetUserId,
                "ice-candidate",
                {
                    candidate:
                        event.candidate
                },
                callId
            );

        } else {

            sendCallSignal(
                targetUserId,
                "ice-candidate",
                {
                    candidate:
                        event.candidate
                },
                callId
            );
        }
    };


    /* =====================================================
       REMOTE TRACK
    ===================================================== */

    connection.ontrack = async event => {

        console.log(
            "NEXA GROUP TRACK RECEIVED:",
            {
                user: String(otherUserId),
                kind: event.track?.kind,
                readyState: event.track?.readyState,
                enabled: event.track?.enabled,
                muted: event.track?.muted,
                streams: event.streams?.length || 0
            }
        );

        const stream =
            event.streams &&
            event.streams[0];

        if (!stream) {

            console.warn(
                "NEXA remote track arrived without a MediaStream:",
                event.track?.kind
            );
        }


        /* =================================================
           GROUP CALL
        ================================================= */

        if (activeGroupCall) {

            const memberId =
                String(
                    targetUserId
                );

            groupRemoteStreams.set(
                memberId,
                stream
            );

            groupCallParticipants.add(
                memberId
            );

            renderGroupCallParticipants();


            /* =============================================
               GROUP VIDEO
            ============================================= */

            if (
                activeGroupCall.callType ===
                "video"
            ) {

                const video =
                    document.getElementById(
                        "nexa-group-video-" +
                        memberId
                    );

                if (video) {

                    video.autoplay = true;
                    video.playsInline = true;
                    video.muted = false;

                    if (
                        video.srcObject !==
                        stream
                    ) {

                        video.srcObject =
                            stream;
                    }

                    video.play()
                        .then(() => {

                            console.log(
                                "NEXA GROUP VIDEO PLAYING:",
                                memberId
                            );

                        })
                        .catch(error => {

                            console.warn(
                                "NEXA group video playback:",
                                error
                            );

                        });
                }

                return;
            }


            /* =====================================================
               GROUP VOICE — HTML AUDIO OUTPUT
            ===================================================== */

            try {

                if (!groupRemoteAudio) {
                    console.warn(
                        "NEXA group remote audio element not found."
                    );
                    return;
                }

                const audioStream =
                    new MediaStream();

                if (
                    event.track &&
                    event.track.kind === "audio"
                ) {
                    audioStream.addTrack(
                        event.track
                    );
                }

                if (
                    !audioStream.getAudioTracks().length
                ) {
                    console.warn(
                        "NEXA group call: no audio track."
                    );
                    return;
                }

                groupRemoteStreams.set(
                    memberId,
                    audioStream
                );

                groupCallParticipants.add(
                    memberId
                );

                groupRemoteAudio.srcObject =
                    audioStream;

                groupRemoteAudio.autoplay = true;
                groupRemoteAudio.playsInline = true;
                groupRemoteAudio.muted = false;
                groupRemoteAudio.volume = 1;

                const playGroupAudio = async () => {

                    try {

                        await groupRemoteAudio.play();
                        console.log(
    "NEXA GROUP AUDIO PLAY RESULT:",
    {
        paused: groupRemoteAudio.paused,
        readyState: groupRemoteAudio.readyState,
        currentTime: groupRemoteAudio.currentTime,
        muted: groupRemoteAudio.muted,
        volume: groupRemoteAudio.volume
    }
);

                        console.log(
                            "NEXA GROUP HTML AUDIO PLAYING:",
                            memberId
                        );

                    } catch (error) {

                        console.warn(
                            "NEXA GROUP HTML AUDIO PLAY BLOCKED:",
                            error
                        );
                    }
                };

                if (event.track.muted) {

                    event.track.onunmute = () => {

                        console.log(
                            "NEXA GROUP AUDIO UNMUTED:",
                            memberId
                        );

                        groupRemoteAudio.srcObject =
                            audioStream;
                        console.log(
                            "NEXA GROUP AUDIO ELEMENT:",
                            {
                                exists: !!groupRemoteAudio,
                                muted: groupRemoteAudio?.muted,
                                volume: groupRemoteAudio?.volume,
                                paused: groupRemoteAudio?.paused,
                                readyState: groupRemoteAudio?.readyState,
                                srcObject: !!groupRemoteAudio?.srcObject,
                                audioTracks:
                                    audioStream.getAudioTracks().map(track => ({
                                        enabled: track.enabled,
                                        muted: track.muted,
                                        readyState: track.readyState
                                    }))
                            }
                        );

                        playGroupAudio();
                    };

                } else {

                    playGroupAudio();
                }

                renderGroupCallParticipants();

            } catch (error) {

                console.error(
                    "NEXA GROUP HTML AUDIO ERROR:",
                    error
                );
            }

            return;

        }


        /* =================================================
           PRIVATE CALL
        ================================================= */

        remoteStream =
            stream;

        if (
            activeCall &&
            activeCall.callType ===
            "video"
        ) {

            if (remoteCallArea) {
                remoteCallArea.style.display =
                    "block";
            }

            if (remoteVideo) {

                remoteVideo.style.display =
                    "block";

                remoteVideo.srcObject =
                    stream;

                remoteVideo.play()
                    .catch(() => { });
            }

            if (remoteAudio) {

                remoteAudio.style.display =
                    "none";

                remoteAudio.srcObject =
                    stream;
            }

            const activeScreen =
                document.getElementById(
                    "nexaActiveCallScreen"
                );

            if (activeScreen) {
                activeScreen.style.display =
                    "none";
            }

        } else {

            if (remoteCallArea) {
                remoteCallArea.style.display =
                    "block";
            }

            if (remoteVideo) {

                remoteVideo.style.display =
                    "none";

                remoteVideo.srcObject =
                    null;
            }

            if (remoteAudio) {

                remoteAudio.style.display =
                    "block";

                remoteAudio.srcObject =
                    stream;

                remoteAudio.play()
                    .catch(() => { });
            }

            showActiveCallScreen();

            startRemoteSpeakingVisualizer(
                stream
            );
        }
    };


    /* =====================================================
       CONNECTION STATE
    ===================================================== */

    connection.onconnectionstatechange = async () => {

        console.log(
            "NEXA WebRTC state:",
            targetUserId,
            connection.connectionState
        );


        if (
            activeGroupCall &&
            connection.connectionState === "connected"
        ) {

            const stats =
                await connection.getStats();

            stats.forEach(report => {

                if (
                    report.type === "inbound-rtp" &&
                    report.kind === "audio"
                ) {

                    console.log(
                        "NEXA GROUP AUDIO INBOUND:",
                        targetUserId,
                        {
                            packetsReceived:
                                report.packetsReceived,

                            bytesReceived:
                                report.bytesReceived,

                            packetsLost:
                                report.packetsLost
                        }
                    );
                }

            });
        }


        if (
            connection.connectionState ===
            "connected"
        ) {

            if (activeGroupCall) {

                groupCallParticipants.add(
                    targetUserId
                );

                callInProgress = true;

                renderGroupCallParticipants();

            } else {

                callInProgress = true;

                if (endCallButton) {
                    endCallButton.style.display =
                        "inline-block";
                }

                if (callStatus) {
                    callStatus.textContent =
                        "Connected";
                }

                if (
                    activeCall &&
                    activeCall.callType ===
                    "voice"
                ) {
                    showActiveCallScreen();
                }
            }
        }


        if (
            connection.connectionState ===
            "failed"
        ) {

            if (activeGroupCall) {

                groupCallParticipants.delete(
                    targetUserId
                );

                renderGroupCallParticipants();

            } else {

                endCall();
            }
        }


        if (
            connection.connectionState ===
            "closed"
        ) {

            if (activeGroupCall) {

                groupCallParticipants.delete(
                    targetUserId
                );

                renderGroupCallParticipants();

            } else {

                endCall(false);
            }
        }
    };


    return connection;
}


/* =========================================================
   GROUP CALL SIGNAL HELPER
========================================================= */
async function sendGroupCallSignal(
    receiverId,
    signalType,
    payload,
    callId
) {

    const sent = await sendCallSignal(
        receiverId,
        signalType,
        {
            ...payload,
            groupCall: true
        },
        callId
    );

    console.log(
        "NEXA GROUP CALL SIGNAL:",
        signalType,
        "TO:",
        receiverId,
        "SENT:",
        sent
    );

    return sent;
}

/* =========================================================
   CALL SIGNAL
========================================================= */

async function sendCallSignal(receiverId, signalType, payload, callId) {

    try {

        const { error } = await nexaSupabase.from("call_signals").insert({
            call_id: String(callId),
            sender_id: String(currentUser.id),
            receiver_id: String(receiverId),
            signal_type: signalType,
            payload: payload || {}
        });

        if (error) throw error;

        return true;

    } catch (error) {
        console.error("NEXA call signal error:", error);
        return false;
    }
}


/* =========================================================
   GROUP ICE QUEUE
   Only add candidates after remoteDescription exists.
========================================================= */

async function flushGroupIceCandidates(
    peerId,
    connection
) {

    if (
        !activeGroupCall ||
        !connection
    ) {
        return;
    }

    const id = String(peerId);

    const candidates =
        activeGroupCall.pendingCandidates?.get(id) || [];

    if (!candidates.length) {
        return;
    }

    for (const candidate of candidates) {

        try {

            await connection.addIceCandidate(
                candidate
            );

        } catch (error) {

            console.warn(
                "NEXA GROUP ICE FLUSH SKIPPED:",
                id,
                error
            );
        }
    }

    activeGroupCall.pendingCandidates.delete(id);
}


/* =========================================================
   CALL SIGNAL REALTIME
========================================================= */

function subscribeToCallSignals() {

    if (callRealtimeChannel) {
        nexaSupabase.removeChannel(callRealtimeChannel);
    }

    callRealtimeChannel = nexaSupabase
        .channel("nexa-call-signals-" + currentUser.id)
        .on("postgres_changes", {
            event: "INSERT",
            schema: "public",
            table: "call_signals",
            filter: "receiver_id=eq." + currentUser.id
        }, async payload => {

            const signal = payload.new;
            if (!signal) return;

            const data = signal.payload || {};

            /* =========================================================
               GROUP CALL OFFER
            ========================================================= */

            if (
                signal.signal_type === "group-offer" &&
                data.groupCall
            ) {

                const groupId =
                    String(data.groupId || "");

                const callerId =
                    String(
                        data.callerId ||
                        signal.sender_id
                    );

                if (!groupId || !data.offer) {
                    return;
                }


                /* =====================================================
   ALREADY IN GROUP CALL — AUTO ACCEPT NEW CONNECTION
===================================================== */

                const offerCallerId =
                    String(
                        data.callerId ||
                        signal.sender_id
                    );

                if (
                    activeGroupCall &&
                    String(activeGroupCall.groupId) === groupId &&
                    offerCallerId !== String(currentUser.id)
                ) {

                    try {

                        let connection =
                            groupPeerConnections.get(
                                offerCallerId
                            );
                        if (!connection) {

                            connection =
                                createPeerConnection(
                                    offerCallerId
                                );

                            groupPeerConnections.set(
                                offerCallerId,
                                connection
                            );

                            if (localStream) {

                                localStream
                                    .getTracks()
                                    .forEach(track => {

                                        connection.addTrack(
                                            track,
                                            localStream
                                        );

                                    });
                            }
                        }


                        await connection.setRemoteDescription(
                            new RTCSessionDescription(
                                data.offer
                            )
                        );

                        const answer =
                            await connection.createAnswer();

                        await connection.setLocalDescription(
                            answer
                        );

                        await sendGroupCallSignal(
                            offerCallerId,
                            "group-answer",
                            {
                                groupId: groupId,

                                callerId:
                                    String(currentUser.id),

                                answer
                            },
                            signal.call_id
                        );

                        groupCallParticipants.add(
                            offerCallerId
                        );

                        renderGroupCallParticipants();

                        console.log(
                            "NEXA GROUP MESH CONNECTION ACCEPTED:",
                            offerCallerId
                        );

                    } catch (error) {

                        console.error(
                            "NEXA GROUP MESH OFFER ERROR:",
                            error
                        );

                    }

                    return;
                }


                await loadGroupCallMembers(
                    groupId
                );



                const group =
                    groups.find(
                        item =>
                            String(item.id) ===
                            groupId
                    );

                if (group) {
                    selectedGroup = group;
                    selectedFriend = null;
                }
                activeGroupCall = {

                    ...(activeGroupCall || {}),

                    callId:
                        signal.call_id,

                    groupId:
                        groupId,

                    callerId:
                        callerId,

                    callerName:
                        data.callerName ||
                        activeGroupCall?.callerName ||
                        "NEXA Member",

                    callType:
                        data.callType ||
                        activeGroupCall?.callType ||
                        "voice",

                    pendingCandidates:
                        activeGroupCall?.pendingCandidates ||
                        new Map(),

                    offer:
                        data.offer
                };

                renderGroupCallParticipants();

                callAnswered = false;

                if (incomingCaller) {

                    incomingCaller.textContent =
                        (
                            data.callerName ||
                            "Someone"
                        ) +
                        " is calling the group";
                }

                const icon =
                    document.getElementById(
                        "incomingCallIcon"
                    );

                if (icon) {

                    icon.textContent =
                        activeGroupCall.callType === "video"
                            ? "📹"
                            : "📞";
                }

                if (incomingCall) {

                    const title =
                        incomingCall.querySelector("h2");

                    if (title) {

                        title.textContent =
                            activeGroupCall.callType === "video"
                                ? "Incoming Group Video Call"
                                : "Incoming Group Voice Call";
                    }

                    incomingCall.style.display =
                        "flex";
                    startNexaIncomingRingtone();
                }

                return;
            }

            if (signal.signal_type === "offer") {

                activeCall = {
                    callId: signal.call_id,
                    callerId: String(signal.sender_id),
                    receiverId: String(signal.receiver_id),
                    callerName: data.callerName || "Someone",
                    callType: data.callType || "voice",
                    offer: data.offer || null
                };

                if (incomingCaller) {
                    incomingCaller.textContent = activeCall.callerName + " is calling you";
                }

                const icon = document.getElementById("incomingCallIcon");

                if (icon) {
                    icon.textContent = activeCall.callType === "video" ? "📹" : "📞";
                }

                if (incomingCall) {

                    const title = incomingCall.querySelector("h2");

                    if (title) {
                        title.textContent = activeCall.callType === "video" ? "Incoming Video Call" : "Incoming Voice Call";
                    }

                    incomingCall.style.display = "flex";
                    startNexaIncomingRingtone();
                }

                return;
            }


            /* =========================================================
   GROUP CALL JOIN
========================================================= */
            if (
                signal.signal_type === "group-join" &&
                data.groupCall
            ) {

                const memberId =
                    String(
                        data.userId ||
                        signal.sender_id
                    );

                if (
                    !activeGroupCall ||
                    String(activeGroupCall.callerId) !==
                    String(currentUser.id)
                ) {
                    return;
                }

                const peerIds =
                    Array.from(
                        groupPeerConnections.keys()
                    )
                        .map(id => String(id))
                        .filter(
                            id =>
                                id !== memberId &&
                                id !== String(currentUser.id)
                        );

                await sendGroupCallSignal(
                    memberId,
                    "group-peer-list",
                    {
                        groupId:
                            activeGroupCall.groupId,

                        peerIds:
                            peerIds
                    },
                    activeGroupCall.callId
                );

                groupCallParticipants.add(
                    memberId
                );

                renderGroupCallParticipants();

                console.log(
                    "NEXA GROUP PEERS SENT TO:",
                    memberId,
                    peerIds
                );

                return;
            }


            /* =========================================================
   GROUP CALL PEER LIST
========================================================= */

            if (
                signal.signal_type === "group-peer-list" &&
                data.groupCall
            ) {

                if (!activeGroupCall) {
                    return;
                }

                const peerIds =
                    Array.isArray(data.peerIds)
                        ? data.peerIds.map(id => String(id))
                        : [];

                for (
                    const peerId
                    of peerIds
                ) {

                    if (
                        peerId ===
                        String(currentUser.id)
                    ) {
                        continue;
                    }

                    if (
                        groupPeerConnections.has(
                            peerId
                        )
                    ) {
                        continue;
                    }

                    try {

                        const connection =
                            createPeerConnection(
                                peerId
                            );

                        groupPeerConnections.set(
                            peerId,
                            connection
                        );

                        if (localStream) {

                            localStream
                                .getTracks()
                                .forEach(track => {

                                    connection.addTrack(
                                        track,
                                        localStream
                                    );

                                });
                        }

                        const offer =
                            await connection.createOffer();

                        await connection.setLocalDescription(
                            offer
                        );

                        await sendGroupCallSignal(
                            peerId,
                            "group-peer-offer",
                            {
                                groupId:
                                    activeGroupCall.groupId,

                                callerId:
                                    String(currentUser.id),

                                callerName:
                                    currentUser.name,

                                callType:
                                    activeGroupCall.callType,

                                offer
                            },
                            activeGroupCall.callId
                        );

                    } catch (error) {

                        console.error(
                            "NEXA GROUP PEER CONNECTION ERROR:",
                            peerId,
                            error
                        );
                    }
                }

                return;
            }

            /* =====================================================
   GROUP PEER OFFER
===================================================== */

            if (
                signal.signal_type === "group-peer-offer" &&
                data.groupCall
            ) {

                if (!activeGroupCall) {
                    return;
                }

                const peerId =
                    String(signal.sender_id);

                if (!data.offer) {
                    return;
                }

                try {

                    let connection =
                        groupPeerConnections.get(
                            peerId
                        );

                    if (!connection) {

                        connection =
                            createPeerConnection(
                                peerId
                            );

                        groupPeerConnections.set(
                            peerId,
                            connection
                        );

                        if (localStream) {

                            localStream
                                .getTracks()
                                .forEach(track => {

                                    connection.addTrack(
                                        track,
                                        localStream
                                    );

                                });
                        }
                    }

                    await connection.setRemoteDescription(
                        new RTCSessionDescription(
                            data.offer
                        )
                    );
                    const waitingCandidates =
                        activeGroupCall
                            .pendingCandidates
                            ?.get(peerId) || [];

                    for (
                        const candidate
                        of waitingCandidates
                    ) {

                        try {

                            await connection.addIceCandidate(
                                candidate
                            );

                        } catch (error) {

                            console.error(
                                "NEXA GROUP PEER ICE ERROR:",
                                error
                            );
                        }
                    }

                    if (
                        activeGroupCall.pendingCandidates
                    ) {

                        activeGroupCall
                            .pendingCandidates
                            .delete(peerId);
                    }



                    const answer =
                        await connection.createAnswer();

                    await connection.setLocalDescription(
                        answer
                    );

                    await sendGroupCallSignal(
                        peerId,
                        "group-peer-answer",
                        {
                            groupId:
                                activeGroupCall.groupId,

                            answer
                        },
                        activeGroupCall.callId
                    );

                    groupCallParticipants.add(
                        peerId
                    );

                    renderGroupCallParticipants();

                    console.log(
                        "NEXA GROUP PEER ANSWER SENT:",
                        peerId
                    );

                } catch (error) {

                    console.error(
                        "NEXA GROUP PEER OFFER ERROR:",
                        error
                    );
                }

                return;
            }


            /* =====================================================
   GROUP PEER ANSWER
===================================================== */

            if (
                signal.signal_type === "group-peer-answer" &&
                data.groupCall
            ) {

                if (!activeGroupCall) {
                    return;
                }

                const peerId =
                    String(signal.sender_id);

                const connection =
                    groupPeerConnections.get(
                        peerId
                    );

                if (
                    !connection ||
                    !data.answer
                ) {
                    return;
                }

                if (
                    connection.signalingState !==
                    "have-local-offer"
                ) {
                    return;
                }

                try {

                    await connection.setRemoteDescription(
                        new RTCSessionDescription(
                            data.answer
                        )
                    );

                    const waitingCandidates =
                        activeGroupCall
                            .pendingCandidates
                            ?.get(peerId) || [];

                    for (
                        const candidate
                        of waitingCandidates
                    ) {

                        try {

                            await connection.addIceCandidate(
                                candidate
                            );

                        } catch (error) {

                            console.error(
                                "NEXA GROUP PEER ICE ERROR:",
                                error
                            );
                        }
                    }

                    if (
                        activeGroupCall.pendingCandidates
                    ) {

                        activeGroupCall
                            .pendingCandidates
                            .delete(peerId);
                    }

                    groupCallParticipants.add(
                        peerId
                    );

                    renderGroupCallParticipants();

                    console.log(
                        "NEXA GROUP PEER CONNECTED:",
                        peerId
                    );

                } catch (error) {

                    console.error(
                        "NEXA GROUP PEER ANSWER ERROR:",
                        error
                    );
                }

                return;
            }

            /* =========================================================
               GROUP CALL ANSWER
            ========================================================= */

            if (
                signal.signal_type === "group-answer" &&
                data.groupCall
            ) {

                const memberId =
                    String(signal.sender_id);

                const connection =
                    groupPeerConnections.get(
                        memberId
                    );

                if (!connection || !data.answer) {
                    return;
                }

                /*
                 * A valid group answer can only be applied while
                 * this connection is waiting for its answer.
                 *
                 * If it is already stable, the answer was already
                 * applied and we must ignore the duplicate signal.
                 */
                if (
                    connection.signalingState !==
                    "have-local-offer"
                ) {

                    console.log(
                        "NEXA GROUP ANSWER IGNORED:",
                        memberId,
                        "state:",
                        connection.signalingState
                    );

                    return;
                }

                try {

                    await connection.setRemoteDescription(
                        new RTCSessionDescription(
                            data.answer
                        )
                    );

                    groupCallParticipants.add(
                        memberId
                    );

                    callInProgress = true;

                    if (callStatus) {

                        callStatus.textContent =
                            groupCallParticipants.size +
                            " member" +
                            (
                                groupCallParticipants.size === 1
                                    ? ""
                                    : "s"
                            ) +
                            " connected";
                    }

                    if (endCallButton) {
                        endCallButton.style.display =
                            "inline-block";
                    }

                    renderGroupCallParticipants();

                } catch (error) {

                    console.error(
                        "NEXA group call answer error:",
                        error
                    );

                }

                return;
            }


            if (signal.signal_type === "answer") {

                callAnswered = true;

                if (!peerConnection || !data.answer) return;

                try {

                    await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));

                    for (const candidate of pendingIceCandidates) {
                        try {
                            await peerConnection.addIceCandidate(candidate);
                        } catch (error) {
                            console.error("ICE error:", error);
                        }
                    }

                    pendingIceCandidates = [];

                    if (callStatus) callStatus.textContent = "Connecting...";

                } catch (error) {
                    console.error("NEXA call answer error:", error);
                    endCall(false);
                }

                return;
            }

            if (signal.signal_type === "ice-candidate") {

                if (!data.candidate) {
                    return;
                }

                const candidate =
                    new RTCIceCandidate(
                        data.candidate
                    );


                /* =====================================================
                   GROUP CALL ICE
                ===================================================== */
                if (activeGroupCall) {

                    const senderId =
                        String(signal.sender_id);

                    const groupConnection =
                        groupPeerConnections.get(
                            senderId
                        );

                    if (
                        groupConnection &&
                        groupConnection.remoteDescription
                    ) {

                        try {

                            await groupConnection.addIceCandidate(
                                candidate
                            );

                        } catch (error) {

                            console.error(
                                "NEXA GROUP ICE ERROR:",
                                senderId,
                                error
                            );
                        }

                    } else {

                        if (
                            !activeGroupCall.pendingCandidates
                        ) {

                            activeGroupCall.pendingCandidates =
                                new Map();
                        }

                        if (
                            !activeGroupCall
                                .pendingCandidates
                                .has(senderId)
                        ) {

                            activeGroupCall
                                .pendingCandidates
                                .set(
                                    senderId,
                                    []
                                );
                        }

                        activeGroupCall
                            .pendingCandidates
                            .get(senderId)
                            .push(candidate);
                    }

                    return;
                }


                /* =====================================================
             NORMAL PRIVATE CALL ICE
          ===================================================== */

                if (!peerConnection) {
                    pendingIceCandidates.push(candidate);
                    return;
                }

                if (!peerConnection.remoteDescription) {
                    pendingIceCandidates.push(candidate);
                    return;
                }

                try {

                    await peerConnection.addIceCandidate(
                        candidate
                    );

                } catch (error) {

                    console.warn(
                        "NEXA ICE candidate skipped:",
                        error
                    );
                }

                return;
            }

            /* =====================================================
               GROUP CALL DECLINE
            ===================================================== */

            if (
                signal.signal_type === "group-decline" &&
                data.groupCall
            ) {

                const memberId =
                    String(signal.sender_id);

                console.log(
                    "NEXA GROUP CALL DECLINED BY:",
                    memberId
                );

                groupCallParticipants.delete(
                    memberId
                );

                const connection =
                    groupPeerConnections.get(
                        memberId
                    );

                if (connection) {

                    try {
                        connection.close();
                    } catch (_) { }

                    groupPeerConnections.delete(
                        memberId
                    );
                }

                groupRemoteStreams.delete(
                    memberId
                );

                renderGroupCallParticipants();

                if (activeGroupCall) {

                    const connectedCount =
                        groupCallParticipants.size;

                    if (callStatus) {

                        callStatus.textContent =
                            connectedCount +
                            " member" +
                            (
                                connectedCount === 1
                                    ? ""
                                    : "s"
                            ) +
                            " connected";
                    }
                }

                return;
            }

            if (signal.signal_type === "decline") {

                if (callStatus) callStatus.textContent = "The call was declined.";

                endCall(false);

                return;
            }

            if (signal.signal_type === "end") {
                endCall(false);
            }
        })
        .subscribe(status => {
            console.log("NEXA Call Realtime:", status);
        });
}


/* =========================================================
   START VOICE CALL
========================================================= */


async function startVoiceCall() {

if (selectedGroup) {
    showNexaComingSoon("Group voice calling");
    return;
}

    if (selectedGroup) {

        resetGroupCallState();

        const members =
            await loadGroupCallMembers(
                selectedGroup.id
            );

        if (!members.length) {

            alert(
                "This group has no other members available for a call."
            );

            return;
        }

        try {

            callInProgress = true;
            callAnswered = false;

            activeGroupCall = {
                callId:
                    "group_" +
                    Date.now() +
                    "_" +
                    Math.random()
                        .toString(36)
                        .slice(2, 9),

                groupId:
                    String(selectedGroup.id),

                callerId:
                    String(currentUser.id),

                callerName:
                    currentUser.name,

                callType:
                    "voice"
            };

            if (callStatus) {

                callStatus.textContent =
                    "Calling " +
                    (selectedGroup.name ||
                        "NEXA Group") +
                    "...";
            }

            localStream =
                await navigator.mediaDevices
                    .getUserMedia({
                        audio: true,
                        video: false
                    });
            await ensureGroupAudioContext();

            /*
             * Create one WebRTC connection for
             * every other group member.
             */
            for (const member of members) {

                const memberId =
                    String(member.id);

                const connection =
                    createPeerConnection(
                        memberId
                    );

                groupPeerConnections.set(
                    memberId,
                    connection
                );

                localStream
                    .getTracks()
                    .forEach(track => {

                        connection.addTrack(
                            track,
                            localStream
                        );
                    });

                const offer =
                    await connection.createOffer();

                await connection
                    .setLocalDescription(offer);

                const signalSent =
                    await sendGroupCallSignal(
                        memberId,
                        "group-offer",
                        {
                            groupId:
                                String(
                                    selectedGroup.id
                                ),

                            callerId:
                                String(
                                    currentUser.id
                                ),

                            callerName:
                                currentUser.name,

                            callType:
                                "voice",

                            offer
                        },
                        activeGroupCall.callId
                    );

                if (!signalSent) {

                    throw new Error(
                        "NEXA could not send the group call signal."
                    );
                }


            }

            if (endCallButton) {
                endCallButton.style.display =
                    "inline-block";
            }

        } catch (error) {

            console.error(
                "NEXA group voice call error:",
                error
            );

            endCall(false);

            alert(
                "Could not start the group voice call. Please allow microphone access."
            );
        }

        return;
    }

    if (!selectedFriend) {

        alert(
            "Open a conversation first."
        );

        return;
    }

    try {

        callInProgress = true;
        callAnswered = false;

        if (callStatus) {
            callStatus.textContent = "Calling " + (selectedFriend.name || "NEXA Member") + "...";
        }

        localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });

        peerConnection = createPeerConnection(selectedFriend.id);

        localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

        activeCall = {
            callId: Date.now(),
            callerId: String(currentUser.id),
            receiverId: String(selectedFriend.id),
            callerName: currentUser.name,
            callType: "voice"
        };

        const offer = await peerConnection.createOffer();

        await peerConnection.setLocalDescription(offer);

        activeCall.offer = offer;

        await sendCallSignal(
            selectedFriend.id,
            "offer",
            { callerName: currentUser.name, callType: "voice", offer: offer },
            activeCall.callId
        );

        if (endCallButton) endCallButton.style.display = "inline-block";

    } catch (error) {

        console.error("NEXA voice call error:", error);

        endCall(false);

        alert("Could not start the voice call. Please allow microphone access.");
    }
}


/* =========================================================
   START VIDEO CALL
========================================================= */

async function startVideoCall() {

        if (selectedGroup) {
        alert("Group video calling is coming soon.");
        return;
    }

    if (selectedGroup) {

        resetGroupCallState();

        const members =
            await loadGroupCallMembers(
                selectedGroup.id
            );

        if (!members.length) {

            alert(
                "This group has no other members available for a video call."
            );

            return;
        }

        try {

            callInProgress = true;
            callAnswered = false;

            activeGroupCall = {
                callId:
                    "group_" +
                    Date.now() +
                    "_" +
                    Math.random()
                        .toString(36)
                        .slice(2, 9),

                groupId:
                    String(selectedGroup.id),

                callerId:
                    String(currentUser.id),

                callerName:
                    currentUser.name,

                callType:
                    "video"
            };

            if (callStatus) {
                callStatus.textContent =
                    "Calling " +
                    (selectedGroup.name || "NEXA Group") +
                    "...";
            }

            localStream =
                await navigator.mediaDevices
                    .getUserMedia({
                        audio: true,
                        video: true
                    });

            await ensureGroupAudioContext();

            for (const member of members) {

                const memberId =
                    String(member.id);

                const connection =
                    createPeerConnection(
                        memberId
                    );

                groupPeerConnections.set(
                    memberId,
                    connection
                );

                localStream
                    .getTracks()
                    .forEach(track => {

                        connection.addTrack(
                            track,
                            localStream
                        );

                    });

                const offer =
                    await connection.createOffer();

                await connection
                    .setLocalDescription(offer);

                const signalSent =
                    await sendGroupCallSignal(
                        memberId,
                        "group-offer",
                        {
                            groupId:
                                String(selectedGroup.id),

                            callerId:
                                String(currentUser.id),

                            callerName:
                                currentUser.name,

                            callType:
                                "video",

                            offer
                        },
                        activeGroupCall.callId
                    );

                if (!signalSent) {

                    throw new Error(
                        "Could not send the group video call signal."
                    );
                }
            }

            if (endCallButton) {
                endCallButton.style.display =
                    "inline-block";
            }

            renderGroupCallParticipants();

        } catch (error) {

            console.error(
                "NEXA group video call error:",
                error
            );

            endCall(false);

            alert(
                "Could not start the group video call. Please allow camera and microphone access."
            );
        }

        return;
    }

    if (!selectedFriend) {

        alert(
            "Open a conversation first."
        );

        return;
    }

    try {

        callInProgress = true;
        callAnswered = false;

        if (callStatus) {
            callStatus.textContent = "Calling " + (selectedFriend.name || "NEXA Member") + "...";
        }

        localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });

        peerConnection = createPeerConnection(selectedFriend.id);

        localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

        activeCall = {
            callId: Date.now(),
            callerId: String(currentUser.id),
            receiverId: String(selectedFriend.id),
            callerName: currentUser.name,
            callType: "video"
        };

        const offer = await peerConnection.createOffer();

        await peerConnection.setLocalDescription(offer);

        activeCall.offer = offer;

        await sendCallSignal(
            selectedFriend.id,
            "offer",
            { callerName: currentUser.name, callType: "video", offer: offer },
            activeCall.callId
        );

        if (endCallButton) endCallButton.style.display = "inline-block";

    } catch (error) {

        console.error("NEXA video call error:", error);

        endCall(false);

        alert("Could not start the video call. Please allow camera and microphone access.");
    }
}


/* =========================================================
   ACCEPT CALL
========================================================= */


if (acceptCallButton) {

    acceptCallButton.addEventListener(
        "click",
        async () => {

            /* =================================================
               GROUP CALL
            ================================================= */

            if (
                activeGroupCall &&
                activeGroupCall.offer
            ) {

                stopNexaIncomingRingtone();

                try {

                    callInProgress = true;
                    callAnswered = true;

                    const isVideo =
                        activeGroupCall.callType ===
                        "video";

                    if (callStatus) {
                        callStatus.textContent =
                            "Connecting...";
                    }

                    localStream =
                        await navigator.mediaDevices
                            .getUserMedia({
                                audio: true,
                                video: isVideo
                            });
                    await ensureGroupAudioContext();
                    const connection =
                        createPeerConnection(
                            activeGroupCall.callerId
                        );

                    groupPeerConnections.set(
                        String(
                            activeGroupCall.callerId
                        ),
                        connection
                    );


                    localStream
                        .getTracks()
                        .forEach(track => {

                            connection.addTrack(
                                track,
                                localStream
                            );

                        });


                    await connection
                        .setRemoteDescription(
                            new RTCSessionDescription(
                                activeGroupCall.offer
                            )
                        );


                    /* =====================================================
                       ADD WAITING GROUP ICE CANDIDATES
                    ===================================================== */

                    const waitingCandidates =
                        activeGroupCall
                            .pendingCandidates
                            ?.get(
                                String(
                                    activeGroupCall.callerId
                                )
                            ) || [];

                    for (
                        const candidate
                        of waitingCandidates
                    ) {

                        try {

                            await connection
                                .addIceCandidate(
                                    candidate
                                );

                        } catch (error) {

                            console.error(
                                "NEXA GROUP ICE ACCEPT ERROR:",
                                error
                            );
                        }
                    }

                    if (
                        activeGroupCall.pendingCandidates
                    ) {

                        activeGroupCall
                            .pendingCandidates
                            .delete(
                                String(
                                    activeGroupCall.callerId
                                )
                            );
                    }






                    const answer =
                        await connection.createAnswer();


                    await connection
                        .setLocalDescription(
                            answer
                        );

                    const sent =
                        await sendGroupCallSignal(
                            activeGroupCall.callerId,
                            "group-answer",
                            {
                                groupId:
                                    activeGroupCall.groupId,

                                callerId:
                                    String(
                                        currentUser.id
                                    ),

                                answer
                            },
                            activeGroupCall.callId
                        );

                    await sendGroupCallSignal(
                        activeGroupCall.callerId,
                        "group-join",
                        {
                            groupId:
                                activeGroupCall.groupId,

                            userId:
                                String(currentUser.id),

                            userName:
                                currentUser.name
                        },
                        activeGroupCall.callId
                    );

                    if (!sent) {
                        throw new Error(
                            "Could not send group call answer."
                        );
                    }


                    if (incomingCall) {
                        incomingCall.style.display =
                            "none";
                    }

                    if (endCallButton) {
                        endCallButton.style.display =
                            "inline-block";
                    }

                    if (callStatus) {
                        callStatus.textContent =
                            "Connected";
                    }

                    renderGroupCallParticipants();

                } catch (error) {

                    console.error(
                        "NEXA group call accept error:",
                        error
                    );

                    endCall(false);

                }

                return;
            }


            /* =================================================
               NORMAL PRIVATE CALL
            ================================================= */

            if (
                !activeCall ||
                !activeCall.offer
            ) {
                return;
            }

            stopNexaIncomingRingtone();

            try {

                callInProgress = true;
                callAnswered = true;

                const isVideo =
                    activeCall.callType ===
                    "video";

                if (callStatus) {
                    callStatus.textContent =
                        "Connecting...";
                }

                localStream =
                    await navigator.mediaDevices
                        .getUserMedia({
                            audio: true,
                            video: isVideo
                        });
                await ensureGroupAudioContext();
                peerConnection =
                    createPeerConnection(
                        activeCall.callerId
                    );

                localStream
                    .getTracks()
                    .forEach(track => {

                        peerConnection.addTrack(
                            track,
                            localStream
                        );

                    });

                await peerConnection
                    .setRemoteDescription(
                        new RTCSessionDescription(
                            activeCall.offer
                        )
                    );

                for (
                    const candidate
                    of pendingIceCandidates
                ) {

                    try {

                        await peerConnection
                            .addIceCandidate(
                                candidate
                            );

                    } catch (error) {

                        console.error(
                            "NEXA ICE error:",
                            error
                        );
                    }
                }

                pendingIceCandidates = [];

                const answer =
                    await peerConnection
                        .createAnswer();

                await peerConnection
                    .setLocalDescription(
                        answer
                    );

                await sendCallSignal(
                    activeCall.callerId,
                    "answer",
                    {
                        answer: answer
                    },
                    activeCall.callId
                );

                if (incomingCall) {
                    incomingCall.style.display =
                        "none";
                }

                if (endCallButton) {
                    endCallButton.style.display =
                        "inline-block";
                }

            } catch (error) {

                console.error(
                    "NEXA accept call error:",
                    error
                );

                endCall(false);
            }
        }
    );
}


/* =========================================================
   DECLINE CALL
========================================================= */

if (declineCallButton) {

    declineCallButton.addEventListener(
        "click",
        async () => {

            stopNexaIncomingRingtone();

            /* =================================================
               GROUP CALL
            ================================================= */

            if (activeGroupCall) {

                const callerId =
                    String(
                        activeGroupCall.callerId
                    );

                const groupCallId =
                    activeGroupCall.callId;

                await sendGroupCallSignal(
                    callerId,
                    "group-decline",
                    {
                        groupId:
                            activeGroupCall.groupId,

                        callerId:
                            String(
                                currentUser.id
                            )
                    },
                    groupCallId
                );

                if (incomingCall) {
                    incomingCall.style.display =
                        "none";
                }

                activeGroupCall = null;
                callAnswered = false;

                if (callStatus) {
                    callStatus.textContent =
                        "Group call declined.";
                }

                return;
            }


            /* =================================================
               NORMAL PRIVATE CALL
            ================================================= */

            if (!activeCall) {
                return;
            }

            await sendCallSignal(
                activeCall.callerId,
                "decline",
                {},
                activeCall.callId
            );

            if (incomingCall) {
                incomingCall.style.display =
                    "none";
            }

            activeCall = null;
            callAnswered = false;

            if (callStatus) {
                callStatus.textContent =
                    "Call declined.";
            }
        }
    );
}



/* =========================================================
   MISSED CALL MESSAGE
========================================================= */

async function saveMissedCallMessage(call) {

    if (!call) return false;

    /*
     * Only the person who started the call creates the
     * missed-call event. This prevents both devices from
     * creating duplicate messages.
     */
    if (String(call.callerId) !== String(currentUser.id)) {
        return false;
    }

    if (callAnswered) {
        return false;
    }

    if (missedCallBeingSaved) {
        return false;
    }

    missedCallBeingSaved = true;

    try {

        const isVideo = call.callType === "video";

        const missedCallMessage = {
            id: createMessageId(),

            conversationId:
                createConversationId(
                    currentUser,
                    selectedFriend || {
                        id: call.receiverId
                    }
                ),

            senderId:
                String(call.callerId),

            receiverId:
                String(call.receiverId),

            text:
                isVideo
                    ? "📹 Missed video call"
                    : "📞 Missed voice call",

            media: null,

            mediaType:
                isVideo
                    ? "call_missed_video"
                    : "call_missed_voice",

            latitude: null,
            longitude: null,

            timestamp:
                new Date().toISOString(),

            read: false
        };

        const saved =
            await sendMessageToServer(
                missedCallMessage
            );

        if (!saved) {
            console.error(
                "NEXA missed call could not be saved."
            );

            return false;
        }

        /*
         * Add locally so the caller also gets an instant
         * call-history event if the conversation is open.
         */
        addMessage(missedCallMessage);

        if (selectedFriend) {
            renderCurrentConversation(true);
        }

        displayConversations(
            getConversationSearchValue()
        );

        return true;

    } catch (error) {

        console.error(
            "NEXA missed call error:",
            error
        );

        return false;

    } finally {

        missedCallBeingSaved = false;
    }
}


/* =========================================================
   END CALL
========================================================= */
if (groupRemoteAudio) {

    try {
        groupRemoteAudio.pause();
    } catch (_) { }

    groupRemoteAudio.srcObject = null;
}
function endCall(notifyServer = true) {

    stopNexaIncomingRingtone();

    const endingCall = activeCall
        ? { ...activeCall }
        : null;

    /*
     * If the current user started the call and the other
     * person never answered, save a persistent missed-call
     * message for them.
     */
    if (
        endingCall &&
        String(endingCall.callerId) === String(currentUser.id) &&
        !callAnswered
    ) {
        saveMissedCallMessage(endingCall);
    }

    stopCallTimer();
    stopRemoteSpeakingVisualizer();

    if (notifyServer && endingCall) {

        const currentId =
            String(currentUser.id);

        const otherUserId =
            String(endingCall.callerId) === currentId
                ? String(endingCall.receiverId)
                : String(endingCall.callerId);

        if (otherUserId) {
            sendCallSignal(
                otherUserId,
                "end",
                {},
                endingCall.callId
            );
        }
    }

    stopCallTimer();
    stopRemoteSpeakingVisualizer();


    if (peerConnection) {
        try { peerConnection.close(); } catch (_) { }
        peerConnection = null;
    }

    /* =========================================================
       CLEAN UP GROUP CALL CONNECTIONS
    ========================================================= */

    if (groupPeerConnections.size) {

        groupPeerConnections.forEach(
            connection => {

                try {
                    connection.close();
                } catch (_) { }

            }
        );

        groupPeerConnections.clear();
    }

    groupRemoteStreams.clear();
    groupCallParticipants.clear();

    document
        .querySelectorAll(
            'audio[id^="nexa-group-audio-"]'
        )
        .forEach(audio => {

            try {
                audio.pause();
            } catch (_) { }

            audio.srcObject = null;

            audio.remove();
        });

    document
        .querySelectorAll(
            'video[id^="nexa-group-video-"]'
        )
        .forEach(video => {

            try {
                video.pause();
            } catch (_) { }

            video.srcObject = null;

            video.remove();
        });

    activeGroupCall = null;


    if (localStream) {
        localStream.getTracks().forEach(track => {
            try { track.stop(); } catch (_) { }
        });
        localStream = null;
    }

    remoteStream = null;

    if (remoteAudio) remoteAudio.srcObject = null;
    if (remoteVideo) remoteVideo.srcObject = null;
    if (remoteCallArea) remoteCallArea.style.display = "none";
    if (remoteVideo) remoteVideo.style.display = "none";
    if (remoteAudio) remoteAudio.style.display = "block";
    if (incomingCall) incomingCall.style.display = "none";
    if (endCallButton) endCallButton.style.display = "none";
    if (callStatus) callStatus.textContent = "";
    const activeScreen =
        document.getElementById(
            "nexaActiveCallScreen"
        );

    if (activeScreen) {
        activeScreen.style.display = "none";
    }

    pendingIceCandidates = [];
    activeCall = null;
    callInProgress = false;
}


if (voiceCallButton) voiceCallButton.addEventListener("click", startVoiceCall);
if (videoCallButton) videoCallButton.addEventListener("click", startVideoCall);

if (endCallButton) {
    endCallButton.addEventListener("click", () => endCall(true));
}


/* =========================================================
   OPEN FRIEND FROM URL
========================================================= */

async function openFriendFromURL() {

    const params = new URLSearchParams(window.location.search);
    const friendId = params.get("user");

    if (!friendId) return;

    let friend = findUserById(friendId);

    if (!friend) {

        try {

            const { data, error } = await nexaSupabase
                .from("profiles")
                .select(`id, name, username, profile_picture, created_at`)
                .eq("id", String(friendId))
                .maybeSingle();

            if (!error && data) {
                friend = data;
                users.push(friend);
            }

        } catch (error) {
            console.error("NEXA URL friend error:", error);
        }
    }

    if (friend) {
        await openChat(friend);
    }
}


/* =========================================================
   CLOSE CHAT
========================================================= */

function closeCurrentChat() {

    if (isRecording || recordedVoiceBlob) {
        resetVoiceRecording();
    }

    selectedFriend = null;

    localStorage.removeItem("nexaActiveConversation");

    if (chatSection) chatSection.style.display = "none";

    if (emptyChatState) {
        emptyChatState.style.display = window.innerWidth <= 820 ? "none" : "grid";
    }

    const shell = document.querySelector(".messages-shell");
    if (shell) shell.classList.remove("chat-open");

    if (messagesContainer) messagesContainer.innerHTML = "";
}

if (backToConversations) backToConversations.addEventListener("click", closeCurrentChat);
if (chatCloseButton) chatCloseButton.addEventListener("click", closeCurrentChat);


/* =========================================================
   RESTORE ACTIVE CONVERSATION
========================================================= */

async function restoreSavedConversation() {

    const savedFriendId = localStorage.getItem("nexaActiveConversation");
    if (!savedFriendId) return;

    const friend = findUserById(savedFriendId);
    if (friend) await openChat(friend);
}


/* =========================================================
   INITIALIZE
   1. Load friends
   2. Render friends
   3. Load lightweight message metadata
   4. Refresh conversation previews
   5. Start realtime
========================================================= */

async function initializeNEXA() {

    console.log("Initializing NEXA Messages...");

    updateConversationFilterButtons();

    await getUsers();

    await displayConversations();

    await loadMessagesFromServer();

    displayConversations(getConversationSearchValue());

    subscribeToMessages();
    subscribeToCallSignals();
    await subscribeToPresence();

    await openFriendFromURL();

    if (!selectedFriend) {
        await restoreSavedConversation();
    }

    console.log("NEXA Messages initialized.");
}

/* =========================================================
   NEXA GROUP CREATION
========================================================= */

const createGroupModal =
    document.getElementById("createGroupModal");

const closeCreateGroupButton =
    document.getElementById("closeCreateGroupButton");

const cancelCreateGroupButton =
    document.getElementById("cancelCreateGroupButton");

const createGroupButton =
    document.getElementById("createGroupButton");

const groupNameInput =
    document.getElementById("groupNameInput");

const groupDescriptionInput =
    document.getElementById("groupDescriptionInput");

const groupFriendsList =
    document.getElementById("groupFriendsList");

const selectedGroupFriendsCount =
    document.getElementById("selectedGroupFriendsCount");

const groupPictureInput =
    document.getElementById("groupPictureInput");

const groupPicturePreview =
    document.getElementById("groupPicturePreview");

let selectedGroupFriendIds = [];

let selectedGroupPicture = "";


/* =========================================================
   OPEN GROUP MODAL
========================================================= */

async function openCreateGroupModal() {

    if (!createGroupModal) return;

    selectedGroupFriendIds = [];
    selectedGroupPicture = "";

    if (groupNameInput) {
        groupNameInput.value = "";
    }

    if (groupDescriptionInput) {
        groupDescriptionInput.value = "";
    }

    if (groupPictureInput) {
        groupPictureInput.value = "";
    }

    if (groupPicturePreview) {

        groupPicturePreview.innerHTML = "👥";

        groupPicturePreview.style.backgroundImage = "";
    }

    createGroupModal.style.display = "flex";

    await renderGroupFriends();

    setTimeout(() => {

        if (groupNameInput) {
            groupNameInput.focus();
        }

    }, 100);
}


/* =========================================================
   CLOSE GROUP MODAL
========================================================= */

function closeCreateGroupModal() {

    if (!createGroupModal) return;

    createGroupModal.style.display = "none";

    selectedGroupFriendIds = [];
    selectedGroupPicture = "";
}


/* =========================================================
   LOAD FRIENDS INTO GROUP CREATOR
========================================================= */

async function renderGroupFriends() {

    if (!groupFriendsList) return;

    groupFriendsList.innerHTML = `
        <div class="group-friends-loading">
            Loading friends...
        </div>
    `;

    try {

        if (!users.length) {
            await getUsers();
        }

        const friendIds = getFriendIds();

        const friends = friendIds
            .map(friendId => findUserById(friendId))
            .filter(Boolean);

        if (!friends.length) {

            groupFriendsList.innerHTML = `
                <div class="group-friends-empty">
                    Add friends first to create a group.
                </div>
            `;

            updateSelectedGroupFriendsCount();

            return;
        }

        groupFriendsList.innerHTML = "";

        friends.forEach(friend => {

            const friendId =
                String(friend.id);

            const selected =
                selectedGroupFriendIds.includes(friendId);

            const picture =
                friend.profile_picture ||
                friend.profilePicture ||
                "";

            const row =
                document.createElement("button");

            row.type = "button";

            row.className =
                "group-friend-row" +
                (selected ? " selected" : "");

            row.dataset.userId =
                friendId;

            const avatarHTML = picture
                ? `
                    <img
                        src="${escapeHTML(picture)}"
                        alt="${escapeHTML(friend.name || "Friend")}"
                    >
                  `
                : `
                    <span class="group-friend-letter">
                        ${escapeHTML(
                    String(friend.name || "U")
                        .trim()
                        .charAt(0)
                        .toUpperCase()
                )}
                    </span>
                  `;

            row.innerHTML = `

                <span class="group-friend-avatar">
                    ${avatarHTML}
                </span>

                <span class="group-friend-info">

                    <strong>
                        ${escapeHTML(
                friend.name || "NEXA Member"
            )}
                    </strong>

                    <small>
                        ${escapeHTML(
                friend.username
                    ? "@" + friend.username
                    : "NEXA Member"
            )}
                    </small>

                </span>

                <span class="group-friend-check">
                    ${selected ? "✓" : ""}
                </span>
            `;

            row.addEventListener(
                "click",
                () => toggleGroupFriend(friendId)
            );

            groupFriendsList.appendChild(row);
        });

        updateSelectedGroupFriendsCount();

    } catch (error) {

        console.error(
            "NEXA group friends error:",
            error
        );

        groupFriendsList.innerHTML = `
            <div class="group-friends-empty">
                Could not load your friends.
            </div>
        `;
    }
}


/* =========================================================
   SELECT / DESELECT FRIEND
========================================================= */

function toggleGroupFriend(friendId) {

    friendId = String(friendId);

    const index =
        selectedGroupFriendIds.indexOf(friendId);

    if (index >= 0) {

        selectedGroupFriendIds.splice(
            index,
            1
        );

    } else {

        selectedGroupFriendIds.push(
            friendId
        );
    }

    renderGroupFriends();
}


/* =========================================================
   SELECTED FRIEND COUNT
========================================================= */

function updateSelectedGroupFriendsCount() {

    if (!selectedGroupFriendsCount) return;

    const count =
        selectedGroupFriendIds.length;

    selectedGroupFriendsCount.textContent =
        count === 1
            ? "1 selected"
            : `${count} selected`;
}


/* =========================================================
   GROUP PICTURE
========================================================= */

if (groupPictureInput) {

    groupPictureInput.addEventListener(
        "change",
        event => {

            const file =
                event.target.files?.[0];

            if (!file) return;

            if (!file.type.startsWith("image/")) {

                alert(
                    "Please choose an image."
                );

                groupPictureInput.value = "";

                return;
            }

            const reader =
                new FileReader();

            reader.onload = () => {

                selectedGroupPicture =
                    reader.result;

                if (groupPicturePreview) {

                    groupPicturePreview.innerHTML = "";

                    groupPicturePreview.style.backgroundImage =
                        `url("${selectedGroupPicture}")`;

                    groupPicturePreview.style.backgroundSize =
                        "cover";

                    groupPicturePreview.style.backgroundPosition =
                        "center";
                }
            };

            reader.readAsDataURL(file);
        }
    );
}


/* =========================================================
   CREATE GROUP
========================================================= */

async function createNexaGroup() {

    if (!currentUser) {

        alert(
            "You must be logged in first."
        );

        return;
    }

    const groupName =
        groupNameInput
            ? groupNameInput.value.trim()
            : "";

    const description =
        groupDescriptionInput
            ? groupDescriptionInput.value.trim()
            : "";

    if (!groupName) {

        alert(
            "Please enter a group name."
        );

        if (groupNameInput) {
            groupNameInput.focus();
        }

        return;
    }

    if (!selectedGroupFriendIds.length) {

        alert(
            "Choose at least one friend."
        );

        return;
    }

    if (createGroupButton) {

        createGroupButton.disabled =
            true;

        createGroupButton.innerHTML = `
            <span>
                Creating...
            </span>
        `;
    }

    try {

        /*
         * Use a string ID so it works with the current
         * NEXA user ID architecture.
         */
        const groupId =
            "group_" +
            Date.now() +
            "_" +
            Math.random()
                .toString(36)
                .slice(2, 9);


        /* -----------------------------------------------------
           CREATE GROUP
        ----------------------------------------------------- */

        const { data: group, error: groupError } =
            await nexaSupabase
                .from("groups")
                .insert({

                    id: groupId,

                    name: groupName,

                    description:
                        description,

                    group_picture:
                        selectedGroupPicture,

                    created_by:
                        String(currentUser.id)

                })
                .select()
                .single();

        if (groupError) {
            throw groupError;
        }


        /* -----------------------------------------------------
           ADD CREATOR + SELECTED FRIENDS
        ----------------------------------------------------- */

        const members = [

            {
                group_id: groupId,

                user_id:
                    String(currentUser.id),

                role: "admin"
            },

            ...selectedGroupFriendIds.map(
                friendId => ({

                    group_id: groupId,

                    user_id:
                        String(friendId),

                    role: "member"
                })
            )

        ];


        const { error: membersError } =
            await nexaSupabase
                .from("group_members")
                .insert(members);

        if (membersError) {
            throw membersError;
        }


        /* -----------------------------------------------------
           SUCCESS
        ----------------------------------------------------- */

        closeCreateGroupModal();

        alert(
            `"${groupName}" was created successfully.`
        );

        /*
         * Refresh the conversation list.
         * Group rendering will be added in the next step.
         */
        await displayConversations(
            getConversationSearchValue()
        );

        console.log(
            "NEXA group created:",
            group
        );

    } catch (error) {

        console.error(
            "NEXA create group error:",
            error
        );

        alert(
            "Could not create the group. Please try again."
        );

    } finally {

        if (createGroupButton) {

            createGroupButton.disabled =
                false;

            createGroupButton.innerHTML = `
                <span>
                    Create Group
                </span>

                <span>
                    ➤
                </span>
            `;
        }
    }
}


/* =========================================================
   GROUP BUTTON EVENTS
========================================================= */

if (newMessageButton) {

    newMessageButton.addEventListener(
        "click",
        openCreateGroupModal
    );
}


if (emptyNewMessageButton) {

    emptyNewMessageButton.addEventListener(
        "click",
        openCreateGroupModal
    );
}


if (closeCreateGroupButton) {

    closeCreateGroupButton.addEventListener(
        "click",
        closeCreateGroupModal
    );
}


if (cancelCreateGroupButton) {

    cancelCreateGroupButton.addEventListener(
        "click",
        closeCreateGroupModal
    );
}


if (createGroupButton) {

    createGroupButton.addEventListener(
        "click",
        createNexaGroup
    );
}


/* =========================================================
   CLOSE MODAL BY CLICKING OUTSIDE
========================================================= */

if (createGroupModal) {

    createGroupModal.addEventListener(
        "click",
        event => {

            if (
                event.target ===
                createGroupModal
            ) {
                closeCreateGroupModal();
            }
        }
    );
}


/* =========================================================
   NEXA COMING SOON MESSAGE
========================================================= */

function showNexaComingSoon(type = "Group calling") {

    let popup =
        document.getElementById("nexaComingSoonPopup");

    if (!popup) {

        popup = document.createElement("div");

        popup.id =
            "nexaComingSoonPopup";

        popup.className =
            "nexa-coming-soon-popup";

        popup.innerHTML = `
            <div class="nexa-coming-soon-card">

                <div class="nexa-coming-soon-icon">
                    ✨
                </div>

                <div class="nexa-coming-soon-content">

                    <div class="nexa-coming-soon-label">
                        NEXA
                    </div>

                    <h3>
                        Coming Soon
                    </h3>

                    <p id="nexaComingSoonText">
                        Group calling is being prepared.
                    </p>

                </div>

                <button
                    type="button"
                    class="nexa-coming-soon-close"
                    aria-label="Close"
                >
                    ×
                </button>

            </div>
        `;

        document.body.appendChild(popup);

        const closeButton =
            popup.querySelector(
                ".nexa-coming-soon-close"
            );

        if (closeButton) {
            closeButton.addEventListener(
                "click",
                () => {
                    popup.classList.remove("show");
                }
            );
        }

        popup.addEventListener(
            "click",
            event => {

                if (
                    event.target === popup
                ) {
                    popup.classList.remove(
                        "show"
                    );
                }

            }
        );
    }

    const text =
        document.getElementById(
            "nexaComingSoonText"
        );

    if (text) {

        text.textContent =
            type +
            " is coming soon.";
    }

    popup.classList.remove("show");

    requestAnimationFrame(() => {
        popup.classList.add("show");
    });

    clearTimeout(
        popup._hideTimer
    );

    popup._hideTimer =
        setTimeout(() => {

            popup.classList.remove(
                "show"
            );

        }, 4500);
}


/* =========================================================
   START
========================================================= */

initializeNEXA();
