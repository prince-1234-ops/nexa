/* =========================================================
   NEXA PROFILE
   Supabase + Public Profiles + Posts + Likes + Friends
========================================================= */


/* =========================================================
   SUPABASE
========================================================= */

if (
    typeof nexaSupabase === "undefined"
) {
    throw new Error(
        "NEXA Supabase is not available."
    );
}


const storedUser =
    JSON.parse(
        localStorage.getItem(
            "nexaCurrentUser"
        )
    );


if (!storedUser) {

    window.location.href =
        "index.html";

    throw new Error(
        "No NEXA user is logged in."
    );
}


/* =========================================================
   CURRENT USER
========================================================= */

let currentUser =
    storedUser;


let profileUser =
    null;


let isOwnProfile =
    true;


let profilePosts =
    [];


let profileStories =
    [];


let profileLikesCount =
    0;


/* =========================================================
   DOM
========================================================= */

const profilePageLoading =
    document.getElementById(
        "profilePageLoading"
    );

const profileUsernameTitle =
    document.getElementById(
        "profileUsernameTitle"
    );

const profilePhoto =
    document.getElementById(
        "profilePhoto"
    );

const profilePhotoFallback =
    document.getElementById(
        "profilePhotoFallback"
    );

const profileName =
    document.getElementById(
        "profileName"
    );

const profileUsername =
    document.getElementById(
        "profileUsername"
    );

const profileBio =
    document.getElementById(
        "profileBio"
    );

const profilePostsCount =
    document.getElementById(
        "profilePostsCount"
    );

const profileFriendsCount =
    document.getElementById(
        "profileFriendsCount"
    );

const profileLikesCountElement =
    document.getElementById(
        "profileLikesCount"
    );

const profileStoriesElement =
    document.getElementById(
        "profileStories"
    );

const profileStoriesLoading =
    document.getElementById(
        "profileStoriesLoading"
    );

const profilePostsGrid =
    document.getElementById(
        "profilePostsGrid"
    );

const profilePostsLoading =
    document.getElementById(
        "profilePostsLoading"
    );

const profileEmptyPosts =
    document.getElementById(
        "profileEmptyPosts"
    );

const editProfileButton =
    document.getElementById(
        "editProfileButton"
    );

const addFriendProfileButton =
    document.getElementById(
        "addFriendProfileButton"
    );

const messageProfileButton =
    document.getElementById(
        "messageProfileButton"
    );

const profileBackButton =
    document.getElementById(
        "profileBackButton"
    );

const profileMenuButton =
    document.getElementById(
        "profileMenuButton"
    );

const profileStatusCloud =
    document.getElementById(
        "profileStatusCloud"
    );

const profileStatusPreview =
    document.getElementById(
        "profileStatusPreview"
    );

const profileStatusModal =
    document.getElementById(
        "profileStatusModal"
    );

const profileStatusInput =
    document.getElementById(
        "profileStatusInput"
    );

const profileStatusCharacters =
    document.getElementById(
        "profileStatusCharacters"
    );

const saveProfileStatusButton =
    document.getElementById(
        "saveProfileStatusButton"
    );

const editProfileModal =
    document.getElementById(
        "editProfileModal"
    );

const profilePictureInput =
    document.getElementById(
        "profilePictureInput"
    );

const editProfilePhotoPreview =
    document.getElementById(
        "editProfilePhotoPreview"
    );

const editProfileName =
    document.getElementById(
        "editProfileName"
    );

const editProfileUsername =
    document.getElementById(
        "editProfileUsername"
    );

const editProfileBio =
    document.getElementById(
        "editProfileBio"
    );

const saveProfileButton =
    document.getElementById(
        "saveProfileButton"
    );

const profilePostViewer =
    document.getElementById(
        "profilePostViewer"
    );

const profilePostViewerContent =
    document.getElementById(
        "profilePostViewerContent"
    );

const closeProfilePostViewer =
    document.getElementById(
        "closeProfilePostViewer"
    );


/* =========================================================
   HELPERS
========================================================= */

function escapeHTML(
    value
) {

    const element =
        document.createElement(
            "div"
        );

    element.textContent =
        String(
            value ?? ""
        );

    return element.innerHTML;
}


function getProfilePicture(
    user
) {

    return (
        user?.profile_picture ||
        user?.profilePicture ||
        ""
    );
}


function getDisplayName(
    user
) {

    return (
        user?.name ||
        user?.username ||
        "NEXA Member"
    );
}


function normalizeFriends(
    value
) {

    if (
        Array.isArray(value)
    ) {
        return value;
    }


    if (
        typeof value ===
        "string"
    ) {

        const trimmed =
            value.trim();

        if (!trimmed) {
            return [];
        }


        try {

            const parsed =
                JSON.parse(
                    trimmed
                );

            return Array.isArray(
                parsed
            )
                ? parsed
                : [];

        } catch (_) {

            return trimmed
                .split(",")
                .map(
                    id =>
                        id.trim()
                )
                .filter(Boolean);
        }
    }


    return [];
}


function getFriendIds(
    user
) {

    return normalizeFriends(
        user?.friends
    )
        .map(
            friend =>
                typeof friend ===
                    "object"
                    ? friend?.id
                    : friend
        )
        .filter(
            id =>
                id !==
                undefined &&
                id !==
                null &&
                String(id).trim()
        )
        .map(
            id =>
                String(id)
        );
}


function showLoading(
    visible
) {

    if (
        !profilePageLoading
    ) {
        return;
    }


    profilePageLoading.classList.toggle(
        "hidden",
        !visible
    );
}


/* =========================================================
   PROFILE USER ID
========================================================= */

function getRequestedProfileId() {

    const params =
        new URLSearchParams(
            window.location.search
        );

    return (
        params.get("user") ||
        params.get("id") ||
        String(
            currentUser.id
        )
    );
}


/* =========================================================
   LOAD PROFILE
========================================================= */

async function loadProfile() {

    const requestedId =
        getRequestedProfileId();


    isOwnProfile =
        String(requestedId) ===
        String(currentUser.id);


    try {

        const {
            data,
            error
        } =
            await nexaSupabase
                .from("profiles")
                .select(`
    id,
    name,
    username,
    profile_picture,
    bio,
    friends,
    created_at
`)
                .eq(
                    "id",
                    String(requestedId)
                )
                .maybeSingle();


        if (error) {
            throw error;
        }


        if (!data) {

            throw new Error(
                "Profile not found."
            );
        }


        profileUser =
            data;


        /*
         * Keep the logged-in user's
         * local identity synchronized.
         */

        if (isOwnProfile) {

            currentUser.name =
                data.name ??
                currentUser.name;

            currentUser.username =
                data.username ??
                currentUser.username;

            currentUser.profilePicture =
                data.profile_picture ||
                currentUser.profilePicture ||
                "";

            currentUser.profile_picture =
                data.profile_picture ||
                currentUser.profile_picture ||
                "";

            currentUser.bio =
                data.bio ??
                currentUser.bio;

            localStorage.setItem(
                "nexaCurrentUser",
                JSON.stringify(
                    currentUser
                )
            );
        }


        renderProfileHeader();


    } catch (error) {

        console.error(
            "NEXA profile loading error:",
            error
        );

        renderProfileError(
            "Could not load this profile."
        );
    }
}


/* =========================================================
   PROFILE HEADER
========================================================= */

