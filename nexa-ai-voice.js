/* =========================================================
   NEXA AI LIVE VOICE
   Gemini Live API
   Continuous real-time conversation
========================================================= */

(function () {

    "use strict";


    /* =====================================================
       STATE
    ===================================================== */

    let voiceEnabled = false;

    let waitingForVoiceChoice = false;

    let selectedVoiceGender =
        localStorage.getItem("nexa_voice_gender") ||
        "female";

    let liveSocket = null;

    let microphoneStream = null;

    let microphoneContext = null;

    let microphoneSource = null;

    let microphoneProcessor = null;

    let microphoneSilentGain = null;

    let outputContext = null;

    let outputNextTime = 0;

    let activeAudioSources = new Set();

    let liveConnecting = false;

    let setupComplete = false;


    /* =====================================================
       NEXA SYSTEM INSTRUCTIONS
    ===================================================== */

    const NEXA_SYSTEM_INSTRUCTION = `
You are NEXA, the official AI voice assistant inside the NEXA application.

You are a friendly companion inside NEXA.

You can help users with:
settings, themes, profiles, messages, group chats,
calls, voice notes, stories, reels, privacy,
notifications, account features, pages, buttons,
and NEXA troubleshooting.

Stay focused on NEXA.

Speak naturally like a real friend.
Be warm, relaxed, conversational, and concise.
Do not sound like a narrator.
Do not give unnecessarily long answers.
Respond quickly and naturally.
`;


    /* =====================================================
       VOICE SELECTOR
    ===================================================== */

    function showVoiceSelector() {

        const existing =
            document.getElementById(
                "nexaVoiceSelector"
            );

        if (existing) {
            existing.remove();
        }

        const selector =
            document.createElement("div");

        selector.id =
            "nexaVoiceSelector";

        selector.innerHTML = `
            <div class="nexa-voice-selector-box">

                <div class="nexa-voice-selector-title">
                    NEXA VOICE
                </div>

                <div class="nexa-voice-selector-subtitle">
                    Choose your NEXA voice
                </div>

                <button
                    type="button"
                    class="nexa-voice-gender"
                    data-gender="female"
                >
                    <span class="nexa-voice-gender-icon">
                        ♀
                    </span>

                    <span>
                        <strong>Female</strong>
                        <small>Warm & friendly</small>
                    </span>
                </button>

                <button
                    type="button"
                    class="nexa-voice-gender"
                    data-gender="male"
                >
                    <span class="nexa-voice-gender-icon">
                        ♂
                    </span>

                    <span>
                        <strong>Male</strong>
                        <small>Warm & confident</small>
                    </span>
                </button>

            </div>
        `;

        Object.assign(
            selector.style,
            {
                position: "fixed",
                inset: "0",
                zIndex: "2147483647",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "20px",
                boxSizing: "border-box",
                background:
                    "rgba(0,0,0,0.84)"
            }
        );

        const box =
            selector.querySelector(
                ".nexa-voice-selector-box"
            );

        if (box) {

            Object.assign(
                box.style,
                {
                    width:
                        "min(420px, 100%)",

                    padding:
                        "30px",

                    borderRadius:
                        "24px",

                    background:
                        "#080808",

                    border:
                        "1px solid #d4af37",

                    boxShadow:
                        "0 25px 80px rgba(0,0,0,.8)",

                    color:
                        "#f5f0df",

                    boxSizing:
                        "border-box"
                }
            );
        }

        document.body.appendChild(
            selector
        );

        waitingForVoiceChoice = true;

        const buttons =
            selector.querySelectorAll(
                ".nexa-voice-gender"
            );

        buttons.forEach(button => {

            button.classList.toggle(
                "active",
                button.dataset.gender ===
                    selectedVoiceGender
            );

            button.addEventListener(
                "click",
                async () => {

                    selectedVoiceGender =
                        button.dataset.gender;

                    localStorage.setItem(
                        "nexa_voice_gender",
                        selectedVoiceGender
                    );

                    waitingForVoiceChoice =
                        false;

                    selector.remove();

                    voiceEnabled = true;

                    updateVoiceUI(
                        false
                    );

                    await startLiveVoice();
                }
            );
        });
    }


    /* =====================================================
       TOKEN
    ===================================================== */

    async function getLiveToken() {

        if (
            typeof nexaSupabase ===
            "undefined"
        ) {

            throw new Error(
                "NEXA Supabase is not available."
            );
        }

        const { data, error } =
            await nexaSupabase
                .functions
                .invoke(
                    "nexa-ai",
                    {
                        body: {
                            action:
                                "live-token",

                            voiceGender:
                                selectedVoiceGender
                        }
                    }
                );

        if (error) {
            throw error;
        }

        if (
            !data?.token
        ) {
            throw new Error(
                data?.error ||
                "NEXA did not receive a Live token."
            );
        }

        return data.token;
    }


    /* =====================================================
       START LIVE VOICE
    ===================================================== */

    async function startLiveVoice() {

        if (
            liveConnecting ||
            liveSocket ||
            !voiceEnabled
        ) {
            return;
        }

        liveConnecting = true;

        console.log(
            "NEXA LIVE: connecting..."
        );

        updateVoiceUI(false);

        try {

            const token =
                await getLiveToken();

            if (!voiceEnabled) {
                return;
            }

            const socketUrl =
                "wss://generativelanguage.googleapis.com/" +
                "ws/google.ai.generativelanguage.v1beta." +
                "GenerativeService.BidiGenerateContentConstrained" +
                "?access_token=" +
                encodeURIComponent(token);

            liveSocket =
                new WebSocket(
                    socketUrl
                );

            liveSocket.onopen =
                async () => {

                    console.log(
                        "NEXA LIVE: WebSocket connected."
                    );

                    if (!voiceEnabled) {
                        stopLiveVoice();
                        return;
                    }

                    const voiceName =
                        selectedVoiceGender === "male"
                            ? "Puck"
                            : "Aoede";

                    liveSocket.send(
                        JSON.stringify({
                            setup: {
                                model:
                                    "models/gemini-3.8-live",

                                generationConfig: {
                                    responseModalities:
                                        ["AUDIO"],

                                    speechConfig: {
                                        voiceConfig: {
                                            prebuiltVoiceConfig: {
                                                voiceName
                                            }
                                        }
                                    }
                                },

                                systemInstruction: {
                                    parts: [
                                        {
                                            text:
                                                NEXA_SYSTEM_INSTRUCTION
                                        }
                                    ]
                                }
                            }
                        })
                    );
                };


            liveSocket.onmessage =
                async event => {

                    try {

                        const response =
                            JSON.parse(
                                event.data
                            );

                        /*
                         * Connection ready.
                         */

                        if (
                            response.setupComplete
                        ) {

                            setupComplete =
                                true;

                            console.log(
                                "NEXA LIVE: setup complete."
                            );

                            await startMicrophone();

                            return;
                        }


                        const serverContent =
                            response.serverContent;

                        if (!serverContent) {
                            return;
                        }


                        /*
                         * User interrupted NEXA.
                         */

                        if (
                            serverContent.interrupted
                        ) {

                            stopOutputImmediately();

                            console.log(
                                "NEXA LIVE: response interrupted."
                            );
                        }


                        /*
                         * Stream audio immediately.
                         */

                        const parts =
                            serverContent
                                ?.modelTurn
                                ?.parts || [];

                        for (
                            const part
                            of parts
                        ) {

                            const inlineData =
                                part?.inlineData;

                            if (
                                inlineData?.data
                            ) {

                                playPcmChunk(
                                    inlineData.data,
                                    inlineData.mimeType
                                );
                            }
                        }


                        if (
                            serverContent.turnComplete
                        ) {

                            console.log(
                                "NEXA LIVE: turn complete."
                            );
                        }

                    } catch (error) {

                        console.error(
                            "NEXA LIVE message error:",
                            error
                        );
                    }
                };


            liveSocket.onerror =
                event => {

                    console.error(
                        "NEXA LIVE WebSocket error:",
                        event
                    );
                };


            liveSocket.onclose =
                event => {

                    console.log(
                        "NEXA LIVE WebSocket closed:",
                        event.code,
                        event.reason
                    );

                    setupComplete =
                        false;

                    liveSocket =
                        null;

                    if (voiceEnabled) {

                        voiceEnabled =
                            false;

                        stopMicrophone();

                        stopOutputImmediately();

                        updateVoiceUI(
                            false
                        );
                    }
                };

        } catch (error) {

            console.error(
                "NEXA LIVE connection error:",
                error
            );

            voiceEnabled =
                false;

            stopMicrophone();

            stopOutputImmediately();

            updateVoiceUI(
                false
            );

            alert(
                "NEXA voice could not connect."
            );

        } finally {

            liveConnecting =
                false;
        }
    }


    /* =====================================================
       MICROPHONE
    ===================================================== */

    async function startMicrophone() {

        if (
            microphoneStream ||
            !voiceEnabled
        ) {
            return;
        }

        if (
            !navigator.mediaDevices ||
            !navigator.mediaDevices.getUserMedia
        ) {

            throw new Error(
                "Microphone is not supported."
            );
        }

        microphoneStream =
            await navigator.mediaDevices
                .getUserMedia({
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true,
                        channelCount: 1
                    }
                });


        const AudioContextClass =
            window.AudioContext ||
            window.webkitAudioContext;

        if (!AudioContextClass) {

            throw new Error(
                "Web Audio is not supported."
            );
        }

        microphoneContext =
            new AudioContextClass();

        await microphoneContext.resume();


        microphoneSource =
            microphoneContext
                .createMediaStreamSource(
                    microphoneStream
                );


        microphoneProcessor =
            microphoneContext
                .createScriptProcessor(
                    1024,
                    1,
                    1
                );


        microphoneSilentGain =
            microphoneContext
                .createGain();

        /*
         * Keep microphone processing alive
         * without playing your own voice back
         * through the speakers.
         */

        microphoneSilentGain.gain.value = 0;


        microphoneProcessor.onaudioprocess =
            event => {

                if (
                    !voiceEnabled ||
                    !setupComplete ||
                    !liveSocket ||
                    liveSocket.readyState !==
                        WebSocket.OPEN
                ) {
                    return;
                }

                const input =
                    event.inputBuffer
                        .getChannelData(
                            0
                        );

                const pcm =
                    float32ToPCM16(
                        input
                    );

                const base64 =
                    arrayBufferToBase64(
                        pcm.buffer
                    );

                try {

                    liveSocket.send(
                        JSON.stringify({
                            realtimeInput: {
                                audio: {
                                    data:
                                        base64,

                                    mimeType:
                                        "audio/pcm;rate=" +
                                        Math.round(
                                            microphoneContext
                                                .sampleRate
                                        )
                                }
                            }
                        })
                    );

                } catch (error) {

                    console.warn(
                        "NEXA LIVE microphone send error:",
                        error
                    );
                }
            };


        microphoneSource.connect(
            microphoneProcessor
        );

        microphoneProcessor.connect(
            microphoneSilentGain
        );

        microphoneSilentGain.connect(
            microphoneContext.destination
        );


        console.log(
            "NEXA LIVE: microphone started.",
            "Sample rate:",
            microphoneContext.sampleRate
        );

        updateVoiceUI(
            true
        );
    }


    /* =====================================================
       FLOAT32 → PCM16
    ===================================================== */

    function float32ToPCM16(
        input
    ) {

        const buffer =
            new ArrayBuffer(
                input.length * 2
            );

        const view =
            new DataView(buffer);

        for (
            let i = 0;
            i < input.length;
            i++
        ) {

            const sample =
                Math.max(
                    -1,
                    Math.min(
                        1,
                        input[i]
                    )
                );

            view.setInt16(
                i * 2,
                sample < 0
                    ? sample * 0x8000
                    : sample * 0x7fff,
                true
            );
        }

        return new Int16Array(
            buffer
        );
    }


    /* =====================================================
       ARRAY BUFFER → BASE64
    ===================================================== */

    function arrayBufferToBase64(
        buffer
    ) {

        const bytes =
            new Uint8Array(
                buffer
            );

        let binary = "";

        const chunkSize =
            0x8000;

        for (
            let i = 0;
            i < bytes.length;
            i += chunkSize
        ) {

            binary += String.fromCharCode(
                ...bytes.subarray(
                    i,
                    Math.min(
                        i + chunkSize,
                        bytes.length
                    )
                )
            );
        }

        return btoa(
            binary
        );
    }


    /* =====================================================
       OUTPUT AUDIO
    ===================================================== */

    function ensureOutputContext() {

        if (!outputContext) {

            const AudioContextClass =
                window.AudioContext ||
                window.webkitAudioContext;

            if (!AudioContextClass) {
                throw new Error(
                    "Audio output is not supported."
                );
            }

            outputContext =
                new AudioContextClass();
        }

        return outputContext;
    }


    function playPcmChunk(
        base64,
        mimeType
    ) {

        if (!base64) {
            return;
        }

        try {

            const context =
                ensureOutputContext();

            if (
                context.state ===
                "suspended"
            ) {

                context.resume()
                    .catch(() => {});
            }


            const binary =
                atob(
                    base64
                );

            const pcmLength =
                Math.floor(
                    binary.length / 2
                );

            const pcm =
                new Int16Array(
                    pcmLength
                );


            for (
                let i = 0;
                i < pcmLength;
                i++
            ) {

                const low =
                    binary.charCodeAt(
                        i * 2
                    );

                const high =
                    binary.charCodeAt(
                        i * 2 + 1
                    );

                pcm[i] =
                    low |
                    (high << 8);
            }


            const rateMatch =
                String(
                    mimeType ||
                    ""
                ).match(
                    /rate=(\d+)/i
                );

            const sampleRate =
                rateMatch
                    ? Number(
                        rateMatch[1]
                    )
                    : 24000;


            const audioBuffer =
                context.createBuffer(
                    1,
                    pcm.length,
                    sampleRate
                );

            const channel =
                audioBuffer.getChannelData(
                    0
                );


            for (
                let i = 0;
                i < pcm.length;
                i++
            ) {

                channel[i] =
                    pcm[i] / 32768;
            }


            const source =
                context.createBufferSource();

            source.buffer =
                audioBuffer;

            source.connect(
                context.destination
            );


            const now =
                context.currentTime;

            const startTime =
                Math.max(
                    now + 0.02,
                    outputNextTime
                );

            outputNextTime =
                startTime +
                audioBuffer.duration;

            activeAudioSources.add(
                source
            );

            source.onended = () => {

                activeAudioSources.delete(
                    source
                );
            };

            source.start(
                startTime
            );

        } catch (error) {

            console.error(
                "NEXA LIVE audio playback error:",
                error
            );
        }
    }


    /* =====================================================
       STOP AUDIO IMMEDIATELY
    ===================================================== */

    function stopOutputImmediately() {

        activeAudioSources.forEach(
            source => {

                try {
                    source.stop();
                } catch (_) {}

            }
        );

        activeAudioSources.clear();

        if (outputContext) {
            outputNextTime =
                outputContext.currentTime;
        } else {
            outputNextTime = 0;
        }
    }


    /* =====================================================
       STOP MICROPHONE
    ===================================================== */

    function stopMicrophone() {

        if (
            microphoneProcessor
        ) {

            try {
                microphoneProcessor.disconnect();
            } catch (_) {}

            microphoneProcessor.onaudioprocess =
                null;

            microphoneProcessor =
                null;
        }


        if (
            microphoneSource
        ) {

            try {
                microphoneSource.disconnect();
            } catch (_) {}

            microphoneSource =
                null;
        }


        if (
            microphoneSilentGain
        ) {

            try {
                microphoneSilentGain.disconnect();
            } catch (_) {}

            microphoneSilentGain =
                null;
        }


        if (
            microphoneStream
        ) {

            microphoneStream
                .getTracks()
                .forEach(track => {

                    try {
                        track.stop();
                    } catch (_) {}

                });

            microphoneStream =
                null;
        }


        if (
            microphoneContext
        ) {

            try {

                if (
                    microphoneContext.state !==
                    "closed"
                ) {
                    microphoneContext.close();
                }

            } catch (_) {}

            microphoneContext =
                null;
        }
    }


    /* =====================================================
       STOP EVERYTHING
    ===================================================== */

    function stopLiveVoice() {

        voiceEnabled =
            false;

        waitingForVoiceChoice =
            false;

        setupComplete =
            false;

        liveConnecting =
            false;

        stopMicrophone();

        stopOutputImmediately();

        if (
            liveSocket
        ) {

            try {
                liveSocket.close(
                    1000,
                    "NEXA voice stopped"
                );
            } catch (_) {}

            liveSocket =
                null;
        }


        const selector =
            document.getElementById(
                "nexaVoiceSelector"
            );

        if (selector) {
            selector.remove();
        }


        updateVoiceUI(
            false
        );

        console.log(
            "NEXA LIVE: voice OFF."
        );
    }


    /* =====================================================
       TOGGLE
    ===================================================== */

    function toggleVoice() {

        if (
            voiceEnabled ||
            liveConnecting ||
            waitingForVoiceChoice
        ) {

            stopLiveVoice();

            return;
        }


        const savedGender =
            localStorage.getItem(
                "nexa_voice_gender"
            );

        if (savedGender) {

            selectedVoiceGender =
                savedGender === "male"
                    ? "male"
                    : "female";

            voiceEnabled =
                true;

            startLiveVoice();

            return;
        }


        showVoiceSelector();
    }


    /* =====================================================
       UI
    ===================================================== */

    function updateVoiceUI(
        listening
    ) {

        const buttons =
            document.querySelectorAll(
                ".nexa-voice-toggle"
            );

        buttons.forEach(
            button => {

                button.classList.toggle(
                    "active",
                    voiceEnabled
                );

                button.classList.toggle(
                    "listening",
                    listening
                );

                button.setAttribute(
                    "aria-pressed",
                    String(
                        voiceEnabled
                    )
                );
            }
        );
    }


    /* =====================================================
       LOGO CONNECTION
    ===================================================== */

    function setupVoiceButtons() {

        if (
            window.__nexaVoiceLogoBound
        ) {
            return;
        }

        window.__nexaVoiceLogoBound =
            true;


        document.addEventListener(
            "click",
            event => {

                const target =
                    event.target;

                if (
                    !target ||
                    typeof target.closest !==
                        "function"
                ) {
                    return;
                }


                const button =
                    target.closest(
                        ".nexa-logo, .logo, .mobile-logo"
                    );

                if (!button) {
                    return;
                }


                event.preventDefault();

                event.stopImmediatePropagation();


                button.classList.add(
                    "nexa-voice-toggle"
                );


                toggleVoice();


                console.log(
                    "NEXA LIVE: logo clicked."
                );

            },
            true
        );
    }


    /* =====================================================
       PUBLIC API
    ===================================================== */

    window.NEXAVoice = {

        enable() {

            if (!voiceEnabled) {
                toggleVoice();
            }
        },

        disable() {

            if (
                voiceEnabled ||
                liveConnecting ||
                waitingForVoiceChoice
            ) {
                stopLiveVoice();
            }
        },

        toggle:
            toggleVoice,

        isEnabled() {
            return voiceEnabled;
        }
    };


    /* =====================================================
       INITIALIZE
    ===================================================== */

    function initialize() {
        setupVoiceButtons();
    }


    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            initialize
        );

    } else {

        initialize();
    }

})();
