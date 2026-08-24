/* =========================================================
   NEXA HOME
   Server-backed posts, photos, videos, reels, stories
   Fullscreen Reel viewer + likes + comments + shares + saves
   ========================================================= */


/* =========================================================
   CURRENT USER
   ========================================================= */

const currentUser = JSON.parse(
    localStorage.getItem("nexaCurrentUser")
);

if (!currentUser) {
    window.location.href = "index.html";
    throw new Error("No NEXA user is logged in.");
}



/* =========================================================
   ELEMENTS
   ========================================================= */

const feedPosts =
    document.getElementById("feedPosts");

const emptyFeed =
    document.getElementById("emptyFeed");

const postInput =
    document.getElementById("postInput");

const createPostButton =
    document.getElementById("createPostButton");

const introCreateButton =
    document.getElementById("introCreateButton");

const topCreateButton =
    document.getElementById("topCreateButton");

const emptyFeedCreateButton =
    document.getElementById("emptyFeedCreateButton");

const photoPostButton =
    document.getElementById("photoPostButton");

const videoPostButton =
    document.getElementById("videoPostButton");

const reelPostButton =
    document.getElementById("reelPostButton");

const photoFileInput =
    document.getElementById("photoFileInput");

const videoFileInput =
    document.getElementById("videoFileInput");

const searchInput =
    document.getElementById("searchInput");

const storiesContainer =
    document.getElementById("storiesContainer");

const addStoryButton =
    document.getElementById("addStoryButton");

const viewAllStories =
    document.getElementById("viewAllStories");

const storyViewerComment =
    document.getElementById("storyViewerComment");

const commentsModal =
    document.getElementById("commentsModal");

const commentsList =
    document.getElementById("commentsList");

const commentForm =
    document.getElementById("commentForm");

const commentInput =
    document.getElementById("commentInput");

const closeCommentsButton =
    document.getElementById("closeCommentsButton");

const storyViewer =
    document.getElementById("storyViewer");

const storyViewerContent =
    document.getElementById("storyViewerContent");

const closeStoryViewer =
    document.getElementById("closeStoryViewer");
const storyViewerLike =
    document.getElementById("storyViewerLike");

const storyViewerLikes =
    document.getElementById("storyViewerLikes");

const storyViewerComments =
    document.getElementById("storyViewerComments");

const storyCommentPanel =
    document.getElementById("storyCommentPanel");

const storyCommentForm =
    document.getElementById("storyCommentForm");

const storyCommentInput =
    document.getElementById("storyCommentInput");

const closeStoryComment =
    document.getElementById("closeStoryComment");

const notificationArea =
    document.getElementById("notificationArea");

const notificationButton =
    document.getElementById("notificationButton");

const mediaPreviewModal =
    document.getElementById("mediaPreviewModal");

const mediaPreviewContent =
    document.getElementById("mediaPreviewContent");

const closeMediaPreview =
    document.getElementById("closeMediaPreview");

const publishMediaButton =
    document.getElementById("publishMediaButton");

const logoutButton =
    document.getElementById("logoutButton");

const miniAvatar =
    document.getElementById("miniAvatar");

const postAvatar =
    document.getElementById("postAvatar");

const storyAvatar =
    document.getElementById("storyAvatar");


/* =========================================================
   FULLSCREEN REEL / MEDIA VIEWER
   ========================================================= */

const reelViewer =
    document.getElementById("reelViewer");

const closeReelViewer =
    document.getElementById("closeReelViewer");

const reelViewerBackdrop =
    document.getElementById("reelViewerBackdrop");

const reelViewerVideo =
    document.getElementById("reelViewerVideo");

const reelCenterToggle =
    document.getElementById("reelCenterToggle");

const reelViewerImage =
    document.getElementById("reelViewerImage");

const reelViewerAvatar =
    document.getElementById("reelViewerAvatar");

const reelViewerAuthor =
    document.getElementById("reelViewerAuthor");

const reelViewerTime =
    document.getElementById("reelViewerTime");

const reelViewerCaption =
    document.getElementById("reelViewerCaption");

const reelViewerLike =
    document.getElementById("reelViewerLike");

const reelViewerLikes =
    document.getElementById("reelViewerLikes");

const reelViewerComment =
    document.getElementById("reelViewerComment");

const reelViewerComments =
    document.getElementById("reelViewerComments");

const reelViewerShare =
    document.getElementById("reelViewerShare");

const reelViewerShares =
    document.getElementById("reelViewerShares");

const reelViewerSave =
    document.getElementById("reelViewerSave");


/* =========================================================
   STATE
   ========================================================= */

let posts = [];

let stories = [];

let selectedPostId = null;

let selectedMediaType = null;

let selectedMediaFile = null;

let selectedViewerPostId = null;

let viewerIsOpen = false;

let viewerTouchStartY = 0;

let viewerTouchStartX = 0;

let viewerChanging = false;

let selectedStoryId = null;

let selectedStoryCommentId = null;


/* =========================================================
   USER HELPERS
   ========================================================= */

function getUserId() {

    return (
        currentUser.id ||
        currentUser._id ||
        currentUser.userId ||
        currentUser.email ||
        currentUser.username ||
        "nexa-user"
    );
}


function getUsername() {

    return (
        currentUser.username ||
        currentUser.name ||
        currentUser.fullName ||
        currentUser.email ||
        "NEXA User"
    );
}


function getUserAvatar() {

    return (
        currentUser.profile_picture ||
        currentUser.profilePicture ||
        currentUser.profileImage ||
        currentUser.avatar ||
        currentUser.image ||
        ""
    );
}

async function loadCurrentProfileForHome() {

    try {

        const {
            data,
            error
        } = await nexaSupabase
            .from("profiles")
            .select(`
                id,
                name,
                username,
                profile_picture
            `)
            .eq(
                "id",
                String(getUserId())
            )
            .maybeSingle();

        if (error) {
            throw error;
        }

        if (!data) {
            return;
        }

        currentUser.name =
            data.name ||
            currentUser.name;

        currentUser.username =
            data.username ||
            currentUser.username;

        currentUser.profile_picture =
            data.profile_picture ||
            "";

        currentUser.profilePicture =
            data.profile_picture ||
            "";

        localStorage.setItem(
            "nexaCurrentUser",
            JSON.stringify(currentUser)
        );

    } catch (error) {

        console.error(
            "NEXA current profile refresh error:",
            error
        );
    }
}


function getAvatarLetter(name) {

    return (
        String(name || "N")
            .trim()
            .charAt(0)
            .toUpperCase() ||
        "N"
    );
}


/* =========================================================
   HTML SAFETY
   ========================================================= */

function escapeHTML(value) {

    const div =
        document.createElement("div");

    div.textContent =
        String(value ?? "");

    return div.innerHTML;
}


/* =========================================================
   MEDIA URL
   ========================================================= */

function getMediaURL(media) {

    if (!media) {
        return "";
    }

    const value =
        String(media);

    if (
        value.startsWith("http://") ||
        value.startsWith("https://") ||
        value.startsWith("data:") ||
        value.startsWith("blob:")
    ) {
        return value;
    }

    if (
        value.startsWith("/")
    ) {
        return (
            "http://localhost:3000" +
            value
        );
    }

    return (
        "http://localhost:3000/" +
        value
    );
}


/* =========================================================
   TIME AGO
   ========================================================= */

function timeAgo(timestamp) {

    if (!timestamp) {
        return "Just now";
    }

    const date =
        new Date(timestamp);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return "Just now";
    }

    const difference =
        Math.max(
            0,
            Date.now() -
            date.getTime()
        );

    const seconds =
        Math.floor(
            difference / 1000
        );

    if (seconds < 60) {
        return "Just now";
    }

    const minutes =
        Math.floor(
            seconds / 60
        );

    if (minutes < 60) {
        return `${minutes}m`;
    }

    const hours =
        Math.floor(
            minutes / 60
        );

    if (hours < 24) {
        return `${hours}h`;
    }

    const days =
        Math.floor(
            hours / 24
        );

    if (days === 1) {
        return "Yesterday";
    }

    if (days < 7) {
        return `${days}d`;
    }

    return date.toLocaleDateString(
        [],
        {
            month: "short",
            day: "numeric"
        }
    );
}


/* =========================================================
   NOTIFICATION
   ========================================================= */

function showNotification(text) {

    if (!notificationArea) {
        return;
    }

    const notice =
        document.createElement("div");

    notice.className =
        "nexa-notification";

    notice.textContent =
        text;

    notificationArea.appendChild(
        notice
    );

    setTimeout(
        () => {
            notice.remove();
        },
        3000
    );
}


/* =========================================================
   AVATARS
   ========================================================= */

function updateHomeAvatars() {

    const username =
        getUsername();

    const avatar =
        getUserAvatar();

    const letter =
        getAvatarLetter(username);

    [
        miniAvatar,
        postAvatar,
        storyAvatar
    ].forEach(element => {

        if (!element) {
            return;
        }

        if (avatar) {

            element.innerHTML = `
                <img
                    src="${escapeHTML(
                getMediaURL(avatar)
            )}"
                    alt="${escapeHTML(username)}"
                    loading="lazy"
                >
            `;

            element.classList.add(
                "has-avatar"
            );

        } else {

            element.innerHTML = `
                <span>
                    ${escapeHTML(letter)}
                </span>
            `;

            element.classList.remove(
                "has-avatar"
            );
        }
    });
}

function formatEngagementCount(number) {

    const value =
        Number(number || 0);

    if (value >= 1000000) {
        return (
            (value / 1000000)
                .toFixed(
                    value % 1000000 === 0 ? 0 : 1
                )
        ) + "M";
    }

    if (value >= 1000) {
        return (
            (value / 1000)
                .toFixed(
                    value % 1000 === 0 ? 0 : 1
                )
        ) + "K";
    }

    return String(value);
}

/* =========================================================
   LIKE / SAVE HELPERS
   ========================================================= */

function userLiked(post) {

    if (
        !post ||
        !Array.isArray(post.likes)
    ) {
        return false;
    }

    return post.likes.some(
        id =>
            String(id) ===
            String(getUserId())
    );
}


function userSaved(post) {

    if (
        !post ||
        !Array.isArray(post.savedBy)
    ) {
        return false;
    }

    return post.savedBy.some(
        id =>
            String(id) ===
            String(getUserId())
    );
}


function getLikesCount(post) {

    if (!post) {
        return 0;
    }

    const realLikes =
        Array.isArray(post.likes)
            ? post.likes.length
            : Number(post.likes || 0);

    return formatEngagementCount(
        Number(post.demoLikes || 0) +
        realLikes
    );
}


function getCommentsCount(post) {

    if (!post) {
        return 0;
    }

    const realComments =
        Array.isArray(post.comments)
            ? post.comments.length
            : 0;

    return formatEngagementCount(
        Number(post.demoComments || 0) +
        realComments
    );
}


function getSharesCount(post) {

    if (!post) {
        return 0;
    }

    return formatEngagementCount(
        Number(post.demoShares || 0) +
        Number(post.shares || 0)
    );
}


/* =========================================================
   FIND POST
   ========================================================= */

function findPost(postId) {

    return posts.find(
        post =>
            String(post.id) ===
            String(postId)
    );
}


/* =========================================================
   LOAD POSTS FROM SUPABASE
   ========================================================= */

