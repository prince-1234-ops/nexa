/* =========================================================
   NEXA AI VOICE
   Continuous conversation
   Gemini AI
   Gemini Natural TTS
========================================================= */

(function () {

    "use strict";

    let recognition = null;

    let isListening = false;

    let voiceEnabled = false;

    let waitingForVoiceChoice = false;

    let selectedVoiceGender =
        localStorage.getItem(
            "nexa_voice_gender"
        ) || "female";

    let currentAudio = null;

    let conversationRequestRunning =
        false;


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

        document.body.appendChild(selector);

waitingForVoiceChoice = true;

/*
 * Force the selector to be visible above everything.
 * This avoids problems caused by missing or conflicting CSS.
 */
Object.assign(selector.style, {
    position: "fixed",
    inset: "0",
    zIndex: "2147483647",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
    boxSizing: "border-box",
    background: "rgba(0, 0, 0, 0.82)"
});

const selectorBox =
    selector.querySelector(".nexa-voice-selector-box");

if (selectorBox) {

    Object.assign(selectorBox.style, {
        width: "min(420px, 100%)",
        padding: "30px",
        boxSizing: "border-box",
        borderRadius: "24px",
        background: "#080808",
        border: "1px solid #d4af37",
        boxShadow: "0 25px 80px rgba(0, 0, 0, 0.8)",
        color: "#f5f0df",
        fontFamily: "Arial, sans-serif"
    });
}

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
                () => {

                    selectedVoiceGender =
                        button.dataset.gender;

                    localStorage.setItem(
                        "nexa_voice_gender",
                        selectedVoiceGender
                    );

                    waitingForVoiceChoice = false;

                    buttons.forEach(item => {
                        item.classList.toggle(
                            "active",
                            item.dataset.gender ===
                                selectedVoiceGender
                        );
                    });

                    selector.remove();

                    ensureRecognition();

                    startListening();
                }
            );
        });
    }


    /* =====================================================
       PCM 16-BIT → WAV
    ===================================================== */

    function pcm16ToWav(
        pcmBytes,
        sampleRate = 24000
    ) {

        const channels = 1;

        const bitsPerSample = 16;

        const dataSize =
            pcmBytes.length;

        const buffer =
            new ArrayBuffer(
                44 + dataSize
            );

        const view =
            new DataView(buffer);

        function writeString(
            offset,
            value
        ) {

            for (
                let i = 0;
                i < value.length;
                i++
            ) {

                view.setUint8(
                    offset + i,
                    value.charCodeAt(i)
                );
            }
        }

        writeString(0, "RIFF");

        view.setUint32(
            4,
            36 + dataSize,
            true
        );

        writeString(8, "WAVE");

        writeString(12, "fmt ");

        view.setUint32(
            16,
            16,
            true
        );

        view.setUint16(
            20,
            1,
            true
        );

        view.setUint16(
            22,
            channels,
            true
        );

        view.setUint32(
            24,
            sampleRate,
            true
        );

        view.setUint32(
            28,
            sampleRate *
                channels *
                bitsPerSample /
                8,
            true
        );

        view.setUint16(
            32,
            channels *
                bitsPerSample /
                8,
            true
        );

        view.setUint16(
            34,
            bitsPerSample,
            true
        );

        writeString(36, "data");

        view.setUint32(
            40,
            dataSize,
            true
        );

        new Uint8Array(
            buffer,
            44
        ).set(
            pcmBytes
        );

        return buffer;
    }


    /* =====================================================
       STOP CURRENT AUDIO
    ===================================================== */

    function stopCurrentAudio() {

        if (!currentAudio) {
            return;
        }

        try {
            currentAudio.pause();
        } catch (_) {}

        try {
            if (currentAudio.src) {
                URL.revokeObjectURL(
                    currentAudio.src
                );
            }
        } catch (_) {}

        currentAudio = null;
    }


    /* =====================================================
       START LISTENING
    ===================================================== */

    function startListening() {

        if (
            !voiceEnabled ||
            waitingForVoiceChoice ||
            !recognition ||
            isListening ||
            conversationRequestRunning
        ) {
            return;
        }

        setTimeout(() => {

            if (
                !voiceEnabled ||
                waitingForVoiceChoice ||
                !recognition ||
                isListening ||
                conversationRequestRunning
            ) {
                return;
            }

            try {

                recognition.start();

            } catch (error) {

                console.warn(
                    "NEXA recognition start:",
                    error
                );
            }

        }, 500);
    }


    /* =====================================================
       SPEAK GEMINI AUDIO
    ===================================================== */

    async function speak(
        text,
        audioBase64,
        audioMimeType
    ) {

        if (!voiceEnabled) {
            return;
        }

        if (
            recognition &&
            isListening
        ) {

            try {
                recognition.stop();
            } catch (_) {}
        }

        stopCurrentAudio();

        if (!audioBase64) {

            console.error(
                "NEXA did not receive generated audio."
            );

            startListening();

            return;
        }

        try {

            const mimeType =
                String(
                    audioMimeType ||
                    "audio/L16;rate=24000"
                );

            const binaryString =
                atob(audioBase64);

            const pcmBytes =
                new Uint8Array(
                    binaryString.length
                );

            for (
                let i = 0;
                i < binaryString.length;
                i++
            ) {

                pcmBytes[i] =
                    binaryString.charCodeAt(i);
            }

            let audioBlob;

            /*
             * Gemini TTS returns raw PCM.
             */

            if (
                mimeType
                    .toLowerCase()
                    .includes("audio/l16") ||
                mimeType
                    .toLowerCase()
                    .includes("audio/pcm")
            ) {

                const rateMatch =
                    mimeType.match(
                        /rate=(\d+)/i
                    );

                const sampleRate =
                    rateMatch
                        ? Number(
                            rateMatch[1]
                        )
                        : 24000;

                const wavBuffer =
                    pcm16ToWav(
                        pcmBytes,
                        sampleRate
                    );

                audioBlob =
                    new Blob(
                        [wavBuffer],
                        {
                            type:
                                "audio/wav"
                        }
                    );

            } else {

                audioBlob =
                    new Blob(
                        [pcmBytes],
                        {
                            type:
                                mimeType
                        }
                    );
            }

            const url =
                URL.createObjectURL(
                    audioBlob
                );

            const audio =
                new Audio(url);

            currentAudio =
                audio;

            audio.volume = 1;

            audio.onended = () => {

                URL.revokeObjectURL(url);

                if (
                    currentAudio === audio
                ) {
                    currentAudio = null;
                }

                startListening();
            };

            audio.onerror = error => {

                console.error(
                    "NEXA audio playback error:",
                    error
                );

                URL.revokeObjectURL(url);

                if (
                    currentAudio === audio
                ) {
                    currentAudio = null;
                }

                startListening();
            };

            await audio.play();

        } catch (error) {

            console.error(
                "NEXA generated voice error:",
                error
            );

            startListening();
        }
    }


    /* =====================================================
       GENERATE RESPONSE
    ===================================================== */

    async function generateResponse(
        text
    ) {

        const message =
            String(
                text || ""
            ).trim();

        if (!message) {

            return {
                reply:
                    "I didn't hear anything.",
                audio:
                    null,
                audioMimeType:
                    null
            };
        }

        if (
            typeof nexaSupabase ===
            "undefined"
        ) {

            return {
                reply:
                    "I'm having trouble connecting to NEXA.",
                audio:
                    null,
                audioMimeType:
                    null
            };
        }

        try {

            const {
                data,
                error
            } =
                await nexaSupabase
                    .functions
                    .invoke(
                        "nexa-ai",
                        {
                            body: {
                                message,
                                voiceGender:
                                    selectedVoiceGender
                            }
                        }
                    );

            if (error) {

                console.error(
                    "NEXA AI function error:",
                    error
                );

                return {
                    reply:
                        "I'm having trouble thinking right now.",
                    audio:
                        null,
                    audioMimeType:
                        null
                };
            }

            if (data?.error) {

                console.error(
                    "NEXA AI returned error:",
                    data.error
                );

                return {
                    reply:
                        "I couldn't process that right now.",
                    audio:
                        null,
                    audioMimeType:
                        null
                };
            }

            return {
                reply:
                    data?.reply ||
                    "I don't have an answer yet.",

                audio:
                    data?.audio ||
                    null,

                audioMimeType:
                    data?.audioMimeType ||
                    null
            };

        } catch (error) {

            console.error(
                "NEXA AI connection error:",
                error
            );

            return {
                reply:
                    "NEXA couldn't connect to the AI service.",
                audio:
                    null,
                audioMimeType:
                    null
            };
        }
    }


    /* =====================================================
       CREATE SPEECH RECOGNITION
    ===================================================== */

    function createRecognition() {

        const SpeechRecognition =
            window.SpeechRecognition ||
            window.webkitSpeechRecognition;

        if (!SpeechRecognition) {

            console.warn(
                "NEXA Voice is not supported in this browser."
            );

            return null;
        }

        const instance =
            new SpeechRecognition();

        instance.continuous = false;

        instance.interimResults = false;

        instance.lang = "en-US";


        instance.onstart = () => {

            isListening = true;

            updateVoiceUI(true);
        };


        instance.onend = () => {

            isListening = false;

            updateVoiceUI(false);

            if (
                voiceEnabled &&
                !conversationRequestRunning
            ) {
                startListening();
            }
        };


        instance.onerror = event => {

            console.warn(
                "NEXA speech error:",
                event.error
            );

            isListening = false;

            updateVoiceUI(false);

            if (
                voiceEnabled &&
                event.error !==
                    "not-allowed"
            ) {
                startListening();
            }
        };


        instance.onresult = async event => {

            const transcript =
                event
                    ?.results?.[0]?.[0]
                    ?.transcript
                    ?.trim();

            if (!transcript) {

                startListening();

                return;
            }

            console.log(
                "NEXA heard:",
                transcript
            );

            if (
                conversationRequestRunning
            ) {
                return;
            }

            conversationRequestRunning =
                true;

            try {

                const response =
                    await generateResponse(
                        transcript
                    );

                console.log(
                    "NEXA response:",
                    response.reply
                );

                await speak(
                    response.reply,
                    response.audio,
                    response.audioMimeType
                );

            } finally {

                conversationRequestRunning =
                    false;
            }
        };


        return instance;
    }


    /* =====================================================
       ENSURE RECOGNITION
    ===================================================== */

    function ensureRecognition() {

        if (!recognition) {

            recognition =
                createRecognition();
        }

        return recognition;
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

        buttons.forEach(button => {

            button.classList.toggle(
                "active",
                voiceEnabled
            );

            button.classList.toggle(
                "listening",
                listening
            );
        });
    }


