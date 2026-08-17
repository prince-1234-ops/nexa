/* =========================================================
   NEXA AUTH
   Clean Supabase registration + login
   ========================================================= */


/* =========================================================
   DOM
   ========================================================= */

const loginSection =
    document.getElementById("loginSection");

const registerSection =
    document.getElementById("registerSection");

const showRegister =
    document.getElementById("showRegister");

const showLogin =
    document.getElementById("showLogin");

const loginForm =
    document.getElementById("loginForm");

const registerForm =
    document.getElementById("registerForm");

const message =
    document.getElementById("message");


/* =========================================================
   MESSAGE
   ========================================================= */

function showMessage(
    text,
    type = ""
) {

    if (!message) {
        return;
    }

    message.textContent =
        text;

    message.className =
        "message " + type;
}


/* =========================================================
   SHOW LOGIN
   ========================================================= */

function showLoginSection() {

    if (registerSection) {

        registerSection.style.display =
            "none";
    }

    if (loginSection) {

        loginSection.style.display =
            "block";
    }

    showMessage(
        "",
        ""
    );
}


/* =========================================================
   SHOW REGISTER
   ========================================================= */

function showRegisterSection() {

    if (loginSection) {

        loginSection.style.display =
            "none";
    }

    if (registerSection) {

        registerSection.style.display =
            "block";
    }

    showMessage(
        "",
        ""
    );
}


/* =========================================================
   SWITCH TO REGISTER
   ========================================================= */

if (showRegister) {

    showRegister.addEventListener(
        "click",
        event => {

            event.preventDefault();

            showRegisterSection();
        }
    );
}


/* =========================================================
   SWITCH TO LOGIN
   ========================================================= */

if (showLogin) {

    showLogin.addEventListener(
        "click",
        event => {

            event.preventDefault();

            showLoginSection();
        }
    );
}


/* =========================================================
   CHECK SUPABASE
   ========================================================= */

function checkSupabase() {

    if (
        typeof nexaSupabase ===
        "undefined"
    ) {

        console.error(
            "NEXA: nexaSupabase is not available."
        );

        showMessage(
            "NEXA connection is not ready.",
            "error"
        );

        return false;
    }

    return true;
}


/* =========================================================
   REGISTER
   ========================================================= */

if (registerForm) {

    registerForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            if (!checkSupabase()) {
                return;
            }


            const nameInput =
                document.getElementById(
                    "registerName"
                );

            const usernameInput =
                document.getElementById(
                    "registerUsername"
                );

            const emailInput =
                document.getElementById(
                    "registerEmail"
                );

            const passwordInput =
                document.getElementById(
                    "registerPassword"
                );


            const name =
                nameInput
                    ? nameInput.value.trim()
                    : "";

            const username =
                usernameInput
                    ? usernameInput.value.trim()
                    : "";

            const email =
                emailInput
                    ? emailInput.value
                        .trim()
                        .toLowerCase()
                    : "";

            const password =
                passwordInput
                    ? passwordInput.value
                    : "";


            /* -----------------------------------------
               VALIDATION
            ----------------------------------------- */

            if (
                !name ||
                !username ||
                !email ||
                !password
            ) {

                showMessage(
                    "Please fill in all the fields.",
                    "error"
                );

                return;
            }


            if (
                password.length < 6
            ) {

                showMessage(
                    "Password must be at least 6 characters.",
                    "error"
                );

                return;
            }


            /* -----------------------------------------
               BUTTON
            ----------------------------------------- */

            const submitButton =
                registerForm.querySelector(
                    'button[type="submit"]'
                );


            if (submitButton) {

                submitButton.disabled =
                    true;

                submitButton.innerHTML =
                    `
                    <span>Creating account...</span>
                    <span class="button-arrow">→</span>
                    `;
            }


            showMessage(
                "Creating your NEXA account...",
                "success"
            );


            try {

                /* -------------------------------------
                   CREATE SUPABASE AUTH ACCOUNT
                ------------------------------------- */

                const {
                    data,
                    error
                } =
                    await nexaSupabase.auth.signUp({

                        email,

                        password,

                        options: {

                            data: {

                                name,

                                username
                            }
                        }
                    });


                if (error) {

                    console.error(
                        "NEXA registration error:",
                        error
                    );

                    showMessage(
                        error.message ||
                        "Could not create your account.",
                        "error"
                    );

                    return;
                }


                /* -------------------------------------
                   SUCCESS
                ------------------------------------- */

                console.log(
                    "NEXA account created:",
                    data.user
                );


                /*
                 * Supabase is our new authentication
                 * system.
                 *
                 * Save a lightweight local copy for
                 * the current frontend while we build
                 * the rest of NEXA.
                 */

                if (data.user) {

                    localStorage.setItem(
                        "nexaCurrentUser",
                        JSON.stringify({

                            id:
                                data.user.id,

                            email:
                                data.user.email,

                            name,

                            username
                        })
                    );
                }


                showMessage(
                    "Account created successfully! Welcome to NEXA.",
                    "success"
                );


                registerForm.reset();


                /*
                 * Wait briefly so the user can see
                 * the success message.
                 */

                setTimeout(
                    () => {

                        window.location.href =
                            "home.html";

                    },
                    900
                );


            } catch (error) {

                console.error(
                    "NEXA registration request failed:",
                    error
                );

                showMessage(
                    "Could not create your account.",
                    "error"
                );

            } finally {

                if (submitButton) {

                    submitButton.disabled =
                        false;

                    submitButton.innerHTML =
                        `
                        <span>Create Account</span>
                        <span class="button-arrow">→</span>
                        `;
                }
            }
        }
    );
}