function renderProfileHeader() {

    if (!profileUser) {
        return;
    }


    const name =
        getDisplayName(
            profileUser
        );


    const username =
        profileUser.username
            ? "@" +
            profileUser.username
            : "@nexa";


    const picture =
        getProfilePicture(
            profileUser
        );


    if (
        profileUsernameTitle
    ) {

        profileUsernameTitle.textContent =
            profileUser.username
                ? "@" +
                profileUser.username
                : name;
    }


    if (
        profileName
    ) {

        profileName.textContent =
            name;
    }


    if (
        profileUsername
    ) {

        profileUsername.textContent =
            username;
    }


    if (
        profileBio
    ) {

        profileBio.textContent =
            profileUser.bio ||
            "Welcome to NEXA.";
    }


    if (
        profilePhoto
    ) {

        if (picture) {

            profilePhoto.src =
                picture;

            profilePhoto.alt =
                name;

            profilePhoto.style.display =
                "block";

        } else {

            profilePhoto.removeAttribute(
                "src"
            );

            profilePhoto.style.display =
                "none";
        }
    }


    if (
        profilePhotoFallback
    ) {

        profilePhotoFallback.textContent =
            name
                .trim()
                .charAt(0)
                .toUpperCase() ||
            "N";

        profilePhotoFallback.style.display =
            picture
                ? "none"
                : "flex";
    }


    if (
        editProfileButton
    ) {

        editProfileButton.hidden =
            !isOwnProfile;
    }


    if (
        addFriendProfileButton
    ) {

        addFriendProfileButton.hidden =
            isOwnProfile;
    }


    if (
        messageProfileButton
    ) {

        messageProfileButton.hidden =
            isOwnProfile;
    }
}


/* =========================================================
   LOAD FRIEND COUNT
========================================================= */

async function loadFriendCount() {

    if (
        !profileUser
    ) {
        return;
    }


    const friendIds =
        getFriendIds(
            profileUser
        );


    if (
        profileFriendsCount
    ) {

        profileFriendsCount.textContent =
            friendIds.length;
    }


    /*
     * If this is the logged-in user,
     * always use the current local
     * friend list as the immediate
     * source of truth.
     */

    return friendIds.length;
}


/* =========================================================
   LOAD POSTS
========================================================= */


async function loadProfilePosts() {

    if (!profileUser) {
        return;
    }

    try {

        const profileId =
            String(profileUser.id);

        const {
            data,
            error
        } = await nexaSupabase
            .from("posts")
            .select("*")
            .eq(
                "author_id",
                profileId
            )
            .order(
                "created_at",
                {
                    ascending: false
                }
            );

        if (error) {
            throw error;
        }

        profilePosts =
            Array.isArray(data)
                ? data
                : [];

        if (profilePostsCount) {
            profilePostsCount.textContent =
                String(
                    profilePosts.length
                );
        }

        await loadProfileLikeCount();

        renderProfilePosts();

    } catch (error) {

        console.error(
            "NEXA profile posts error:",
            error
        );

        profilePosts = [];

        if (profilePostsCount) {
            profilePostsCount.textContent =
                "0";
        }

        renderProfilePosts();
    }
}


function formatEngagementCount(number) {

    const value =
        Number(number || 0);

    if (value >= 1000000) {
        return (
            value / 1000000
        ).toFixed(
            value % 1000000 === 0
                ? 0
                : 1
        ) + "M";
    }

    if (value >= 1000) {
        return (
            value / 1000
        ).toFixed(
            value % 1000 === 0
                ? 0
                : 1
        ) + "K";
    }

    return String(value);
}


/* =========================================================
   LOAD TOTAL LIKES
========================================================= */

async function loadProfileLikeCount() {

    if (!profileUser) {
        return;
    }

    try {

        if (!profilePosts.length) {

            profileLikesCount = 0;

        } else {

            const postIds =
                profilePosts
                    .map(post => post.id)
                    .filter(Boolean);


            if (!postIds.length) {

                profileLikesCount = 0;

            } else {

                const {
                    data,
                    error
                } = await nexaSupabase
                    .from("likes")
                    .select(
                        "id, post_id"
                    )
                    .in(
                        "post_id",
                        postIds
                    );

                if (error) {
                    throw error;
                }


                const realLikes =
                    Array.isArray(data)
                        ? data.length
                        : 0;


                const demoLikes =
                    profilePosts.reduce(
                        (total, post) =>
                            total +
                            Number(
                                post.demo_likes ||
                                0
                            ),
                        0
                    );


                profileLikesCount =
                    realLikes +
                    demoLikes;
            }
        }

    } catch (error) {

        console.error(
            "NEXA profile likes error:",
            error
        );

        profileLikesCount = 0;
    }


    const likesElement =
        document.getElementById(
            "profileLikesCount"
        );

    if (likesElement) {

        likesElement.textContent =
            formatEngagementCount(
                profileLikesCount
            );
    }
}


/* =========================================================
   POST MEDIA
========================================================= */

function getPostMedia(
    post
) {

    return (
        post?.media ||
        post?.image ||
        post?.image_url ||
        post?.video ||
        post?.video_url ||
        post?.media_url ||
        ""
    );
}

function getPostMediaType(post) {

    const explicit =
        String(
            post?.media_type ||
            post?.mediaType ||
            ""
        ).toLowerCase();

    if (explicit) {
        return explicit;
    }

    const media =
        getPostMedia(post);

    if (
        String(media).startsWith("data:video/")
    ) {
        return "video";
    }

    if (
        /\.(mp4|webm|ogg)(\?|$)/i.test(
            String(media)
        )
    ) {
        return "video";
    }

    return "image";
}