/* =====================================================
   TOGGLE NEXA VOICE
===================================================== */

function toggleVoice() {

    /*
     * TURN OFF
     *
     * Clicking NEXA again should immediately stop
     * listening, stop any reply audio, and close
     * the voice selector if it is open.
     */

    if (
        voiceEnabled ||
        waitingForVoiceChoice
    ) {

        voiceEnabled = false;
        waitingForVoiceChoice = false;
        conversationRequestRunning = false;

        if (recognition) {
            try {
                recognition.stop();
            } catch (_) {}
        }

        stopCurrentAudio();

        const selector =
            document.getElementById(
                "nexaVoiceSelector"
            );

        if (selector) {
            selector.remove();
        }

        updateVoiceUI(false);

        console.log(
            "NEXA AI: voice OFF."
        );

        return;
    }


    /*
     * TURN ON
     *
     * If the user has already chosen a voice,
     * start immediately.
     */

    const savedGender =
        localStorage.getItem(
            "nexa_voice_gender"
        );

    if (savedGender) {

        selectedVoiceGender =
            savedGender;

        voiceEnabled = true;
        waitingForVoiceChoice = false;

        ensureRecognition();

        updateVoiceUI(false);

        startListening();

        console.log(
            "NEXA AI: voice ON."
        );

        return;
    }


    /*
     * FIRST TIME
     *
     * Ask the user to choose Male or Female.
     */

    showVoiceSelector();
}

/* =====================================================
   LOGO CONNECTION
===================================================== */

function setupVoiceButtons() {

    if (window.__nexaVoiceLogoBound) {
        return;
    }

    window.__nexaVoiceLogoBound = true;

    document.addEventListener(
        "click",
        event => {

            const target = event.target;

            if (
                !target ||
                typeof target.closest !== "function"
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

            /*
             * Clicking NEXA should always start
             * the voice assistant.
             */
            if (!voiceEnabled) {
                toggleVoice();
            }

            console.log(
                "NEXA AI: logo clicked and voice activated."
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

            if (voiceEnabled) {
                toggleVoice();
            }
        },

        toggle:
            toggleVoice,

        speak:
            speak,

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