/* =========================================================
   LOGIN
   ========================================================= */

if (loginForm) {

    loginForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            if (!checkSupabase()) {
                return;
            }


            const loginInput =
                document.getElementById(
                    "loginEmail"
                );

            const passwordInput =
                document.getElementById(
                    "loginPassword"
                );


            const email =
                loginInput
                    ? loginInput.value
                        .trim()
                        .toLowerCase()
                    : "";

            const password =
                passwordInput
                    ? passwordInput.value
                    : "";


            if (
                !email ||
                !password
            ) {

                showMessage(
                    "Please enter your email and password.",
                    "error"
                );

                return;
            }


            const submitButton =
                loginForm.querySelector(
                    'button[type="submit"]'
                );


            if (submitButton) {

                submitButton.disabled =
                    true;

                submitButton.innerHTML =
                    `
                    <span>Logging in...</span>
                    <span class="button-arrow">→</span>
                    `;
            }


            showMessage(
                "Logging you into NEXA...",
                "success"
            );


            try {

                const {
                    data,
                    error
                } =
                    await nexaSupabase.auth.signInWithPassword({

                        email,

                        password
                    });


                if (error) {

                    console.error(
                        "NEXA login error:",
                        error
                    );

                    showMessage(
                        error.message ||
                        "Incorrect email or password.",
                        "error"
                    );

                    return;
                }


                console.log(
                    "NEXA login successful:",
                    data.user
                );


                /*
                 * Keep the current authenticated
                 * user available to the frontend.
                 */

                if (data.user) {

                    const metadata =
                        data.user.user_metadata ||
                        {};


                    localStorage.setItem(
                        "nexaCurrentUser",
                        JSON.stringify({

                            id:
                                data.user.id,

                            email:
                                data.user.email,

                            name:
                                metadata.name ||
                                "",

                            username:
                                metadata.username ||
                                ""
                        })
                    );
                }


                showMessage(
                    "Login successful. Welcome back!",
                    "success"
                );


                loginForm.reset();


                setTimeout(
                    () => {

                        window.location.href =
                            "home.html";

                    },
                    700
                );


            } catch (error) {

                console.error(
                    "NEXA login request failed:",
                    error
                );

                showMessage(
                    "Could not log you in.",
                    "error"
                );

            } finally {

                if (submitButton) {

                    submitButton.disabled =
                        false;

                    submitButton.innerHTML =
                        `
                        <span>Log In</span>
                        <span class="button-arrow">→</span>
                        `;
                }
            }
        }
    );
}


/* =========================================================
   STARTUP
   ========================================================= */

console.log(
    "NEXA Supabase authentication system loaded."
);

console.log(
    "NEXA Supabase URL:",
    SUPABASE_URL
);