function timeAgoProfile(timestamp) {

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
   RENDER POSTS
========================================================= */

function renderProfilePosts() {

    if (profilePostsLoading) {
        profilePostsLoading.style.display = "none";
    }

    if (!profilePostsGrid) {
        return;
    }

    profilePostsGrid.innerHTML = "";

    if (!profilePosts.length) {

        profilePostsGrid.style.display = "none";

        if (profileEmptyPosts) {
            profileEmptyPosts.hidden = false;
        }

        return;
    }

    if (profileEmptyPosts) {
        profileEmptyPosts.hidden = true;
    }

    profilePostsGrid.style.display = "grid";


    profilePosts.forEach(post => {

        const media =
            getPostMedia(post);

        const mediaType =
            String(
                post.media_type ||
                post.mediaType ||
                ""
            ).toLowerCase();


        /* =====================================================
           REAL REEL
        ===================================================== */

        if (mediaType === "reel") {

            const reel =
                document.createElement("article");

            reel.className =
                "profile-reel-card";

            reel.dataset.postId =
                String(post.id);


            const demoLikes =
                Number(
                    post.demo_likes || 0
                );

            const realComments =
                Array.isArray(post.comments)
                    ? post.comments.length
                    : 0;

            const demoComments =
                Number(
                    post.demo_comments || 0
                );

            const realShares =
                Number(
                    post.shares || 0
                );

            const demoShares =
                Number(
                    post.demo_shares || 0
                );


            const likesText =
                formatEngagementCount(
                    demoLikes
                );

            const commentsText =
                formatEngagementCount(
                    demoComments +
                    realComments
                );

            const sharesText =
                formatEngagementCount(
                    demoShares +
                    realShares
                );


            reel.innerHTML = `

                <div class="profile-reel-media">

                    <video
                        <video
    src="${escapeHTML(media)}?v=${Date.now()}"
                        class="profile-reel-video"
                        muted
                        loop
                        playsinline
                        preload="metadata"
                    ></video>


                    <div class="profile-reel-gradient"></div>


                    <div class="profile-reel-author">

                        <div class="profile-reel-avatar">

                            ${profileUser
                    ? (
                        getProfilePicture(
                            profileUser
                        )
                            ? `
                                                <img
                                                    src="${escapeHTML(
                                getProfilePicture(
                                    profileUser
                                )
                            )}"
                                                    alt="${escapeHTML(
                                profileUser.username ||
                                profileUser.name ||
                                "NEXA User"
                            )}"
                                                >
                                              `
                            : escapeHTML(
                                (
                                    profileUser.username ||
                                    profileUser.name ||
                                    "N"
                                )
                                    .charAt(0)
                                    .toUpperCase()
                            )
                    )
                    : "N"
                }

                        </div>


                        <div>

                            <strong>
                                ${escapeHTML(
                    post.author_name ||
                    profileUser?.username ||
                    profileUser?.name ||
                    "NEXA User"
                )}
                            </strong>

                            <span>
                                ${escapeHTML(
                    timeAgoProfile(
                        post.created_at
                    )
                )}
                            </span>

                        </div>

                    </div>


                    <div class="profile-reel-actions">

                        <button
                            type="button"
                            class="profile-reel-action"
                            data-profile-action="like"
                            data-id="${escapeHTML(
                    post.id
                )}"
                        >

                            <span class="profile-reel-action-icon">
                                ♡
                            </span>

                            <span>
                                ${likesText}
                            </span>

                        </button>


                        <button
                            type="button"
                            class="profile-reel-action"
                            data-profile-action="comment"
                            data-id="${escapeHTML(
                    post.id
                )}"
                        >

                            <span class="profile-reel-action-icon">
                                💬
                            </span>

                            <span>
                                ${commentsText}
                            </span>

                        </button>


                        <button
                            type="button"
                            class="profile-reel-action"
                            data-profile-action="share"
                            data-id="${escapeHTML(
                    post.id
                )}"
                        >

                            <span class="profile-reel-action-icon">
                                ↗
                            </span>

                            <span>
                                ${sharesText}
                            </span>

                        </button>

                    </div>


                    ${post.text
                    ? `
                                <div class="profile-reel-caption">

                                    ${escapeHTML(
                        post.text
                    )}

                                </div>
                              `
                    : ""
                }

                </div>
            `;


            const video =
                reel.querySelector(
                    ".profile-reel-video"
                );


            reel.addEventListener(
                "click",
                event => {

                    const actionButton =
                        event.target.closest(
                            "[data-profile-action]"
                        );

                    if (actionButton) {
                        return;
                    }

                    openProfileReelViewer(
                        post
                    );
                }
            );


            const observer =
                new IntersectionObserver(
                    entries => {

                        entries.forEach(entry => {

                            if (
                                entry.isIntersecting &&
                                entry.intersectionRatio >= 0.65
                            ) {

                                video
                                    ?.play()
                                    .catch(
                                        () => { }
                                    );

                            } else {

                                video?.pause();
                            }
                        });

                    },
                    {
                        threshold: [
                            0,
                            0.65,
                            1
                        ]
                    }
                );


            if (video) {
                observer.observe(video);
            }


            profilePostsGrid.appendChild(
                reel
            );

            return;
        }


        /* =====================================================
           NORMAL POST
        ===================================================== */

        const card =
            document.createElement("button");

        card.type =
            "button";

        card.className =
            "profile-post";

        card.dataset.postId =
            String(post.id);


        let mediaHTML =
            "";

        if (
            mediaType === "video" ||
            mediaType.startsWith("video")
        ) {

            mediaHTML = media
                ? `
                    <video
                        src="${escapeHTML(media)}"
                        muted
                        playsinline
                        preload="metadata"
                    ></video>
                  `
                : "";

        } else {

            mediaHTML = media
                ? `
                    <img
                        src="${escapeHTML(media)}"
                        alt="NEXA post"
                        loading="lazy"
                    >
                  `
                : "";
        }


        const realLikes =
            Array.isArray(post.likes)
                ? post.likes.length
                : 0;

        const demoLikes =
            Number(
                post.demo_likes || 0
            );


        const realComments =
            Array.isArray(post.comments)
                ? post.comments.length
                : 0;

        const demoComments =
            Number(
                post.demo_comments || 0
            );


        card.innerHTML = `

            ${mediaHTML}

            <span class="profile-post-overlay">

                <span>
                    <i class="fa-solid fa-heart"></i>
                    ${formatEngagementCount(
            demoLikes +
            realLikes
        )}
                </span>

                <span>
                    <i class="fa-regular fa-comment"></i>
                    ${formatEngagementCount(
            demoComments +
            realComments
        )}
                </span>

            </span>
        `;


        card.addEventListener(
            "click",
            () => {
                openPostViewer(post);
            }
        );


        profilePostsGrid.appendChild(
            card
        );
    });
}


/* =========================================================
   PROFILE REEL VIEWER
   CLICK REEL → FULLSCREEN + SCROLL THROUGH REELS
========================================================= */

let profileViewerPosts = [];
let profileViewerIndex = 0;
let profileViewer = null;


function getProfileReels() {

    return profilePosts.filter(
        post =>
            String(
                post.media_type ||
                post.mediaType ||
                ""
            ).toLowerCase() === "reel" &&
            getPostMedia(post)
    );
}


function openProfileReelViewer(post) {

    profileViewerPosts =
        getProfileReels();

    profileViewerIndex =
        profileViewerPosts.findIndex(
            item =>
                String(item.id) ===
                String(post.id)
        );

    if (
        profileViewerIndex < 0
    ) {
        return;
    }


    if (profileViewer) {
        profileViewer.remove();
    }


    profileViewer =
        document.createElement(
            "div"
        );

    profileViewer.className =
        "profile-reel-viewer";


    document.body.appendChild(
        profileViewer
    );

    document.body.style.overflow =
        "hidden";


    renderProfileViewerReel();


    /* =====================================================
       MOUSE WHEEL
    ===================================================== */

    profileViewer.addEventListener(
        "wheel",
        event => {

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

                showNextProfileViewerReel();

            } else {

                showPreviousProfileViewerReel();
            }

        },
        {
            passive: false
        }
    );


    /* =====================================================
       TOUCH SWIPE
    ===================================================== */

    let startY = 0;


    profileViewer.addEventListener(
        "touchstart",
        event => {

            const touch =
                event.touches[0];

            if (!touch) {
                return;
            }

            startY =
                touch.clientY;

        },
        {
            passive: true
        }
    );


    profileViewer.addEventListener(
        "touchend",
        event => {

            const touch =
                event.changedTouches[0];

            if (!touch) {
                return;
            }

            const difference =
                startY -
                touch.clientY;


            if (
                Math.abs(
                    difference
                ) < 60
            ) {
                return;
            }


            if (
                difference > 0
            ) {

                showNextProfileViewerReel();

            } else {

                showPreviousProfileViewerReel();
            }

        },
        {
            passive: true
        }
    );


    /* =====================================================
       KEYBOARD
    ===================================================== */

    document.addEventListener(
        "keydown",
        profileViewerKeyboardHandler
    );
}


/* =========================================================
   RENDER CURRENT REEL
========================================================= */