async function loadPosts() {

    try {

        /* -----------------------------------------------------
           LOAD POSTS
        ----------------------------------------------------- */

        const {
            data: postData,
            error: postError
        } = await nexaSupabase
            .from("posts")
            .select("*")
            .order(
                "created_at",
                {
                    ascending: false
                }
            );

        if (postError) {
            throw postError;
        }


        /* -----------------------------------------------------
           LOAD LIKES
        ----------------------------------------------------- */

        const {
            data: likeData,
            error: likeError
        } = await nexaSupabase
            .from("likes")
            .select(
                "post_id, user_id"
            );

        if (likeError) {
            throw likeError;
        }


        /* -----------------------------------------------------
           LOAD CURRENT AUTHOR PROFILES
        ----------------------------------------------------- */

        const authorIds = [
            ...new Set(
                (postData || [])
                    .map(post =>
                        post.author_id
                            ? String(post.author_id)
                            : null
                    )
                    .filter(Boolean)
            )
        ];


        let profileMap = new Map();


        if (authorIds.length) {

            const {
                data: profileData,
                error: profileError
            } = await nexaSupabase
                .from("profiles")
                .select(`
                    id,
                    name,
                    username,
                    profile_picture
                `)
                .in(
                    "id",
                    authorIds
                );

            if (profileError) {
                throw profileError;
            }

            (profileData || []).forEach(
                profile => {

                    profileMap.set(
                        String(profile.id),
                        profile
                    );
                }
            );
        }


        /* -----------------------------------------------------
           GROUP LIKES BY POST
        ----------------------------------------------------- */

        const likesByPost = {};


        (likeData || []).forEach(
            like => {

                const postId =
                    String(
                        like.post_id
                    );

                if (
                    !likesByPost[postId]
                ) {

                    likesByPost[postId] = [];
                }

                likesByPost[postId].push(
                    String(
                        like.user_id
                    )
                );
            }
        );


        /* -----------------------------------------------------
           BUILD HOME POSTS
        ----------------------------------------------------- */

        posts =
            (postData || []).map(
                post => {

                    const postId =
                        String(
                            post.id
                        );

                    const authorProfile =
                        profileMap.get(
                            String(
                                post.author_id
                            )
                        );

                    return {

                        demoLikes:
                            Number(
                                post.demo_likes || 0
                            ),

                        demoComments:
                            Number(
                                post.demo_comments || 0
                            ),

                        demoShares:
                            Number(
                                post.demo_shares || 0
                            ),

                        demoSaves:
                            Number(
                                post.demo_saves || 0
                            ),

                        id:
                            post.id,

                        createdAt:
                            post.created_at,

                        authorId:
                            post.author_id,

                        authorName:
                            authorProfile?.name ||
                            authorProfile?.username ||
                            post.author_name ||
                            "NEXA User",

                        authorAvatar:
                            authorProfile?.profile_picture ||
                            "",

                        text:
                            post.text ||
                            "",

                        media:
                            post.media ||
                            "",

                        mediaType:
                            post.media_type ||
                            "",

                        likes:
                            likesByPost[postId] ||
                            [],

                        comments:
                            Array.isArray(
                                post.comments
                            )
                                ? post.comments
                                : [],

                        shares:
                            Number(
                                post.shares || 0
                            ),

                        savedBy:
                            Array.isArray(
                                post.saved_by
                            )
                                ? post.saved_by
                                : []
                    };
                }
            );


        console.log(
            "NEXA posts loaded from Supabase:",
            posts.length
        );

        console.log(
            "NEXA likes loaded from Supabase:",
            likeData?.length || 0
        );


    } catch (error) {

        console.error(
            "NEXA Supabase feed loading error:",
            error
        );

        posts = [];

        showNotification(
            "Could not load NEXA posts."
        );
    }
}


/* =========================================================
   SERVER POST UPDATE
   ========================================================= */

async function updatePostOnServer(post) {

    if (!post) {
        return null;
    }

    try {

        const response =
            await fetch(
                `${API_BASE}/posts/${encodeURIComponent(
                    post.id
                )}`,
                {
                    method:
                        "PUT",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({
                            text:
                                post.text || "",

                            likes:
                                Array.isArray(
                                    post.likes
                                )
                                    ? post.likes
                                    : [],

                            comments:
                                Array.isArray(
                                    post.comments
                                )
                                    ? post.comments
                                    : [],

                            shares:
                                Number(
                                    post.shares || 0
                                ),

                            savedBy:
                                Array.isArray(
                                    post.savedBy
                                )
                                    ? post.savedBy
                                    : []
                        })
                }
            );

        if (!response.ok) {

            const text =
                await response.text();

            throw new Error(
                text ||
                `Server returned ${response.status}`
            );
        }

        const data =
            await response.json();

        return (
            data.post ||
            data
        );

    } catch (error) {

        console.error(
            "NEXA post update error:",
            error
        );

        return null;
    }
}


/* =========================================================
   RENDER FEED
   ========================================================= */

function renderFeed(search = "") {

    if (!feedPosts) {
        return;
    }

    const searchText =
        String(search)
            .trim()
            .toLowerCase();

    const visiblePosts =
        posts.filter(
            post => {

                if (!searchText) {
                    return true;
                }

                const author =
                    String(
                        post.authorName ||
                        ""
                    ).toLowerCase();

                const text =
                    String(
                        post.text ||
                        ""
                    ).toLowerCase();

                return (
                    author.includes(
                        searchText
                    ) ||
                    text.includes(
                        searchText
                    )
                );
            }
        );

    feedPosts.innerHTML =
        "";

    if (
        visiblePosts.length ===
        0
    ) {

        if (emptyFeed) {
            emptyFeed.hidden =
                false;
            emptyFeed.style.display =
                "block";
        }

        return;
    }

    if (emptyFeed) {
        emptyFeed.hidden =
            true;
        emptyFeed.style.display =
            "none";
    }

    visiblePosts.forEach(
        post => {

            if (
                String(
                    post.mediaType ||
                    ""
                ).toLowerCase() ===
                "reel"
            ) {

                renderReel(
                    post
                );

                return;
            }

            renderRegularPost(
                post
            );
        }
    );

    attachFeedVideoObservers();
}


/* =========================================================
   RENDER REEL
   IMPORTANT:
   Uses the real server media path.
   ========================================================= */

function renderReel(post) {

    const article =
        document.createElement(
            "article"
        );

    article.className =
        "reel-card";

    article.dataset.id =
        post.id;

    const liked =
        userLiked(post);

    const saved =
        userSaved(post);

    const mediaURL =
        getMediaURL(
            post.media
        );

    article.innerHTML = `

        <div class="reel-header">

            <div class="post-author">

        <div class="post-user-avatar">

    ${post.authorAvatar
            ? `
                <img
                    src="${escapeHTML(
                post.authorAvatar
            )}"
                    alt="${escapeHTML(
                post.authorName ||
                "NEXA User"
            )}"
                >
              `
            : `
                ${escapeHTML(
                getAvatarLetter(
                    post.authorName
                )
            )}
              `
        }

</div>

                <div>

                    <h3>
                        ${escapeHTML(
            post.authorName ||
            "NEXA User"
        )}
                    </h3>

                    <span>
                        ${escapeHTML(
            timeAgo(
                post.createdAt
            )
        )}
                    </span>

                </div>

            </div>

            <button
                type="button"
                class="post-menu"
                aria-label="More options"
            >
                ⋯
            </button>

        </div>


        <div class="reel-video">

            <video
                class="reel-player"
                src="${escapeHTML(
            mediaURL
        )}"
                loop
                muted
                playsinline
                preload="metadata"
            ></video>


            <button
                type="button"
                class="reel-play-button"
                aria-label="Play Reel"
            >
                ▶
            </button>


            <div class="reel-overlay">

                <div class="reel-caption">

                    ${post.text
            ? `
                                <h3>
                                    ${escapeHTML(
                post.text
            )}
                                </h3>
                            `
            : ""
        }

                    <p>
                        @${escapeHTML(
            post.authorName ||
            "NEXA"
        )}
                    </p>

                </div>


                <div class="reel-actions">

                    <button
                        type="button"
                        class="
                            reel-action
                            ${liked
            ? "liked"
            : ""
        }
                        "
                        data-action="like"
                        data-id="${escapeHTML(
            post.id
        )}"
                    >

                        <span
                            class="reel-action-icon"
                        >
                            ${liked
            ? "♥"
            : "♡"
        }
                        </span>

                        <span>
                            ${getLikesCount(
            post
        )}
                        </span>

                    </button>


                    <button
                        type="button"
                        class="reel-action"
                        data-action="comment"
                        data-id="${escapeHTML(
            post.id
        )}"
                    >

                        <span
                            class="reel-action-icon"
                        >
                            💬
                        </span>

                        <span>
                            ${getCommentsCount(
            post
        )}
                        </span>

                    </button>


                    <button
                        type="button"
                        class="reel-action"
                        data-action="share"
                        data-id="${escapeHTML(
            post.id
        )}"
                    >

                        <span
                            class="reel-action-icon"
                        >
                            ↗
                        </span>

                        <span>
                            ${getSharesCount(
            post
        )}
                        </span>

                    </button>


                    <button
                        type="button"
                        class="
                            reel-action
                            ${saved
            ? "saved"
            : ""
        }
                        "
                        data-action="save"
                        data-id="${escapeHTML(
            post.id
        )}"
                    >

                        <span
                            class="reel-action-icon"
                        >
                            ${saved
            ? "★"
            : "☆"
        }
                        </span>

                    </button>

                </div>

            </div>

        </div>
    `;

    feedPosts.appendChild(
        article
    );


    const video =
        article.querySelector(
            ".reel-player"
        );

    const playButton =
        article.querySelector(
            ".reel-play-button"
        );


    if (!video) {
        return;
    }


    /* -------------------------------------------------------
       VIDEO ERROR
    ------------------------------------------------------- */

    video.addEventListener(
        "error",
        () => {

            console.error(
                "NEXA Reel video failed:",
                mediaURL,
                post
            );

        }
    );




    /* -------------------------------------------------------
       PLAY BUTTON
    ------------------------------------------------------- */

    if (playButton) {

        playButton.addEventListener(
            "click",
            event => {

                event.preventDefault();
                event.stopPropagation();

                video
                    .play()
                    .catch(
                        () => { }
                    );
            }
        );
    }


    video.addEventListener(
        "play",
        () => {

            if (playButton) {
                playButton.style.opacity =
                    "0";
            }
        }
    );


    video.addEventListener(
        "pause",
        () => {

            if (playButton) {
                playButton.style.opacity =
                    "1";
            }
        }
    );


    /* =========================================================
    OPEN REEL FULLSCREEN WITH ONE TAP
    ========================================================= */

    video.addEventListener(
        "click",
        event => {

            event.preventDefault();
            event.stopPropagation();

            video.pause();

            openViewer(
                post
            );
        }
    );
}


/* =========================================================
   REGULAR POSTS
   ========================================================= */

function renderRegularPost(post) {

    const article =
        document.createElement("article");

    article.className = "feed-post";
    article.dataset.id = post.id;

    const liked = userLiked(post);
    const saved = userSaved(post);

    const mediaType =
        String(post.mediaType || "").toLowerCase();

    const hasImage =
        mediaType === "image" ||
        mediaType === "photo";

    const hasVideo =
        mediaType === "video";

    const authorAvatar =
        post.authorAvatar ||
        "";

    const authorName =
        post.authorName ||
        "NEXA User";

    const avatarHTML =
        authorAvatar
            ? `
                <img
                    src="${escapeHTML(getMediaURL(authorAvatar))}"
                    alt="${escapeHTML(authorName)}"
                    loading="lazy"
                >
              `
            : `
                <span>
                    ${escapeHTML(
                getAvatarLetter(authorName)
            )}
                </span>
              `;

    article.innerHTML = `

        <div class="post-header">

            <div class="post-author">

                <a
                    href="profile.html?user=${encodeURIComponent(
        String(post.authorId || "")
    )}"
                    class="post-user-avatar"
                    aria-label="Open ${escapeHTML(authorName)}'s profile"
                >
                    ${avatarHTML}
                </a>

                <div>

                    <h3>
                        ${escapeHTML(authorName)}
                    </h3>

                    <span>
                        ${escapeHTML(
        timeAgo(post.createdAt)
    )}
                    </span>

                </div>

            </div>

            <button
                type="button"
                class="post-menu"
            >
                ⋯
            </button>

        </div>

        ${post.text
            ? `
                    <div class="post-caption">
                        ${escapeHTML(post.text)}
                    </div>
                  `
            : ""
        }

        ${hasImage
            ? `
                    <div
                        class="post-media"
                        data-media-type="image"
                    >
                        <img
                            src="${escapeHTML(
                getMediaURL(post.media)
            )}"
                            alt="NEXA post"
                        >
                    </div>
                  `
            : ""
        }

        ${hasVideo
            ? `
                    <div
                        class="post-media"
                        data-media-type="video"
                    >
                        <video
    class="feed-normal-video"
    src="${escapeHTML(
                getMediaURL(
                    post.media
                )
            )}"
    muted
    playsinline
    preload="metadata"
