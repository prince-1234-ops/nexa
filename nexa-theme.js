/* =========================================================
   NEXA GLOBAL THEME ENGINE
========================================================= */

(function () {

    "use strict";


    const DEFAULT_THEME =
        "royal-black";


    const THEME_KEY =
        "nexa_theme";


    const BACKGROUND_KEY =
        "nexa_custom_background";


    function getStoredTheme() {

        return (
            localStorage.getItem(
                THEME_KEY
            ) ||
            DEFAULT_THEME
        );
    }


    function getStoredBackground() {

        return (
            localStorage.getItem(
                BACKGROUND_KEY
            ) ||
            ""
        );
    }


    function applyTheme(
        theme,
        customBackground = null
    ) {

        const safeTheme =
            theme ||
            DEFAULT_THEME;


        document.documentElement
            .setAttribute(
                "data-nexa-theme",
                safeTheme
            );


        if (
            customBackground
        ) {

            document.documentElement
                .classList.add(
                    "has-nexa-custom-background"
                );


            document.documentElement
                .style
                .setProperty(
                    "--nexa-theme-background-image",
                    `url("${customBackground}")`
                );

        } else {

            document.documentElement
                .classList.remove(
                    "has-nexa-custom-background"
                );


            document.documentElement
                .style
                .removeProperty(
                    "--nexa-theme-background-image"
                );
        }
    }


    /*
     * Apply immediately.
     * This reduces the visible flash before
     * the page's normal JavaScript loads.
     */

    const initialTheme =
        getStoredTheme();


    const initialBackground =
        getStoredBackground();


    applyTheme(
        initialTheme,
        initialBackground
    );


    /*
     * Public API for Settings and other pages.
     */

    window.NEXATheme = {

        get() {
            return getStoredTheme();
        },


        getBackground() {
            return getStoredBackground();
        },


        apply(theme) {

            localStorage.setItem(
                THEME_KEY,
                theme
            );


            applyTheme(
                theme,
                getStoredBackground()
            );
        },


        setBackground(
            dataUrl
        ) {

            if (!dataUrl) {

                localStorage.removeItem(
                    BACKGROUND_KEY
                );

                applyTheme(
                    getStoredTheme(),
                    null
                );

                return;
            }


            localStorage.setItem(
                BACKGROUND_KEY,
                dataUrl
            );


            applyTheme(
                getStoredTheme(),
                dataUrl
            );
        },


        clearBackground() {

            localStorage.removeItem(
                BACKGROUND_KEY
            );


            applyTheme(
                getStoredTheme(),
                null
            );
        },


        reset() {

            localStorage.removeItem(
                THEME_KEY
            );

            localStorage.removeItem(
                BACKGROUND_KEY
            );


            applyTheme(
                DEFAULT_THEME,
                null
            );
        }
    };

})();
