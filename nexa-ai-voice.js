/* =========================================================
   NEXA VOICE
   One male voice assistant for the whole NEXA app
========================================================= */

document.addEventListener("DOMContentLoaded", function () {

    const logo = document.getElementById("nexaAILogo");

    if (!logo) {
        console.error("NEXA Voice: logo not found.");
        return;
    }


    /* =====================================================
       SPEECH RECOGNITION
    ===================================================== */

    const SpeechRecognition =
        window.SpeechRecognition ||
        window.webkitSpeechRecognition;

    if (!SpeechRecognition) {

        console.error(
            "NEXA Voice: speech recognition is not supported in this browser."
        );

        logo.title =
            "NEXA Voice is not supported in this browser";

        return;
    }


    const recognition = new SpeechRecognition();

    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;


    let listening = false;
    let speaking = false;


    /* =====================================================
       START LISTENING
    ===================================================== */

    function startListening() {

        if (listening || speaking) {
            return;
        }

        try {

            recognition.start();

        } catch (error) {

            console.error(
                "NEXA Voice could not start:",
                error
            );

        }
    }


    /* =====================================================
       LOGO CLICK
    ===================================================== */

    logo.addEventListener("click", function (event) {

        event.preventDefault();

        startListening();

    });


    /* =====================================================
       RECOGNITION STARTED
    ===================================================== */

    recognition.onstart = function () {

        listening = true;

        logo.classList.add(
            "nexa-voice-active"
        );

        logo.title =
            "NEXA Voice is listening...";

        console.log(
            "NEXA Voice is listening..."
        );

    };


    /* =====================================================
       SPEECH RESULT
    ===================================================== */

    recognition.onresult = async function (event) {

        const spokenText =
            event.results[0][0].transcript.trim();

        if (!spokenText) {
            return;
        }

        console.log(
            "You said:",
            spokenText
        );

        logo.classList.remove(
            "nexa-voice-active"
        );

        logo.title =
            "NEXA Voice is thinking...";


        await askNexa(spokenText);

    };


    /* =====================================================
       RECOGNITION ENDED
    ===================================================== */

    recognition.onend = function () {

        listening = false;

        if (!speaking) {

            logo.classList.remove(
                "nexa-voice-active"
            );

            logo.title =
                "Talk to NEXA Voice";

        }

    };


    /* =====================================================
       RECOGNITION ERROR
    ===================================================== */

    recognition.onerror = function (event) {

        console.error(
            "NEXA Voice error:",
            event.error
        );

        listening = false;

        logo.classList.remove(
            "nexa-voice-active"
        );

        logo.title =
            "Talk to NEXA Voice";

    };


    /* =====================================================
       SEND SPEECH TO NEXA AI
    ===================================================== */

    async function askNexa(message) {

        try {

            if (
                typeof nexaSupabase ===
                "undefined"
            ) {

                throw new Error(
                    "Supabase is not available."
                );

            }


            const {
                data,
                error
            } =
                await nexaSupabase.functions.invoke(
                    "nexa-ai",
                    {
                        body: {

                            message: message,

                            context: {

                                app: "NEXA",

                                assistant:
                                    "NEXA Voice",

                                page:
                                    document.title,

                                currentPage:
                                    window.location.pathname,

                                instruction:
                                    `
You are NEXA Voice, the male voice assistant
inside the NEXA social application.

You are friendly, natural and helpful.

Help the user with anything related to NEXA,
including messaging, profiles, people, settings,
games and navigating the application.

Keep answers conversational and reasonably short.

Do not claim an action happened unless the
application actually performed that action.
                                    `
                            }
                        }
                    }
                );


            if (error) {
                throw error;
            }


            const reply =
                data?.reply ||
                data?.message ||
                data?.response ||
                data?.text ||
                data?.content;


            if (!reply) {

                throw new Error(
                    "NEXA AI returned no response."
                );

            }


            console.log(
                "NEXA:",
                reply
            );


            speakNexa(reply);


        } catch (error) {

            console.error(
                "NEXA AI error:",
                error
            );


            speakNexa(
                "Sorry, I couldn't connect to NEXA right now."
            );

        }

    }


    /* =====================================================
       NEXA SPEAKS
    ===================================================== */

    function speakNexa(text) {

        window.speechSynthesis.cancel();

        const voice =
            new SpeechSynthesisUtterance(
                text
            );


        voice.lang = "en-US";

        voice.rate = 0.95;

        voice.pitch = 0.82;

        voice.volume = 1;


        const voices =
            window.speechSynthesis.getVoices();


        /*
         * Try to find an available male English voice.
         */

        const maleVoice =
            voices.find(function (item) {

                const name =
                    item.name.toLowerCase();

                const language =
                    item.lang.toLowerCase();

                return (
                    language.startsWith("en") &&
                    (
                        name.includes("male") ||
                        name.includes("david") ||
                        name.includes("mark") ||
                        name.includes("george") ||
                        name.includes("guy") ||
                        name.includes("daniel")
                    )
                );

            });


        if (maleVoice) {

            voice.voice =
                maleVoice;

        }


        speaking = true;


        logo.classList.add(
            "nexa-voice-speaking"
        );

        logo.title =
            "NEXA Voice is speaking...";


        voice.onend = function () {

            speaking = false;

            logo.classList.remove(
                "nexa-voice-speaking"
            );

            logo.title =
                "Talk to NEXA Voice";


            /*
             * Automatically listen again.
             * This creates the conversational
             * voice-assistant behavior.
             */

            setTimeout(
                startListening,
                250
            );

        };


        voice.onerror = function () {

            speaking = false;

            logo.classList.remove(
                "nexa-voice-speaking"
            );

            logo.title =
                "Talk to NEXA Voice";

        };


        window.speechSynthesis.speak(
            voice
        );

    }


    /* =====================================================
       LOAD AVAILABLE VOICES
    ===================================================== */

    window.speechSynthesis.onvoiceschanged =
        function () {

            window.speechSynthesis
                .getVoices();

        };


    console.log(
        "NEXA Voice loaded."
    );

});