></video>
                    </div>
                  `
            : ""
        }

        <div class="post-actions post-actions-side">

  <button
    type="button"
    data-action="like"
    data-id="${escapeHTML(post.id)}"
    aria-label="Like post"
    class="${liked ? "active liked" : ""}"
>
        <span class="post-action-icon">
            ${liked ? "♥" : "♡"}
        </span>

        <span>
            ${getLikesCount(post)}
        </span>
    </button>


    <button
        type="button"
        data-action="comment"
        data-id="${escapeHTML(post.id)}"
        aria-label="Comment"
    >
        <span class="post-action-icon">
            💬
        </span>

        <span>
            ${getCommentsCount(post)}
        </span>
    </button>


    <button
        type="button"
        data-action="share"
        data-id="${escapeHTML(post.id)}"
        aria-label="Share"
    >
        <span class="post-action-icon">
            ↗
        </span>

        <span>
            ${getSharesCount(post)}
        </span>
    </button>


    <button
        type="button"
        data-action="save"
        data-id="${escapeHTML(post.id)}"
        aria-label="Save"
    >
        <span class="post-action-icon">
            ${saved ? "★" : "☆"}
        </span>
    </button>

</div>
    `;

    feedPosts.appendChild(article);
}


/* =========================================================
   FEED VIDEO OBSERVER
   ========================================================= */

function attachFeedVideoObservers() {

    if (
        !(
            "IntersectionObserver"
            in window
        )
    ) {
        return;
    }

    const videos =
        document.querySelectorAll(
            ".reel-player, .feed-normal-video"
        );

    if (!videos.length) {
        return;
    }

    const observer =
        new IntersectionObserver(
            entries => {

                entries.forEach(
                    entry => {

                        const video =
                            entry.target;

                        if (
                            entry.isIntersecting &&
                            entry.intersectionRatio >=
                            0.65
                        ) {

                            video.muted = true;

                            video
                                .play()
                                .catch(
                                    () => { }
                                );

                        } else {

                            video.pause();
                        }
                    }
                );

            },
            {
                threshold: [
                    0,
                    0.65,
                    1
                ]
            }
        );

    videos.forEach(
        video =>
            observer.observe(
                video
            )
    );
}


/* =========================================================
   OPEN VIEWER
   ========================================================= */

function openViewer(post) {

    if (
        !reelViewer ||
        !post
    ) {
        return;
    }

    const mediaType =
        String(
            post.mediaType ||
            ""
        ).toLowerCase();

    if (
        mediaType !== "reel" &&
        mediaType !== "video"
    ) {
        return;
    }

    viewerIsOpen =
        true;

    selectedViewerPostId =
        post.id;

    reelViewer.hidden =
        false;

    reelViewer.style.display =
        "flex";

    reelViewer.classList.add(
        "active"
    );

    reelViewer.setAttribute(
        "aria-hidden",
        "false"
    );

    document.body.classList.add(
        "reel-open"
    );

    document.body.style.overflow =
        "hidden";

    loadViewerPost(
        post
    );
}


/* =========================================================
   LOAD VIEWER POST
   ========================================================= */

function loadViewerPost(post) {

    if (
        !reelViewer ||
        !post
    ) {
        return;
    }

    selectedViewerPostId =
        post.id;


    /* -------------------------------------------------------
       RESET IMAGE
    ------------------------------------------------------- */

    if (reelViewerImage) {

        reelViewerImage.pause?.();

        reelViewerImage.removeAttribute(
            "src"
        );

        reelViewerImage.style.display =
            "none";
    }


    /* -------------------------------------------------------
       RESET VIDEO
    ------------------------------------------------------- */

    if (reelViewerVideo) {

        reelViewerVideo.pause();

        reelViewerVideo.removeAttribute(
            "src"
        );

        reelViewerVideo.style.display =
            "none";

        reelViewerVideo.onloadeddata =
            null;

        reelViewerVideo.onerror =
            null;

        reelViewerVideo.load();
    }


    /* -------------------------------------------------------
       INFORMATION
    ------------------------------------------------------- */

    if (reelViewerAvatar) {

        reelViewerAvatar.textContent =
            post.authorAvatar ||
            getAvatarLetter(
                post.authorName
            );
    }

    if (reelViewerAuthor) {

        reelViewerAuthor.textContent =
            post.authorName ||
            "NEXA User";
    }

    if (reelViewerTime) {

        reelViewerTime.textContent =
            timeAgo(
                post.createdAt
            );
    }

    if (reelViewerCaption) {

        reelViewerCaption.textContent =
            post.text ||
            "";
    }


    /* -------------------------------------------------------
       COUNTS
    ------------------------------------------------------- */

    updateViewerCounts(
        post
    );


    /* -------------------------------------------------------
       VIDEO
    ------------------------------------------------------- */

    const mediaType =
        String(
            post.mediaType ||
            ""
        ).toLowerCase();

    if (
        mediaType === "reel" ||
        mediaType === "video"
    ) {

        if (!reelViewerVideo) {
            return;
        }

        const mediaURL =
            getMediaURL(
                post.media
            );

        console.log(
            "NEXA viewer loading:",
            mediaURL
        );


        /*
         * IMPORTANT:
         * Source is assigned BEFORE play().
         */

        reelViewerVideo.style.display =
            "block";

        reelViewerVideo.loop =
            true;

        reelViewerVideo.playsInline =
            true;

        reelViewerVideo.muted =
            false;

        reelViewerVideo.volume =
            1;

        reelViewerVideo.src =
            mediaURL;


        reelViewerVideo.onloadeddata =
            () => {

                if (
                    !viewerIsOpen ||
                    String(
                        selectedViewerPostId
                    ) !==
                    String(post.id)
                ) {
                    return;
                }

                reelViewerVideo
                    .play()
                    .catch(
                        error => {

                            console.log(
                                "NEXA viewer autoplay:",
                                error
                            );
                        }
                    );
            };





        reelViewerVideo.onerror =
            () => {

                console.error(
                    "NEXA viewer could not load:",
                    mediaURL
                );

                showNotification(
                    "This Reel could not be loaded."
                );
            };


        reelViewerVideo.load();

        return;
    }




    /* -------------------------------------------------------
       IMAGE
    ------------------------------------------------------- */

    if (
        mediaType === "image"
    ) {

        if (!reelViewerImage) {
            return;
        }

        reelViewerImage.style.display =
            "block";

        reelViewerImage.src =
            getMediaURL(
                post.media
            );
    }
}

/* =========================================================
   FULLSCREEN REEL — CENTER TAP PLAY / PAUSE
   ========================================================= */

if (reelCenterToggle) {

    reelCenterToggle.addEventListener(
        "click",
        event => {

            event.preventDefault();
            event.stopPropagation();

            if (
                !viewerIsOpen ||
                !reelViewerVideo
            ) {
                return;
            }


            if (
                reelViewerVideo.paused
            ) {

                reelViewerVideo
                    .play()
                    .catch(
                        () => { }
                    );

            } else {

                reelViewerVideo.pause();
            }
        }
    );
}

/* =========================================================
   UPDATE VIEWER COUNTS
   ========================================================= */

function updateViewerCounts(post) {

    if (!post) {
        return;
    }

    if (reelViewerLikes) {
        reelViewerLikes.textContent =
            getLikesCount(post);
    }

    if (reelViewerComments) {
        reelViewerComments.textContent =
            getCommentsCount(post);
    }

    if (reelViewerShares) {
        reelViewerShares.textContent =
            getSharesCount(post);
    }

    if (reelViewerLike) {

        reelViewerLike.classList.toggle(
            "active",
            userLiked(post)
        );
    }

    if (reelViewerSave) {

        reelViewerSave.classList.toggle(
            "active",
            userSaved(post)
        );
    }
}

/* =========================================================
   CLOSE VIEWER
   ========================================================= */

function closeViewer() {

    viewerIsOpen = false;

    if (reelViewerVideo) {

        reelViewerVideo.pause();

        reelViewerVideo.removeAttribute(
            "src"
        );

        reelViewerVideo.load();

        reelViewerVideo.style.display =
            "none";
    }

    if (reelViewerImage) {

        reelViewerImage.removeAttribute(
            "src"
        );

        reelViewerImage.style.display =
            "none";
    }

    if (reelViewer) {

        reelViewer.classList.remove(
            "active"
        );

        reelViewer.setAttribute(
            "aria-hidden",
            "true"
        );

        reelViewer.style.display =
            "none";

        reelViewer.hidden =
            true;
    }

    document.body.classList.remove(
        "reel-open"
    );

    document.body.style.overflow =
        "";

    selectedViewerPostId =
        null;
}
/* =========================================================
   GET VIEWER VIDEOS
   ========================================================= */

function getViewerPosts() {

    return posts.filter(
        post => {

            const type =
                String(
                    post.mediaType ||
                    ""
                ).toLowerCase();

            return (
                (
                    type === "reel" ||
                    type === "video"
                ) &&
                post.media
            );
        }
    );
}


/* =========================================================
   NEXT REEL / VIDEO
   ========================================================= */

function showNextViewerPost() {

    if (viewerChanging) {
        return;
    }

    const viewerPosts =
        getViewerPosts();

    if (
        viewerPosts.length ===
        0
    ) {
        return;
    }

    const currentIndex =
        viewerPosts.findIndex(
            post =>
                String(post.id) ===
                String(
                    selectedViewerPostId
                )
        );

    let nextIndex =
        currentIndex + 1;

    if (
        currentIndex ===
        -1
    ) {

        nextIndex =
            0;

    } else if (
        nextIndex >=
        viewerPosts.length
    ) {

        nextIndex =
            0;
    }

    viewerChanging =
        true;

    loadViewerPost(
        viewerPosts[
        nextIndex
        ]
    );

    setTimeout(
        () => {
            viewerChanging =
                false;
        },
        350
    );
}


/* =========================================================
   PREVIOUS REEL / VIDEO
   ========================================================= */

function showPreviousViewerPost() {

    if (viewerChanging) {
        return;
    }

    const viewerPosts =
        getViewerPosts();

    if (
        viewerPosts.length ===
        0
    ) {
        return;
    }

    const currentIndex =
        viewerPosts.findIndex(
            post =>
                String(post.id) ===
                String(
                    selectedViewerPostId
                )
        );

    let previousIndex =
        currentIndex - 1;

    if (
        currentIndex ===
        -1
    ) {

        previousIndex =
            viewerPosts.length - 1;

    } else if (
        previousIndex < 0
    ) {

        previousIndex =
            viewerPosts.length - 1;
    }

    viewerChanging =
        true;

    loadViewerPost(
        viewerPosts[
        previousIndex
        ]
    );

    setTimeout(
        () => {
            viewerChanging =
                false;
        },
        350
    );
}


/* =========================================================
   VIEWER WHEEL
   ========================================================= */

if (reelViewer) {

    reelViewer.addEventListener(
        "wheel",
        event => {

            if (!viewerIsOpen) {
                return;
            }

            /*
             * Don't let the page itself scroll.
             */

            event.preventDefault();

            if (
                Math.abs(
                    event.deltaY
                ) < 35
            ) {
                return;
            }

            if (
                event.deltaY > 0
            ) {

                showNextViewerPost();

            } else {

                showPreviousViewerPost();
            }
        },
        {
            passive:
                false
        }
    );
}


/* =========================================================
   VIEWER TOUCH START
   ========================================================= */

if (reelViewer) {

    reelViewer.addEventListener(
        "touchstart",
        event => {

            if (!viewerIsOpen) {
                return;
            }

            const touch =
                event.touches[0];

            if (!touch) {
                return;
            }

            viewerTouchStartY =
                touch.clientY;

            viewerTouchStartX =
                touch.clientX;
        },
        {
            passive:
                true
        }
    );


    /* -------------------------------------------------------
       TOUCH END
    ------------------------------------------------------- */

    reelViewer.addEventListener(
        "touchend",
        event => {

            if (!viewerIsOpen) {
                return;
            }

            const touch =
                event.changedTouches[0];

            if (!touch) {
                return;
            }

            const differenceY =
                viewerTouchStartY -
                touch.clientY;

            const differenceX =
                viewerTouchStartX -
                touch.clientX;


            if (
                Math.abs(
                    differenceY
                ) <=
                Math.abs(
                    differenceX
                )
            ) {
                return;
            }


            if (
                Math.abs(
                    differenceY
                ) < 60
            ) {
                return;
            }


            if (
                differenceY > 0
            ) {

                showNextViewerPost();

            } else {

                showPreviousViewerPost();
            }
        },
        {
            passive:
                true
        }
    );
}


/* =========================================================
   KEYBOARD VIEWER
   ========================================================= */

document.addEventListener(
    "keydown",
    event => {

        if (!viewerIsOpen) {
            return;
        }

        if (
            event.key ===
            "ArrowDown"
        ) {

            event.preventDefault();

            showNextViewerPost();

            return;
        }

        if (
            event.key ===
            "ArrowUp"
        ) {

            event.preventDefault();

            showPreviousViewerPost();

            return;
        }

        if (
            event.key ===
            "Escape"
        ) {

            event.preventDefault();

            closeViewer();
        }
    }
);


