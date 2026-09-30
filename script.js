/* =========================================
   NEXA LOGIN / REGISTER
   SUPABASE AUTHENTICATION
   ========================================= */

// -----------------------------------------
// SUPABASE CONFIG
// -----------------------------------------

const SUPABASE_URL = "https://pakdneudwsxtanrkirmu.supabase.co";

// IMPORTANT:
// Put your PUBLIC Supabase publishable/anon key here.
// NEVER use the service_role key in browser code.
const SUPABASE_KEY = "YOUR_SUPABASE_PUBLISHABLE_KEY";

const { createClient } = window.supabase;

const supabaseClient = createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);


// -----------------------------------------
// ELEMENTS
// -----------------------------------------

const authForm = document.getElementById("authForm");

const fullNameInput = document.getElementById("fullName");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const confirmPasswordInput =
    document.getElementById("confirmPassword");

const submitButton = document.getElementById("submitButton");
const buttonText = document.getElementById("buttonText");
const buttonIcon = document.getElementById("buttonIcon");
const loadingSpinner = document.getElementById("loadingSpinner");

const passwordToggle =
    document.getElementById("passwordToggle");

const forgotButton =
    document.getElementById("forgotButton");

const switchButton =
    document.getElementById("switchButton");

const switchText =
    document.getElementById("switchText");

const authMessage =
    document.getElementById("authMessage");

const formTitle =
    document.getElementById("formTitle");

const formSubtitle =
    document.getElementById("formSubtitle");

const formEyebrow =
    document.getElementById("formEyebrow");

const registerFields =
    document.querySelectorAll(".register-only");


// -----------------------------------------
// STATE
// -----------------------------------------

let isRegisterMode = false;


// -----------------------------------------
// SHOW MESSAGE
// -----------------------------------------

function showMessage(message, type = "error") {

    authMessage.textContent = message;

    authMessage.className = `auth-message show ${type}`;
}


// -----------------------------------------
// CLEAR MESSAGE
// -----------------------------------------

function clearMessage() {

    authMessage.textContent = "";

    authMessage.className = "auth-message";
}


// -----------------------------------------
// LOADING
// -----------------------------------------

function setLoading(isLoading) {

    submitButton.disabled = isLoading;

    if (isLoading) {
        submitButton.classList.add("loading");
    } else {
        submitButton.classList.remove("loading");
    }
}


// -----------------------------------------
// SWITCH LOGIN / REGISTER
// -----------------------------------------

function updateAuthMode() {

    clearMessage();

    if (isRegisterMode) {

        formEyebrow.textContent = "JOIN NEXA";

        formTitle.textContent = "Create account";

        formSubtitle.textContent =
            "Create your NEXA account and start connecting.";

        buttonText.textContent =
            "Create my NEXA account";

        buttonIcon.className =
            "fa-solid fa-user-plus";

        switchText.textContent =
            "Already have an account?";

        switchButton.textContent =
            "Sign in";

        forgotButton.style.display = "none";

        registerFields.forEach((field) => {
            field.classList.remove("hidden");
        });

        passwordInput.setAttribute(
            "autocomplete",
            "new-password"
        );

    } else {

        formEyebrow.textContent = "WELCOME BACK";

        formTitle.textContent = "Sign in";

        formSubtitle.textContent =
            "Enter your details to continue to NEXA.";

        buttonText.textContent =
            "Sign in to NEXA";

        buttonIcon.className =
            "fa-solid fa-arrow-right";

        switchText.textContent =
            "Don't have an account?";

        switchButton.textContent =
            "Create account";

        forgotButton.style.display = "block";

        registerFields.forEach((field) => {
            field.classList.add("hidden");
        });

        passwordInput.setAttribute(
            "autocomplete",
            "current-password"
        );
    }

    authForm.reset();
}


// -----------------------------------------
// PASSWORD VISIBILITY
// -----------------------------------------

passwordToggle.addEventListener("click", () => {

    const isPassword =
        passwordInput.type === "password";

    passwordInput.type =
        isPassword ? "text" : "password";

    passwordToggle.innerHTML = isPassword
        ? '<i class="fa-regular fa-eye-slash"></i>'
        : '<i class="fa-regular fa-eye"></i>';

    passwordToggle.setAttribute(
        "aria-label",
        isPassword ? "Hide password" : "Show password"
    );
});


// -----------------------------------------
// SWITCH BUTTON
// -----------------------------------------

switchButton.addEventListener("click", () => {

    isRegisterMode = !isRegisterMode;

    updateAuthMode();
});


// -----------------------------------------
// VALIDATE
// -----------------------------------------

