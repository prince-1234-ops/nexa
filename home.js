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
   API
   ========================================================= */

const API_BASE = "http://localhost:3000/api";


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
        currentUser.profilePicture ||
        currentUser.profileImage ||
        currentUser.avatar ||
        currentUser.image ||
        ""
    );
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

    const letter =
        getAvatarLetter(
            getUsername()
        );

    [
        miniAvatar,
        postAvatar,
        storyAvatar
    ].forEach(
        element => {

            if (!element) {
                return;
            }

            const avatar =
                getUserAvatar();

            if (avatar) {

                element.innerHTML = `
                    <img
                        src="${escapeHTML(avatar)}"
                        alt="${escapeHTML(
                            getUsername()
                        )}"
                    >
                `;

            } else {

                element.textContent =
                    letter;
            }
        }
    );
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

    if (
        !post
    ) {
        return 0;
    }

    if (
        Array.isArray(post.likes)
    ) {
        return post.likes.length;
    }

    return Number(
        post.likes || 0
    );
}


function getCommentsCount(post) {

    if (
        !post ||
        !Array.isArray(post.comments)
    ) {
        return 0;
    }

    return post.comments.length;
}


function getSharesCount(post) {

    if (!post) {
        return 0;
    }

    return Number(
        post.shares || 0
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
                    !likesByPost[
                        postId
                    ]
                ) {

                    likesByPost[
                        postId
                    ] = [];
                }

                likesByPost[
                    postId
                ].push(
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

                    return {

                        id:
                            post.id,

                        createdAt:
                            post.created_at,

                        authorId:
                            post.author_id,

                        authorName:
                            post.author_name,

                        authorAvatar:
                            post.author_avatar ||
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
                            likesByPost[
                                postId
                            ] || [],

                        comments:
    Array.isArray(post.comments)
        ? post.comments
        : [],

                        shares:
                            0,

                        savedBy:
                            []
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

                    ${
                        post.authorAvatar &&
                        (
                            String(
                                post.authorAvatar
                            ).startsWith(
                                "http"
                            ) ||
                            String(
                                post.authorAvatar
                            ).startsWith(
                                "/"
                            )
                        )
                            ? `
                                <img
                                    src="${escapeHTML(
                                        getMediaURL(
                                            post.authorAvatar
                                        )
                                    )}"
                                    alt="${escapeHTML(
                                        post.authorName ||
                                        "NEXA User"
                                    )}"
                                >
                            `
                            : escapeHTML(
                                post.authorAvatar ||
                                getAvatarLetter(
                                    post.authorName
                                )
                            )
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

                    ${
                        post.text
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
                            ${
                                liked
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
                            ${
                                liked
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
                            ${
                                saved
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
                            ${
                                saved
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
       CLICK VIDEO = PLAY / PAUSE
    ------------------------------------------------------- */

    video.addEventListener(
        "click",
        event => {

            event.preventDefault();
            event.stopPropagation();

            if (
                video.paused
            ) {

                video
                    .play()
                    .catch(
                        () => {}
                    );

            } else {

                video.pause();
            }
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
                        () => {}
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


    /* -------------------------------------------------------
       OPEN FULLSCREEN WHEN MEDIA IS CLICKED
    ------------------------------------------------------- */

    video.addEventListener(
        "dblclick",
        event => {

            event.preventDefault();
            event.stopPropagation();

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
        document.createElement(
            "article"
        );

    article.className =
        "feed-post";

    article.dataset.id =
        post.id;

    const liked =
        userLiked(post);

    const saved =
        userSaved(post);

    const mediaType =
        String(
            post.mediaType ||
            ""
        ).toLowerCase();

    const hasImage =
        mediaType === "image" ||
        mediaType === "photo";

    const hasVideo =
        mediaType === "video";

    article.innerHTML = `

        <div class="post-header">

            <div class="post-author">

                <div class="post-user-avatar">

                    ${escapeHTML(
                        post.authorAvatar ||
                        getAvatarLetter(
                            post.authorName
                        )
                    )}

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
            >
                ⋯
            </button>

        </div>


        ${
            post.text
                ? `
                    <div class="post-caption">

                        ${escapeHTML(
                            post.text
                        )}

                    </div>
                `
                : ""
        }


        ${
            hasImage
                ? `
                    <div
                        class="post-media"
                        data-media-type="image"
                    >

                        <img
                            src="${escapeHTML(
                                getMediaURL(
                                    post.media
                                )
                            )}"
                            alt="NEXA post"
                        >

                    </div>
                `
                : ""
        }


        ${
            hasVideo
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
                            controls
                            playsinline
                            preload="metadata"
                        ></video>

                    </div>
                `
                : ""
        }


        <div class="post-actions">

            <button
                type="button"
                data-action="like"
                data-id="${escapeHTML(
                    post.id
                )}"
            >

                <span>
                    ${
                        liked
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
                data-action="comment"
                data-id="${escapeHTML(
                    post.id
                )}"
            >

                <span>
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
                data-action="share"
                data-id="${escapeHTML(
                    post.id
                )}"
            >

                <span>
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
                data-action="save"
                data-id="${escapeHTML(
                    post.id
                )}"
            >

                <span>
                    ${
                        saved
                            ? "★"
                            : "☆"
                    }
                </span>

            </button>

        </div>
    `;

    feedPosts.appendChild(
        article
    );
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

                            video
                                .play()
                                .catch(
                                    () => {}
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

                    } catch {}
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
                            () => {}
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
   Server-backed
   ========================================================= */

async function toggleSave(
    postId,
    rerenderFeed = true
) {

    const post =
        findPost(
            postId
        );

    if (!post) {
        return false;
    }

    if (
        !Array.isArray(
            post.savedBy
        )
    ) {

        post.savedBy =
            [];
    }

    const userId =
        getUserId();

    const index =
        post.savedBy.findIndex(
            id =>
                String(id) ===
                String(userId)
        );

    if (
        index !==
        -1
    ) {

        post.savedBy.splice(
            index,
            1
        );

        showNotification(
            "Removed from saved."
        );

    } else {

        post.savedBy.push(
            userId
        );

        showNotification(
            "Post saved."
        );
    }


    const result =
        await updatePostOnServer(
            post
        );


    if (!result) {

        /*
         * Undo the local change
         * if server update failed.
         */

        const nowIndex =
            post.savedBy.findIndex(
                id =>
                    String(id) ===
                    String(userId)
            );

        if (
            index !== -1 &&
            nowIndex === -1
        ) {

            post.savedBy.push(
                userId
            );

        } else if (
            index === -1 &&
            nowIndex !== -1
        ) {

            post.savedBy.splice(
                nowIndex,
                1
            );
        }

        showNotification(
            "Could not save this change."
        );

        return false;
    }


    if (
        rerenderFeed
    ) {

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
   ========================================================= */

async function sharePost(
    postId,
    rerenderFeed = true
) {

    const post =
        findPost(
            postId
        );

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


    try {

        if (
            navigator.share
        ) {

            await navigator.share(
                shareData
            );

        } else if (
            navigator.clipboard
        ) {

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


    post.shares =
        getSharesCount(
            post
        ) + 1;


    const result =
        await updatePostOnServer(
            post
        );


    if (!result) {

        post.shares =
            Math.max(
                0,
                post.shares - 1
            );

        return false;
    }


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


    if (
        rerenderFeed
    ) {

        renderFeed(
            searchInput
                ? searchInput.value
                : ""
        );
    }


    return true;
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
                []
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
                                postInput
                                    ? postInput.value.trim()
                                    : "",

                            media:
                                mediaURL,

                            media_type:
                                type

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
   STORIES
   ========================================================= */

function loadStories() {

    try {

        const stored =
            JSON.parse(
                localStorage.getItem(
                    "nexaStories"
                ) || "[]"
            );

        stories =
            Array.isArray(
                stored
            )
                ? stored
                : [];

    } catch {

        stories =
            [];
    }
}


function saveStories() {

    try {

        localStorage.setItem(
            "nexaStories",
            JSON.stringify(
                stories
            )
        );

    } catch (error) {

        console.error(
            "Could not save stories:",
            error
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


    storiesContainer.innerHTML =
        "";


    const yourStory =
        document.createElement(
            "div"
        );

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
                ${escapeHTML(
                    getAvatarLetter(
                        getUsername()
                    )
                )}
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


    stories.forEach(
        story => {

            const item =
                document.createElement(
                    "div"
                );

            item.className =
                "story";


            item.innerHTML = `

                <div
                    class="story-ring"
                >

                    ${
                        String(
                            story.mediaType ||
                            ""
                        ).startsWith(
                            "video"
                        )
                            ? `
                                <video
                                    src="${escapeHTML(
                                        getMediaURL(
                                            story.media
                                        )
                                    )}"
                                    muted
                                    playsinline
                                ></video>
                            `
                            : `
                                <img
                                    src="${escapeHTML(
                                        getMediaURL(
                                            story.media
                                        )
                                    )}"
                                    alt="Story"
                                >
                            `
                    }

                </div>

                <span>
                    ${escapeHTML(
                        story.username ||
                        story.authorName ||
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
        () => {

            const file =
                input.files?.[0];

            if (!file) {
                return;
            }


            const reader =
                new FileReader();


            reader.onload =
                () => {

                    const story = {

                        id:
                            Date.now(),

                        userId:
                            getUserId(),

                        username:
                            getUsername(),

                        media:
                            reader.result,

                        mediaType:
                            file.type.startsWith(
                                "video/"
                            )
                                ? "video"
                                : "image",

                        createdAt:
                            new Date()
                                .toISOString()
                    };


                    stories.unshift(
                        story
                    );


                    saveStories();


                    renderStories();


                    showNotification(
                        "Your story is live!"
                    );


                    openStory(
                        story.id
                    );
                };


            reader.readAsDataURL(
                file
            );
        }
    );


    input.click();
}


if (addStoryButton) {

    addStoryButton.addEventListener(
        "click",
        createStoryFileInput
    );
}


/* =========================================================
   OPEN STORY
   ========================================================= */

function openStory(storyId) {

    const story =
        stories.find(
            item =>
                String(
                    item.id
                ) ===
                String(
                    storyId
                )
        );

    if (
        !story ||
        !storyViewer ||
        !storyViewerContent
    ) {
        return;
    }


    selectedStoryId =
        story.id;


    storyViewerContent.innerHTML =
        "";


    if (
        String(
            story.mediaType ||
            ""
        ).startsWith(
            "video"
        )
    ) {

        const video =
            document.createElement(
                "video"
            );

        video.src =
            getMediaURL(
                story.media
            );

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
            getMediaURL(
                story.media
            );

        image.alt =
            "NEXA Story";


        storyViewerContent.appendChild(
            image
        );
    }


    storyViewer.hidden =
        false;

    storyViewer.style.display =
        "flex";

    storyViewer.setAttribute(
        "aria-hidden",
        "false"
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

    updateHomeAvatars();

    loadStories();

    renderStories();


    /*
     * IMPORTANT:
     * Load the real posts from posts.json
     * on your server.
     */

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