/* =========================================================
   VIEWER LIKE
   ========================================================= */

if (reelViewerLike) {

    reelViewerLike.addEventListener(
        "click",
        async event => {

            event.preventDefault();
            event.stopPropagation();

            if (!selectedViewerPostId) {
                return;
            }

            const postId =
                selectedViewerPostId;

            const video =
                reelViewerVideo;

            const wasPlaying =
                video &&
                !video.paused;

            const currentTime =
                video
                    ? video.currentTime
                    : 0;

            const success =
                await toggleLike(
                    postId
                );

            /*
             * Stay on the exact same Reel.
             */

            if (
                success &&
                viewerIsOpen &&
                String(
                    selectedViewerPostId
                ) ===
                String(
                    postId
                )
            ) {

                const post =
                    findPost(
                        postId
                    );

                if (post) {

                    updateViewerCounts(
                        post
                    );
                }

                /*
                 * Restore the exact
                 * video position.
                 */

                if (video) {

                    try {

                        video.currentTime =
                            currentTime;

                    } catch { }
                }

                /*
                 * Continue playback.
                 */

                if (
                    wasPlaying &&
                    video
                ) {

                    video
                        .play()
                        .catch(
                            () => { }
                        );
                }
            }
        }
    );
}

/* =========================================================
   VIEWER COMMENT
   ========================================================= */

if (reelViewerComment) {

    reelViewerComment.addEventListener(
        "click",
        event => {

            event.preventDefault();
            event.stopPropagation();

            if (
                !selectedViewerPostId
            ) {
                return;
            }

            const id =
                selectedViewerPostId;

            closeViewer();

            openComments(
                id
            );
        }
    );
}


/* =========================================================
   VIEWER SHARE
   ========================================================= */

if (reelViewerShare) {

    reelViewerShare.addEventListener(
        "click",
        async event => {

            event.preventDefault();
            event.stopPropagation();

            if (
                !selectedViewerPostId
            ) {
                return;
            }

            await sharePost(
                selectedViewerPostId,
                false
            );
        }
    );
}


/* =========================================================
   VIEWER SAVE
   ========================================================= */

if (reelViewerSave) {

    reelViewerSave.addEventListener(
        "click",
        async event => {

            event.preventDefault();
            event.stopPropagation();

            if (
                !selectedViewerPostId
            ) {
                return;
            }

            await toggleSave(
                selectedViewerPostId,
                false
            );
        }
    );
}


/* =========================================================
   TOGGLE LIKE
   Supabase-backed
   ========================================================= */

async function toggleLike(postId) {

    console.log(
        "NEXA SUPABASE: toggleLike START",
        postId
    );

    const post = findPost(postId);

    if (!post) {
        console.error(
            "NEXA Supabase like: post not found",
            postId
        );

        return false;
    }

    const userId = String(getUserId());

    try {

        /* =====================================================
           CHECK WHETHER CURRENT USER ALREADY LIKED THIS POST
           ===================================================== */

        const {
            data: existingLike,
            error: checkError
        } = await nexaSupabase
            .from("likes")
            .select("id")
            .eq("post_id", Number(postId))
            .eq("user_id", userId)
            .limit(1)
            .maybeSingle();


        if (checkError) {
            throw checkError;
        }


        /* =====================================================
           UNLIKE
           ===================================================== */

        if (existingLike) {

            const {
                error: deleteError
            } = await nexaSupabase
                .from("likes")
                .delete()
                .eq("id", existingLike.id);


            if (deleteError) {
                throw deleteError;
            }


            if (
                Array.isArray(post.likes)
            ) {

                post.likes =
                    post.likes.filter(
                        id =>
                            String(id) !==
                            userId
                    );
            }


            console.log(
                "NEXA SUPABASE: post unliked",
                postId
            );

        }


        /* =====================================================
           LIKE
           ===================================================== */

        else {

            const {
                error: insertError
            } = await nexaSupabase
                .from("likes")
                .insert({
                    post_id:
                        Number(postId),

                    user_id:
                        userId
                });


            if (insertError) {
                throw insertError;
            }


            if (
                !Array.isArray(post.likes)
            ) {

                post.likes =
                    [];
            }


            const alreadyInLocalArray =
                post.likes.some(
                    id =>
                        String(id) ===
                        userId
                );


            if (
                !alreadyInLocalArray
            ) {

                post.likes.push(
                    userId
                );
            }


            console.log(
                "NEXA SUPABASE: post liked",
                postId
            );
        }


        /* =====================================================
           UPDATE UI WITHOUT RELOADING PAGE
           ===================================================== */

        updatePostLikeUI(
            post
        );


        if (
            viewerIsOpen &&
            String(
                selectedViewerPostId
            ) ===
            String(post.id)
        ) {

            updateViewerCounts(
                post
            );
        }


        return true;


    } catch (error) {

        console.error(
            "NEXA Supabase like error:",
            error.message,
            error.details,
            error.hint,
            error.code
        );

        showNotification(
            "Could not update the like."
        );

        return false;
    }
}


/* =========================================================
   UPDATE LIKE UI
   ========================================================= */

function updatePostLikeUI(post) {

    if (!post) {
        return;
    }

    const elements =
        document.querySelectorAll(
            `[data-id="${CSS.escape(
                String(post.id)
            )}"]`
        );

    elements.forEach(
        element => {

            const button =
                element.querySelector(
                    '[data-action="like"]'
                );

            if (!button) {
                return;
            }

            const liked =
                userLiked(post);

            button.classList.toggle(
                "liked",
                liked
            );

            const icon =
                button.querySelector(
                    ".reel-action-icon"
                );

            if (icon) {

                icon.textContent =
                    liked
                        ? "♥"
                        : "♡";
            }

            const spans =
                button.querySelectorAll(
                    "span"
                );

            if (
                spans.length >= 2
            ) {

                spans[
                    spans.length - 1
                ].textContent =
                    getLikesCount(
                        post
                    );
            }
        }
    );
}

/* =========================================================
   TOGGLE SAVE
   Supabase-backed
   ========================================================= */

async function toggleSave(
    postId,
    rerenderFeed = true
) {

    const post =
        findPost(postId);

    if (!post) {
        return false;
    }

    const userId =
        String(getUserId());

    if (!Array.isArray(post.savedBy)) {
        post.savedBy = [];
    }

    const alreadySaved =
        post.savedBy.some(
            id =>
                String(id) ===
                userId
        );

    const oldSavedBy =
        [...post.savedBy];

    try {

        if (alreadySaved) {

            post.savedBy =
                post.savedBy.filter(
                    id =>
                        String(id) !==
                        userId
                );

        } else {

            post.savedBy.push(
                userId
            );
        }


        const {
            data,
            error
        } =
            await nexaSupabase
                .from("posts")
                .update({
                    saved_by:
                        post.savedBy
                })
                .eq(
                    "id",
                    post.id
                )
                .select("id, saved_by")
                .single();


        if (error) {
            throw error;
        }


        post.savedBy =
            Array.isArray(
                data.saved_by
            )
                ? data.saved_by
                : [];


        if (alreadySaved) {

            showNotification(
                "Removed from saved."
            );

        } else {

            showNotification(
                "Post saved."
            );
        }


        if (rerenderFeed) {

            renderFeed(
                searchInput
                    ? searchInput.value
                    : ""
            );
        }


        if (
            viewerIsOpen &&
            String(
                selectedViewerPostId
            ) ===
            String(postId)
        ) {

            updateViewerCounts(
                post
            );
        }


        return true;


    } catch (error) {

        post.savedBy =
            oldSavedBy;

        console.error(
            "NEXA Supabase save error:",
            error.message,
            error.details,
            error.hint,
            error.code
        );

        showNotification(
            "Could not save this post."
        );

        return false;
    }
}

/* =========================================================
   COMMENTS
   ========================================================= */

function openComments(postId) {

    const post =
        findPost(
            postId
        );

    if (!post) {
        return;
    }

    selectedPostId =
        postId;

    if (!commentsList) {
        return;
    }

    commentsList.innerHTML =
        "";

    const comments =
        Array.isArray(
            post.comments
        )
            ? post.comments
            : [];


    if (
        comments.length ===
        0
    ) {

        commentsList.innerHTML = `
            <div class="empty-comments">
                No comments yet.
                Be the first.
            </div>
        `;

    } else {

        comments.forEach(
            comment => {

                const item =
                    document.createElement(
                        "div"
                    );

                item.className =
                    "comment-item";

                item.innerHTML = `

                    <strong>
                        ${escapeHTML(
                    comment.username ||
                    comment.userName ||
                    comment.authorName ||
                    "NEXA User"
                )}
                    </strong>

                    <p>
                        ${escapeHTML(
                    comment.text ||
                    ""
                )}
                    </p>

                `;

                commentsList.appendChild(
                    item
                );
            }
        );
    }


    if (commentsModal) {

        commentsModal.hidden =
            false;

        commentsModal.style.display =
            "flex";

        commentsModal.setAttribute(
            "aria-hidden",
            "false"
        );
    }


    setTimeout(
        () => {

            if (commentInput) {
                commentInput.focus();
            }

        },
        100
    );
}


/* =========================================================
   COMMENT FORM
   Supabase-backed
   ========================================================= */

if (commentForm) {

    commentForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            const text =
                commentInput
                    ? commentInput.value.trim()
                    : "";


            if (
                !text ||
                !selectedPostId
            ) {

                return;
            }


            const post =
                findPost(
                    selectedPostId
                );


            if (!post) {
                return;
            }


            /* -------------------------------------------------
               KEEP EXISTING COMMENTS
            ------------------------------------------------- */

            if (
                !Array.isArray(
                    post.comments
                )
            ) {

                post.comments =
                    [];
            }


            const newComment = {

                id:
                    Date.now(),

                userId:
                    String(
                        getUserId()
                    ),

                username:
                    getUsername(),

                text:
                    text,

                createdAt:
                    new Date()
                        .toISOString()
            };


            post.comments.push(
                newComment
            );


            try {

                /* ---------------------------------------------
                   SAVE COMMENTS TO SUPABASE
                --------------------------------------------- */

                const {
                    data,
                    error
                } =
                    await nexaSupabase
                        .from("posts")
                        .update({

                            comments:
                                post.comments

                        })
                        .eq(
                            "id",
                            post.id
                        )
                        .select()
                        .single();


                if (error) {
                    throw error;
                }


                /* ---------------------------------------------
                   UPDATE LOCAL POST
                --------------------------------------------- */

                post.comments =
                    Array.isArray(
                        data.comments
                    )
                        ? data.comments
                        : post.comments;


                /* ---------------------------------------------
                   CLEAR INPUT
                --------------------------------------------- */

                if (commentInput) {

                    commentInput.value =
                        "";
                }


                /* ---------------------------------------------
                   UPDATE COMMENT WINDOW
                --------------------------------------------- */

                openComments(
                    post.id
                );


                updateCommentCountUI(
                    post
                );


                /* ---------------------------------------------
                   UPDATE FULLSCREEN VIEWER
                --------------------------------------------- */

                if (
                    viewerIsOpen &&
                    String(
                        selectedViewerPostId
                    ) ===
                    String(
                        post.id
                    )
                ) {

                    updateViewerCounts(
                        post
                    );
                }


                showNotification(
                    "Comment posted."
                );


                console.log(
                    "NEXA comment saved to Supabase:",
                    data
                );


            } catch (error) {

                /* ---------------------------------------------
                   REMOVE LOCAL COMMENT IF SAVE FAILED
                --------------------------------------------- */

                post.comments.pop();


                console.error(
                    "NEXA Supabase comment error:",
                    error.message,
                    error.details,
                    error.hint,
                    error.code
                );


                showNotification(
                    error.message ||
                    "Could not save your comment."
                );
            }
        }
    );
}

/* =========================================================
   UPDATE COMMENT COUNT
   ========================================================= */

function updateCommentCountUI(post) {

    if (!post) {
        return;
    }

    const elements =
        document.querySelectorAll(
            `[data-id="${CSS.escape(
                String(post.id)
            )}"]`
        );

    elements.forEach(
        element => {

            const button =
                element.querySelector(
                    '[data-action="comment"]'
                );

            if (!button) {
                return;
            }

            const spans =
                button.querySelectorAll(
                    "span"
                );

            if (
                spans.length >= 2
            ) {

                spans[
                    spans.length - 1
                ].textContent =
                    getCommentsCount(
                        post
                    );
            }
        }
    );
}