function renderProfileViewerReel() {

    if (
        !profileViewer ||
        !profileViewerPosts.length
    ) {
        return;
    }


    const post =
        profileViewerPosts[
        profileViewerIndex
        ];


    const media =
        getPostMedia(post);


    const demoLikes =
        Number(
            post.demo_likes || 0
        );


    const realLikes =
        Array.isArray(post.likes)
            ? post.likes.length
            : 0;


    const comments =
        Number(
            post.demo_comments || 0
        ) +
        (
            Array.isArray(post.comments)
                ? post.comments.length
                : 0
        );


    const shares =
        Number(
            post.demo_shares || 0
        ) +
        Number(
            post.shares || 0
        );


    const liked =
        Array.isArray(post.likes) &&
        post.likes.some(
            id =>
                String(id) ===
                String(currentUser.id)
        );


    profileViewer.innerHTML = `

        <button
            type="button"
            class="profile-reel-viewer-close"
        >
            ×
        </button>


        <div
            class="profile-reel-viewer-media"
        >

           <video
    src="${escapeHTML(media)}"
    autoplay
    controls
    loop
    playsinline
    preload="metadata"
></video>


            <div
                class="profile-reel-viewer-actions"
            >

                <button
                    type="button"
                    data-viewer-action="like"
                    class="${liked ? "liked" : ""}"
                >

                    <span>
                        ${liked ? "♥" : "♡"}
                    </span>

                    <small>
                        ${formatEngagementCount(
        demoLikes +
        realLikes
    )}
                    </small>

                </button>


                <button
                    type="button"
                    data-viewer-action="comment"
                >

                    <span>
                        💬
                    </span>

                    <small>
                        ${formatEngagementCount(
        comments
    )}
                    </small>

                </button>


                <button
                    type="button"
                    data-viewer-action="share"
                >

                    <span>
                        ↗
                    </span>

                    <small>
                        ${formatEngagementCount(
        shares
    )}
                    </small>

                </button>

            </div>


            <div
                class="profile-reel-viewer-info"
            >

                <strong>
                    ${escapeHTML(
        post.author_name ||
        profileUser?.username ||
        profileUser?.name ||
        "NEXA User"
    )}
                </strong>

                <span>
                    ${escapeHTML(
        timeAgoProfile(
            post.created_at
        )
    )}
                </span>

                ${post.text
            ? `
                            <p>
                                ${escapeHTML(
                post.text
            )}
                            </p>
                          `
            : ""
        }

            </div>

        </div>
    `;


    const closeButton =
        profileViewer.querySelector(
            ".profile-reel-viewer-close"
        );


    closeButton?.addEventListener(
        "click",
        closeProfileReelViewer
    );

    profileViewer
        .querySelectorAll(
            "[data-viewer-action]"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    async event => {

                        event.preventDefault();
                        event.stopPropagation();


                        const action =
                            button.dataset
                                .viewerAction;


                        if (
                            action ===
                            "like"
                        ) {

                            const video =
                                profileViewer.querySelector(
                                    "video"
                                );

                            const wasPaused =
                                video?.paused;

                            const currentTime =
                                video?.currentTime || 0;


                            await toggleProfileReelLike(
                                post.id
                            );


                            if (video) {

                                try {

                                    video.currentTime =
                                        currentTime;

                                } catch (_) { }

                                if (!wasPaused) {

                                    video
                                        .play()
                                        .catch(
                                            () => { }
                                        );

                                }
                            }


                            renderProfileViewerReel();

                            return;
                        }


                        if (
                            action ===
                            "comment"
                        ) {

                            await openProfileReelComments(
                                post.id
                            );

                            return;
                        }


                        if (
                            action ===
                            "share"
                        ) {

                            const video =
                                profileViewer.querySelector(
                                    "video"
                                );

                            const currentTime =
                                video?.currentTime || 0;

                            const wasPaused =
                                video?.paused;


                            await shareProfileReel(
                                post.id
                            );


                            if (video) {

                                try {

                                    video.currentTime =
                                        currentTime;

                                } catch (_) { }

                                if (!wasPaused) {

                                    video
                                        .play()
                                        .catch(
                                            () => { }
                                        );
                                }
                            }

                            renderProfileViewerReel();
                        }

                    }
                );
            }
        );
}


/* =========================================================
   NEXT
========================================================= */

function showNextProfileViewerReel() {

    if (
        !profileViewerPosts.length
    ) {
        return;
    }


    profileViewerIndex++;


    if (
        profileViewerIndex >=
        profileViewerPosts.length
    ) {

        profileViewerIndex = 0;
    }


    renderProfileViewerReel();
}


/* =========================================================
   PREVIOUS
========================================================= */

function showPreviousProfileViewerReel() {

    if (
        !profileViewerPosts.length
    ) {
        return;
    }


    profileViewerIndex--;


    if (
        profileViewerIndex < 0
    ) {

        profileViewerIndex =
            profileViewerPosts.length - 1;
    }


    renderProfileViewerReel();
}


/* =========================================================
   KEYBOARD
========================================================= */

function profileViewerKeyboardHandler(
    event
) {

    if (!profileViewer) {
        return;
    }


    if (
        event.key ===
        "ArrowDown"
    ) {

        event.preventDefault();

        showNextProfileViewerReel();

        return;
    }


    if (
        event.key ===
        "ArrowUp"
    ) {

        event.preventDefault();

        showPreviousProfileViewerReel();

        return;
    }


    if (
        event.key ===
        "Escape"
    ) {

        event.preventDefault();

        closeProfileReelViewer();
    }
}


/* =========================================================
   CLOSE
========================================================= */

function closeProfileReelViewer() {

    if (profileViewer) {

        profileViewer.remove();

        profileViewer =
            null;
    }


    document.removeEventListener(
        "keydown",
        profileViewerKeyboardHandler
    );


    document.body.style.overflow =
        "";
}


/* =========================================================
   POST VIEWER
========================================================= */

function openPostViewer(
    post
) {

    if (
        !profilePostViewer ||
        !profilePostViewerContent
    ) {
        return;
    }


    const media =
        getPostMedia(
            post
        );


    const mediaType =
        getPostMediaType(
            post
        );


    const caption =
        post.caption ||
        post.content ||
        post.text ||
        "";


    let mediaHTML =
        "";


    if (
        mediaType === "reel" ||
        mediaType === "video" ||
        mediaType.startsWith("video")
    ) {

        mediaHTML = media

            ? `
                <video
                    src="${escapeHTML(
                media
            )}"
                    controls
                    autoplay
                    playsinline
                ></video>
            `

            : "";

    } else {

        mediaHTML = media

            ? `
                <img
                    src="${escapeHTML(
                media
            )}"
                    alt="NEXA post"
                >
            `

            : "";
    }


    const likeCount =
        Number(
            post.likes_count ||
            post.like_count ||
            post.likes ||
            0
        );


    profilePostViewerContent.innerHTML = `

        <div class="profile-post-viewer-card">

            ${mediaHTML}

            <div
                class="profile-post-viewer-info"
                style="
                    margin-top:18px;
                    padding:18px;
                    border:1px solid rgba(212,175,55,0.18);
                    border-radius:18px;
                    background:rgba(15,15,15,0.92);
                "
            >

                <div
                    style="
                        color:#d4af37;
                        font-size:12px;
                        margin-bottom:8px;
                    "
                >

                    <i
                        class="fa-solid fa-heart"
                    ></i>

                    ${likeCount} likes

                </div>


                ${caption

            ? `
                            <p
                                style="
                                    color:#d7d1c1;
                                    font-size:13px;
                                    line-height:1.7;
                                "
                            >
                                ${escapeHTML(
                caption
            )}
                            </p>
                          `

            : ""
        }

            </div>

        </div>
    `;


    profilePostViewer.hidden =
        false;


    document.body.style.overflow =
        "hidden";
}


function closePostViewer() {

    if (
        profilePostViewer
    ) {

        profilePostViewer.hidden =
            true;
    }


    document.body.style.overflow =
        "";
}