function validateForm() {

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email) {
        showMessage("Please enter your email address.");
        emailInput.focus();
        return false;
    }

    if (!email.includes("@")) {
        showMessage("Please enter a valid email address.");
        emailInput.focus();
        return false;
    }

    if (!password) {
        showMessage("Please enter your password.");
        passwordInput.focus();
        return false;
    }

    if (password.length < 6) {
        showMessage(
            "Your password must contain at least 6 characters."
        );
        passwordInput.focus();
        return false;
    }

    if (isRegisterMode) {

        const fullName =
            fullNameInput.value.trim();

        const confirmPassword =
            confirmPasswordInput.value;

        if (!fullName) {
            showMessage("Please enter your full name.");
            fullNameInput.focus();
            return false;
        }

        if (confirmPassword !== password) {
            showMessage("Your passwords do not match.");
            confirmPasswordInput.focus();
            return false;
        }
    }

    return true;
}


// -----------------------------------------
// LOGIN / REGISTER
// -----------------------------------------

authForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    clearMessage();

    if (!validateForm()) {
        return;
    }

    setLoading(true);

    const email =
        emailInput.value.trim().toLowerCase();

    const password =
        passwordInput.value;

    try {

        // ---------------------------------
        // REGISTER
        // ---------------------------------

        if (isRegisterMode) {

            const fullName =
                fullNameInput.value.trim();

            const { data, error } =
                await supabaseClient.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            full_name: fullName
                        }
                    }
                });

            if (error) {
                throw error;
            }

            // Email confirmation enabled
            if (!data.session) {

                showMessage(
                    "Account created. Check your email to confirm your account before signing in.",
                    "success"
                );

                authForm.reset();

                setLoading(false);

                return;
            }

            // Session returned immediately
            showMessage(
                "Account created successfully. Welcome to NEXA!",
                "success"
            );

            setTimeout(() => {
                window.location.href = "home.html";
            }, 800);

            return;
        }


        // ---------------------------------
        // LOGIN
        // ---------------------------------

        const { data, error } =
            await supabaseClient.auth.signInWithPassword({
                email,
                password
            });

        if (error) {
            throw error;
        }

        if (!data.session) {
            throw new Error(
                "Login succeeded but no session was created."
            );
        }

        showMessage(
            "Welcome back to NEXA.",
            "success"
        );

        setTimeout(() => {
            window.location.href = "home.html";
        }, 700);

    } catch (error) {

        console.error("NEXA Auth Error:", error);

        let message =
            "Something went wrong. Please try again.";

        if (error.message) {
            message = error.message;
        }

        // Friendlier Supabase messages
        if (
            message.toLowerCase().includes("invalid login")
        ) {
            message =
                "Incorrect email or password.";
        }

        if (
            message.toLowerCase().includes("email not confirmed")
        ) {
            message =
                "Please confirm your email before signing in.";
        }

        if (
            message.toLowerCase().includes("already registered")
        ) {
            message =
                "This email is already registered. Try signing in.";
        }

        showMessage(message);

    } finally {

        setLoading(false);
    }
});


// -----------------------------------------
// FORGOT PASSWORD
// -----------------------------------------

forgotButton.addEventListener("click", async () => {

    const email =
        emailInput.value.trim().toLowerCase();

    clearMessage();

    if (!email) {

        showMessage(
            "Enter your email address first, then click Forgot password."
        );

        emailInput.focus();

        return;
    }

    if (!email.includes("@")) {

        showMessage(
            "Please enter a valid email address."
        );

        emailInput.focus();

        return;
    }

    forgotButton.disabled = true;

    try {

        const redirectUrl =
            `${window.location.origin}${window.location.pathname
                .replace(/\/[^/]*$/, "")}/reset-password.html`;

        const { error } =
            await supabaseClient.auth.resetPasswordForEmail(
                email,
                {
                    redirectTo: redirectUrl
                }
            );

        if (error) {
            throw error;
        }

        showMessage(
            "Password reset instructions have been sent to your email.",
            "success"
        );

    } catch (error) {

        console.error(
            "NEXA Password Reset Error:",
            error
        );

        showMessage(
            error.message ||
            "Unable to send the password reset email."
        );

    } finally {

        forgotButton.disabled = false;
    }
});


// -----------------------------------------
// CHECK EXISTING SESSION
// -----------------------------------------

async function checkExistingSession() {

    try {

        const { data, error } =
            await supabaseClient.auth.getSession();

        if (error) {
            console.error(error);
            return;
        }

        if (data.session) {
            window.location.href = "home.html";
        }

    } catch (error) {

        console.error(
            "Session check failed:",
            error
        );
    }
}


// -----------------------------------------
// AUTH STATE
// -----------------------------------------

supabaseClient.auth.onAuthStateChange(
    (event, session) => {

        console.log(
            "NEXA Auth:",
            event
        );

        if (
            event === "SIGNED_IN" &&
            session
        ) {
            window.location.href = "home.html";
        }
    }
);


// -----------------------------------------
// START
// -----------------------------------------

updateAuthMode();

checkExistingSession();
