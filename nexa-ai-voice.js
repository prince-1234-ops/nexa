/* =========================================================
   NEXA AI VOICE

   Click the NEXA logo (#nexaAILogo) and Nexa says:
       "Hi there, I'm Nexa, how can I help?"
   then talks with you live. Click the logo again (or press
   Esc, or tap "End") to stop.

   How it works
   1. This script asks your "nexa-ai" Supabase edge function
      for a one-time Gemini Live token (action: "live-token").
   2. It opens a WebSocket straight to Gemini Live with that
      token, so your real API key never reaches the browser.
   3. Your microphone is streamed as 16 kHz PCM, and Nexa's
      voice comes back as 24 kHz PCM and is played instantly.

   Needs on the page:  supabase.js (defines nexaSupabase)
   Works on every page that has  <... id="nexaAILogo">
   The overlay UI builds itself, no extra HTML needed.
========================================================= */

(function () {
    "use strict";

    /* =====================================================
       SETTINGS
    ===================================================== */

    const EDGE_FUNCTION = "nexa-ai";
    const LIVE_MODEL = "models/gemini-3.8-live";

    /* Google documents v1beta for ephemeral tokens, some of
       their samples still use v1alpha. We try v1beta first
       and fall back automatically. */
    const API_VERSIONS = ["v1beta", "v1alpha"];

    const INPUT_RATE = 16000;    // microphone -> Gemini
    const OUTPUT_RATE = 24000;   // Gemini -> speaker
    const CONNECT_TIMEOUT_MS = 12000;

    /* false = the microphone is muted while Nexa talks. This
       stops laptop speakers from feeding Nexa's own voice back
       into the mic. Set to true only if people use headphones
       and you want them to be able to interrupt Nexa. */
    const ALLOW_BARGE_IN = false;

    const GREETING_PROMPT =
        "The user just tapped the NEXA logo to start a voice chat. " +
        "Greet them now by saying exactly: " +
        "\"Hi there, I'm Nexa, how can I help?\" " +
        "Then wait for them to speak.";


    /* =====================================================
       STATE
    ===================================================== */

    let logo = null;
    let ui = null;
    let session = null;

    function newSession() {
        return {
            ended: false,
            ws: null,

            /* playback */
            playCtx: null,
            nextPlayTime: 0,
            sources: new Set(),
            speaking: false,
            speakEndTimer: null,

            /* microphone */
            micStream: null,
            micCtx: null,
            micSource: null,
            micNode: null,
            micMute: null,
            micOpen: false,
            ratio: 1,
            carry: new Float32Array(0),
            readPos: 0,
            pcm: [],
            lastLevelAt: 0,

            safetyTimer: null
        };
    }

    function cancelled() {
        const error = new Error("cancelled");
        error.cancelled = true;
        return error;
    }

    function assertActive(s) {
        if (s.ended) {
            throw cancelled();
        }
    }


    /* =====================================================
       OVERLAY UI (builds itself)
    ===================================================== */

    function injectStyles() {

        if (document.getElementById("nexa-voice-styles")) {
            return;
        }

        const style = document.createElement("style");

        style.id = "nexa-voice-styles";

        style.textContent = `
            #nexaVoiceOverlay {
                position: fixed;
                left: 50%;
                bottom: calc(88px + env(safe-area-inset-bottom, 0px));
                transform: translate(-50%, 20px);
                z-index: 99999;
                display: flex;
                align-items: center;
                gap: 14px;
                min-width: 250px;
                max-width: calc(100vw - 32px);
                padding: 12px 14px 12px 12px;
                border-radius: 22px;
                background: rgba(12, 12, 16, 0.94);
                border: 1px solid rgba(212, 175, 55, 0.35);
                box-shadow: 0 18px 50px rgba(0, 0, 0, 0.55);
                -webkit-backdrop-filter: blur(14px);
                backdrop-filter: blur(14px);
                color: #f5f0df;
                font-family: inherit;
                opacity: 0;
                pointer-events: none;
                transition: opacity 0.25s ease, transform 0.25s ease;
            }

            #nexaVoiceOverlay.is-open {
                opacity: 1;
                pointer-events: auto;
                transform: translate(-50%, 0);
            }

            #nexaVoiceOverlay .nv-orb {
                position: relative;
                flex: none;
                width: 46px;
                height: 46px;
                display: grid;
                place-items: center;
            }

            #nexaVoiceOverlay .nv-orb::before {
                content: "";
                position: absolute;
                inset: 0;
                border-radius: 50%;
                background: radial-gradient(
                    circle,
                    rgba(212, 175, 55, 0.45),
                    rgba(212, 175, 55, 0) 70%
                );
                transform: scale(calc(1 + var(--nv-level, 0) * 1.4));
                transition: transform 0.08s linear;
            }

            #nexaVoiceOverlay .nv-orb-core {
                position: relative;
                width: 26px;
                height: 26px;
                border-radius: 50%;
                background: linear-gradient(145deg, #f3d56b, #b8902a);
                box-shadow: 0 0 18px rgba(212, 175, 55, 0.6);
            }

            #nexaVoiceOverlay[data-mode="connecting"] .nv-orb-core {
                animation: nvPulse 1.1s ease-in-out infinite;
            }

            #nexaVoiceOverlay[data-mode="speaking"] .nv-orb-core {
                background: linear-gradient(145deg, #7ff0b0, #2ecc71);
                box-shadow: 0 0 22px rgba(46, 204, 113, 0.65);
                animation: nvSpeak 0.6s ease-in-out infinite;
            }

            #nexaVoiceOverlay[data-mode="error"] .nv-orb-core {
                background: linear-gradient(145deg, #ff8a80, #d8433a);
                box-shadow: 0 0 18px rgba(231, 76, 60, 0.6);
            }

            @keyframes nvPulse {
                0%, 100% { transform: scale(0.85); opacity: 0.7; }
                50%      { transform: scale(1.05); opacity: 1; }
            }

            @keyframes nvSpeak {
                0%, 100% { transform: scale(0.92); }
                50%      { transform: scale(1.18); }
            }

            #nexaVoiceOverlay .nv-text {
                display: flex;
                flex-direction: column;
                gap: 2px;
                min-width: 0;
                flex: 1;
            }

            #nexaVoiceOverlay .nv-title {
                font-size: 11px;
                letter-spacing: 0.22em;
                text-transform: uppercase;
                color: #d4af37;
            }

            #nexaVoiceOverlay .nv-status {
                font-size: 14px;
                line-height: 1.3;
            }

            #nexaVoiceOverlay .nv-end {
                flex: none;
                padding: 8px 14px;
                border-radius: 999px;
                border: 1px solid rgba(231, 76, 60, 0.5);
                background: rgba(231, 76, 60, 0.14);
                color: #ff8f86;
                font: inherit;
                font-size: 13px;
                cursor: pointer;
            }

            #nexaVoiceOverlay .nv-end:hover {
                background: rgba(231, 76, 60, 0.26);
            }
        `;

        document.head.appendChild(style);
    }

    function ensureUI() {

        if (ui) {
            return ui;
        }

        injectStyles();

        const root = document.createElement("div");

        root.id = "nexaVoiceOverlay";
        root.setAttribute("role", "dialog");
        root.setAttribute("aria-label", "NEXA Voice");
        root.dataset.mode = "connecting";

        root.innerHTML = `
            <div class="nv-orb"><span class="nv-orb-core"></span></div>

            <div class="nv-text">
                <strong class="nv-title">NEXA Voice</strong>
                <span class="nv-status" aria-live="polite">Connecting…</span>
            </div>

            <button type="button" class="nv-end" aria-label="End voice chat">
                End
            </button>
        `;

        document.body.appendChild(root);

        root.querySelector(".nv-end").addEventListener("click", function () {
            endSession();
        });

        ui = {
            root: root,
            status: root.querySelector(".nv-status")
        };

        return ui;
    }

    function setStatus(mode, text) {

        const u = ensureUI();

        u.root.dataset.mode = mode;
        u.status.textContent = text;

        if (logo) {
            logo.classList.toggle(
                "nexa-voice-active",
                mode === "listening" || mode === "connecting"
            );
            logo.classList.toggle(
                "nexa-voice-speaking",
                mode === "speaking"
            );
        }
    }

    function setLevel(level) {
        if (ui) {
            ui.root.style.setProperty(
                "--nv-level",
                String(Math.max(0, Math.min(1, level)).toFixed(2))
            );
        }
    }

    function hideOverlay() {

        if (ui) {
            ui.root.classList.remove("is-open");
            setLevel(0);
        }

        if (logo) {
            logo.classList.remove("nexa-voice-active", "nexa-voice-speaking");
        }
    }


    /* =====================================================
       SMALL HELPERS
    ===================================================== */

    function voiceGender() {
        try {
            return localStorage.getItem("nexaSelectedVoice") === "female"
                ? "female"
                : "male";
        } catch (_) {
            return "male";
        }
    }

    function bytesToBase64(bytes) {

        let binary = "";
        const step = 0x8000;

        for (let i = 0; i < bytes.length; i += step) {
            binary += String.fromCharCode.apply(
                null,
                bytes.subarray(i, i + step)
            );
        }

        return btoa(binary);
    }

    function base64ToBytes(base64) {

        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);

        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }

        return bytes;
    }

    function parseMessage(data) {
        try {
            const text =
                typeof data === "string"
                    ? data
                    : new TextDecoder().decode(data);

            return JSON.parse(text);
        } catch (_) {
            return null;
        }
    }

    function friendlyError(error) {

        const name = error && error.name;
        const message = (error && error.message) || "Something went wrong.";

        if (name === "NotAllowedError" || name === "SecurityError") {
            return "Please allow microphone access for NEXA.";
        }

        if (name === "NotFoundError") {
            return "No microphone was found on this device.";
        }

        return message.length > 110 ? message.slice(0, 107) + "…" : message;
    }


    /* =====================================================
       TOKEN + LIVE CONNECTION
    ===================================================== */

    async function fetchToken() {

        if (typeof nexaSupabase === "undefined") {
            throw new Error("Supabase is not available on this page.");
        }

        const { data, error } = await nexaSupabase.functions.invoke(
            EDGE_FUNCTION,
            {
                body: {
                    action: "live-token",
                    voiceGender: voiceGender()
                }
            }
        );

        if (error) {

            let detail = error.message || "The NEXA AI function failed.";

            try {
                const body = await error.context.json();
                if (body && body.error) {
                    detail = body.error;
                }
            } catch (_) { }

            throw new Error(detail);
        }

        if (!data || !data.token) {
            throw new Error(
                (data && data.error) || "The NEXA AI function returned no token."
            );
        }

        return data.token;
    }

    function tryConnect(s, version, token) {

        return new Promise(function (resolve, reject) {

            const url =
                "wss://generativelanguage.googleapis.com/ws/" +
                "google.ai.generativelanguage." + version +
                ".GenerativeService.BidiGenerateContentConstrained" +
                "?access_token=" + token;

            const ws = new WebSocket(url);

            ws.binaryType = "arraybuffer";

            s.ws = ws;

            let settled = false;
            let timer = null;

            function finish(callback, value) {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                callback(value);
            }

            timer = setTimeout(function () {
                try { ws.close(); } catch (_) { }
                finish(reject, new Error("Connecting to Nexa timed out."));
            }, CONNECT_TIMEOUT_MS);

            ws.onopen = function () {
                /*
                 * The edge function locked the real settings (model,
                 * voice, instructions) into the token, so this first
                 * message only has to exist and name the model.
                 */
                ws.send(JSON.stringify({
                    setup: {
                        model: LIVE_MODEL,
                        generationConfig: { responseModalities: ["AUDIO"] }
                    }
                }));
            };

            ws.onmessage = function (event) {
                const message = parseMessage(event.data);

                if (message && message.setupComplete !== undefined) {
                    finish(resolve, ws);
                }
            };

            ws.onerror = function () {
                /* Browsers hide the details, the reason arrives in onclose. */
            };

            ws.onclose = function (event) {
                finish(
                    reject,
                    new Error(closeMessage(event))
                );
            };
        });
    }

    function closeMessage(event) {

        const reason = String((event && event.reason) || "").trim();

        if (reason) {
            return reason.length > 110 ? reason.slice(0, 107) + "…" : reason;
        }

        if (event && event.code === 1006) {
            return "Could not reach Nexa. Check your internet connection.";
        }

        return "Nexa disconnected (code " + (event ? event.code : "?") + ").";
    }

    async function connectLive(s) {

        let lastError = null;

        for (const version of API_VERSIONS) {

            assertActive(s);

            /* A token is single-use, so every attempt gets a fresh one. */
            const token = await fetchToken();

            assertActive(s);

            try {
                return await tryConnect(s, version, token);
            } catch (error) {
                lastError = error;
                console.warn(
                    "NEXA Voice: " + version + " connection failed:",
                    error.message
                );
            }
        }

        throw lastError || new Error("Could not connect to Nexa.");
    }


    /* =====================================================
       MICROPHONE  ->  16 kHz PCM  ->  Gemini
    ===================================================== */

    async function startMic(s) {

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error("This browser cannot use the microphone.");
        }

        const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
                channelCount: 1
            }
        });

        if (s.ended) {
            stream.getTracks().forEach(function (track) { track.stop(); });
            throw cancelled();
        }

        s.micStream = stream;

        const AudioContextClass =
            window.AudioContext || window.webkitAudioContext;

        s.micCtx = new AudioContextClass();

        if (s.micCtx.state === "suspended") {
            await s.micCtx.resume();
        }

        s.ratio = s.micCtx.sampleRate / INPUT_RATE;

        s.micSource = s.micCtx.createMediaStreamSource(stream);

        /* Silent output, some browsers only run nodes that reach the speakers. */
        s.micMute = s.micCtx.createGain();
        s.micMute.gain.value = 0;
        s.micMute.connect(s.micCtx.destination);

        let node = null;

        try {

            if (s.micCtx.audioWorklet && typeof AudioWorkletNode !== "undefined") {

                const code =
                    "class NexaMic extends AudioWorkletProcessor {" +
                    "  process(inputs) {" +
                    "    const channel = inputs[0] && inputs[0][0];" +
                    "    if (channel) { this.port.postMessage(channel.slice(0)); }" +
                    "    return true;" +
                    "  }" +
                    "}" +
                    "registerProcessor('nexa-mic', NexaMic);";

                const url = URL.createObjectURL(
                    new Blob([code], { type: "application/javascript" })
                );

                try {
                    await s.micCtx.audioWorklet.addModule(url);
                } finally {
                    URL.revokeObjectURL(url);
                }

                node = new AudioWorkletNode(s.micCtx, "nexa-mic");

                node.port.onmessage = function (event) {
                    onMicFrame(s, event.data);
                };
            }

        } catch (error) {
            console.warn("NEXA Voice: AudioWorklet unavailable, using fallback.", error);
            node = null;
        }

        if (!node) {

            node = s.micCtx.createScriptProcessor(4096, 1, 1);

            node.onaudioprocess = function (event) {
                onMicFrame(s, new Float32Array(event.inputBuffer.getChannelData(0)));
            };
        }

        s.micSource.connect(node);
        node.connect(s.micMute);

        s.micNode = node;
    }

    /* Streaming down-sampler (native rate -> 16 kHz). */
    function downsample(s, input) {

        if (s.ratio === 1) {
            return input;
        }

        const data = new Float32Array(s.carry.length + input.length);

        data.set(s.carry);
        data.set(input, s.carry.length);

        const out = [];

        while (s.readPos + s.ratio <= data.length) {

            const start = Math.floor(s.readPos);
            const end = Math.max(start + 1, Math.floor(s.readPos + s.ratio));

            let sum = 0;
            let count = 0;

            for (let i = start; i < end && i < data.length; i++) {
                sum += data[i];
                count++;
            }

            out.push(count ? sum / count : 0);

            s.readPos += s.ratio;
        }

        const consumed = Math.floor(s.readPos);

        s.carry = data.slice(consumed);
        s.readPos -= consumed;

        return out;
    }

    function onMicFrame(s, input) {

        if (
            s.ended ||
            !s.micOpen ||
            !s.ws ||
            s.ws.readyState !== WebSocket.OPEN
        ) {
            return;
        }

        if (s.speaking && !ALLOW_BARGE_IN) {
            return;
        }

        /* Little level meter for the orb. */
        const now = performance.now();

        if (now - s.lastLevelAt > 60) {

            let sum = 0;

            for (let i = 0; i < input.length; i++) {
                sum += input[i] * input[i];
            }

            setLevel(Math.sqrt(sum / input.length) * 8);

            s.lastLevelAt = now;
        }

        const samples = downsample(s, input);

        for (let i = 0; i < samples.length; i++) {
            const value = Math.max(-1, Math.min(1, samples[i]));
            s.pcm.push(value < 0 ? value * 0x8000 : value * 0x7fff);
        }

        /* Send 100 ms chunks (1600 samples at 16 kHz). */
        while (s.pcm.length >= 1600) {

            const chunk = Int16Array.from(s.pcm.splice(0, 1600));

            s.ws.send(JSON.stringify({
                realtimeInput: {
                    audio: {
                        data: bytesToBase64(new Uint8Array(chunk.buffer)),
                        mimeType: "audio/pcm;rate=" + INPUT_RATE
                    }
                }
            }));
        }
    }


    /* =====================================================
       NEXA'S VOICE  (24 kHz PCM  ->  speakers)
    ===================================================== */

    function playChunk(s, base64) {

        if (!s.playCtx) return;

        const bytes = base64ToBytes(base64);
        const count = bytes.length >> 1;

        if (!count) return;

        const view = new DataView(bytes.buffer, bytes.byteOffset, count * 2);
        const buffer = s.playCtx.createBuffer(1, count, OUTPUT_RATE);
        const channel = buffer.getChannelData(0);

        for (let i = 0; i < count; i++) {
            channel[i] = view.getInt16(i * 2, true) / 32768;
        }

        const source = s.playCtx.createBufferSource();

        source.buffer = buffer;
        source.connect(s.playCtx.destination);

        const startAt = Math.max(
            s.playCtx.currentTime + 0.03,
            s.nextPlayTime
        );

        source.start(startAt);

        s.nextPlayTime = startAt + buffer.duration;

        s.sources.add(source);

        source.onended = function () {

            s.sources.delete(source);

            if (!s.sources.size) {
                scheduleSpeakEnd(s);
            }
        };

        beginSpeaking(s);
    }

    function beginSpeaking(s) {

        clearTimeout(s.speakEndTimer);

        if (!s.speaking) {

            s.speaking = true;

            /* Throw away any mic audio captured before Nexa started. */
            s.pcm.length = 0;
            s.carry = new Float32Array(0);
            s.readPos = 0;

            setLevel(0);
            setStatus("speaking", "Nexa is speaking…");
        }
    }

    function scheduleSpeakEnd(s) {

        clearTimeout(s.speakEndTimer);

        /* Small tail so the mic doesn't catch the end of Nexa's voice. */
        s.speakEndTimer = setTimeout(function () {
            finishSpeaking(s);
        }, 400);
    }

    function finishSpeaking(s) {

        if (s.ended || s.sources.size) return;

        clearTimeout(s.safetyTimer);

        s.speaking = false;
        s.micOpen = true;
        s.pcm.length = 0;

        setStatus("listening", "Listening… go ahead");
    }

    function stopPlayback(s) {

        s.sources.forEach(function (source) {
            source.onended = null;
            try { source.stop(); } catch (_) { }
        });

        s.sources.clear();
        s.nextPlayTime = 0;

        finishSpeaking(s);
    }

    function handleMessage(s, event) {

        if (s.ended) return;

        const message = parseMessage(event.data);

        if (!message) return;

        const content = message.serverContent;

        if (content) {

            if (content.interrupted) {
                stopPlayback(s);
            }

            const parts = content.modelTurn && content.modelTurn.parts;

            if (parts) {
                for (const part of parts) {
                    if (part.inlineData && part.inlineData.data) {
                        playChunk(s, part.inlineData.data);
                    }
                }
            }

            /* Turn finished. If no audio is playing, start listening. */
            if (content.turnComplete && !s.sources.size) {
                scheduleSpeakEnd(s);
            }
        }

        if (message.goAway) {
            console.warn("NEXA Voice: server will disconnect soon.", message.goAway);
        }
    }


    /* =====================================================
       START / END
    ===================================================== */

    async function startSession() {

        if (session) {
            endSession();
            return;
        }

        const s = newSession();

        session = s;

        ensureUI().root.classList.add("is-open");
        setStatus("connecting", "Connecting…");

        try {

            /* Create the speaker context inside the click so browsers allow sound. */
            const AudioContextClass =
                window.AudioContext || window.webkitAudioContext;

            if (!AudioContextClass) {
                throw new Error("This browser does not support web audio.");
            }

            s.playCtx = new AudioContextClass();

            if (s.playCtx.state === "suspended") {
                s.playCtx.resume().catch(function () { });
            }

            await startMic(s);
            assertActive(s);

            setStatus("connecting", "Connecting to Nexa…");

            const ws = await connectLive(s);
            assertActive(s);

            s.ws = ws;

            ws.onmessage = function (event) {
                handleMessage(s, event);
            };

            ws.onerror = function () {
                console.warn("NEXA Voice: socket error.");
            };

            ws.onclose = function (event) {

                if (s.ended) return;

                console.warn("NEXA Voice: connection closed.", event.code, event.reason);

                if (session === s) {
                    endSession(
                        event.code === 1000
                            ? "Voice chat ended."
                            : closeMessage(event)
                    );
                }
            };

            setStatus("connecting", "Nexa is joining…");

            /* This makes Nexa say the greeting. */
            ws.send(JSON.stringify({ realtimeInput: { text: GREETING_PROMPT } }));

            /* If the greeting never arrives, open the mic anyway. */
            s.safetyTimer = setTimeout(function () {

                if (!s.ended && !s.speaking && !s.micOpen) {
                    s.micOpen = true;
                    setStatus("listening", "Listening… go ahead");
                }

            }, 8000);

        } catch (error) {

            if (error && error.cancelled) {
                return;
            }

            console.error("NEXA Voice error:", error);

            if (session === s) {
                endSession(friendlyError(error));
            }
        }
    }

    function cleanup(s) {

        s.ended = true;

        clearTimeout(s.speakEndTimer);
        clearTimeout(s.safetyTimer);

        if (s.ws) {
            try { s.ws.close(1000, "user ended"); } catch (_) { }
        }

        s.sources.forEach(function (source) {
            source.onended = null;
            try { source.stop(); } catch (_) { }
        });

        s.sources.clear();

        if (s.micNode) {
            try {
                if (s.micNode.port) {
                    s.micNode.port.onmessage = null;
                } else {
                    s.micNode.onaudioprocess = null;
                }
                s.micNode.disconnect();
            } catch (_) { }
        }

        if (s.micSource) {
            try { s.micSource.disconnect(); } catch (_) { }
        }

        if (s.micStream) {
            s.micStream.getTracks().forEach(function (track) {
                try { track.stop(); } catch (_) { }
            });
        }

        [s.micCtx, s.playCtx].forEach(function (context) {
            if (context && context.state !== "closed") {
                try { context.close(); } catch (_) { }
            }
        });
    }

    /* endSession()          -> close quietly
       endSession("message") -> show the message for a moment, then close */
    function endSession(message) {

        const s = session;

        if (!s) return;

        session = null;

        cleanup(s);

        if (message) {

            setStatus("error", message);

            setTimeout(function () {
                if (!session) hideOverlay();
            }, 3500);

        } else {

            hideOverlay();
        }
    }


    /* =====================================================
       INIT
    ===================================================== */

    function init() {

        logo = document.getElementById("nexaAILogo");

        if (!logo) {
            console.error("NEXA Voice: #nexaAILogo was not found on this page.");
            return;
        }

        logo.addEventListener("click", function (event) {
            event.preventDefault();
            startSession();
        });

        document.addEventListener("keydown", function (event) {
            if (event.key === "Escape" && session) {
                endSession();
            }
        });

        window.addEventListener("pagehide", function () {
            endSession();
        });

        /* Handy for other scripts: NexaVoice.start() / NexaVoice.stop() */
        window.NexaVoice = {
            start: startSession,
            stop: function () { endSession(); },
            get active() { return Boolean(session); }
        };

        console.log("NEXA Voice ready.");
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }

})();