async function loadProfileStories() {

    if (!profileUser) {
        return;
    }

    try {

        const profileId =
            String(profileUser.id);

        const {
            data,
            error
        } = await nexaSupabase
            .from("stories")
            .select("*")
            .eq(
                "user_id",
                profileId
            )
            .order(
                "created_at",
                {
                    ascending: false
                }
            );

        if (error) {
            throw error;
        }

        profileStories =
            (data || []).map(
                story => ({

                    id:
                        story.id,

                    userId:
                        story.user_id,

                    username:
                        story.username ||
                        profileUser.username ||
                        profileUser.name ||
                        "NEXA User",

                    authorAvatar:
                        story.author_avatar ||
                        getProfilePicture(
                            profileUser
                        ) ||
                        "",

                    media:
                        story.media ||
                        "",

                    mediaType:
                        story.media_type ||
                        "image",

                    createdAt:
                        story.created_at,

                    likes:
                        Array.isArray(
                            story.likes
                        )
                            ? story.likes
                            : [],

                    comments:
                        Array.isArray(
                            story.comments
                        )
                            ? story.comments
                            : [],

                    shares:
                        Number(
                            story.shares || 0
                        )
                })
            );

        console.log(
            "NEXA PROFILE STORIES FOUND:",
            profileStories.length,
            profileStories
        );

        renderProfileStories();

    } catch (error) {

        console.error(
            "NEXA profile stories error:",
            error
        );

        profileStories = [];

        renderProfileStories();
    }
}




/* =========================================================
   RENDER PROFILE STORIES
========================================================= */

function renderProfileStories() {

    if (profileStoriesLoading) {
        profileStoriesLoading.style.display =
            "none";
    }

    if (!profileStoriesElement) {
        return;
    }

    profileStoriesElement.innerHTML = "";

    if (!profileStories.length) {
        profileStoriesElement.innerHTML = `
        <div class="profile-stories-empty">
            <i class="fa-regular fa-clock"></i>
            <span>No stories yet.</span>
        </div>
    `;
        return;
    }

    profileStories.forEach(
        story => {

            const button =
                document.createElement(
                    "button"
                );

            button.type =
                "button";

            button.className =
                "profile-story";

            const media =
                story.media || "";

            const mediaType =
                String(
                    story.mediaType || ""
                ).toLowerCase();

            const mediaHTML =
                mediaType.startsWith(
                    "video"
                )
                    ? `
                        <video
                            src="${escapeHTML(media)}"
                            muted
                            playsinline
                            preload="metadata"
                        ></video>
                    `
                    : `
                        <img
                            src="${escapeHTML(media)}"
                            alt="Story"
                            loading="lazy"
                        >
                    `;

            button.innerHTML = `
                <div class="profile-story-ring">
                    ${mediaHTML}
                </div>

                <span class="profile-story-name">
                    ${escapeHTML(
                story.username ||
                "Story"
            )}
                </span>
            `;

            button.addEventListener(
                "click",
                () => {
                    openProfileStoryViewer(
                        story
                    );
                }
            );

            profileStoriesElement.appendChild(
                button
            );
        }
    );
}

/* =========================================================
   PROFILE STORY VIEWER
========================================================= */

function openProfileStoryViewer(story) {

    if (!story) {
        return;
    }

    const media =
        story.media || "";

    const mediaType =
        String(
            story.mediaType || ""
        ).toLowerCase();

    const viewer =
        document.createElement("div");

    viewer.className =
        "profile-story-viewer";

    viewer.innerHTML = `

        <button
            type="button"
            class="profile-story-viewer-close"
        >
            ×
        </button>

        <div class="profile-story-viewer-content">

            ${mediaType.startsWith("video")

            ? `
                        <video
                            src="${escapeHTML(media)}"
                            controls
                            autoplay
                            playsinline
                        ></video>
                      `

            : `
                        <img
                            src="${escapeHTML(media)}"
                            alt="Story"
                        >
                      `
        }

        </div>

        <div class="profile-story-viewer-actions">

            <button
                type="button"
                class="profile-story-like"
            >
                ♥
                <span>
                    ${Array.isArray(story.likes)
            ? story.likes.length
            : 0
        }
                </span>
            </button>

            <button
                type="button"
                class="profile-story-comment"
            >
                💬
                <span>
                    ${Array.isArray(story.comments)
            ? story.comments.length
            : 0
        }
                </span>
            </button>

            <button
                type="button"
                class="profile-story-share"
            >
                ↗
                <span>
                    ${Number(story.shares || 0)}
                </span>
            </button>

        </div>
    `;

    document.body.appendChild(viewer);

    document.body.style.overflow =
        "hidden";

    const closeButton =
        viewer.querySelector(
            ".profile-story-viewer-close"
        );

    closeButton?.addEventListener(
        "click",
        () => {

            viewer.remove();

            document.body.style.overflow =
                "";
        }
    );
}


/* =========================================================
   EDIT PROFILE
========================================================= */

function openEditProfileModal() {

    if (
        !editProfileModal ||
        !profileUser
    ) {
        return;
    }


    if (
        editProfileName
    ) {

        editProfileName.value =
            profileUser.name ||
            "";
    }


    if (
        editProfileUsername
    ) {

        editProfileUsername.value =
            profileUser.username ||
            "";
    }


    if (
        editProfileBio
    ) {

        editProfileBio.value =
            profileUser.bio ||
            "";
    }


    renderEditProfilePicture(
        getProfilePicture(
            profileUser
        )
    );


    editProfileModal.hidden =
        false;


    document.body.style.overflow =
        "hidden";
}


function renderEditProfilePicture(
    picture
) {

    if (
        !editProfilePhotoPreview
    ) {
        return;
    }


    if (picture) {

        editProfilePhotoPreview.innerHTML = `
            <img
                src="${escapeHTML(
            picture
        )}"
                alt="Profile preview"
            >
        `;

    } else {

        editProfilePhotoPreview.innerHTML = `
            <span>
                ${getDisplayName(
            profileUser
        )
                .trim()
                .charAt(0)
                .toUpperCase() ||
            "N"
            }
            </span>
        `;
    }
}


/* =========================================================
   IMAGE COMPRESSION
========================================================= */

function compressProfileImage(
    file
) {

    return new Promise(
        (
            resolve,
            reject
        ) => {

            const reader =
                new FileReader();


            reader.onload =
                () => {

                    const image =
                        new Image();


                    image.onload =
                        () => {

                            const maxSize =
                                700;


                            let width =
                                image.width;

                            let height =
                                image.height;


                            if (
                                width >
                                height &&
                                width >
                                maxSize
                            ) {

                                height =
                                    Math.round(
                                        height *
                                        (
                                            maxSize /
                                            width
                                        )
                                    );

                                width =
                                    maxSize;

                            } else if (
                                height >
                                maxSize
                            ) {

                                width =
                                    Math.round(
                                        width *
                                        (
                                            maxSize /
                                            height
                                        )
                                    );

                                height =
                                    maxSize;
                            }


                            const canvas =
                                document.createElement(
                                    "canvas"
                                );


                            canvas.width =
                                width;

                            canvas.height =
                                height;


                            const context =
                                canvas.getContext(
                                    "2d"
                                );


                            context.drawImage(
                                image,
                                0,
                                0,
                                width,
                                height
                            );


                            resolve(
                                canvas.toDataURL(
                                    "image/jpeg",
                                    0.82
                                )
                            );
                        };


                    image.onerror =
                        reject;


                    image.src =
                        reader.result;
                };


            reader.onerror =
                reject;


            reader.readAsDataURL(
                file
            );
        }
    );
}


/* =========================================================
   SAVE PROFILE
========================================================= */

