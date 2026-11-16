/* =========================================================
   NEXA SHARED MENU SCRIPT
   Shows the red unread-messages number on the Messages
   menu item. Load AFTER supabase.js.
========================================================= */

(function () {

    let user = null;

    try {
        user = JSON.parse(localStorage.getItem("nexaCurrentUser"));
    } catch (_) { }

    if (!user) {
        return;
    }

    const myId = String(user.id || user._id || user.userId || "");

    /* logout (same on every page) */

    const logout = document.getElementById("logoutButton");

    if (logout) {
        logout.addEventListener("click", function () {
            localStorage.removeItem("nexaCurrentUser");
            window.location.href = "index.html";
        });
    }

    /* badge */

    function render(count) {

        count = Number(count) || 0;

        document.querySelectorAll("[data-unread-badge]").forEach(function (badge) {

            if (count > 0) {
                badge.textContent = count > 99 ? "99+" : String(count);
                badge.hidden = false;
                badge.title = count + " unread message" + (count === 1 ? "" : "s");
            } else {
                badge.hidden = true;
            }
        });

        try {
            localStorage.setItem("nexaUnreadCount", String(count));
        } catch (_) { }
    }

    render(localStorage.getItem("nexaUnreadCount") || 0);

    if (typeof nexaSupabase === "undefined" || !myId) {
        return;
    }

    async function refresh() {

        try {

            const result = await nexaSupabase
                .from("messages")
                .select("id", { count: "exact", head: true })
                .eq("receiver_id", myId)
                .eq("read", false);

            if (result.error) {
                throw result.error;
            }

            render(result.count || 0);

        } catch (error) {
            console.error("NEXA unread badge error:", error);
        }
    }

    let timer = null;

    function refreshSoon() {
        clearTimeout(timer);
        timer = setTimeout(refresh, 250);
    }

    refresh();

    /* live: new message arrives, or a message is marked read */

    nexaSupabase
        .channel("nexa-nav-unread-" + myId)
        .on("postgres_changes", {
            event: "*",
            schema: "public",
            table: "messages",
            filter: "receiver_id=eq." + myId
        }, refreshSoon)
        .subscribe();

    document.addEventListener("visibilitychange", function () {
        if (document.visibilityState === "visible") {
            refreshSoon();
        }
    });

    window.addEventListener("pageshow", refreshSoon);

    setInterval(refresh, 30000);

})();
