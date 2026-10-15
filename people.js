/* =========================================================
   NEXA — people.js (complete, rewritten)
   Works with the people.html you shared.
   Friends are stored in their own table: nexa_friends
   (no more updating other users' rows in "profiles").
========================================================= */

(function () {
    "use strict";

    /* ---------- Supabase client ---------- */
    function getClient() {
        try { if (typeof supabaseClient !== "undefined" && supabaseClient.from) return supabaseClient; } catch (e) {}
        try { if (typeof supabase !== "undefined" && supabase.from) return supabase; } catch (e) {}
        try { if (typeof db !== "undefined" && db.from) return db; } catch (e) {}
        if (window.supabaseClient && window.supabaseClient.from) return window.supabaseClient;
        if (window.supabase && window.supabase.from) return window.supabase;
        return null;
    }

    const client = getClient();

    /* ---------- DOM ---------- */
    const $ = (id) => document.getElementById(id);

    const els = {
        sidebarAvatar: $("sidebarAvatar"),
        sidebarUserName: $("sidebarUserName"),
        sidebarUsername: $("sidebarUsername"),
        miniAvatar: $("miniAvatar"),
        mobileProfileAvatar: $("mobileProfileAvatar"),
        myProfileAvatar: $("myProfileAvatar"),
        myProfileName: $("myProfileName"),
        myProfileUsername: $("myProfileUsername"),
        myProfileBio: $("myProfileBio"),
        searchInput: $("searchInput"),
        searchButton: $("searchPeopleButton"),
        clearButton: $("clearSearchButton"),
        searchStatus: $("searchStatus"),
        peopleCount: $("peopleCount"),
        usersList: $("usersList"),
        emptyPeople: $("emptyPeople"),
        loading: $("peopleLoading"),
        notifications: $("notificationArea"),
        logout: $("logoutButton")
    };

    /* ---------- State ---------- */
    const state = {
        me: null,
        myProfile: null,
        people: [],
        iAdded: new Set(),     // people I added
        addedMe: new Set(),    // people who added me
        busy: new Set(),       // ids currently being toggled
        query: ""
    };

    /* ---------- Helpers ---------- */
    function esc(value) {
        return String(value == null ? "" : value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function personName(p) {
        return p.full_name || p.name || p.display_name || p.username || "NEXA User";
    }

    function personUsername(p) {
        return p.username ? "@" + String(p.username).replace(/^@/, "") : "";
    }

    function personAvatarUrl(p) {
        return p.avatar_url || p.avatar || p.photo_url || p.profile_image || "";
    }

    function initial(p) {
        return personName(p).trim().charAt(0).toUpperCase() || "N";
    }

    function setAvatar(el, p) {
        if (!el) return;
        const url = personAvatarUrl(p);
        if (url) {
            el.textContent = "";
            el.style.backgroundImage = 'url("' + url.replace(/"/g, "%22") + '")';
            el.style.backgroundSize = "cover";
            el.style.backgroundPosition = "center";
        } else {
            el.style.backgroundImage = "";
            el.textContent = initial(p);
        }
    }

    function notify(message, type) {
        if (!els.notifications) return;
        const item = document.createElement("div");
        item.className = "notification " + (type || "info");
        item.textContent = message;
        item.style.cssText =
            "background:#111;color:#fff;border:1px solid " +
            (type === "error" ? "#ff5a5a" : "#d4af37") +
            ";padding:12px 16px;border-radius:12px;margin-top:8px;font-size:14px;" +
            "box-shadow:0 8px 24px rgba(0,0,0,.4);";
        els.notifications.appendChild(item);
        setTimeout(() => item.remove(), 3200);
    }

    function setLoading(on) {
        if (els.loading) els.loading.hidden = !on;
    }

    /* ---------- Auth ---------- */
    async function requireUser() {
        const { data, error } = await client.auth.getSession();
        if (error || !data || !data.session) {
            window.location.href = "index.html";
            return null;
        }
        return data.session.user;
    }

    /* ---------- Data ---------- */
    async function loadMyProfile() {
        const { data, error } = await client
            .from("profiles")
            .select("*")
            .eq("id", state.me.id)
            .maybeSingle();

        if (error) console.error("NEXA my profile error:", error.message, error.code);

        state.myProfile = data || {
            id: state.me.id,
            full_name: (state.me.user_metadata && state.me.user_metadata.full_name) || "NEXA User",
            username: state.me.email ? state.me.email.split("@")[0] : "nexauser"
        };

        const p = state.myProfile;
        if (els.sidebarUserName) els.sidebarUserName.textContent = personName(p);
        if (els.sidebarUsername) els.sidebarUsername.textContent = personUsername(p) || "@nexauser";
        if (els.myProfileName) els.myProfileName.textContent = personName(p);
        if (els.myProfileUsername) els.myProfileUsername.textContent = personUsername(p) || "@nexauser";
        if (els.myProfileBio) els.myProfileBio.textContent = p.bio || "No bio yet.";

        setAvatar(els.sidebarAvatar, p);
        setAvatar(els.miniAvatar, p);
        setAvatar(els.mobileProfileAvatar, p);
        setAvatar(els.myProfileAvatar, p);
    }

    async function loadPeople() {
        const { data, error } = await client
            .from("profiles")
            .select("*")
            .neq("id", state.me.id)
            .limit(500);

        if (error) {
            console.error("NEXA people load error:", error.message, error.code);
            notify("Couldn't load people.", "error");
            state.people = [];
            return;
        }
        state.people = data || [];
    }

    async function loadFriends() {
        const me = state.me.id;
        const { data, error } = await client
            .from("nexa_friends")
            .select("user_id, friend_id")
            .or("user_id.eq." + me + ",friend_id.eq." + me);

        if (error) {
            console.error("NEXA friends load error:", error.message, error.code, error.hint);
            if (error.code === "42P01" || error.code === "PGRST205") {
                notify("Friends table missing. Run the SQL in Supabase first.", "error");
            }
            return;
        }

        state.iAdded = new Set();
        state.addedMe = new Set();
        (data || []).forEach((row) => {
            if (row.user_id === me) state.iAdded.add(row.friend_id);
            if (row.friend_id === me) state.addedMe.add(row.user_id);
        });
    }

    /* ---------- Friend toggle ---------- */
    async function toggleFriend(targetId) {
        if (state.busy.has(targetId)) return;
        state.busy.add(targetId);

        const me = state.me.id;
        const wasAdded = state.iAdded.has(targetId);

        // optimistic UI
        if (wasAdded) state.iAdded.delete(targetId);
        else state.iAdded.add(targetId);
        render();

        let error = null;

        if (wasAdded) {
            ({ error } = await client
                .from("nexa_friends")
                .delete()
                .eq("user_id", me)
                .eq("friend_id", targetId));
        } else {
            ({ error } = await client
                .from("nexa_friends")
                .insert({ user_id: me, friend_id: targetId }));

            // already exists (double click / other tab) is not a real failure
            if (error && error.code === "23505") error = null;
        }

        state.busy.delete(targetId);

        if (error) {
            console.error("NEXA friend error:", error.message, error.details, error.hint, error.code);
            // roll back
            if (wasAdded) state.iAdded.add(targetId);
            else state.iAdded.delete(targetId);
            render();
            notify("Couldn't update friend. Try again.", "error");
            return;
        }

        const person = state.people.find((p) => p.id === targetId);
        const name = person ? personName(person) : "this person";
        if (wasAdded) notify("Removed " + name + ".");
        else if (state.addedMe.has(targetId)) notify("You and " + name + " are now friends.");
        else notify("Friend request sent to " + name + ".");
    }

    /* ---------- Render ---------- */
    function friendState(id) {
        const mine = state.iAdded.has(id);
        const theirs = state.addedMe.has(id);
        if (mine && theirs) return "friends";
        if (mine) return "requested";
        if (theirs) return "incoming";
        return "none";
    }

    function buttonLabel(s) {
        if (s === "friends") return "Friends ✓";
        if (s === "requested") return "Requested";
        if (s === "incoming") return "Accept";
        return "Add friend";
    }

    function filtered() {
        const q = state.query.trim().toLowerCase();
        if (!q) return state.people;
        return state.people.filter((p) => {
            return (
                personName(p).toLowerCase().includes(q) ||
                String(p.username || "").toLowerCase().includes(q) ||
                String(p.bio || "").toLowerCase().includes(q)
            );
        });
    }

    function cardHTML(p) {
        const s = friendState(p.id);
        const url = personAvatarUrl(p);
        const avatarStyle = url
            ? ' style="background-image:url(&quot;' + esc(url) + '&quot;);background-size:cover;background-position:center;"'
            : "";
        const avatarText = url ? "" : esc(initial(p));

        return (
            '<article class="user-card person-card" data-id="' + esc(p.id) + '">' +
                '<a class="user-avatar person-avatar" href="profile.html?id=' + encodeURIComponent(p.id) + '"' + avatarStyle + ">" +
                    avatarText +
                "</a>" +
                '<div class="user-info person-info">' +
                    '<a class="user-name" href="profile.html?id=' + encodeURIComponent(p.id) + '">' + esc(personName(p)) + "</a>" +
                    '<span class="user-username">' + esc(personUsername(p)) + "</span>" +
                    '<p class="user-bio">' + esc(p.bio || "No bio yet.") + "</p>" +
                "</div>" +
                '<div class="user-actions person-actions">' +
                    '<button type="button" class="friend-button add-friend-button ' + s + '" data-action="friend" data-id="' + esc(p.id) + '">' +
                        buttonLabel(s) +
                    "</button>" +
                    '<a class="message-button" href="messages.html?user=' + encodeURIComponent(p.id) + '">Message</a>' +
                "</div>" +
            "</article>"
        );
    }

    function render() {
        const list = filtered();

        if (els.peopleCount) {
            els.peopleCount.textContent =
                state.people.length + (state.people.length === 1 ? " person" : " people");
        }

        if (els.searchStatus) {
            els.searchStatus.textContent = state.query.trim()
                ? list.length + (list.length === 1 ? " result" : " results") + ' for "' + state.query.trim() + '"'
                : "";
        }

        if (els.clearButton) els.clearButton.hidden = !state.query;

        if (els.emptyPeople) els.emptyPeople.hidden = list.length > 0;

        if (els.usersList) {
            els.usersList.innerHTML = list.map(cardHTML).join("");
        }
    }

    /* ---------- Events ---------- */
    function bindEvents() {
        if (els.usersList) {
            els.usersList.addEventListener("click", (event) => {
                const btn = event.target.closest('[data-action="friend"]');
                if (!btn) return;
                toggleFriend(btn.getAttribute("data-id"));
            });
        }

        let timer = null;
        if (els.searchInput) {
            els.searchInput.addEventListener("input", () => {
                clearTimeout(timer);
                timer = setTimeout(() => {
                    state.query = els.searchInput.value;
                    render();
                }, 150);
            });

            els.searchInput.addEventListener("keydown", (event) => {
                if (event.key === "Enter") {
                    state.query = els.searchInput.value;
                    render();
                }
            });
        }

        if (els.searchButton) {
            els.searchButton.addEventListener("click", () => {
                state.query = els.searchInput ? els.searchInput.value : "";
                render();
            });
        }

        if (els.clearButton) {
            els.clearButton.addEventListener("click", () => {
                state.query = "";
                if (els.searchInput) {
                    els.searchInput.value = "";
                    els.searchInput.focus();
                }
                render();
            });
        }

        if (els.logout) {
            els.logout.addEventListener("click", async () => {
                await client.auth.signOut();
                window.location.href = "index.html";
            });
        }
    }

    /* ---------- Minimal fallback styles (only for the buttons/cards
       this file creates; your people.css still wins if it defines them) ---------- */
    function injectFallbackStyles() {
        const style = document.createElement("style");
        style.textContent =
            ".friend-button{cursor:pointer;border:1px solid #d4af37;background:#d4af37;color:#111;" +
            "font-weight:600;padding:9px 16px;border-radius:999px;font-size:14px;transition:.2s}" +
            ".friend-button.requested,.friend-button.friends{background:transparent;color:#d4af37}" +
            ".friend-button:hover{opacity:.85}" +
            ".message-button{margin-left:8px;color:#fff;text-decoration:none;border:1px solid #333;" +
            "padding:9px 16px;border-radius:999px;font-size:14px}";
        document.head.appendChild(style);
    }

    /* ---------- Init ---------- */
    async function init() {
        if (!client) {
            console.error("NEXA: Supabase client not found. Check supabase.js defines your client.");
            notify("Supabase isn't connected.", "error");
            return;
        }

        injectFallbackStyles();
        bindEvents();
        setLoading(true);

        try {
            state.me = await requireUser();
            if (!state.me) return;

            await Promise.all([loadMyProfile(), loadPeople(), loadFriends()]);
            render();
        } catch (err) {
            console.error("NEXA people init error:", err);
            notify("Something went wrong loading people.", "error");
        } finally {
            setLoading(false);
        }
    }

    document.addEventListener("DOMContentLoaded", init);
})();