async function saveProfile() {

    if (
        !profileUser
    ) {
        return;
    }


    if (
        !isOwnProfile
    ) {
        return;
    }


    const name =
        editProfileName
            ? editProfileName.value.trim()
            : "";


    const username =
        editProfileUsername
            ? editProfileUsername.value
                .trim()
                .replace(
                    /^@/,
                    ""
                )
                .toLowerCase()
            : "";


    const bio =
        editProfileBio
            ? editProfileBio.value.trim()
            : "";


    if (!name) {

        alert(
            "Please enter your name."
        );

        return;
    }


    if (
        saveProfileButton
    ) {

        saveProfileButton.disabled =
            true;

        saveProfileButton.innerHTML = `
            <i
                class="fa-solid fa-spinner fa-spin"
            ></i>

            Saving...
        `;
    }


    try {

        let profilePicture =
            getProfilePicture(
                profileUser
            );


        if (
            profilePictureInput &&
            profilePictureInput.files &&
            profilePictureInput.files[0]
        ) {

            profilePicture =
                await compressProfileImage(
                    profilePictureInput.files[0]
                );
        }


        const updates = {

            name,

            username,

            bio,

            profile_picture:
                profilePicture
        };


        const {
            data,
            error
        } =
            await nexaSupabase
                .from("profiles")
                .update(
                    updates
                )
                .eq(
                    "id",
                    String(
                        currentUser.id
                    )
                )
                .select(`
                    id,
                    name,
                    username,
                    profile_picture,
                    bio,
                    created_at
                `)
                .single();


        if (error) {
            throw error;
        }


        profileUser =
            data;


        currentUser.name =
            data.name;

        currentUser.username =
            data.username;

        currentUser.profilePicture =
            data.profile_picture ||
            "";

        currentUser.profile_picture =
            data.profile_picture ||
            "";

        currentUser.bio =
            data.bio ||
            "";


        localStorage.setItem(
            "nexaCurrentUser",
            JSON.stringify(
                currentUser
            )
        );


        renderProfileHeader();

        closeModal(
            editProfileModal
        );

        profilePictureInput.value =
            "";


        await loadFriendCount();

        await loadProfilePosts();


        /*
         * Notify other pages/tabs.
         */

        window.dispatchEvent(
            new CustomEvent(
                "nexaProfileUpdated",
                {
                    detail:
                        data
                }
            )
        );


    } catch (error) {

        console.error(
            "NEXA profile save error:",
            error
        );


        alert(
            "Could not save your profile."
        );

    } finally {

        if (
            saveProfileButton
        ) {

            saveProfileButton.disabled =
                false;

            saveProfileButton.innerHTML = `
                <i
                    class="fa-solid fa-check"
                ></i>

                Save Profile
            `;
        }
    }
}


/* =========================================================
   WHAT'S NEW
========================================================= */

function getStatusStorageKey() {

    return (
        "nexaProfileStatus_" +
        String(
            profileUser?.id ||
            currentUser.id
        )
    );
}


function getSavedStatus() {

    try {

        const raw =
            localStorage.getItem(
                getStatusStorageKey()
            );


        if (!raw) {
            return null;
        }


        const status =
            JSON.parse(
                raw
            );


        if (
            !status ||
            !status.expiresAt
        ) {
            return null;
        }


        if (
            Date.now() >=
            Number(
                status.expiresAt
            )
        ) {

            localStorage.removeItem(
                getStatusStorageKey()
            );

            return null;
        }


        return status;

    } catch (_) {

        return null;
    }
}


function renderStatus() {

    const status =
        getSavedStatus();


    if (
        !profileStatusPreview
    ) {
        return;
    }


    profileStatusPreview.textContent =
        status?.text ||
        "Share an update";
}


function openStatusModal() {

    if (
        !profileStatusModal
    ) {
        return;
    }


    const status =
        getSavedStatus();


    if (
        profileStatusInput
    ) {

        profileStatusInput.value =
            status?.text ||
            "";
    }


    updateStatusCharacters();


    profileStatusModal.hidden =
        false;


    document.body.style.overflow =
        "hidden";


    setTimeout(
        () => {

            profileStatusInput?.focus();

        },
        50
    );
}


function saveStatus() {

    if (
        !isOwnProfile ||
        !profileStatusInput
    ) {
        return;
    }


    const text =
        profileStatusInput.value.trim();


    if (!text) {

        localStorage.removeItem(
            getStatusStorageKey()
        );

        renderStatus();

        closeModal(
            profileStatusModal
        );

        return;
    }


    const status = {

        text,

        createdAt:
            new Date()
                .toISOString(),

        expiresAt:
            Date.now() +
            24 *
            60 *
            60 *
            1000
    };


    localStorage.setItem(
        getStatusStorageKey(),
        JSON.stringify(
            status
        )
    );


    renderStatus();

    closeModal(
        profileStatusModal
    );


    window.dispatchEvent(
        new CustomEvent(
            "nexaStatusUpdated",
            {
                detail:
                    status
            }
        )
    );
}


function updateStatusCharacters() {

    if (
        !profileStatusCharacters ||
        !profileStatusInput
    ) {
        return;
    }


    profileStatusCharacters.textContent =
        profileStatusInput.value.length +
        " / 180";
}


/* =========================================================
   FRIEND ACTION
========================================================= */

async function addFriendFromProfile() {

    if (
        !profileUser ||
        isOwnProfile
    ) {
        return;
    }


    try {

        const friendId =
            String(
                profileUser.id
            );


        const currentIds =
            getFriendIds(
                currentUser
            );


        if (
            currentIds.includes(
                friendId
            )
        ) {

            alert(
                "You are already friends."
            );

            return;
        }


        currentIds.push(
            friendId
        );


        /*
         * This follows the current
         * NEXA friends architecture.
         */

        const {
            data,
            error
        } =
            await nexaSupabase
                .from("profiles")
                .update({
                    friends:
                        currentIds
                })
                .eq(
                    "id",
                    String(
                        currentUser.id
                    )
                )
                .select()
                .single();


        if (error) {
            throw error;
        }


        currentUser.friends =
            currentIds;


        localStorage.setItem(
            "nexaCurrentUser",
            JSON.stringify(
                currentUser
            )
        );


        if (
            addFriendProfileButton
        ) {

            addFriendProfileButton.innerHTML = `
                <i
                    class="fa-solid fa-check"
                ></i>

                <span>
                    Friends
                </span>
            `;

            addFriendProfileButton.disabled =
                true;
        }


        window.dispatchEvent(
            new CustomEvent(
                "nexaFriendsUpdated",
                {
                    detail:
                        data
                }
            )
        );


    } catch (error) {

        console.error(
            "NEXA add friend error:",
            error
        );


        alert(
            "Could not add this friend."
        );
    }
}


/* =========================================================
   MESSAGE PROFILE
========================================================= */

function messageProfile() {

    if (
        !profileUser ||
        isOwnProfile
    ) {
        return;
    }


    window.location.href =
        "messages.html?user=" +
        encodeURIComponent(
            String(
                profileUser.id
            )
        );
}


/* =========================================================
   MODAL HELPERS
========================================================= */

function closeModal(
    modal
) {

    if (!modal) {
        return;
    }


    modal.hidden =
        true;


    /*
     * Only unlock the page when
     * no other modal/viewer remains open.
     */

    const editOpen =
        editProfileModal &&
        !editProfileModal.hidden;

    const statusOpen =
        profileStatusModal &&
        !profileStatusModal.hidden;

    const viewerOpen =
        profilePostViewer &&
        !profilePostViewer.hidden;


    if (
        !editOpen &&
        !statusOpen &&
        !viewerOpen
    ) {

        document.body.style.overflow =
            "";
    }
}


