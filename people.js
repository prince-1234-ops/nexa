/* =========================================================
   NEXA — people.js
   Friend data is stored in the nexa_friends table.
========================================================= */

(function () {
    "use strict";

    /* ---------- Supabase client ---------- */
    function getClient() {
        try {
            if (typeof nexaSupabase !== "undefined" && nexaSupabase.from) {
                return nexaSupabase;
            }
        } catch (e) {}

        try {
            if (typeof supabaseClient !== "undefined" && supabaseClient.from) {
                return supabaseClient;
            }
        } catch (e) {}

        if (window.nexaSupabase && window.nexaSupabase.from) {
            return window.nexaSupabase;
        }

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
        iAdded: new Set(),
        addedMe: new Set(),
        busy: new Set(),
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

    function personName(person) {
        return (
            person.full_name ||
            person.name ||
            person.display_name ||
            person.username ||
            "NEXA User"
        );
    }

    function personUsername(person) {
        return person.username
            ? "@" + String(person.username).replace(/^@/, "")
            : "";
    }

    function personAvatarUrl(person) {
        return (
            person.avatar_url ||
            person.avatar ||
            person.photo_url ||
            person.profile_image ||
            ""
        );
    }

    function initial(person) {
        return personName(person).trim().charAt(0).toUpperCase() || "N";
    }

    function setAvatar(element, person) {
        if (!element) return;

        const url = personAvatarUrl(person);

        if (url) {
            element.textContent = "";
            element.style.backgroundImage =
                'url("' + url.replace(/"/g, "%22") + '")';
            element.style.backgroundSize = "cover";
            element.style.backgroundPosition = "center";
        } else {
            element.style.backgroundImage = "";
            element.textContent = initial(person);
        }
    }

    function notify(message, type) {
        if (!els.notifications) return;

        const item = document.createElement("div");
        item.className = "notification " + (type || "info");
        item.textContent = message;

        els.notifications.appendChild(item);

        window.setTimeout(() => item.remove(), 3200);
    }

    function setLoading(isLoading) {
        if (els.loading) {
            els.loading.hidden = !isLoading;
        }
    }

    /* ---------- Authentication ---------- */
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

        if (error) {
            console.error(
                "NEXA my profile error:",
                error.message,
                error.code
            );
        }

        state.myProfile = data || {
            id: state.me.id,
            full_name:
                (state.me.user_metadata &&
                    state.me.user_metadata.full_name) ||
                "NEXA User",
            username: state.me.email
                ? state.me.email.split("@")[0]
                : "nexauser"
        };

        const profile = state.myProfile;

        if (els.sidebarUserName) {
            els.sidebarUserName.textContent = personName(profile);
        }

        if (els.sidebarUsername) {
            els.sidebarUsername.textContent =
                personUsername(profile) || "@nexauser";
        }

        if (els.myProfileName) {
            els.myProfileName.textContent = personName(profile);
        }

        if (els.myProfileUsername) {
            els.myProfileUsername.textContent =
                personUsername(profile) || "@nexauser";
        }

        if (els.myProfileBio) {
            els.myProfileBio.textContent = profile.bio || "No bio yet.";
        }

        setAvatar(els.sidebarAvatar, profile);
        setAvatar(els.miniAvatar, profile);
        setAvatar(els.mobileProfileAvatar, profile);
        setAvatar(els.myProfileAvatar, profile);
    }

    async function loadPeople() {
        const { data, error } = await client
            .from("profiles")
            .select("*")
            .neq("id", state.me.id)
            .limit(500);

        if (error) {
            console.error(
                "NEXA people load error:",
                error.message,
                error.code
            );
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
            console.error(
                "NEXA friends load error:",
                error.message,
                error.code,
                error.hint
            );

            if (error.code === "42P01" || error.code === "PGRST205") {
                notify(
                    "Friends table missing. Run the SQL in Supabase first.",
                    "error"
                );
            }

            return;
        }

        state.iAdded = new Set();
        state.addedMe = new Set();

        (data || []).forEach((row) => {
            if (row.user_id === me) {
                state.iAdded.add(row.friend_id);
            }

            if (row.friend_id === me) {
                state.addedMe.add(row.user_id);
            }
        });
    }

    /* ---------- Friend actions ---------- */
    async function toggleFriend(targetId) {
        if (!targetId || state.busy.has(targetId)) return;

        state.busy.add(targetId);

        const me = state.me.id;
        const wasAdded = state.iAdded.has(targetId);

        // Update the display immediately while the database request runs.
        if (wasAdded) {
            state.iAdded.delete(targetId);
        } else {
            state.iAdded.add(targetId);
        }

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
                .insert({
                    user_id: me,
                    friend_id: targetId
                }));

            // A duplicate insert may happen if the request was already sent.
            if (error && error.code === "23505") {
                error = null;
            }
        }

        state.busy.delete(targetId);

        if (error) {
            console.error(
                "NEXA friend error:",
                error.message,
                error.details,
                error.hint,
                error.code
            );

            // Restore the previous state if the request failed.
            if (wasAdded) {
                state.iAdded.add(targetId);
            } else {
                state.iAdded.delete(targetId);
            }

            render();
            notify("Couldn't update friend. Try again.", "error");
            return;
        }

        const person = state.people.find((item) => item.id === targetId);
        const name = person ? personName(person) : "this person";

        if (wasAdded) {
            notify("Removed " + name + ".");
        } else if (state.addedMe.has(targetId)) {
            notify("You and " + name + " are now friends.");
        } else {
            notify("Friend request sent to " + name + ".");
        }
    }

    /* ---------- Rendering ---------- */
    function friendState(id) {
        const mine = state.iAdded.has(id);
        const theirs = state.addedMe.has(id);

        if (mine && theirs) return "friends";
        if (mine) return "requested";
        if (theirs) return "incoming";

        return "none";
    }

    function buttonLabel(status) {
        if (status === "friends") return "Friends ✓";
        if (status === "requested") return "Requested";
        if (status === "incoming") return "Accept";

        return "Add friend";
    }

    function filteredPeople() {
        const query = state.query.trim().toLowerCase();

        if (!query) return state.people;

        return state.people.filter((person) => {
            return (
                personName(person).toLowerCase().includes(query) ||
                String(person.username || "").toLowerCase().includes(query) ||
                String(person.bio || "").toLowerCase().includes(query)
            );
        });
    }

    function cardHTML(person) {
        const status = friendState(person.id);
        const avatarUrl = personAvatarUrl(person);

        const avatarStyle = avatarUrl
            ? ' style="background-image:url(&quot;' +
              esc(avatarUrl) +
              '&quot;);background-size:cover;background-position:center;"'
            : "";

        const avatarText = avatarUrl ? "" : esc(initial(person));
        const profileUrl =
            "profile.html?id=" + encodeURIComponent(person.id);
        const messageUrl =
            "messages.html?user=" + encodeURIComponent(person.id);

        return (
            '<article class="user-card person-card" data-id="' +
            esc(person.id) +
            '">' +
                '<a class="user-avatar person-avatar" href="' +
                profileUrl +
                '"' +
                avatarStyle +
                ">" +
                    avatarText +
                "</a>" +
                '<div class="user-info person-info">' +
                    '<a class="user-name" href="' +
                    profileUrl +
                    '">' +
                        esc(personName(person)) +
                    "</a>" +
                    '<span class="user-username">' +
                        esc(personUsername(person)) +
                    "</span>" +
                    '<p class="user-bio">' +
                        esc(person.bio || "No bio yet.") +
                    "</p>" +
                "</div>" +
                '<div class="user-actions person-actions">' +
                    '<button type="button" class="friend-button add-friend-button ' +
                    status +
                    '" data-action="friend" data-id="' +
                    esc(person.id) +
                    '">' +
                        buttonLabel(status) +
                    "</button>" +
                    '<a class="message-button" href="' +
                    messageUrl +
                    '">Message</a>' +
                "</div>" +
            "</article>"
        );
    }

    function render() {
        const people = filteredPeople();

        if (els.peopleCount) {
            els.peopleCount.textContent =
                state.people.length +
                (state.people.length === 1 ? " person" : " people");
        }

        if (els.searchStatus) {
            els.searchStatus.textContent = state.query.trim()
                ? people.length +
                  (people.length === 1 ? " result" : " results") +
                  ' for "' +
                  state.query.trim() +
                  '"'
                : "";
        }

        if (els.clearButton) {
            els.clearButton.hidden = !state.query;
        }

        if (els.emptyPeople) {
            els.emptyPeople.hidden = people.length > 0;
        }

        if (els.usersList) {
            els.usersList.innerHTML = people.map(cardHTML).join("");
        }
    }

    /* ---------- Events ---------- */
    function bindEvents() {
        if (els.usersList) {
            els.usersList.addEventListener("click", (event) => {
                const button = event.target.closest(
                    '[data-action="friend"]'
                );

                if (!button || !els.usersList.contains(button)) return;

                toggleFriend(button.getAttribute("data-id"));
            });
        }

        let searchTimer = null;

        if (els.searchInput) {
            els.searchInput.addEventListener("input", () => {
                window.clearTimeout(searchTimer);

                searchTimer = window.setTimeout(() => {
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
                state.query = els.searchInput
                    ? els.searchInput.value
                    : "";

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
                if (client) {
                    await client.auth.signOut();
                }

                window.location.href = "index.html";
            });
        }
    }

    /* ---------- Initialize ---------- */
    async function init() {
        if (!client) {
            console.error(
                "NEXA: Supabase client not found. Check supabase.js."
            );
            notify("Supabase isn't connected.", "error");
            return;
        }

        bindEvents();
        setLoading(true);

        try {
            state.me = await requireUser();

            if (!state.me) return;

            await Promise.all([
                loadMyProfile(),
                loadPeople(),
                loadFriends()
            ]);

            render();
        } catch (error) {
            console.error("NEXA people init error:", error);
            notify("Something went wrong loading people.", "error");
        } finally {
            setLoading(false);
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