/* =========================================================
   CLOSE COMMENTS
   ========================================================= */

function closeComments() {

    if (!commentsModal) {
        return;
    }

    commentsModal.hidden =
        true;

    commentsModal.style.display =
        "none";

    commentsModal.setAttribute(
        "aria-hidden",
        "true"
    );

    selectedPostId =
        null;
}


if (closeCommentsButton) {

    closeCommentsButton.addEventListener(
        "click",
        event => {

            event.preventDefault();

            closeComments();
        }
    );
}

/* =========================================================
   SHARE POST
   Supabase-backed
   ========================================================= */

async function sharePost(
    postId,
    rerenderFeed = true
) {

    const post =
        findPost(postId);

    if (!post) {
        return false;
    }


    const shareData = {

        title:
            "NEXA",

        text:
            post.text ||
            "Check out this post on NEXA.",

        url:
            window.location.href
    };


    /* -----------------------------------------------------
       SHARE / COPY LINK
       ----------------------------------------------------- */

    try {

        if (navigator.share) {

            await navigator.share(
                shareData
            );

        } else if (navigator.clipboard) {

            await navigator.clipboard.writeText(
                window.location.href
            );

            showNotification(
                "Post link copied."
            );

        } else {

            showNotification(
                "Post shared."
            );
        }

    } catch (error) {

        if (
            error.name ===
            "AbortError"
        ) {

            return false;
        }

        console.error(
            "NEXA share error:",
            error
        );

        return false;
    }


    /* -----------------------------------------------------
       INCREASE SHARE COUNT
       ----------------------------------------------------- */

    const oldShares =
        Number(
            post.shares || 0
        );

    post.shares =
        oldShares + 1;


    try {

        const {
            data,
            error
        } =
            await nexaSupabase
                .from("posts")
                .update({

                    shares:
                        post.shares

                })
                .eq(
                    "id",
                    post.id
                )
                .select(
                    "id, shares"
                )
                .single();


        if (error) {
            throw error;
        }


        post.shares =
            Number(
                data.shares || 0
            );


        updateShareCountUI(
            post
        );


        if (
            viewerIsOpen &&
            String(
                selectedViewerPostId
            ) ===
            String(
                postId
            )
        ) {

            updateViewerCounts(
                post
            );
        }


        if (rerenderFeed) {

            renderFeed(
                searchInput
                    ? searchInput.value
                    : ""
            );
        }


        showNotification(
            "Post shared."
        );


        console.log(
            "NEXA share saved to Supabase:",
            data
        );


        return true;


    } catch (error) {

        post.shares =
            oldShares;

        console.error(
            "NEXA Supabase share error:",
            error.message,
            error.details,
            error.hint,
            error.code
        );

        showNotification(
            "Could not save the share."
        );

        return false;
    }
}

/* =========================================================
   UPDATE SHARE COUNT
   ========================================================= */

function updateShareCountUI(post) {

    if (!post) {
        return;
    }

    const elements =
        document.querySelectorAll(
            `[data-id="${CSS.escape(
                String(post.id)
            )}"]`
        );

    elements.forEach(
        element => {

            const button =
                element.querySelector(
                    '[data-action="share"]'
                );

            if (!button) {
                return;
            }

            const spans =
                button.querySelectorAll(
                    "span"
                );

            if (
                spans.length >= 2
            ) {

                spans[
                    spans.length - 1
                ].textContent =
                    getSharesCount(
                        post
                    );
            }
        }
    );
}


/* =========================================================
   FEED ACTION HANDLER
   ========================================================= */

if (feedPosts) {

    feedPosts.addEventListener(
        "click",
        async event => {

            const actionButton =
                event.target.closest(
                    "[data-action]"
                );


            if (actionButton) {

                event.preventDefault();
                event.stopPropagation();


                const action =
                    actionButton.dataset.action;


                const postId =
                    actionButton.dataset.id;


                if (!postId) {
                    return;
                }


                if (
                    action ===
                    "like"
                ) {

                    await toggleLike(
                        postId
                    );

                    return;
                }


                if (
                    action ===
                    "comment"
                ) {

                    openComments(
                        postId
                    );

                    return;
                }


                if (
                    action ===
                    "share"
                ) {

                    await sharePost(
                        postId
                    );

                    return;
                }


                if (
                    action ===
                    "save"
                ) {

                    await toggleSave(
                        postId
                    );

                    return;
                }
            }


            /*
             * -------------------------------------------------
             * OPEN REEL BY CLICKING ITS MEDIA
             * -------------------------------------------------
             */

            const reelCard =
                event.target.closest(
                    ".reel-card"
                );


            if (
                reelCard
            ) {

                const postId =
                    reelCard.dataset.id;

                if (!postId) {
                    return;
                }

                const post =
                    findPost(
                        postId
                    );

                if (!post) {
                    return;
                }


                const clickedButton =
                    event.target.closest(
                        "button"
                    );


                if (clickedButton) {
                    return;
                }


                const clickedMedia =
                    event.target.closest(
                        ".reel-video"
                    );


                if (
                    clickedMedia
                ) {

                    const video =
                        reelCard.querySelector(
                            ".reel-player"
                        );

                    if (video) {
                        video.pause();
                    }

                    openViewer(
                        post
                    );
                }

                return;
            }


            /*
             * -------------------------------------------------
             * NORMAL VIDEO
             * -------------------------------------------------
             */

            const normalPost =
                event.target.closest(
                    ".feed-post"
                );

            if (
                normalPost
            ) {

                const postId =
                    normalPost.dataset.id;

                const post =
                    findPost(
                        postId
                    );

                if (!post) {
                    return;
                }


                const media =
                    event.target.closest(
                        ".post-media"
                    );


                if (
                    media &&
                    String(
                        post.mediaType ||
                        ""
                    ).toLowerCase() ===
                    "video"
                ) {

                    openViewer(
                        post
                    );
                }
            }
        }
    );
}

/* =========================================================
   CREATE TEXT POST — SUPABASE
   ========================================================= */

async function createTextPost() {

    const text =
        postInput
            ? postInput.value.trim()
            : "";

    if (!text) {

        showNotification(
            "Write something first."
        );

        return;
    }


    try {

        if (createPostButton) {

            createPostButton.disabled =
                true;
        }

        const { data, error } =
            await nexaSupabase
                .from("posts")
                .insert({

                    author_id:
                        String(
                            getUserId()
                        ),

                    author_name:
                        getUsername(),

                    author_avatar:
                        getUserAvatar() ||
                        getAvatarLetter(
                            getUsername()
                        ),

                    text:
                        text,

                    media:
                        null,

                    media_type:
                        null
                })
                .select()
                .single();


        if (error) {

            throw error;
        }


        const savedPost = {

            id:
                data.id,

            createdAt:
                data.created_at,

            authorId:
                data.author_id,

            authorName:
                data.author_name,

            authorAvatar:
                data.author_avatar,

            text:
                data.text,

            media:
                data.media,

            mediaType:
                data.media_type,

            likes:
                [],

            comments:
                [],

            shares:
                0,

            savedBy:
                Array.isArray(post.saved_by)
                    ? post.saved_by
                    : [],
        };


        posts.unshift(
            savedPost
        );


        if (postInput) {

            postInput.value =
                "";
        }


        renderFeed();


        showNotification(
            "Your post is live."
        );


        console.log(
            "NEXA post created in Supabase:",
            data
        );


    } catch (error) {

        console.error(
            "NEXA Supabase post creation error:",
            error
        );

        showNotification(
            error.message ||
            "Could not publish the post."
        );

    } finally {

        if (createPostButton) {

            createPostButton.disabled =
                false;
        }
    }
}


/* =========================================================
   CREATE BUTTONS
   ========================================================= */

function focusComposer() {

    if (!postInput) {
        return;
    }

    postInput.focus();

    postInput.scrollIntoView({
        behavior:
            "smooth",

        block:
            "center"
    });
}


if (createPostButton) {

    createPostButton.addEventListener(
        "click",
        createTextPost
    );
}


if (introCreateButton) {

    introCreateButton.addEventListener(
        "click",
        focusComposer
    );
}


if (topCreateButton) {

    topCreateButton.addEventListener(
        "click",
        focusComposer
    );
}


if (emptyFeedCreateButton) {

    emptyFeedCreateButton.addEventListener(
        "click",
        focusComposer
    );
}


if (postInput) {

    postInput.addEventListener(
        "keydown",
        event => {

            if (
                event.key ===
                "Enter" &&
                !event.shiftKey
            ) {

                event.preventDefault();

                createTextPost();
            }
        }
    );
}


/* =========================================================
   MEDIA BUTTONS
   ========================================================= */

if (photoPostButton) {

    photoPostButton.addEventListener(
        "click",
        () => {

            selectedMediaType =
                "image";

            if (photoFileInput) {

                photoFileInput.value =
                    "";

                photoFileInput.click();
            }
        }
    );
}


if (videoPostButton) {

    videoPostButton.addEventListener(
        "click",
        () => {

            selectedMediaType =
                "video";

            if (videoFileInput) {

                videoFileInput.value =
                    "";

                videoFileInput.dataset.mode =
                    "video";

                videoFileInput.click();
            }
        }
    );
}


if (reelPostButton) {

    reelPostButton.addEventListener(
        "click",
        () => {

            selectedMediaType =
                "reel";

            if (videoFileInput) {

                videoFileInput.value =
                    "";

                videoFileInput.dataset.mode =
                    "reel";

                videoFileInput.click();
            }
        }
    );
}


/* =========================================================
   PHOTO INPUT
   ========================================================= */

if (photoFileInput) {

    photoFileInput.addEventListener(
        "change",
        () => {

            const file =
                photoFileInput.files?.[0];

            if (!file) {
                return;
            }

            selectedMediaType =
                "image";

            prepareMediaPreview(
                file,
                "image"
            );
        }
    );
}


/* =========================================================
   VIDEO / REEL INPUT
   ========================================================= */

if (videoFileInput) {

    videoFileInput.addEventListener(
        "change",
        () => {

            const file =
                videoFileInput.files?.[0];

            if (!file) {
                return;
            }

            const type =
                videoFileInput.dataset.mode ===
                    "reel"
                    ? "reel"
                    : "video";


            selectedMediaType =
                type;


            prepareMediaPreview(
                file,
                type
            );
        }
    );
}


/* =========================================================
   MEDIA PREVIEW
   ========================================================= */

function prepareMediaPreview(
    file,
    type
) {

    if (!file) {
        return;
    }

    selectedMediaFile =
        file;

    selectedMediaType =
        type;


    if (!mediaPreviewContent) {
        return;
    }


    mediaPreviewContent.innerHTML =
        "";


    if (
        type ===
        "image"
    ) {

        const image =
            document.createElement(
                "img"
            );

        image.src =
            URL.createObjectURL(
                file
            );

        image.alt =
            "NEXA Preview";

        mediaPreviewContent.appendChild(
            image
        );

    } else {

        const video =
            document.createElement(
                "video"
            );

        video.src =
            URL.createObjectURL(
                file
            );

        video.controls =
            true;

        video.autoplay =
            true;

        video.muted =
            true;

        video.playsInline =
            true;

        mediaPreviewContent.appendChild(
            video
        );
    }


    if (publishMediaButton) {

        publishMediaButton.textContent =
            type ===
                "reel"
                ? "Publish Reel"
                : "Publish";
    }


    if (mediaPreviewModal) {

        mediaPreviewModal.hidden =
            false;

        mediaPreviewModal.style.display =
            "flex";

        mediaPreviewModal.setAttribute(
            "aria-hidden",
            "false"
        );
    }
}


/* =========================================================
   CLOSE MEDIA PREVIEW
   ========================================================= */

function closeMediaModal() {

    if (mediaPreviewModal) {

        mediaPreviewModal.hidden =
            true;

        mediaPreviewModal.style.display =
            "none";

        mediaPreviewModal.setAttribute(
            "aria-hidden",
            "true"
        );
    }


    if (mediaPreviewContent) {

        mediaPreviewContent.innerHTML =
            "";
    }


    selectedMediaFile =
        null;

    selectedMediaType =
        null;


    if (photoFileInput) {

        photoFileInput.value =
            "";
    }


    if (videoFileInput) {

        videoFileInput.value =
            "";

        videoFileInput.dataset.mode =
            "";
    }
}


if (closeMediaPreview) {

    closeMediaPreview.addEventListener(
        "click",
        closeMediaModal
    );
}

/* =========================================================
   PUBLISH MEDIA TO SUPABASE
   ========================================================= */