/* =========================================================
   MODAL CLICK HANDLING
========================================================= */

document.addEventListener(
    "click",
    event => {

        const closeTarget =
            event.target.closest(
                "[data-close-modal]"
            );


        if (!closeTarget) {
            return;
        }


        const modalId =
            closeTarget.dataset
                .closeModal;


        if (
            modalId ===
            "editProfileModal"
        ) {

            closeModal(
                editProfileModal
            );
        }


        if (
            modalId ===
            "profileStatusModal"
        ) {

            closeModal(
                profileStatusModal
            );
        }
    }
);


/* =========================================================
   IMAGE PREVIEW
========================================================= */

if (
    profilePictureInput
) {

    profilePictureInput.addEventListener(
        "change",
        async event => {

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

                alert(
                    "Please choose an image."
                );

                profilePictureInput.value =
                    "";

                return;
            }


            try {

                const compressed =
                    await compressProfileImage(
                        file
                    );


                renderEditProfilePicture(
                    compressed
                );

            } catch (error) {

                console.error(
                    "NEXA profile preview error:",
                    error
                );
            }
        }
    );
}


/* =========================================================
   STATUS CHARACTER COUNT
========================================================= */

if (
    profileStatusInput
) {

    profileStatusInput.addEventListener(
        "input",
        updateStatusCharacters
    );
}


/* =========================================================
   BUTTONS
========================================================= */

if (
    editProfileButton
) {

    editProfileButton.addEventListener(
        "click",
        openEditProfileModal
    );
}


if (
    saveProfileButton
) {

    saveProfileButton.addEventListener(
        "click",
        saveProfile
    );
}


if (
    addFriendProfileButton
) {

    addFriendProfileButton.addEventListener(
        "click",
        addFriendFromProfile
    );
}


if (
    messageProfileButton
) {

    messageProfileButton.addEventListener(
        "click",
        messageProfile
    );
}


if (
    profileStatusCloud
) {

    profileStatusCloud.addEventListener(
        "click",
        openStatusModal
    );
}


if (
    saveProfileStatusButton
) {

    saveProfileStatusButton.addEventListener(
        "click",
        saveStatus
    );
}


if (
    closeProfilePostViewer
) {

    closeProfilePostViewer.addEventListener(
        "click",
        closePostViewer
    );
}


