document.addEventListener("DOMContentLoaded", function () {

    const nexaLogo = document.getElementById("nexaAILogo");
    const nexaVoice = document.getElementById("nexaVoiceSession");
    const closeButton = document.getElementById("nexaVoiceSessionClose");

    if (!nexaLogo || !nexaVoice) {
        console.error("NEXA Voice: required elements not found.");
        return;
    }

    /* Open NEXA Voice */
    nexaLogo.addEventListener("click", function () {

        nexaVoice.classList.add("active");
        nexaVoice.setAttribute("aria-hidden", "false");

        console.log("NEXA Voice opened.");

    });

    /* Close NEXA Voice */
    if (closeButton) {

        closeButton.addEventListener("click", function () {

            nexaVoice.classList.remove("active");
            nexaVoice.setAttribute("aria-hidden", "true");

        });

    }

});