if (publishMediaButton) {

    publishMediaButton.addEventListener(
        "click",
        async () => {

            if (!selectedMediaFile) {

                showNotification(
                    "Choose a file first."
                );

                return;
            }


            const type =
                selectedMediaType;


            try {

                publishMediaButton.disabled =
                    true;

                publishMediaButton.textContent =
                    "Uploading...";


                /* -----------------------------------------
                   1. CREATE A UNIQUE FILE PATH
                   ----------------------------------------- */

                const fileExtension =
                    selectedMediaFile.name
                        .split(".")
                        .pop()
                        .toLowerCase();

                const filePath =
                    `posts/${getUserId()}_${Date.now()}.${fileExtension}`;


                /* -----------------------------------------
                   2. UPLOAD FILE TO SUPABASE STORAGE
                   ----------------------------------------- */

                const {
                    error: uploadError
                } =
                    await nexaSupabase
                        .storage
                        .from("nexa-media")
                        .upload(
                            filePath,
                            selectedMediaFile,
                            {
                                cacheControl:
                                    "3600",

                                upsert:
                                    false,

                                contentType:
                                    selectedMediaFile.type
                            }
                        );


                if (uploadError) {

                    throw uploadError;
                }


                /* -----------------------------------------
                   3. GET PUBLIC MEDIA URL
                   ----------------------------------------- */

                const {
                    data: publicURLData
                } =
                    nexaSupabase
                        .storage
                        .from("nexa-media")
                        .getPublicUrl(
                            filePath
                        );


                const mediaURL =
                    publicURLData.publicUrl;


                if (!mediaURL) {

                    throw new Error(
                        "Could not get the uploaded media URL."
                    );
                }


                /* -----------------------------------------
                   4. SAVE POST IN SUPABASE
                   ----------------------------------------- */

                publishMediaButton.textContent =
                    "Publishing...";


                const {
                    data,
                    error
                } =
                    await nexaSupabase
                        .from("posts")
                        .insert({

                            author_id:
                                String(getUserId()),

                            author_name:
                                getUsername(),

                            author_avatar:
                                getUserAvatar() ||
                                getAvatarLetter(
                                    getUsername()
                                ),

                            text:
                                postInput
                                    ? postInput.value.trim()
                                    : "",

                            media:
                                mediaURL,

                            media_type:
                                type,

                            demo_likes:
                                type === "reel"
                                    ? Math.floor(
                                        1200 +
                                        Math.random() * 8800
                                    )
                                    : 0,

                            demo_comments:
                                type === "reel"
                                    ? Math.floor(
                                        80 +
                                        Math.random() * 920
                                    )
                                    : 0,

                            demo_shares:
                                type === "reel"
                                    ? Math.floor(
                                        40 +
                                        Math.random() * 460
                                    )
                                    : 0,

                            demo_saves:
                                type === "reel"
                                    ? Math.floor(
                                        20 +
                                        Math.random() * 280
                                    )
                                    : 0

                        })
                        .select()
                        .single();



                if (error) {

                    throw error;
                }


                /* -----------------------------------------
                   5. ADD THE NEW POST TO THE FEED
                   ----------------------------------------- */
                const newPost = {

                    id:
                        data.id,

                    createdAt:
                        data.created_at,

                    authorId:
                        data.author_id,

                    authorName:
                        data.author_name,

                    authorAvatar:
                        data.author_avatar,

                    text:
                        data.text || "",

                    media:
                        data.media || "",

                    mediaType:
                        data.media_type || "",

                    demoLikes:
                        Number(post.demo_likes ?? post.likes_count ?? 0),

                    demoComments:
                        Number(post.demo_comments ?? post.comments_count ?? 0),

                    demoShares:
                        Number(post.demo_shares ?? post.shares_count ?? 0),

                    demoSaves:
                        Number(post.demo_saves ?? post.saves_count ?? 0),

                    likes:
                        [],

                    comments:
                        [],

                    shares:
                        0,

                    savedBy:
                        []
                };


                posts.unshift(
                    newPost
                );


                if (postInput) {

                    postInput.value =
                        "";
                }


                closeMediaModal();

                renderFeed();


                showNotification(
                    type === "reel"
                        ? "Your Reel is live!"
                        : "Your post is live!"
                );


                console.log(
                    "NEXA media post created in Supabase:",
                    data
                );


            } catch (error) {

                console.error(
                    "NEXA Supabase media upload error:",
                    error
                );

                showNotification(
                    error.message ||
                    "Could not publish your media."
                );

            } finally {

                publishMediaButton.disabled =
                    false;

                publishMediaButton.textContent =
                    type === "reel"
                        ? "Publish Reel"
                        : "Publish";
            }
        }
    );
}

/* =========================================================
   LOAD STORIES FROM SUPABASE
   ========================================================= */

async function loadStories() {

    try {

        const {
            data,
            error
        } = await nexaSupabase
            .from("stories")
            .select("*")
            .order(
                "created_at",
                {
                    ascending: false
                }
            );

        if (error) {
            throw error;
        }

        stories =
            (data || []).map(
                story => ({

                    id:
                        story.id,

                    userId:
                        story.user_id,

                    username:
                        story.username ||
                        "NEXA User",

                    authorAvatar:
                        story.author_avatar ||
                        "",

                    media:
                        story.media,

                    mediaType:
                        story.media_type,

                    createdAt:
                        story.created_at,

                    likes:
                        Array.isArray(story.likes)
                            ? story.likes
                            : [],

                    comments:
                        Array.isArray(story.comments)
                            ? story.comments
                            : [],

                    shares:
                        Number(story.shares || 0)

                })
            );

        console.log(
            "NEXA STORY COMMENTS AFTER REFRESH:",
            stories.map(story => ({
                id: story.id,
                username: story.username,
                comments: story.comments
            }))
        );

        console.log(
            "NEXA stories loaded from Supabase:",
            stories.length
        );

    } catch (error) {

        console.error(
            "NEXA Supabase stories load error:",
            error
        );

        stories = [];

        showNotification(
            "Could not load stories."
        );
    }
}


/* =========================================================
   RENDER STORIES
   ========================================================= */

function renderStories() {

    if (!storiesContainer) {
        return;
    }

    storiesContainer.innerHTML = "";


    /* =====================================================
       YOUR STORY
       ===================================================== */

    const yourStory =
        document.createElement("div");

    yourStory.className =
        "story create-story";

    yourStory.innerHTML = `

        <div
            class="story-avatar-wrapper"
        >

     <div
    class="story-avatar"
    id="storyAvatar"
>
    ${getUserAvatar()
            ? `
                <img
                    src="${escapeHTML(
                getMediaURL(
                    getUserAvatar()
                )
            )}"
                    alt="${escapeHTML(
                getUsername()
            )}"
                >
              `
            : `
                <span>
                    ${escapeHTML(
                getAvatarLetter(
                    getUsername()
                )
            )}
                </span>
              `
        }
</div>

            <button
                class="add-story"
                type="button"
            >
                +
            </button>

        </div>

        <span>
            Your story
        </span>
    `;


    const storyAddButton =
        yourStory.querySelector(
            ".add-story"
        );


    if (storyAddButton) {

        storyAddButton.addEventListener(
            "click",
            event => {

                event.stopPropagation();

                createStoryFileInput();
            }
        );
    }


    storiesContainer.appendChild(
        yourStory
    );


    /* =====================================================
       OTHER STORIES
       ===================================================== */

    stories.forEach(
        story => {

            const item =
                document.createElement(
                    "div"
                );

            item.className =
                "story";


            const mediaURL =
                getMediaURL(
                    story.media
                );


            item.innerHTML = `

                <div
                    class="story-ring"
                >

                    ${String(
                story.mediaType ||
                ""
            ).startsWith(
                "video"
            )

                    ? `
                                <video
                                    src="${escapeHTML(
                        mediaURL
                    )}"
                                    muted
                                    playsinline
                                ></video>
                              `

                    : `
                                <img
                                    src="${escapeHTML(
                        mediaURL
                    )}"
                                    alt="Story"
                                >
                              `
                }

                </div>

                <span>
                    ${escapeHTML(
                    story.username ||
                    "NEXA User"
                )}
                </span>
            `;


            item.addEventListener(
                "click",
                () => {

                    openStory(
                        story.id
                    );
                }
            );


            storiesContainer.appendChild(
                item
            );
        }
    );
}


/* =========================================================
   STORY VIEWER STATE
   One source of truth for likes/comments/shares
   ========================================================= */

let storyViewerRequestId = 0;


/* =========================================================
   LOAD CURRENT STORY ACTION STATE
   ========================================================= */

async function loadStoryViewerState(storyId) {

    const requestId =
        ++storyViewerRequestId;

    const currentId =
        String(storyId);


    /* -----------------------------------------------------
       RESET THE UI IMMEDIATELY
    ----------------------------------------------------- */

    if (storyViewerLikes) {
        storyViewerLikes.textContent = "0";
    }

    if (storyViewerComments) {
        storyViewerComments.textContent = "0";
    }

    if (storyViewerShares) {
        storyViewerShares.textContent = "0";
    }


    if (storyViewerLike) {

        storyViewerLike.classList.remove(
            "active"
        );

        const icon =
            storyViewerLike.querySelector(
                ".story-viewer-action-icon"
            );

        if (icon) {
            icon.textContent = "♡";
        }
    }


    try {

        const {
            data,
            error
        } =
            await nexaSupabase
                .from("stories")
                .select(
                    "id, likes, comments, shares"
                )
                .eq(
                    "id",
                    storyId
                )
                .single();


        if (error) {
            throw error;
        }


        /* -------------------------------------------------
           IGNORE OLD REQUESTS
        ------------------------------------------------- */

        if (
            requestId !== storyViewerRequestId ||
            String(selectedStoryId) !==
            currentId
        ) {
            return;
        }


        /* -------------------------------------------------
           STORE THE REAL DATA ON THIS STORY ONLY
        ------------------------------------------------- */

        const story =
            stories.find(
                item =>
                    String(item.id) ===
                    currentId
            );


        if (!story) {
            return;
        }


        story.likes =
            Array.isArray(data.likes)
                ? data.likes
                : [];


        story.comments =
            Array.isArray(data.comments)
                ? data.comments
                : [];


        story.shares =
            Number(data.shares || 0);


        /* -------------------------------------------------
           UPDATE COUNTS
        ------------------------------------------------- */

        if (storyViewerLikes) {

            storyViewerLikes.textContent =
                story.likes.length;
        }


        if (storyViewerComments) {

            storyViewerComments.textContent =
                story.comments.length;
        }


        if (storyViewerShares) {

            storyViewerShares.textContent =
                story.shares;
        }


        /* -------------------------------------------------
           UPDATE LIKE HEART
        ------------------------------------------------- */

        const userId =
            String(getUserId());

        const liked =
            story.likes.some(
                id =>
                    String(id) ===
                    userId
            );


        if (storyViewerLike) {

            storyViewerLike.classList.toggle(
                "active",
                liked
            );


            const icon =
                storyViewerLike.querySelector(
                    ".story-viewer-action-icon"
                );


            if (icon) {

                icon.textContent =
                    liked
                        ? "♥"
                        : "♡";
            }
        }


        console.log(
            "NEXA STORY STATE:",
            {
                storyId:
                    story.id,

                likes:
                    story.likes.length,

                comments:
                    story.comments.length,

                shares:
                    story.shares
            }
        );


    } catch (error) {

        if (
            requestId !== storyViewerRequestId ||
            String(selectedStoryId) !==
            currentId
        ) {
            return;
        }


        console.error(
            "NEXA Story viewer state error:",
            error.message,
            error.details,
            error.hint,
            error.code
        );
    }
}


/* =========================================================
   OPEN STORY
   ========================================================= */