if (
    profileBackButton
) {

    profileBackButton.addEventListener(
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
}


if (
    profileMenuButton
) {

    profileMenuButton.addEventListener(
        "click",
        () => {

            if (
                isOwnProfile
            ) {

                openEditProfileModal();

            } else {

                alert(
                    "Profile options are coming soon."
                );
            }
        }
    );
}


/* =========================================================
   PROFILE DATA REFRESH EVENT
========================================================= */

window.addEventListener(
    "nexaProfileUpdated",
    event => {

        if (
            !event.detail
        ) {
            return;
        }


        if (
            String(
                event.detail.id
            ) ===
            String(
                profileUser?.id
            )
        ) {

            profileUser =
                event.detail;

            renderProfileHeader();
        }
    }
);


/* =========================================================
   PAGE INITIALIZATION
========================================================= */

async function initializeProfile() {

    showLoading(
        true
    );


    try {

        await loadProfile();

        await Promise.all([
            loadFriendCount(),
            loadProfilePosts(),
            loadProfileStories()
        ]);


        renderStatus();


        /*
         * Start the reel/post scrolling system
         * AFTER the posts have been rendered.
         */

        initializeProfileReelScrolling();


    } catch (error) {

        console.error(
            "NEXA profile initialization error:",
            error
        );

    } finally {

        showLoading(
            false
        );
    }
}

async function toggleProfileReelLike(postId) {

    const post =
        profilePosts.find(
            item =>
                String(item.id) ===
                String(postId)
        );

    if (!post) {
        return false;
    }


    const userId =
        String(
            currentUser.id
        );


    try {

        const {
            data: existing,
            error: checkError
        } =
            await nexaSupabase
                .from("likes")
                .select("id")
                .eq(
                    "post_id",
                    post.id
                )
                .eq(
                    "user_id",
                    userId
                )
                .maybeSingle();


        if (checkError) {
            throw checkError;
        }


        let liked;


        if (existing) {

            const {
                error
            } =
                await nexaSupabase
                    .from("likes")
                    .delete()
                    .eq(
                        "id",
                        existing.id
                    );

            if (error) {
                throw error;
            }

            liked = false;


            if (Array.isArray(post.likes)) {

                post.likes =
                    post.likes.filter(
                        id =>
                            String(id) !==
                            userId
                    );
            }


        } else {

            const {
                error
            } =
                await nexaSupabase
                    .from("likes")
                    .insert({

                        post_id:
                            post.id,

                        user_id:
                            userId
                    });

            if (error) {
                throw error;
            }

            liked = true;


            if (!Array.isArray(post.likes)) {
                post.likes = [];
            }


            if (
                !post.likes.some(
                    id =>
                        String(id) ===
                        userId
                )
            ) {

                post.likes.push(
                    userId
                );
            }
        }


        /* =====================================================
           UPDATE THE LIKE BUTTON IMMEDIATELY
        ===================================================== */

        const buttons =
            document.querySelectorAll(
                `[data-viewer-action="like"]`
            );


        buttons.forEach(
            button => {

                button.classList.toggle(
                    "liked",
                    liked
                );


                const icon =
                    button.querySelector(
                        "span"
                    );


                if (icon) {

                    icon.textContent =
                        liked
                            ? "♥"
                            : "♡";

                    icon.style.color =
                        liked
                            ? "#ff3040"
                            : "";
                }
            }
        );


        return liked;


    } catch (error) {

        console.error(
            "NEXA profile Reel like error:",
            error
        );

        return false;
    }
}


async function shareProfileReel(postId) {

    const post =
        profilePosts.find(
            item =>
                String(item.id) ===
                String(postId)
        );

    if (!post) {
        return;
    }


    try {

        if (
            navigator.share
        ) {

            await navigator.share({

                title:
                    "NEXA Reel",

                text:
                    post.text ||
                    "Check out this Reel on NEXA.",

                url:
                    window.location.href
            });

        } else if (
            navigator.clipboard
        ) {

            await navigator.clipboard.writeText(
                window.location.href
            );
        }


        const newShares =
            Number(
                post.shares || 0
            ) + 1;


        const {
            data,
            error
        } =
            await nexaSupabase
                .from("posts")
                .update({
                    shares:
                        newShares
                })
                .eq(
                    "id",
                    post.id
                )
                .select(
                    "shares"
                )
                .single();


        if (error) {
            throw error;
        }


        post.shares =
            Number(
                data.shares || 0
            );


        renderProfilePosts();

    } catch (error) {

        console.error(
            "NEXA profile reel share error:",
            error
        );
    }
}


async function openProfileReelComments(postId) {

    const post =
        profilePosts.find(
            item =>
                String(item.id) ===
                String(postId)
        );

    if (!post) {
        return;
    }


    const text =
        prompt(
            "Write a comment:"
        );

    if (!text?.trim()) {
        return;
    }


    const comments =
        Array.isArray(post.comments)
            ? [...post.comments]
            : [];


    comments.push({

        id:
            Date.now(),

        userId:
            String(
                currentUser.id
            ),

        username:
            currentUser.username ||
            currentUser.name ||
            "NEXA User",

        text:
            text.trim(),

        createdAt:
            new Date()
                .toISOString()
    });


    const {
        data,
        error
    } =
        await nexaSupabase
            .from("posts")
            .update({
                comments
            })
            .eq(
                "id",
                post.id
            )
            .select(
                "comments"
            )
            .single();


    if (error) {

        console.error(
            "NEXA profile reel comment error:",
            error
        );

        return;
    }


    post.comments =
        Array.isArray(
            data.comments
        )
            ? data.comments
            : comments;


    renderProfilePosts();
}


if (profilePostsGrid) {

    profilePostsGrid.addEventListener(
        "click",
        async event => {

            const button =
                event.target.closest(
                    "[data-profile-action]"
                );

            if (!button) {
                return;
            }


            event.preventDefault();
            event.stopPropagation();


            const action =
                button.dataset.profileAction;

            const postId =
                button.dataset.id;


            if (
                action === "like"
            ) {

                await toggleProfileReelLike(
                    postId
                );

                return;
            }


            if (
                action === "comment"
            ) {

                await openProfileReelComments(
                    postId
                );

                return;
            }


            if (
                action === "share"
            ) {

                await shareProfileReel(
                    postId
                );
            }

        }
    );
}

/* =========================================================
   PROFILE REELS SCROLL CONTROLLER
   Makes the profile reel/post area vertically scrollable
========================================================= */

let profileReelScrollContainer = null;


/* =========================================================
   CREATE SCROLL CONTAINER
========================================================= */

function setupProfileReelScrolling() {

    if (!profilePostsGrid) {
        return;
    }

    profileReelScrollContainer =
        profilePostsGrid;

    /*
     * Make sure the grid itself can scroll vertically.
     * The CSS still controls the exact reel size and
     * two-column layout.
     */

    profilePostsGrid.style.overflowY =
        "auto";

    profilePostsGrid.style.overflowX =
        "hidden";

    profilePostsGrid.style.webkitOverflowScrolling =
        "touch";

    /*
     * Allow normal touch scrolling on phones/tablets.
     */

    profilePostsGrid.style.touchAction =
        "pan-y";

    /*
     * Prevent the browser from treating the
     * reel cards as draggable elements.
     */

    profilePostsGrid.addEventListener(
        "dragstart",
        event => {
            event.preventDefault();
        }
    );
}


/* =========================================================
   SCROLL REELS WITH MOUSE WHEEL
========================================================= */

function setupProfileReelWheel() {

    if (!profilePostsGrid) {
        return;
    }

    profilePostsGrid.addEventListener(
        "wheel",
        event => {

            /*
             * Only control vertical scrolling.
             */

            if (
                Math.abs(event.deltaY) <=
                Math.abs(event.deltaX)
            ) {
                return;
            }

            /*
             * Let the browser perform the actual
             * scrolling. We only make sure the grid
             * is the active scroll area.
             */

            if (
                profilePostsGrid.scrollHeight >
                profilePostsGrid.clientHeight
            ) {

                event.stopPropagation();
            }

        },
        {
            passive: true
        }
    );
}


/* =========================================================
   TOUCH SWIPE SUPPORT
   Phones + Tablets
========================================================= */

let profileTouchStartY = 0;
let profileTouchEndY = 0;


function setupProfileReelTouch() {

    if (!profilePostsGrid) {
        return;
    }


    profilePostsGrid.addEventListener(
        "touchstart",
        event => {

            profileTouchStartY =
                event.touches[0].clientY;

        },
        {
            passive: true
        }
    );


    profilePostsGrid.addEventListener(
        "touchmove",
        event => {

            /*
             * Do NOT preventDefault here.
             *
             * This allows normal native scrolling
             * on Android, iPhone and tablets.
             */

        },
        {
            passive: true
        }
    );


    profilePostsGrid.addEventListener(
        "touchend",
        event => {

            profileTouchEndY =
                event.changedTouches[0].clientY;


            const difference =
                profileTouchStartY -
                profileTouchEndY;


            /*
             * Small movements are ignored.
             */

            if (
                Math.abs(difference) <
                40
            ) {
                return;
            }


            /*
             * Find the nearest reel/post and
             * gently move toward it.
             */

            scrollToNearestProfilePost(
                difference > 0
            );

        },
        {
            passive: true
        }
    );
}


/* =========================================================
   FIND NEAREST POST
========================================================= */

function scrollToNearestProfilePost(
    scrollingDown
) {

    if (!profilePostsGrid) {
        return;
    }


    const posts =
        Array.from(
            profilePostsGrid.children
        );


    if (!posts.length) {
        return;
    }


    const containerRect =
        profilePostsGrid.getBoundingClientRect();


    const containerCenter =
        containerRect.top +
        (
            containerRect.height / 2
        );


    let closestPost =
        null;

    let closestDistance =
        Infinity;


    posts.forEach(
        post => {

            const rect =
                post.getBoundingClientRect();


            const postCenter =
                rect.top +
                (
                    rect.height / 2
                );


            const distance =
                Math.abs(
                    postCenter -
                    containerCenter
                );


            if (
                distance <
                closestDistance
            ) {

                closestDistance =
                    distance;

                closestPost =
                    post;
            }

        }
    );


    if (!closestPost) {
        return;
    }


    /*
     * Find the next/previous post when possible.
     */

    const currentIndex =
        posts.indexOf(
            closestPost
        );


    let targetIndex =
        currentIndex;


    if (scrollingDown) {

        targetIndex =
            Math.min(
                posts.length - 1,
                currentIndex + 1
            );

    } else {

        targetIndex =
            Math.max(
                0,
                currentIndex - 1
            );
    }


    const target =
        posts[targetIndex];


    if (!target) {
        return;
    }


    target.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });
}


/* =========================================================
   KEYBOARD SCROLLING
   Desktop
========================================================= */

function setupProfileReelKeyboard() {

    if (!profilePostsGrid) {
        return;
    }


    profilePostsGrid.setAttribute(
        "tabindex",
        "0"
    );


    profilePostsGrid.addEventListener(
        "keydown",
        event => {

            if (
                event.key !== "ArrowDown" &&
                event.key !== "ArrowUp" &&
                event.key !== "PageDown" &&
                event.key !== "PageUp"
            ) {
                return;
            }


            event.preventDefault();


            const posts =
                Array.from(
                    profilePostsGrid.children
                );


            if (!posts.length) {
                return;
            }


            const currentScroll =
                profilePostsGrid.scrollTop;


            let closest =
                posts[0];

            let closestDistance =
                Infinity;


            posts.forEach(
                post => {

                    const distance =
                        Math.abs(
                            post.offsetTop -
                            currentScroll
                        );


                    if (
                        distance <
                        closestDistance
                    ) {

                        closestDistance =
                            distance;

                        closest =
                            post;
                    }

                }
            );


            const index =
                posts.indexOf(
                    closest
                );


            let nextIndex =
                index;


            if (
                event.key ===
                "ArrowDown" ||
                event.key ===
                "PageDown"
            ) {

                nextIndex =
                    Math.min(
                        posts.length - 1,
                        index + 1
                    );

            } else {

                nextIndex =
                    Math.max(
                        0,
                        index - 1
                    );
            }


            posts[nextIndex]?.scrollIntoView({
                behavior: "smooth",
                block: "center"
            });

        }
    );
}


/* =========================================================
   START PROFILE REEL SCROLLING
========================================================= */

function initializeProfileReelScrolling() {

    if (!profilePostsGrid) {
        return;
    }


    setupProfileReelScrolling();

    setupProfileReelWheel();

    setupProfileReelTouch();

    setupProfileReelKeyboard();
}


/* =========================================================
   START
========================================================= */

initializeProfile();
