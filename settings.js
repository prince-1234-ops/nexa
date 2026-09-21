
/* =========================================================
   NEXA SETTINGS
   REAL SETTINGS SYSTEM
   Supabase + Auth + Persistent Preferences
========================================================= */

document.addEventListener("DOMContentLoaded", async () => {

    /* =====================================================
       SUPABASE
    ===================================================== */

    if (typeof nexaSupabase === "undefined") {
        console.error("NEXA Supabase is not available.");
        showToast("NEXA backend is not loaded.", "error");
        return;
    }


    /* =====================================================
       CURRENT USER
    ===================================================== */

    let currentUser = null;

    try {
        currentUser =
            JSON.parse(
                localStorage.getItem("nexaCurrentUser")
            );
    } catch (error) {
        console.error(
            "Could not read nexaCurrentUser:",
            error
        );
    }


    if (!currentUser) {
        window.location.href = "index.html";
        return;
    }


    /* =====================================================
       DOM
    ===================================================== */

    const backButton =
        document.getElementById("backButton");

    const profileImage =
        document.getElementById("profileImage");

    const profilePhotoInput =
        document.getElementById("profilePhotoInput");

    const changePhotoButton =
        document.getElementById("changePhotoButton");

    const profileName =
        document.getElementById("profileName");

    const profileUsername =
        document.getElementById("profileUsername");

    const editProfileButton =
        document.getElementById("editProfileButton");

    const editProfileItem =
        document.getElementById("editProfileItem");

    const profileModal =
        document.getElementById("profileModal");

    const closeProfileModal =
        document.getElementById("closeProfileModal");

    const nameInput =
        document.getElementById("nameInput");

    const usernameInput =
        document.getElementById("usernameInput");

    const saveProfileButton =
        document.getElementById("saveProfileButton");

    const themeButton =
        document.getElementById("themeButton");

    const themeText =
        document.getElementById("themeText");

    const themeModal =
        document.getElementById("themeModal");

    const closeThemeModal =
        document.getElementById("closeThemeModal");

    const themeOptions =
        document.querySelectorAll(".theme-option");

    const logoutButton =
        document.getElementById("logoutButton");

    const deleteAccountButton =
        document.getElementById("deleteAccountButton");

    const confirmModal =
        document.getElementById("confirmModal");

    const confirmTitle =
        document.getElementById("confirmTitle");

    const confirmText =
        document.getElementById("confirmText");

    const cancelConfirm =
        document.getElementById("cancelConfirm");

    const confirmAction =
        document.getElementById("confirmAction");

    const onlineStatusToggle =
        document.getElementById("onlineStatusToggle");

    const readReceiptsToggle =
        document.getElementById("readReceiptsToggle");

    const notificationsToggle =
        document.getElementById("notificationsToggle");

    const soundsToggle =
        document.getElementById("soundsToggle");

    const loginAlertsToggle =
        document.getElementById("loginAlertsToggle");

    const emailText =
        document.getElementById("emailText");


    /* =====================================================
       DETAIL MODAL
    ===================================================== */

    const settingsDetailModal =
        document.getElementById(
            "settingsDetailModal"
        );

    const closeSettingsDetailModal =
        document.getElementById(
            "closeSettingsDetailModal"
        );

    const detailModalIcon =
        document.getElementById(
            "detailModalIcon"
        );

    const detailModalTitle =
        document.getElementById(
            "detailModalTitle"
        );

    const detailModalDescription =
        document.getElementById(
            "detailModalDescription"
        );

    const detailModalBody =
        document.getElementById(
            "detailModalBody"
        );


    /* =====================================================
       DEFAULTS
    ===================================================== */

    const DEFAULT_AVATAR =
        "https://i.pravatar.cc/150?img=12";


    const DEFAULT_SETTINGS = {
        message_privacy: "everyone",
        profile_visibility: "public",

        online_status: true,
        read_receipts: true,

        notifications: true,
        sounds: true,
        call_notifications: true,

        theme: "royal-black",
        chat_wallpaper: null,
        font_size: "medium",

        login_alerts: true,

        message_sound: "classic"
    };


    let settings = {
        ...DEFAULT_SETTINGS
    };


    /* =====================================================
       TOAST
    ===================================================== */

    function showToast(
        message,
        type = "success"
    ) {

        let toast =
            document.getElementById(
                "nexaToast"
            );

        if (!toast) {

            toast =
                document.createElement(
                    "div"
                );

            toast.id =
                "nexaToast";

            Object.assign(
                toast.style,
                {
                    position: "fixed",
                    left: "50%",
                    bottom: "28px",
                    transform: "translateX(-50%)",
                    zIndex: "5000",
                    padding: "13px 18px",
                    borderRadius: "13px",
                    fontFamily: "Inter, sans-serif",
                    fontSize: "13px",
                    fontWeight: "600",
                    boxShadow:
                        "0 15px 40px rgba(0,0,0,.4)",
                    backdropFilter:
                        "blur(12px)",
                    transition:
                        "opacity .25s ease"
                }
            );

            document.body.appendChild(
                toast
            );
        }


        toast.textContent =
            message;


        toast.style.background =
            type === "error"
                ? "rgba(110,20,20,.95)"
                : "rgba(35,30,8,.96)";


        toast.style.color =
            type === "error"
                ? "#ffd4d4"
                : "#f4d77d";


        toast.style.border =
            type === "error"
                ? "1px solid rgba(255,100,100,.3)"
                : "1px solid rgba(212,175,55,.25)";


        toast.style.opacity =
            "1";


        clearTimeout(
            toast._hideTimer
        );


        toast._hideTimer =
            setTimeout(() => {

                toast.style.opacity =
                    "0";

            }, 3000);
    }


    /* =====================================================
       MODALS
    ===================================================== */

    function openModal(modal) {

        if (!modal) {
            return;
        }

        modal.classList.add(
            "active"
        );

        document.body.style.overflow =
            "hidden";
    }


    function closeModal(modal) {

        if (!modal) {
            return;
        }

        modal.classList.remove(
            "active"
        );

        if (
            !document.querySelector(
                ".modal-overlay.active"
            )
        ) {

            document.body.style.overflow =
                "";
        }
    }


    /* =====================================================
       PROFILE
    ===================================================== */

    function applyProfile(profile) {

        const safeProfile = {

            id:
                profile?.id ??
                currentUser.id,

            name:
                profile?.name ??
                currentUser.name ??
                "NEXA User",

            username:
                profile?.username ??
                currentUser.username ??
                "nexauser",

            profile_picture:
                profile?.profile_picture ??
                currentUser.profilePicture ??
                DEFAULT_AVATAR
        };


        profileName.textContent =
            safeProfile.name;


        profileUsername.textContent =
            `@${String(
                safeProfile.username
            ).replace(/^@/, "")}`;


        profileImage.src =
            safeProfile.profile_picture ||
            DEFAULT_AVATAR;


        nameInput.value =
            safeProfile.name;


        usernameInput.value =
            String(
                safeProfile.username
            ).replace(/^@/, "");


        currentUser.name =
            safeProfile.name;


        currentUser.username =
            safeProfile.username;


        currentUser.profilePicture =
            safeProfile.profile_picture;


        localStorage.setItem(
            "nexaCurrentUser",
            JSON.stringify(
                currentUser
            )
        );
    }


    async function loadProfile() {

        try {

            const {
                data,
                error
            } =
                await nexaSupabase
                    .from("profiles")
                    .select(
                        "id,name,username,profile_picture"
                    )
                    .eq(
                        "id",
                        String(
                            currentUser.id
                        )
                    )
                    .maybeSingle();


            if (error) {
                throw error;
            }


            applyProfile(
                data || currentUser
            );

        } catch (error) {

            console.error(
                "NEXA profile load error:",
                error
            );


            applyProfile(
                currentUser
            );
        }
    }


    /* =====================================================
       AUTH USER
    ===================================================== */

    async function loadAuthUser() {

        try {

            const {
                data,
                error
            } =
                await nexaSupabase
                    .auth
                    .getUser();


            if (error) {
                throw error;
            }


            if (data?.user) {

                if (data.user.email) {

                    emailText.textContent =
                        data.user.email;

                    currentUser.email =
                        data.user.email;
                }


                localStorage.setItem(
                    "nexaCurrentUser",
                    JSON.stringify(
                        currentUser
                    )
                );
            }

        } catch (error) {

            console.warn(
                "NEXA Auth user load failed:",
                error
            );


            if (currentUser.email) {

                emailText.textContent =
                    currentUser.email;
            }
        }
    }


    /* =====================================================
       SETTINGS — SUPABASE
    ===================================================== */

    async function ensureSettingsRecord() {

        const userId =
            String(
                currentUser.id
            );


        const {
            data,
            error
        } =
            await nexaSupabase
                .from("user_settings")
                .select("*")
                .eq(
                    "user_id",
                    userId
                )
                .maybeSingle();


        if (error) {
            throw error;
        }


        if (data) {

            settings = {
                ...DEFAULT_SETTINGS,
                ...data
            };

            return;
        }


        const {
            data: inserted,
            error: insertError
        } =
            await nexaSupabase
                .from("user_settings")
                .insert({
                    user_id: userId,
                    ...DEFAULT_SETTINGS
                })
                .select("*")
                .single();


        if (insertError) {
            throw insertError;
        }


        settings = {
            ...DEFAULT_SETTINGS,
            ...inserted
        };
    }


    async function saveSetting(
        key,
        value
    ) {

        settings[key] =
            value;


        const userId =
            String(
                currentUser.id
            );


        const {
            data,
            error
        } =
            await nexaSupabase
                .from("user_settings")
                .upsert(
                    {
                        user_id: userId,
                        [key]: value,
                        updated_at:
                            new Date()
                                .toISOString()
                    },
                    {
                        onConflict:
                            "user_id"
                    }
                )
                .select("*")
                .single();


        if (error) {
            throw error;
        }


        if (data) {

            settings = {
                ...settings,
                ...data
            };
        }


        localStorage.setItem(
            "nexaSettings",
            JSON.stringify(
                settings
            )
        );
    }


    /* =====================================================
       APPLY SETTINGS
    ===================================================== */

    function applyChatWallpaper(wallpaper) {

        if (wallpaper) {

            document.body.style.setProperty(
                "--nexa-wallpaper",
                `url("${wallpaper}")`
            );

            document.body.classList.add(
                "has-nexa-wallpaper"
            );

        } else {

            document.body.style.removeProperty(
                "--nexa-wallpaper"
            );

            document.body.classList.remove(
                "has-nexa-wallpaper"
            );
        }
    }

    function getThemeName(theme) {
        const names = {
            "royal-black": "Royal Black",
            "futuristic-blue": "Futuristic Blue",
            "cyber-purple": "Cyber Purple",
            "emerald": "Emerald",
            "crimson": "Crimson",
            "ocean": "Ocean",
            "sunset": "Sunset",
            "sakura": "Sakura",
            "cosmic": "Cosmic",
            "light": "Light"
        };

        return names[theme] || "Custom";
    }

    function getThemeName(theme) {

        const names = {
            "royal-black": "Royal Black",
            "futuristic-blue": "Futuristic Blue",
            "cyber-purple": "Cyber Purple",
            "emerald": "Emerald",
            "crimson": "Crimson",
            "ocean": "Ocean",
            "sunset": "Sunset",
            "sakura": "Sakura",
            "cosmic": "Cosmic",
            "light": "Light"
        };

        return names[theme] || "Custom";
    }


    function applyTheme(theme) {

        const safeTheme =
            theme || "royal-black";


        if (
            window.NEXATheme &&
            typeof window.NEXATheme.apply === "function"
        ) {

            window.NEXATheme.apply(
                safeTheme
            );

        } else {

            document.documentElement.setAttribute(
                "data-nexa-theme",
                safeTheme
            );
        }


        themeText.textContent =
            getThemeName(
                safeTheme
            );


        themeOptions.forEach(
            option => {

                option.classList.toggle(
                    "active",
                    option.dataset.theme ===
                    safeTheme
                );

            }
        );
    }


    /* =====================================================
       EDIT PROFILE
    ===================================================== */

    function openEditProfile() {

        nameInput.value =
            profileName.textContent;


        usernameInput.value =
            profileUsername.textContent
                .replace(/^@/, "");


        openModal(
            profileModal
        );
    }


    editProfileButton.addEventListener(
        "click",
        openEditProfile
    );


    editProfileItem.addEventListener(
        "click",
        openEditProfile
    );


    closeProfileModal.addEventListener(
        "click",
        () => {
            closeModal(
                profileModal
            );
        }
    );


    saveProfileButton.addEventListener(
        "click",
        async () => {

            const name =
                nameInput.value.trim();


            const username =
                usernameInput.value
                    .trim()
                    .replace(/^@+/, "");


            if (!name) {

                showToast(
                    "Enter your display name.",
                    "error"
                );

                return;
            }


            if (!username) {

                showToast(
                    "Enter a username.",
                    "error"
                );

                return;
            }


            if (
                !/^[a-zA-Z0-9._]+$/.test(
                    username
                )
            ) {

                showToast(
                    "Username can only contain letters, numbers, dots and underscores.",
                    "error"
                );

                return;
            }


            saveProfileButton.disabled =
                true;


            saveProfileButton.innerHTML =
                `<i class="fa-solid fa-spinner fa-spin"></i> Saving...`;


            try {

                const {
                    data,
                    error
                } =
                    await nexaSupabase
                        .from("profiles")
                        .update({
                            name,
                            username,
                            profile_picture:
                                profileImage.src
                        })
                        .eq(
                            "id",
                            String(
                                currentUser.id
                            )
                        )
                        .select(
                            "id,name,username,profile_picture"
                        )
                        .single();


                if (error) {
                    throw error;
                }


                applyProfile(
                    data
                );


                closeModal(
                    profileModal
                );


                showToast(
                    "Profile updated."
                );


            } catch (error) {

                console.error(
                    error
                );


                if (
                    error.code ===
                    "23505" ||
                    /duplicate|unique/i.test(
                        error.message || ""
                    )
                ) {

                    showToast(
                        "That username is already taken.",
                        "error"
                    );

                } else {

                    showToast(
                        error.message ||
                        "Could not update profile.",
                        "error"
                    );
                }

            } finally {

                saveProfileButton.disabled =
                    false;

                saveProfileButton.innerHTML =
                    `<i class="fa-solid fa-check"></i> Save Changes`;
            }
        }
    );


    /* =====================================================
       PROFILE PHOTO
    ===================================================== */

    changePhotoButton.addEventListener(
        "click",
        () => {

            profilePhotoInput.click();

        }
    );


    profilePhotoInput.addEventListener(
        "change",
        event => {

            const file =
                event.target.files?.[0];


            if (!file) {
                return;
            }


            if (
                !file.type.startsWith(
                    "image/"
                )
            ) {

                showToast(
                    "Please choose an image.",
                    "error"
                );

                return;
            }


            const reader =
                new FileReader();


            reader.onload =
                event => {

                    const img =
                        new Image();


                    img.onload = () => {

                        const max =
                            600;


                        let width =
                            img.width;


                        let height =
                            img.height;


                        if (
                            width >
                            max
                        ) {

                            height =
                                Math.round(
                                    height *
                                    max /
                                    width
                                );

                            width =
                                max;
                        }


                        if (
                            height >
                            max
                        ) {

                            width =
                                Math.round(
                                    width *
                                    max /
                                    height
                                );

                            height =
                                max;
                        }


                        const canvas =
                            document.createElement(
                                "canvas"
                            );


                        canvas.width =
                            width;


                        canvas.height =
                            height;


                        canvas
                            .getContext(
                                "2d"
                            )
                            .drawImage(
                                img,
                                0,
                                0,
                                width,
                                height
                            );


                        profileImage.src =
                            canvas.toDataURL(
                                "image/jpeg",
                                0.82
                            );


                        showToast(
                            "Photo selected. Save your profile to keep it."
                        );
                    };


                    img.src =
                        event.target.result;
                };


            reader.readAsDataURL(
                file
            );
        }
    );


    /* =====================================================
       THEME
    ===================================================== */

    themeButton.addEventListener(
        "click",
        () => {

            openModal(
                themeModal
            );
        }
    );


    closeThemeModal.addEventListener(
        "click",
        () => {

            closeModal(
                themeModal
            );
        }
    );


    themeOptions.forEach(option => {

        option.addEventListener(
            "click",
            async () => {

                const theme =
                    option.dataset.theme;


                try {

                    await saveSetting(
                        "theme",
                        theme
                    );


                    localStorage.setItem(
                        "nexa_theme",
                        theme
                    );


                    applyTheme(
                        theme
                    );


                    closeModal(
                        themeModal
                    );


                    showToast(
                        `${getThemeName(theme)} theme applied.`
                    );


                } catch (error) {

                    console.error(
                        "Theme save error:",
                        error
                    );


                    showToast(
                        error.message ||
                        "Could not save theme.",
                        "error"
                    );
                }

            }
        );

    });


    /* =====================================================
       SIMPLE TOGGLES
    ===================================================== */

    const toggleSettings = [
        [
            onlineStatusToggle,
            "online_status"
        ],
        [
            readReceiptsToggle,
            "read_receipts"
        ],
        [
            notificationsToggle,
            "notifications"
        ],
        [
            soundsToggle,
            "sounds"
        ],
        [
            loginAlertsToggle,
            "login_alerts"
        ]
    ];


    toggleSettings.forEach(
        ([element, key]) => {

            if (!element) {
                return;
            }


            element.addEventListener(
                "change",
                async () => {

                    try {

                        await saveSetting(
                            key,
                            element.checked
                        );


                        showToast(
                            `${formatLabel(key)} ${element.checked ? "enabled" : "disabled"}.`
                        );

                    } catch (
                    error
                    ) {

                        console.error(
                            error
                        );


                        element.checked =
                            !element.checked;


                        showToast(
                            "Could not save this setting.",
                            "error"
                        );
                    }
                }
            );
        }
    );


    function formatLabel(
        value
    ) {

        return value
            .replaceAll(
                "_",
                " "
            )
            .replace(
                /\b\w/g,
                letter =>
                    letter.toUpperCase()
            );
    }


    /* =====================================================
       DETAIL MODAL
    ===================================================== */

    function openDetail(
        title,
        description,
        icon,
        html
    ) {

        detailModalTitle.textContent =
            title;


        detailModalDescription.textContent =
            description;


        detailModalIcon.className =
            `fa-solid ${icon}`;


        detailModalBody.innerHTML =
            html;


        openModal(
            settingsDetailModal
        );
    }


    closeSettingsDetailModal.addEventListener(
        "click",
        () => {

            closeModal(
                settingsDetailModal
            );
        }
    );


    /* =====================================================
       MESSAGE PRIVACY
    ===================================================== */

    document
        .getElementById(
            "messagePrivacyButton"
        )
        ?.addEventListener(
            "click",
            () => {

                openDetail(
                    "Message Privacy",
                    "Choose who is allowed to start conversations with you.",
                    "fa-message",
                    `
                    <div class="detail-option-list">

                        ${createOption(
                        "everyone",
                        "Everyone",
                        "Anyone on NEXA can message you.",
                        "fa-globe"
                    )}

                        ${createOption(
                        "friends",
                        "Friends only",
                        "Only people in your friends list can message you.",
                        "fa-user-group"
                    )}

                        ${createOption(
                        "nobody",
                        "Nobody",
                        "Block new incoming conversations.",
                        "fa-ban"
                    )}

                    </div>
                    `
                );


                wireChoiceButtons(
                    "message_privacy"
                );
            }
        );


    /* =====================================================
       PROFILE VISIBILITY
    ===================================================== */

    document
        .getElementById(
            "profileVisibilityButton"
        )
        ?.addEventListener(
            "click",
            () => {

                openDetail(
                    "Profile Visibility",
                    "Control who can discover and view your profile.",
                    "fa-eye",
                    `
                    <div class="detail-option-list">

                        ${createOption(
                        "public",
                        "Public",
                        "Your profile can be viewed by NEXA users.",
                        "fa-earth-americas"
                    )}

                        ${createOption(
                        "friends",
                        "Friends only",
                        "Only your friends can see your profile.",
                        "fa-user-group"
                    )}

                        ${createOption(
                        "private",
                        "Private",
                        "Limit profile visibility.",
                        "fa-lock"
                    )}

                    </div>
                    `
                );


                wireChoiceButtons(
                    "profile_visibility"
                );
            }
        );


    /* =====================================================
       CALL NOTIFICATIONS
    ===================================================== */

    document
        .getElementById(
            "callNotificationsButton"
        )
        ?.addEventListener(
            "click",
            () => {

                openDetail(
                    "Call Notifications",
                    "Control notifications for incoming NEXA calls.",
                    "fa-phone",
                    `
                    <div class="detail-option-list">

                        ${createOption(
                        "true",
                        "Enabled",
                        "Show incoming call notifications.",
                        "fa-bell"
                    )}

                        ${createOption(
                        "false",
                        "Disabled",
                        "Silence call notifications.",
                        "fa-bell-slash"
                    )}

                    </div>
                    `
                );


                wireBooleanChoice(
                    "call_notifications"
                );
            }
        );


    /* =====================================================
       CHAT WALLPAPER
    ===================================================== */

    document
        .getElementById(
            "chatWallpaperButton"
        )
        ?.addEventListener(
            "click",
            () => {

                openDetail(
                    "Chat Wallpaper",
                    "Choose the background used for your NEXA chat experience.",
                    "fa-comments",
                    `
                    <div
                        class="wallpaper-preview"
                        id="wallpaperPreview"
                    ></div>

                    <label
                        class="detail-upload"
                        for="wallpaperFileInput"
                    >
                        <i class="fa-solid fa-image"></i>
                        &nbsp; Choose an image
                    </label>

                    <input
                        id="wallpaperFileInput"
                        type="file"
                        accept="image/*"
                        hidden
                    >

                    <button
                        class="detail-primary-button"
                        id="removeWallpaperButton"
                        type="button"
                    >
                        Remove Wallpaper
                    </button>
                    `
                );


                const preview =
                    document.getElementById(
                        "wallpaperPreview"
                    );


                if (
                    settings.chat_wallpaper
                ) {

                    preview.style.backgroundImage =
                        `url("${settings.chat_wallpaper}")`;
                }


                document
                    .getElementById(
                        "wallpaperFileInput"
                    )
                    .addEventListener(
                        "change",
                        event => {

                            const file =
                                event.target.files?.[0];


                            if (!file) {
                                return;
                            }


                            const reader =
                                new FileReader();


                            reader.onload =
                                async event => {

                                    try {

                                        const image =
                                            event.target.result;


                                        preview.style
                                            .backgroundImage =
                                            `url("${image}")`;


                                        await saveSetting(
                                            "chat_wallpaper",
                                            image
                                        );


                                        applyChatWallpaper(
                                            image
                                        );


                                        showToast(
                                            "Wallpaper saved."
                                        );

                                    } catch (
                                    error
                                    ) {

                                        console.error(
                                            error
                                        );


                                        showToast(
                                            "Could not save wallpaper.",
                                            "error"
                                        );
                                    }
                                };


                            reader.readAsDataURL(
                                file
                            );
                        }
                    );


                document
                    .getElementById(
                        "removeWallpaperButton"
                    )
                    .addEventListener(
                        "click",
                        async () => {

                            try {

                                await saveSetting(
                                    "chat_wallpaper",
                                    null
                                );


                                applyChatWallpaper(
                                    null
                                );


                                closeModal(
                                    settingsDetailModal
                                );


                                showToast(
                                    "Wallpaper removed."
                                );

                            } catch (
                            error
                            ) {

                                showToast(
                                    "Could not remove wallpaper.",
                                    "error"
                                );
                            }
                        }
                    );
            }
        );


    /* =====================================================
       FONT SIZE
    ===================================================== */

    document
        .getElementById(
            "fontSizeButton"
        )
        ?.addEventListener(
            "click",
            () => {

                openDetail(
                    "Font Size",
                    "Choose the text size you prefer throughout NEXA.",
                    "fa-text-height",
                    `
                    <div class="detail-option-list">

                        ${createOption(
                        "small",
                        "Small",
                        "Compact text.",
                        "fa-minus"
                    )}

                        ${createOption(
                        "medium",
                        "Medium",
                        "Recommended NEXA size.",
                        "fa-equals"
                    )}

                        ${createOption(
                        "large",
                        "Large",
                        "Larger and easier to read.",
                        "fa-plus"
                    )}

                    </div>
                    `
                );


                wireChoiceButtons(
                    "font_size"
                );
            }
        );


    /* =====================================================
       ACTIVE SESSIONS
    ===================================================== */

    document
        .getElementById(
            "activeSessionsButton"
        )
        ?.addEventListener(
            "click",
            async () => {

                let email =
                    emailText.textContent ||
                    "Authenticated NEXA account";


                openDetail(
                    "Active Sessions",
                    "Manage the session used on this device.",
                    "fa-mobile-screen-button",
                    `
                    <div class="session-card">

                        <strong>
                            This device
                        </strong>

                        <span>
                            ${escapeHtml(email)}
                        </span>

                        <br>

                        <span>
                            Current browser session
                        </span>

                    </div>

                    <button
                        class="detail-primary-button"
                        id="signOutOtherSessionsButton"
                        type="button"
                    >
                        Sign Out Other Sessions
                    </button>
                    `
                );


                document
                    .getElementById(
                        "signOutOtherSessionsButton"
                    )
                    .addEventListener(
                        "click",
                        async () => {

                            try {

                                const {
                                    error
                                } =
                                    await nexaSupabase
                                        .auth
                                        .signOut({
                                            scope:
                                                "others"
                                        });


                                if (error) {
                                    throw error;
                                }


                                showToast(
                                    "Other NEXA sessions were signed out."
                                );

                            } catch (
                            error
                            ) {

                                console.error(
                                    error
                                );


                                showToast(
                                    error.message ||
                                    "Could not sign out other sessions.",
                                    "error"
                                );
                            }
                        }
                    );
            }
        );


    /* =====================================================
       TWO FACTOR
    ===================================================== */

    document
        .getElementById(
            "twoFactorButton"
        )
        ?.addEventListener(
            "click",
            async () => {

                openDetail(
                    "Two-Factor Authentication",
                    "Protect your NEXA account with an additional authentication step.",
                    "fa-shield",
                    `
                    <div class="detail-info-box">
                        NEXA can use Supabase Auth's multi-factor
                        authentication features here. The current
                        status below is based on your authentication
                        account.
                    </div>

                    <div
                        class="session-card"
                        id="mfaStatusBox"
                    >
                        Checking security status...
                    </div>
                    `
                );


                const statusBox =
                    document.getElementById(
                        "mfaStatusBox"
                    );


                try {

                    if (
                        nexaSupabase.auth &&
                        typeof nexaSupabase
                            .auth
                            .mfa
                            ?.listFactors ===
                        "function"
                    ) {

                        const {
                            data,
                            error
                        } =
                            await nexaSupabase
                                .auth
                                .mfa
                                .listFactors();


                        if (error) {
                            throw error;
                        }


                        const factors =
                            data?.totp || [];


                        const verified =
                            factors.filter(
                                factor =>
                                    factor.status ===
                                    "verified"
                            );


                        if (
                            verified.length
                        ) {

                            statusBox.innerHTML =
                                `
                                <strong>
                                    2FA is enabled
                                </strong>
                                <span>
                                    Your account has a verified authentication factor.
                                </span>
                                `;

                        } else {

                            statusBox.innerHTML =
                                `
                                <strong>
                                    2FA is not enabled
                                </strong>
                                <span>
                                    No verified authentication factor was found.
                                </span>
                                `;
                        }

                    } else {

                        statusBox.innerHTML =
                            `
                            <strong>
                                Authentication status unavailable
                            </strong>
                            <span>
                                Your current Supabase client does not expose the MFA API.
                            </span>
                            `;
                    }

                } catch (
                error
                ) {

                    console.error(
                        error
                    );


                    statusBox.innerHTML =
                        `
                        <strong>
                            Could not check 2FA
                        </strong>
                        <span>
                            ${escapeHtml(
                            error.message ||
                            "Unknown error"
                        )}
                        </span>
                        `;
                }
            }
        );


    /* =====================================================
       PRIVACY POLICY
    ===================================================== */

    document
        .getElementById(
            "privacyPolicyButton"
        )
        ?.addEventListener(
            "click",
            () => {

                openDetail(
                    "Privacy Policy",
                    "How NEXA handles user information.",
                    "fa-file-shield",
                    `
                    <div class="detail-info-box">
                        NEXA's privacy policy page can be connected
                        here when your final privacy document is ready.
                    </div>

                    <button
                        class="detail-primary-button"
                        type="button"
                        onclick="location.href='privacy.html'"
                    >
                        Open Privacy Policy
                    </button>
                    `
                );
            }
        );


    /* =====================================================
       TERMS
    ===================================================== */

    document
        .getElementById(
            "termsButton"
        )
        ?.addEventListener(
            "click",
            () => {

                openDetail(
                    "Terms of Service",
                    "The rules governing use of NEXA.",
                    "fa-file-lines",
                    `
                    <div class="detail-info-box">
                        Your final NEXA Terms of Service can be
                        linked here when the legal document is ready.
                    </div>

                    <button
                        class="detail-primary-button"
                        type="button"
                        onclick="location.href='terms.html'"
                    >
                        Open Terms
                    </button>
                    `
                );
            }
        );


    /* =====================================================
       ABOUT NEXA
    ===================================================== */

    document
        .getElementById(
            "aboutNexaButton"
        )
        ?.addEventListener(
            "click",
            () => {

                openDetail(
                    "About NEXA",
                    "Your NEXA social experience.",
                    "fa-crown",
                    `
                    <div class="detail-info-box">

                        <strong>
                            NEXA
                        </strong>

                        <br><br>

                        Connect. Share. Belong.

                        <br><br>

                        Version:
                        <strong>
                            1.0
                        </strong>

                    </div>
                    `
                );
            }
        );


    /* =====================================================
       CHOICE HELPERS
    ===================================================== */

    function createOption(
        value,
        title,
        description,
        icon
    ) {

        const active =
            String(
                settings[
                getCurrentChoiceKey()
                ]
            ) ===
            String(value);


        return `
            <button
                type="button"
                class="detail-option ${active ? "active" : ""}"
                data-choice="${escapeAttribute(value)}"
            >

                <div class="detail-option-icon">
                    <i class="fa-solid ${icon}"></i>
                </div>

                <div class="detail-option-content">

                    <strong>
                        ${escapeHtml(title)}
                    </strong>

                    <span>
                        ${escapeHtml(description)}
                    </span>

                </div>

                <i class="fa-solid fa-check detail-check"></i>

            </button>
        `;
    }


    let currentChoiceKey =
        "message_privacy";


    function getCurrentChoiceKey() {
        return currentChoiceKey;
    }


    function wireChoiceButtons(
        key
    ) {

        currentChoiceKey =
            key;


        /*
         * Re-rendering the options is easier
         * after setting the active key.
         */
        const buttons =
            detailModalBody.querySelectorAll(
                ".detail-option"
            );


        buttons.forEach(
            button => {

                button.classList.toggle(
                    "active",
                    String(
                        button.dataset.choice
                    ) ===
                    String(
                        settings[key]
                    )
                );


                button.addEventListener(
                    "click",
                    async () => {

                        const value =
                            button.dataset.choice;


                        try {

                            await saveSetting(
                                key,
                                value
                            );


                            buttons.forEach(
                                item =>
                                    item.classList.remove(
                                        "active"
                                    )
                            );


                            button.classList.add(
                                "active"
                            );


                            showToast(
                                `${formatLabel(key)} updated.`
                            );

                        } catch (
                        error
                        ) {

                            console.error(
                                error
                            );


                            showToast(
                                error.message ||
                                "Could not save setting.",
                                "error"
                            );
                        }
                    }
                );
            }
        );
    }


    function wireBooleanChoice(
        key
    ) {

        const buttons =
            detailModalBody.querySelectorAll(
                ".detail-option"
            );


        buttons.forEach(
            button => {

                button.classList.toggle(
                    "active",
                    String(
                        settings[key]
                    ) ===
                    String(
                        button.dataset.choice
                    )
                );


                button.addEventListener(
                    "click",
                    async () => {

                        const value =
                            button.dataset.choice ===
                            "true";


                        try {

                            await saveSetting(
                                key,
                                value
                            );


                            buttons.forEach(
                                item =>
                                    item.classList.remove(
                                        "active"
                                    )
                            );


                            button.classList.add(
                                "active"
                            );


                            showToast(
                                `Call notifications ${value ? "enabled" : "disabled"}.`
                            );

                        } catch (
                        error
                        ) {

                            showToast(
                                "Could not save setting.",
                                "error"
                            );
                        }
                    }
                );
            }
        );
    }


    /* =====================================================
       ESCAPE HELPERS
    ===================================================== */

    function escapeHtml(
        value
    ) {

        return String(
            value ?? ""
        )
            .replaceAll(
                "&",
                "&amp;"
            )
            .replaceAll(
                "<",
                "&lt;"
            )
            .replaceAll(
                ">",
                "&gt;"
            )
            .replaceAll(
                '"',
                "&quot;"
            )
            .replaceAll(
                "'",
                "&#039;"
            );
    }


    function escapeAttribute(
        value
    ) {

        return escapeHtml(
            value
        );
    }


    /* =====================================================
       PASSWORD
    ===================================================== */

    const passwordModal =
        document.getElementById(
            "passwordModal"
        );

    const closePasswordModal =
        document.getElementById(
            "closePasswordModal"
        );

    const oldPasswordInput =
        document.getElementById(
            "oldPasswordInput"
        );

    const newPasswordInput =
        document.getElementById(
            "newPasswordInput"
        );

    const confirmPasswordInput =
        document.getElementById(
            "confirmPasswordInput"
        );

    const signOutOtherDevicesToggle =
        document.getElementById(
            "signOutOtherDevicesToggle"
        );

    const changePasswordSubmit =
        document.getElementById(
            "changePasswordSubmit"
        );


    function openPasswordModal() {

        oldPasswordInput.value = "";
        newPasswordInput.value = "";
        confirmPasswordInput.value = "";

        signOutOtherDevicesToggle.checked =
            true;

        openModal(
            passwordModal
        );

        setTimeout(
            () => {
                oldPasswordInput.focus();
            },
            100
        );
    }


    closePasswordModal?.addEventListener(
        "click",
        () => {

            closeModal(
                passwordModal
            );
        }
    );


    document
        .getElementById(
            "changePasswordButton"
        )
        ?.addEventListener(
            "click",
            openPasswordModal
        );


    changePasswordSubmit?.addEventListener(
        "click",
        async () => {

            const oldPassword =
                oldPasswordInput.value;

            const newPassword =
                newPasswordInput.value;

            const confirmPassword =
                confirmPasswordInput.value;


            if (!oldPassword) {

                showToast(
                    "Enter your current password.",
                    "error"
                );

                oldPasswordInput.focus();

                return;
            }


            if (newPassword.length < 6) {

                showToast(
                    "New password must be at least 6 characters.",
                    "error"
                );

                newPasswordInput.focus();

                return;
            }


            if (newPassword !== confirmPassword) {

                showToast(
                    "The new passwords do not match.",
                    "error"
                );

                confirmPasswordInput.focus();

                return;
            }


            if (
                oldPassword ===
                newPassword
            ) {

                showToast(
                    "Your new password must be different from the current password.",
                    "error"
                );

                return;
            }


            changePasswordSubmit.disabled =
                true;

            changePasswordSubmit.innerHTML =
                `
            <i class="fa-solid fa-spinner fa-spin"></i>
            Verifying...
            `;


            try {

                /*
                 * Get the currently authenticated user.
                 */

                const {
                    data: userData,
                    error: userError
                } =
                    await nexaSupabase
                        .auth
                        .getUser();


                if (userError) {
                    throw userError;
                }


                const email =
                    userData?.user?.email ||
                    currentUser.email;


                if (!email) {

                    throw new Error(
                        "Your account email could not be found."
                    );
                }


                /*
                 * Re-authenticate using the
                 * current password.
                 */

                const {
                    error: loginError
                } =
                    await nexaSupabase
                        .auth
                        .signInWithPassword({
                            email,
                            password:
                                oldPassword
                        });


                if (loginError) {

                    throw new Error(
                        "Current password is incorrect."
                    );
                }


                changePasswordSubmit.innerHTML =
                    `
                <i class="fa-solid fa-spinner fa-spin"></i>
                Changing password...
                `;


                /*
                 * Update the password.
                 */

                const {
                    error: passwordError
                } =
                    await nexaSupabase
                        .auth
                        .updateUser({
                            password:
                                newPassword
                        });


                if (passwordError) {
                    throw passwordError;
                }


                /*
                 * Optionally sign out all
                 * OTHER sessions.
                 */

                if (
                    signOutOtherDevicesToggle
                        .checked
                ) {

                    const {
                        error:
                        sessionError
                    } =
                        await nexaSupabase
                            .auth
                            .signOut({
                                scope:
                                    "others"
                            });


                    if (sessionError) {
                        console.warn(
                            "Could not sign out other sessions:",
                            sessionError
                        );
                    }
                }


                oldPasswordInput.value =
                    "";

                newPasswordInput.value =
                    "";

                confirmPasswordInput.value =
                    "";


                closeModal(
                    passwordModal
                );


                showToast(
                    signOutOtherDevicesToggle.checked
                        ? "Password changed and other devices were signed out."
                        : "Password changed successfully."
                );


            } catch (
            error
            ) {

                console.error(
                    "NEXA password change error:",
                    error
                );


                showToast(
                    error.message ||
                    "Could not change your password.",
                    "error"
                );


            } finally {

                changePasswordSubmit.disabled =
                    false;

                changePasswordSubmit.innerHTML =
                    `
                <i class="fa-solid fa-shield-check"></i>
                Change Password
                `;
            }
        }
    );


    /* =====================================================
       EMAIL
    ===================================================== */

    document
        .getElementById(
            "emailButton"
        )
        ?.addEventListener(
            "click",
            async () => {

                const newEmail =
                    prompt(
                        "Enter your new email:",
                        emailText.textContent || ""
                    );


                if (
                    newEmail ===
                    null
                ) {
                    return;
                }


                const email =
                    newEmail.trim();


                if (
                    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
                        email
                    )
                ) {

                    showToast(
                        "Enter a valid email address.",
                        "error"
                    );

                    return;
                }


                try {

                    const {
                        error
                    } =
                        await nexaSupabase
                            .auth
                            .updateUser({
                                email
                            });


                    if (error) {
                        throw error;
                    }


                    currentUser.email =
                        email;


                    localStorage.setItem(
                        "nexaCurrentUser",
                        JSON.stringify(
                            currentUser
                        )
                    );


                    emailText.textContent =
                        email;


                    showToast(
                        "Email change requested. Check your email for confirmation."
                    );

                } catch (
                error
                ) {

                    console.error(
                        error
                    );


                    showToast(
                        error.message ||
                        "Could not change email.",
                        "error"
                    );
                }
            }
        );


    /* =====================================================
       LOGOUT
    ===================================================== */

    let pendingAction =
        null;


    function openConfirm(
        title,
        text,
        action
    ) {

        confirmTitle.textContent =
            title;


        confirmText.textContent =
            text;


        pendingAction =
            action;


        openModal(
            confirmModal
        );
    }


    logoutButton.addEventListener(
        "click",
        () => {

            openConfirm(
                "Log Out?",
                "You'll be signed out of this NEXA session.",
                "logout"
            );

        }
    );


    deleteAccountButton.addEventListener(
        "click",
        () => {

            openConfirm(
                "Delete Account?",
                "Account deletion requires a protected server-side workflow. It is not activated yet.",
                "delete"
            );

        }
    );


    cancelConfirm.addEventListener(
        "click",
        () => {

            pendingAction =
                null;


            closeModal(
                confirmModal
            );
        }
    );


    confirmAction.addEventListener(
        "click",
        async () => {

            if (
                pendingAction ===
                "logout"
            ) {

                try {

                    confirmAction.disabled =
                        true;


                    const {
                        error
                    } =
                        await nexaSupabase
                            .auth
                            .signOut({
                                scope:
                                    "local"
                            });


                    if (error) {
                        throw error;
                    }


                    localStorage.removeItem(
                        "nexaCurrentUser"
                    );


                    localStorage.removeItem(
                        "nexaSettings"
                    );


                    window.location.href =
                        "index.html";

                } catch (
                error
                ) {

                    console.error(
                        error
                    );


                    confirmAction.disabled =
                        false;


                    showToast(
                        error.message ||
                        "Could not log out.",
                        "error"
                    );
                }


            } else if (
                pendingAction ===
                "delete"
            ) {

                closeModal(
                    confirmModal
                );


                showToast(
                    "Delete Account is protected until the server-side deletion flow is added.",
                    "error"
                );
            }

        }
    );


    /* =====================================================
       MODAL OUTSIDE CLICK
    ===================================================== */

    document
        .querySelectorAll(
            ".modal-overlay"
        )
        .forEach(
            overlay => {

                overlay.addEventListener(
                    "click",
                    event => {

                        if (
                            event.target ===
                            overlay
                        ) {

                            closeModal(
                                overlay
                            );
                        }
                    }
                );
            }
        );


    /* =====================================================
       ESC
    ===================================================== */

    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key !==
                "Escape"
            ) {
                return;
            }


            document
                .querySelectorAll(
                    ".modal-overlay.active"
                )
                .forEach(
                    modal => {

                        closeModal(
                            modal
                        );
                    }
                );
        }
    );


    /* =====================================================
       BACK
    ===================================================== */

    backButton.addEventListener(
        "click",
        () => {

            if (
                window.history.length >
                1
            ) {

                window.history.back();

            } else {

                window.location.href =
                    "home.html";
            }
        }
    );


    /* =====================================================
       INITIALIZE
    ===================================================== */

    try {

        await ensureSettingsRecord();

        await loadProfile();

        await loadAuthUser();

        applyTheme(
            settings.theme || "royal-black"
        );


        localStorage.setItem(
            "nexaSettings",
            JSON.stringify(
                settings
            )
        );


    } catch (
    error
    ) {

        console.error(
            "NEXA settings initialization error:",
            error
        );


        /*
         * Fall back to local cached settings
         * when the network is unavailable.
         */
        try {

            const cached =
                JSON.parse(
                    localStorage.getItem(
                        "nexaSettings"
                    )
                );


            if (cached) {

                settings = {
                    ...DEFAULT_SETTINGS,
                    ...cached
                };
            }

        } catch (_) { }


        applyAllSettings();


        showToast(
            "Some settings could not be synchronized with NEXA.",
            "error"
        );
    }

});