async function openStory(storyId) {

    const story =
        stories.find(
            item =>
                String(item.id) ===
                String(storyId)
        );


    if (
        !story ||
        !storyViewer ||
        !storyViewerContent
    ) {
        return;
    }


    /* -----------------------------------------------------
       THIS IS THE IMPORTANT PART:
       SET THE STORY ID FIRST.
    ----------------------------------------------------- */

    selectedStoryId =
        story.id;


    /* -----------------------------------------------------
       SHOW THE MEDIA
    ----------------------------------------------------- */

    storyViewerContent.innerHTML =
        "";


    const mediaURL =
        getMediaURL(
            story.media
        );


    if (
        String(
            story.mediaType || ""
        ).startsWith(
            "video"
        )
    ) {

        const video =
            document.createElement(
                "video"
            );


        video.src =
            mediaURL +
            "?v=" +
            Date.now();

        video.load();

        video.controls =
            true;

        video.autoplay =
            true;

        video.playsInline =
            true;


        storyViewerContent.appendChild(
            video
        );


    } else {

        const image =
            document.createElement(
                "img"
            );


        image.src =
            mediaURL;

        image.alt =
            "NEXA Story";


        storyViewerContent.appendChild(
            image
        );
    }


    /* -----------------------------------------------------
       OPEN VIEWER
    ----------------------------------------------------- */

    storyViewer.hidden =
        false;

    storyViewer.style.display =
        "flex";

    storyViewer.setAttribute(
        "aria-hidden",
        "false"
    );


    /* -----------------------------------------------------
       GET THIS STORY'S REAL COUNTS
    ----------------------------------------------------- */

    await loadStoryViewerState(
        story.id
    );
}


/* =========================================================
   STORY LIKE
   ========================================================= */

async function toggleStoryLike(storyId) {

    if (
        String(selectedStoryId) !==
        String(storyId)
    ) {
        return false;
    }


    const story =
        stories.find(
            item =>
                String(item.id) ===
                String(storyId)
        );


    if (!story) {
        return false;
    }


    try {

        /* -------------------------------------------------
           ALWAYS READ THE LATEST DATABASE VALUE FIRST
        ------------------------------------------------- */

        const {
            data: currentData,
            error: currentError
        } =
            await nexaSupabase
                .from("stories")
                .select(
                    "id, likes"
                )
                .eq(
                    "id",
                    story.id
                )
                .single();


        if (currentError) {
            throw currentError;
        }


        const currentLikes =
            Array.isArray(
                currentData.likes
            )
                ? currentData.likes
                : [];


        const userId =
            String(getUserId());


        const alreadyLiked =
            currentLikes.some(
                id =>
                    String(id) ===
                    userId
            );


        let newLikes;


        if (alreadyLiked) {

            newLikes =
                currentLikes.filter(
                    id =>
                        String(id) !==
                        userId
                );

        } else {

            newLikes =
                [
                    ...currentLikes,
                    userId
                ];
        }


        /* -------------------------------------------------
           SAVE THIS STORY ONLY
        ------------------------------------------------- */

        const {
            data,
            error
        } =
            await nexaSupabase
                .from("stories")
                .update({
                    likes:
                        newLikes
                })
                .eq(
                    "id",
                    story.id
                )
                .select(
                    "id, likes"
                )
                .single();


        if (error) {
            throw error;
        }


        /* -------------------------------------------------
           UPDATE LOCAL STORY
        ------------------------------------------------- */

        story.likes =
            Array.isArray(data.likes)
                ? data.likes
                : [];


        /* -------------------------------------------------
           ONLY UPDATE IF STILL ON SAME STORY
        ------------------------------------------------- */

        if (
            String(selectedStoryId) !==
            String(story.id)
        ) {
            return true;
        }


        if (storyViewerLikes) {

            storyViewerLikes.textContent =
                story.likes.length;
        }


        const likedNow =
            story.likes.some(
                id =>
                    String(id) ===
                    userId
            );


        if (storyViewerLike) {

            storyViewerLike.classList.toggle(
                "active",
                likedNow
            );


            const icon =
                storyViewerLike.querySelector(
                    ".story-viewer-action-icon"
                );


            if (icon) {

                icon.textContent =
                    likedNow
                        ? "♥"
                        : "♡";
            }
        }


        showNotification(
            likedNow
                ? "Story liked."
                : "Story unliked."
        );


        return true;


    } catch (error) {

        console.error(
            "NEXA Story like error:",
            error.message,
            error.details,
            error.hint,
            error.code
        );


        showNotification(
            "Could not update the Story like."
        );


        return false;
    }
}


/* =========================================================
   STORY LIKE BUTTON
   ========================================================= */

if (storyViewerLike) {

    storyViewerLike.addEventListener(
        "click",
        async event => {

            event.preventDefault();
            event.stopPropagation();


            if (!selectedStoryId) {
                return;
            }


            await toggleStoryLike(
                selectedStoryId
            );
        }
    );
}


/* =========================================================
   OPEN STORY COMMENTS
   ========================================================= */

async function openStoryCommentPanel(storyId) {

    if (
        String(selectedStoryId) !==
        String(storyId)
    ) {
        return;
    }


    if (!storyCommentPanel) {
        return;
    }


    try {

        const {
            data,
            error
        } =
            await nexaSupabase
                .from("stories")
                .select(
                    "id, comments"
                )
                .eq(
                    "id",
                    storyId
                )
                .single();


        if (error) {
            throw error;
        }


        if (
            String(selectedStoryId) !==
            String(storyId)
        ) {
            return;
        }


        const story =
            stories.find(
                item =>
                    String(item.id) ===
                    String(storyId)
            );


        if (!story) {
            return;
        }


        story.comments =
            Array.isArray(data.comments)
                ? data.comments
                : [];


        const comments =
            story.comments;


        let existingComments =
            storyCommentPanel.querySelector(
                ".story-existing-comments"
            );


        if (!existingComments) {

            existingComments =
                document.createElement(
                    "div"
                );

            existingComments.className =
                "story-existing-comments";


            const box =
                storyCommentPanel.querySelector(
                    ".story-comment-panel-box"
                );


            const form =
                storyCommentPanel.querySelector(
                    "#storyCommentForm"
                );


            if (
                box &&
                form
            ) {

                box.insertBefore(
                    existingComments,
                    form
                );

            } else if (box) {

                box.appendChild(
                    existingComments
                );
            }
        }


        existingComments.innerHTML =
            "";


        if (
            comments.length ===
            0
        ) {

            const empty =
                document.createElement(
                    "div"
                );

            empty.className =
                "story-no-comments";

            empty.textContent =
                "No comments yet. Be the first.";


            existingComments.appendChild(
                empty
            );

        } else {

            comments.forEach(
                comment => {

                    const item =
                        document.createElement(
                            "div"
                        );

                    item.className =
                        "story-existing-comment";


                    const username =
                        document.createElement(
                            "strong"
                        );

                    username.textContent =
                        comment.username ||
                        "NEXA User";


                    const text =
                        document.createElement(
                            "span"
                        );

                    text.textContent =
                        comment.text ||
                        "";


                    item.appendChild(
                        username
                    );

                    item.appendChild(
                        text
                    );


                    existingComments.appendChild(
                        item
                    );
                }
            );
        }


        if (storyViewerComments) {

            storyViewerComments.textContent =
                comments.length;
        }


        storyCommentPanel.hidden =
            false;

        storyCommentPanel.style.display =
            "flex";


        if (storyCommentInput) {

            storyCommentInput.value =
                "";

            setTimeout(
                () => {

                    storyCommentInput.focus();

                },
                100
            );
        }


    } catch (error) {

        console.error(
            "NEXA Story comments load error:",
            error.message,
            error.details,
            error.hint,
            error.code
        );


        showNotification(
            "Could not load Story comments."
        );
    }
}

/* =========================================================
   STORY SHARE TO FRIEND
   ========================================================= */

async function shareStoryToFriend(storyId, friendId) {

    try {

        const story =
            stories.find(
                item =>
                    String(item.id) ===
                    String(storyId)
            );

        if (!story) {
            showNotification("Story not found.");
            return false;
        }

        const senderId =
            Number(getUserId());

        const receiverId =
            Number(friendId);

        if (!senderId || !receiverId) {
            showNotification("Invalid user.");
            return false;
        }

        const message = {

            id:
                Date.now() +
                "-" +
                Math.random()
                    .toString(36)
                    .slice(2, 8),

            senderId:
                senderId,

            receiverId:
                receiverId,

            conversationId:
                createConversationId(
                    senderId,
                    receiverId
                ),

            text:
                `Shared a story: ${story.media || ""}`,

            media:
                story.media || null,

            mediaType:
                story.mediaType || "story",

            storyId:
                story.id,

            createdAt:
                new Date().toISOString()
        };


        const response =
            await fetch(
                `${API_URL}/api/messages`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify(message)
                }
            );


        if (!response.ok) {
            throw new Error(
                "Message could not be sent."
            );
        }


        /* -------------------------------------------------
           INCREASE STORY SHARE COUNT
        ------------------------------------------------- */

        const {
            data: currentStory,
            error: storyError
        } =
            await nexaSupabase
                .from("stories")
                .select(
                    "id, shares"
                )
                .eq(
                    "id",
                    story.id
                )
                .single();


        if (!storyError) {

            const newShares =
                Number(
                    currentStory?.shares || 0
                ) + 1;


            await nexaSupabase
                .from("stories")
                .update({
                    shares:
                        newShares
                })
                .eq(
                    "id",
                    story.id
                );


            story.shares =
                newShares;


            if (
                String(selectedStoryId) ===
                String(story.id) &&
                storyViewerShares
            ) {

                storyViewerShares.textContent =
                    newShares;
            }
        }


        showNotification(
            "Story sent successfully."
        );

        return true;


    } catch (error) {

        console.error(
            "NEXA Story share error:",
            error
        );

        showNotification(
            "Could not send the story."
        );

        return false;
    }
}

/* =========================================================
   STORY COMMENT BUTTON
   ========================================================= */

if (storyViewerComment) {

    storyViewerComment.addEventListener(
        "click",
        event => {

            event.preventDefault();
            event.stopPropagation();


            if (!selectedStoryId) {
                return;
            }


            openStoryCommentPanel(
                selectedStoryId
            );
        }
    );
}


/* =========================================================
   CREATE STORY INPUT
   ========================================================= */

function createStoryFileInput() {

    const input =
        document.createElement(
            "input"
        );

    input.type =
        "file";

    input.accept =
        "image/*,video/*";


    input.addEventListener(
        "change",
        async () => {

            const file =
                input.files?.[0];

            if (!file) {
                return;
            }


            try {

                showNotification(
                    "Uploading story..."
                );

                console.log("NEXA STORY: upload started");


                /* =============================================
                   1. UNIQUE STORAGE PATH
                   ============================================= */

                const extension =
                    file.name
                        .split(".")
                        .pop()
                        .toLowerCase();


                const filePath =
                    `stories/${getUserId()}_${Date.now()}.${extension}`;


                /* =============================================
                   2. UPLOAD TO SUPABASE STORAGE
                   ============================================= */

                console.log(
                    "NEXA STORY: sending file to Supabase Storage",
                    file.name,
                    file.type,
                    file.size
                );

                const {
                    error: uploadError
                } =
                    await nexaSupabase
                        .storage
                        .from("nexa-media")
                        .upload(
                            filePath,
                            file,
                            {
                                cacheControl:
                                    "3600",

                                upsert:
                                    false,

                                contentType:
                                    file.type
                            }
                        );

                console.log(
                    "NEXA STORY: Storage upload finished",
                    uploadError
                );

                if (uploadError) {
                    throw uploadError;
                }


                /* =============================================
                   3. GET PUBLIC URL
                   ============================================= */

                const {
                    data:
                    publicURLData
                } =
                    nexaSupabase
                        .storage
                        .from("nexa-media")
                        .getPublicUrl(
                            filePath
                        );


                const mediaURL =
                    publicURLData.publicUrl;


                if (!mediaURL) {

                    throw new Error(
                        "Could not get story media URL."
                    );
                }


                /* =============================================
                   4. SAVE STORY TO SUPABASE
                   ============================================= */

                const {
                    data,
                    error
                } =
                    await nexaSupabase
                        .from("stories")
                        .insert({

                            user_id:
                                String(
                                    getUserId()
                                ),

                            username:
                                getUsername(),

                            media:
                                mediaURL,

                            media_type:
                                file.type.startsWith(
                                    "video/"
                                )
                                    ? "video"
                                    : "image"

                        })
                        .select()
                        .single();


                if (error) {
                    throw error;
                }


                /* =============================================
                   5. ADD TO LOCAL ARRAY
                   ============================================= */

                const newStory = {

                    id:
                        data.id,

                    userId:
                        data.user_id,

                    username:
                        data.username,

                    media:
                        data.media,

                    mediaType:
                        data.media_type,

                    createdAt:
                        data.created_at
                };


                stories.unshift(
                    newStory
                );


                /* =============================================
                   6. UPDATE UI
                   ============================================= */

                renderStories();


                showNotification(
                    "Your story is live!"
                );


                /* =============================================
                   7. OPEN STORY
                   ============================================= */

                openStory(
                    newStory.id
                );


            } catch (error) {

                console.error(
                    "NEXA Supabase story upload error:",
                    error
                );

                showNotification(
                    error.message ||
                    "Could not publish your story."
                );
            }
        }
    );


    input.click();
}


