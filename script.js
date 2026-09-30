
/* =========================================================
   NEXA AUTH
   Clean Supabase registration + login
   NEXA VERIFY
   - Login only works for existing accounts (real email/username + password)
   - If the user has been away 14+ days, a 6-digit code is sent to their
     email (or phone, if the account has one) before they get in.
   Load this AFTER script.js and supabase.js.
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
(function () {
    'use strict';

    /* ---------- settings (change these) ---------- */
    const INACTIVE_DAYS = 14;               // how long away before asking for a code
    const REDIRECT_AFTER_LOGIN = 'home.html'; // <-- put your real page here
    const PROFILES_TABLE = 'profiles';      // table with id, username, email, last_active (see notes)
    const RESEND_SECONDS = 60;
    const LS_KEY = 'nexa_last_active';

    /* ---------- find your existing Supabase client ---------- */
    function getClient() {
        const candidates = [];
        try { candidates.push(window.supabaseClient); } catch (e) {}
        try { candidates.push(window.sb); } catch (e) {}
        try { candidates.push(window._supabase); } catch (e) {}
        try { candidates.push(typeof supabaseClient !== 'undefined' ? supabaseClient : null); } catch (e) {}
        try { candidates.push(typeof supabase !== 'undefined' ? supabase : null); } catch (e) {}
        try { candidates.push(typeof sb !== 'undefined' ? sb : null); } catch (e) {}
        return candidates.find(c => c && c.auth && typeof c.auth.signInWithPassword === 'function') || null;
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
    /* ---------- elements ---------- */
    const $ = (id) => document.getElementById(id);
    const msgBox = $('message');
    const loginSection = $('loginSection');
    const verifySection = $('verifySection');
    const loginForm = $('loginForm');
    const verifyForm = $('verifyForm');
    const codeBoxes = Array.from(document.querySelectorAll('.code-box'));
    const methodSwitch = $('methodSwitch');
    const resendBtn = $('resendCode');

    let pending = { email: null, phone: null, method: 'email' };
    let resendTimer = null;

    /* ---------- helpers ---------- */
    function show(text, type) {
        if (!msgBox) return;
        msgBox.className = 'auth-message ' + (type || '');
        msgBox.textContent = text || '';
    }

    if (loginSection) {

        loginSection.style.display =
            "block";
    function mask(email) {
        const [n, d] = email.split('@');
        return n.slice(0, 2) + '•••@' + d;
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
    function maskPhone(p) {
        return '•••• ' + String(p).slice(-3);
    }

    if (registerSection) {

        registerSection.style.display =
            "block";
    function daysSince(dateStr) {
        const t = new Date(dateStr).getTime();
        if (!t) return 0;
        return (Date.now() - t) / 86400000;
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
    /* ---------- last-active tracking ---------- */
    async function touch() {
        localStorage.setItem(LS_KEY, new Date().toISOString());
        const client = getClient();
        if (!client) return;
        try {
            const { data } = await client.auth.getUser();
            if (data && data.user) {
                await client.from(PROFILES_TABLE)
                    .update({ last_active: new Date().toISOString() })
                    .eq('id', data.user.id);
            }
        } catch (e) { /* column may not exist yet — localStorage still works */ }
    }

    return true;
}


/* =========================================================
   REGISTER
   ========================================================= */
    async function getLastActive(client, userId) {
        try {
            const { data } = await client.from(PROFILES_TABLE)
                .select('last_active').eq('id', userId).maybeSingle();
            if (data && data.last_active) return data.last_active;
        } catch (e) {}
        return localStorage.getItem(LS_KEY);
    }

if (registerForm) {
    /* ---------- turn a username into an email ---------- */
    async function resolveEmail(client, identifier) {
        identifier = identifier.trim();
        if (identifier.includes('@') && !identifier.startsWith('@')) return identifier.toLowerCase();

        const username = identifier.replace(/^@/, '').toLowerCase();
        try {
            const { data } = await client.from(PROFILES_TABLE)
                .select('email').eq('username', username).maybeSingle();
            if (data && data.email) return data.email;
        } catch (e) {}
        return null;
    }

    registerForm.addEventListener(
        "submit",
        async event => {
    /* ---------- LOGIN (runs before script.js's own handler) ---------- */
    async function handleLogin(e) {
        e.preventDefault();
        e.stopImmediatePropagation();

            event.preventDefault();
        const client = getClient();
        if (!client) {
            show('Connection problem. Please refresh and try again.', 'error');
            return;
        }

        const identifier = $('loginEmail').value;
        const password = $('loginPassword').value;
        const btn = loginForm.querySelector('button[type="submit"]');
        btn.disabled = true;
        show('Checking your account…', '');

            if (!checkSupabase()) {
        try {
            const email = await resolveEmail(client, identifier);
            if (!email) {
                show("We couldn't find an account with that email or username.", 'error');
                return;
            }

            const { data, error } = await client.auth.signInWithPassword({ email, password });

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

            if (error) {
                const m = (error.message || '').toLowerCase();
                if (m.includes('not confirmed')) {
                    show('Please confirm your email first — check your inbox.', 'error');
                } else {
                    show("That email and password don't match an existing account.", 'error');
                }
                return;
            }

            const user = data.user;
            const last = await getLastActive(client, user.id);

            if (
                password.length < 6
            ) {

                showMessage(
                    "Password must be at least 6 characters.",
                    "error"
                );

            // away too long -> require a code before letting them in
            if (last && daysSince(last) >= INACTIVE_DAYS) {
                pending = { email: user.email || email, phone: user.phone || null, method: 'email' };
                await client.auth.signOut();          // no access until the code is verified
                await startVerification();
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

                /* =====================================================
   CREATE NEXA PROFILE IN SUPABASE
   ===================================================== */

if (data.user) {

    const {
        error: profileError
    } =
        await nexaSupabase
            .from("profiles")
            .insert({

                id:
                    data.user.id,

                name:
                    name,

                username:
                    username,

                email:
                    email,

                bio:
                    "",

                profile_picture:
                    "",

                friends:
                    []
            });


    if (profileError) {

        console.error(
            "NEXA profile creation error:",
            profileError
        );

        showMessage(
            "Account was created, but your NEXA profile could not be created.",
            "error"
        );

        return;
    }

    console.log(
        "NEXA profile created:",
        data.user.id
    );
}


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
            await touch();
            show('Welcome back ✦', 'success');
            setTimeout(() => (window.location.href = REDIRECT_AFTER_LOGIN), 500);
        } catch (err) {
            show('Something went wrong. Please try again.', 'error');
        } finally {
            btn.disabled = false;
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
    }

            event.preventDefault();
    /* ---------- VERIFICATION ---------- */
    async function startVerification() {
        loginSection.style.display = 'none';
        verifySection.style.display = 'block';
        methodSwitch.style.display = pending.phone ? 'flex' : 'none';
        setMethod('email', false);
        await sendCode();
    }

    function setMethod(method, send) {
        pending.method = method;
        document.querySelectorAll('.method-btn').forEach(b =>
            b.classList.toggle('active', b.dataset.method === method));
        const sub = $('verifySubtitle');
        sub.textContent = method === 'phone'
            ? 'We sent a 6-digit code by SMS to ' + maskPhone(pending.phone) + '.'
            : 'We sent a 6-digit code to ' + mask(pending.email) + '.';
        if (send) sendCode();
    }

            if (!checkSupabase()) {
    async function sendCode() {
        const client = getClient();
        clearCode();
        show('Sending your code…', '');
        try {
            const payload = pending.method === 'phone'
                ? { phone: pending.phone, options: { shouldCreateUser: false } }
                : { email: pending.email, options: { shouldCreateUser: false } };
            const { error } = await client.auth.signInWithOtp(payload);
            if (error) {
                show(error.message || "We couldn't send the code. Try again shortly.", 'error');
                return;
            }
            show('Code sent. It expires in a few minutes.', 'success');
            startCooldown();
            codeBoxes[0].focus();
        } catch (err) {
            show("We couldn't send the code. Try again shortly.", 'error');
        }
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

    async function handleVerify(e) {
        e.preventDefault();
        const token = codeBoxes.map(b => b.value).join('');
        if (token.length !== 6) {
            show('Enter all 6 digits.', 'error');
            return;
        }
        const client = getClient();
        const btn = verifyForm.querySelector('button[type="submit"]');
        btn.disabled = true;
        show('Verifying…', '');

        try {
            const args = pending.method === 'phone'
                ? { phone: pending.phone, token, type: 'sms' }
                : { email: pending.email, token, type: 'email' };
            const { error } = await client.auth.verifyOtp(args);

            if (error) {
                show('That code is wrong or has expired.', 'error');
                $('codeRow').classList.remove('shake');
                void $('codeRow').offsetWidth;
                $('codeRow').classList.add('shake');
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
            await touch();
            show('Verified. Welcome back ✦', 'success');
            setTimeout(() => (window.location.href = REDIRECT_AFTER_LOGIN), 500);
        } catch (err) {
            show('Something went wrong. Please try again.', 'error');
        } finally {
            btn.disabled = false;
        }
    );
}

    }

/* =========================================================
   STARTUP
   ========================================================= */
    function startCooldown() {
        let left = RESEND_SECONDS;
        resendBtn.disabled = true;
        clearInterval(resendTimer);
        resendTimer = setInterval(() => {
            left--;
            resendBtn.textContent = left > 0 ? 'Resend code (' + left + 's)' : 'Resend code';
            if (left <= 0) { clearInterval(resendTimer); resendBtn.disabled = false; }
        }, 1000);
        resendBtn.textContent = 'Resend code (' + left + 's)';
    }

console.log(
    "NEXA Supabase authentication system loaded."
);
    function clearCode() {
        codeBoxes.forEach(b => { b.value = ''; b.classList.remove('filled'); });
    }

console.log(
    "NEXA Supabase URL:",
    SUPABASE_URL
);
    /* ---------- 6-box code input behaviour ---------- */
    codeBoxes.forEach((box, i) => {
        box.addEventListener('input', () => {
            box.value = box.value.replace(/\D/g, '').slice(0, 1);
            box.classList.toggle('filled', !!box.value);
            if (box.value && i < 5) codeBoxes[i + 1].focus();
            if (codeBoxes.every(b => b.value)) verifyForm.requestSubmit();
        });
        box.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !box.value && i > 0) codeBoxes[i - 1].focus();
            if (e.key === 'ArrowLeft' && i > 0) codeBoxes[i - 1].focus();
            if (e.key === 'ArrowRight' && i < 5) codeBoxes[i + 1].focus();
        });
        box.addEventListener('paste', (e) => {
            const text = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '').slice(0, 6);
            if (!text) return;
            e.preventDefault();
            text.split('').forEach((d, k) => { codeBoxes[k].value = d; codeBoxes[k].classList.add('filled'); });
            codeBoxes[Math.min(text.length, 5)].focus();
            if (text.length === 6) verifyForm.requestSubmit();
        });
    });

    /* ---------- wire up ---------- */
    // capture phase on document => runs before script.js's own submit handler
    document.addEventListener('submit', (e) => {
        if (e.target && e.target.id === 'loginForm') handleLogin(e);
    }, true);

    verifyForm.addEventListener('submit', handleVerify);
    resendBtn.addEventListener('click', sendCode);

    document.querySelectorAll('.method-btn').forEach(b =>
        b.addEventListener('click', () => setMethod(b.dataset.method, true)));

    $('cancelVerify').addEventListener('click', () => {
        verifySection.style.display = 'none';
        loginSection.style.display = 'block';
        clearInterval(resendTimer);
        show('', '');
    });

    // use NexaVerify.touch() on your other pages (home, feed…) to keep "last active" fresh
    window.NexaVerify = { touch };
})();