/* =========================================================
   ADD STORY BUTTON
   ========================================================= */

if (addStoryButton) {

    addStoryButton.addEventListener(
        "click",
        createStoryFileInput
    );
}



/* =====================================================
   OPEN PANEL
===================================================== */

storyCommentPanel.hidden =
    false;

storyCommentPanel.style.display =
    "flex";


if (storyCommentInput) {

    storyCommentInput.value =
        "";

    setTimeout(
        () => {

            storyCommentInput.focus();

        },
        100
    );
}


/* =========================================================
   CLOSE STORY COMMENT PANEL
   ========================================================= */

function closeStoryCommentPanel() {

    if (!storyCommentPanel) {
        return;
    }

    storyCommentPanel.hidden =
        true;

    storyCommentPanel.style.display =
        "none";

    if (storyCommentInput) {
        storyCommentInput.value =
            "";
    }
}


if (closeStoryComment) {

    closeStoryComment.addEventListener(
        "click",
        event => {

            event.preventDefault();
            event.stopPropagation();

            closeStoryCommentPanel();
        }
    );
}



/* =========================================================
   CLOSE STORY
   ========================================================= */

function closeStory() {

    if (!storyViewer) {
        return;
    }


    storyViewer.hidden =
        true;

    storyViewer.style.display =
        "none";

    storyViewer.setAttribute(
        "aria-hidden",
        "true"
    );


    if (storyViewerContent) {

        storyViewerContent.innerHTML =
            "";
    }


    selectedStoryId =
        null;
}


if (closeStoryViewer) {

    closeStoryViewer.addEventListener(
        "click",
        closeStory
    );
}


/* =========================================================
   VIEW ALL STORIES
   ========================================================= */

if (viewAllStories) {

    viewAllStories.addEventListener(
        "click",
        () => {

            if (
                stories.length ===
                0
            ) {

                showNotification(
                    "No stories yet."
                );

                return;
            }


            openStory(
                stories[0].id
            );
        }
    );
}


/* =========================================================
   RENDER STORIES
   Video stories show a thumbnail preview
   ========================================================= */

function renderStories() {

    if (!storiesContainer) {
        return;
    }

    storiesContainer.innerHTML = "";


    /* =====================================================
       YOUR STORY
       ===================================================== */

    const yourStory =
        document.createElement("div");

    yourStory.className =
        "story create-story";

    yourStory.innerHTML = `

        <div
            class="story-avatar-wrapper"
        >

       <div
    class="story-avatar"
    id="storyAvatar"
>
    ${getUserAvatar()
            ? `
                <img
                    src="${escapeHTML(
                getUserAvatar()
            )}"
                    alt="${escapeHTML(
                getUsername()
            )}"
                >
              `
            : escapeHTML(
                getAvatarLetter(
                    getUsername()
                )
            )
        }
</div>

            <button
                class="add-story"
                type="button"
                aria-label="Add a story"
            >
                +
            </button>

        </div>

        <span>
            Your story
        </span>
    `;


    const storyAddButton =
        yourStory.querySelector(
            ".add-story"
        );


    if (storyAddButton) {

        storyAddButton.addEventListener(
            "click",
            event => {

                event.stopPropagation();

                createStoryFileInput();
            }
        );
    }


    storiesContainer.appendChild(
        yourStory
    );


    /* =====================================================
       OTHER STORIES
       ===================================================== */

    stories.forEach(
        story => {

            const item =
                document.createElement(
                    "div"
                );

            item.className =
                "story";


            const ring =
                document.createElement(
                    "div"
                );

            ring.className =
                "story-ring";


            const mediaType =
                String(
                    story.mediaType || ""
                ).toLowerCase();


            /* =================================================
    VIDEO STORY → SHOW FIRST VIDEO FRAME
    ================================================= */

            if (
                mediaType.startsWith("video")
            ) {

                const video =
                    document.createElement("video");

                video.src =
                    getMediaURL(
                        story.media
                    ) + "?v=" + Date.now();

                video.muted =
                    true;

                video.playsInline =
                    true;

                video.preload =
                    "metadata";

                video.load();

                video.setAttribute(
                    "webkit-playsinline",
                    "true"
                );


                video.addEventListener(
                    "loadeddata",
                    () => {

                        try {

                            video.currentTime =
                                0.1;

                            video.pause();

                        } catch { }
                    }
                );


                ring.appendChild(
                    video
                );

            } else {

                /* =============================================
                   IMAGE STORY
                   ============================================= */

                const image =
                    document.createElement(
                        "img"
                    );

                image.src =
                    getMediaURL(
                        story.media
                    );

                image.alt =
                    "Story";


                ring.appendChild(
                    image
                );
            }


            const username =
                document.createElement(
                    "span"
                );

            username.textContent =
                story.username ||
                "NEXA User";


            item.appendChild(
                ring
            );

            item.appendChild(
                username
            );


            item.addEventListener(
                "click",
                () => {

                    openStory(
                        story.id
                    );
                }
            );


            storiesContainer.appendChild(
                item
            );
        }
    );
}




/* =========================================================
   STORY COMMENT BUTTON
   ========================================================= */

if (storyViewerComment) {

    storyViewerComment.addEventListener(
        "click",
        event => {

            event.preventDefault();
            event.stopPropagation();

            if (!selectedStoryId) {
                return;
            }

            openStoryCommentPanel(
                selectedStoryId
            );
        }
    );
}


/* =========================================================
   STORY COMMENT FORM
   Supabase-backed
   ========================================================= */

if (storyCommentForm) {

    storyCommentForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();
            event.stopPropagation();


            if (!selectedStoryId) {
                return;
            }


            const story =
                stories.find(
                    item =>
                        String(item.id) ===
                        String(selectedStoryId)
                );


            if (!story) {
                return;
            }


            const text =
                storyCommentInput
                    ? storyCommentInput.value.trim()
                    : "";


            if (!text) {
                return;
            }


            if (
                !Array.isArray(
                    story.comments
                )
            ) {

                story.comments =
                    [];
            }


            const oldComments =
                [
                    ...story.comments
                ];


            const newComment = {

                id:
                    Date.now(),

                userId:
                    String(
                        getUserId()
                    ),

                username:
                    getUsername(),

                text:
                    text,

                createdAt:
                    new Date()
                        .toISOString()
            };


            story.comments.push(
                newComment
            );


            try {

                const {
                    data,
                    error
                } =
                    await nexaSupabase
                        .from("stories")
                        .update({

                            comments:
                                story.comments

                        })
                        .eq(
                            "id",
                            story.id
                        )
                        .select(
                            "id, comments"
                        )
                        .single();


                if (error) {
                    throw error;
                }


                story.comments =
                    Array.isArray(
                        data.comments
                    )
                        ? data.comments
                        : [];


                if (storyViewerComments) {

                    storyViewerComments.textContent =
                        story.comments.length;
                }


                closeStoryCommentPanel();


                showNotification(
                    "Comment posted."
                );


                console.log(
                    "NEXA Story comment saved:",
                    data
                );


            } catch (error) {

                story.comments =
                    oldComments;


                console.error(
                    "NEXA Story comment error:",
                    error.message,
                    error.details,
                    error.hint,
                    error.code
                );


                showNotification(
                    "Could not save your Story comment."
                );
            }
        }
    );
}


/* =========================================================
   STORY LIKE BUTTON
   ========================================================= */

if (storyViewerLike) {

    storyViewerLike.addEventListener(
        "click",
        async event => {

            event.preventDefault();
            const story =
                selectedStoryCommentId
                    ? stories.find(
                        item =>
                            String(item.id) ===
                            String(selectedStoryCommentId)
                    )
                    : null;

            if (story) {

                const text =
                    commentInput
                        ? commentInput.value.trim()
                        : "";

                if (!text) {
                    return;
                }


                if (!Array.isArray(story.comments)) {
                    story.comments = [];
                }


                const oldComments =
                    [...story.comments];


                const newComment = {

                    id:
                        Date.now(),

                    userId:
                        String(
                            getUserId()
                        ),

                    username:
                        getUsername(),

                    text:
                        text,

                    createdAt:
                        new Date().toISOString()
                };


                story.comments.push(
                    newComment
                );


                try {

                    const {
                        data,
                        error
                    } =
                        await nexaSupabase
                            .from("stories")
                            .update({
                                comments:
                                    story.comments
                            })
                            .eq(
                                "id",
                                story.id
                            )
                            .select(
                                "id, comments"
                            )
                            .single();


                    if (error) {
                        throw error;
                    }


                    story.comments =
                        Array.isArray(data.comments)
                            ? data.comments
                            : [];


                    if (commentInput) {
                        commentInput.value = "";
                    }


                    if (storyViewerComments) {

                        storyViewerComments.textContent =
                            story.comments.length;
                    }


                    openStoryComments(
                        story.id
                    );


                    showNotification(
                        "Story comment posted."
                    );


                    return;

                } catch (error) {

                    story.comments =
                        oldComments;

                    console.error(
                        "NEXA Story comment error:",
                        error.message,
                        error.details,
                        error.hint,
                        error.code
                    );

                    showNotification(
                        "Could not save your Story comment."
                    );

                    return;
                }
            }
            event.stopPropagation();

            if (!selectedStoryId) {
                return;
            }

            await toggleStoryLike(
                selectedStoryId
            );
        }
    );
}


/* =========================================================
   CLOSE STORY
   ========================================================= */

function closeStory() {

    if (!storyViewer) {
        return;
    }

    storyViewer.hidden =
        true;

    storyViewer.style.display =
        "none";

    storyViewer.setAttribute(
        "aria-hidden",
        "true"
    );


    if (storyViewerContent) {

        storyViewerContent.innerHTML =
            "";
    }


    selectedStoryId =
        null;
}


if (closeStoryViewer) {

    closeStoryViewer.addEventListener(
        "click",
        closeStory
    );
}


/* =========================================================
   VIEW ALL STORIES
   ========================================================= */

if (viewAllStories) {

    viewAllStories.addEventListener(
        "click",
        () => {

            if (
                stories.length ===
                0
            ) {

                showNotification(
                    "No stories yet."
                );

                return;
            }


            openStory(
                stories[0].id
            );
        }
    );
}


/* =========================================================
   SEARCH
   ========================================================= */

if (searchInput) {

    searchInput.addEventListener(
        "input",
        () => {

            renderFeed(
                searchInput.value
            );
        }
    );
}


/* =========================================================
   NOTIFICATIONS BUTTON
   ========================================================= */

if (notificationButton) {

    notificationButton.addEventListener(
        "click",
        () => {

            showNotification(
                "You're all caught up."
            );
        }
    );
}


/* =========================================================
   LOGOUT
   ========================================================= */

if (logoutButton) {

    logoutButton.addEventListener(
        "click",
        () => {

            localStorage.removeItem(
                "nexaCurrentUser"
            );

            window.location.href =
                "index.html";
        }
    );
}


/* =========================================================
   CLOSE VIEWER
   ========================================================= */

if (closeReelViewer) {

    closeReelViewer.addEventListener(
        "click",
        event => {

            event.preventDefault();
            event.stopPropagation();

            closeViewer();

            /*
             * Remove focus from the button before
             * the viewer becomes aria-hidden.
             */

            closeReelViewer.blur();
        },
        true
    );
}


if (reelViewerBackdrop) {

    reelViewerBackdrop.addEventListener(
        "click",
        event => {

            /*
             * ONLY the backdrop itself may close
             * the fullscreen viewer.
             */

            if (
                event.target !==
                reelViewerBackdrop
            ) {
                return;
            }

            event.preventDefault();
            event.stopPropagation();

            closeViewer();
        }
    );
}


/* =========================================================
   INITIALIZE
   ========================================================= */
async function initializeHome() {

    await loadCurrentProfileForHome();

    updateHomeAvatars();

    await loadStories();

    renderStories();

    await loadPosts();

    renderFeed();


    if (reelViewer) {

        reelViewer.hidden =
            true;

        reelViewer.style.display =
            "none";

        reelViewer.classList.remove(
            "active"
        );

        reelViewer.setAttribute(
            "aria-hidden",
            "true"
        );
    }


    viewerIsOpen =
        false;

    document.body.classList.remove(
        "reel-open"
    );

    document.body.style.overflow =
        "";
}


/* =========================================================
   START
   ========================================================= */

initializeHome();
