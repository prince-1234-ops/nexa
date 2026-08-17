const API_URL = "http://localhost:3000";

const socket = io(API_URL, {
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000
});


const currentUser =
    JSON.parse(
        localStorage.getItem("nexaCurrentUser")
    );


if (!currentUser) {

    window.location.href = "index.html";

    throw new Error(
        "No NEXA user is logged in."
    );

}


/* =========================================================
   DOM
========================================================= */

const conversationsList =
    document.getElementById(
        "conversationsList"
    );

const chatSection =
    document.getElementById(
        "chatSection"
    );

const chatWith =
    document.getElementById(
        "chatWith"
    );

const messagesContainer =
    document.getElementById(
        "messagesContainer"
    );

const messageForm =
    document.getElementById(
        "messageForm"
    );

const messageInput =
    document.getElementById(
        "messageInput"
    );

const mediaInput =
    document.getElementById(
        "mediaInput"
    );

const recordButton =
    document.getElementById(
        "recordButton"
    );

const stopButton =
    document.getElementById(
        "stopButton"
    );

const recordingStatus =
    document.getElementById(
        "recordingStatus"
    );

const locationButton =
    document.getElementById(
        "locationButton"
    );

const locationStatus =
    document.getElementById(
        "locationStatus"
    );

const voiceCallButton =
    document.getElementById(
        "voiceCallButton"
    );

const videoCallButton =
    document.getElementById(
        "videoCallButton"
    );

const endCallButton =
    document.getElementById(
        "endCallButton"
    );

const callStatus =
    document.getElementById(
        "callStatus"
    );

const incomingCall =
    document.getElementById(
        "incomingCall"
    );

const incomingCaller =
    document.getElementById(
        "incomingCaller"
    );

const acceptCallButton =
    document.getElementById(
        "acceptCallButton"
    );

const declineCallButton =
    document.getElementById(
        "declineCallButton"
    );

const remoteCallArea =
    document.getElementById(
        "remoteCallArea"
    );

const remoteAudio =
    document.getElementById(
        "remoteAudio"
    );

const remoteVideo =
    document.getElementById(
        "remoteVideo"
    );


/* =========================================================
   STATE
========================================================= */

let users = [];

let selectedFriend = null;

let messages = [];

let mediaRecorder = null;

let audioChunks = [];

let isRecording = false;

let activeCall = null;

let peerConnection = null;

let localStream = null;

let remoteStream = null;

let pendingIceCandidates = [];

let callInProgress = false;


/* =========================================================
   WEBRTC
========================================================= */

const rtcConfiguration = {

    iceServers: [

        {
            urls:
                "stun:stun.l.google.com:19302"
        },

        {
            urls:
                "stun:stun1.l.google.com:19302"
        }

    ]

};


/* =========================================================
   INITIAL UI
========================================================= */

if (chatSection) {

    chatSection.style.display =
        "none";

}

if (incomingCall) {

    incomingCall.style.display =
        "none";

}

if (stopButton) {

    stopButton.disabled =
        true;

}

if (endCallButton) {

    endCallButton.style.display =
        "none";

}


/* =========================================================
   SOCKET
========================================================= */

socket.on(
    "connect",
    function () {

        console.log(
            "Connected to NEXA:",
            socket.id
        );


        socket.emit(
            "register-user",
            Number(currentUser.id)
        );

    }
);


socket.on(
    "connect_error",
    function (error) {

        console.error(
            "NEXA connection error:",
            error
        );

    }
);


socket.on(
    "disconnect",
    function (reason) {

        console.warn(
            "NEXA disconnected:",
            reason
        );

    }
);


socket.on(
    "reconnect",
    function () {

        socket.emit(
            "register-user",
            Number(currentUser.id)
        );

    }
);


/* =========================================================
   USERS
========================================================= */

async function getUsers() {

    try {

        const response =
            await fetch(
                API_URL +
                "/api/users"
            );


        if (!response.ok) {

            throw new Error(
                "Could not load users."
            );

        }


        const data =
            await response.json();


        users =
            Array.isArray(
                data.users
            )
                ? data.users
                : [];


        return users;

    }

    catch (error) {

        console.error(
            "Could not load NEXA users:",
            error
        );

        return [];

    }

}


function findUserById(userId) {

    return users.find(
        user =>
            Number(user.id) ===
            Number(userId)
    );

}


/* =========================================================
   CONVERSATION ID
========================================================= */

function createConversationId(
    user1,
    user2
) {

    return [

        Number(user1.id),

        Number(user2.id)

    ]
        .sort(
            (a, b) =>
                a - b
        )
        .join("_");

}


/* =========================================================
   CACHE
========================================================= */

function getCachedMessages() {

    try {

        const saved =
            JSON.parse(
                localStorage.getItem(
                    "nexaMessages"
                )
            );


        return Array.isArray(saved)
            ? saved
            : [];

    }

    catch (error) {

        return [];

    }

}


function saveCachedMessages() {

    localStorage.setItem(
        "nexaMessages",
        JSON.stringify(
            messages
        )
    );

}


/* =========================================================
   LOAD MESSAGES FROM SERVER
========================================================= */

async function loadMessagesFromServer() {

    try {

        const response =
            await fetch(
                API_URL +
                "/api/messages/" +
                Number(currentUser.id)
            );


        if (!response.ok) {

            throw new Error(
                "Message API returned " +
                response.status
            );

        }


        const data =
            await response.json();


        if (
            data.success &&
            Array.isArray(
                data.messages
            )
        ) {

            messages =
                data.messages;


            saveCachedMessages();


            return messages;

        }

    }

    catch (error) {

        console.error(
            "Could not load messages from server:",
            error
        );

    }


    messages =
        getCachedMessages();


    return messages;

}


/* =========================================================
   ADD MESSAGE LOCALLY
========================================================= */

function addMessage(message) {

    if (!message) {
        return;
    }


    const exists =
        messages.some(
            existing =>
                String(existing.id) ===
                String(message.id)
        );


    if (!exists) {

        messages.push(
            message
        );

        saveCachedMessages();

    }

}


/* =========================================================
   SEND MESSAGE TO SERVER
========================================================= */

function sendMessageToServer(
    message
) {

    socket.emit(
        "send-message",
        message
    );

}


/* =========================================================
   MESSAGE RECEIVED
========================================================= */

socket.on(
    "new-message",
    async function (message) {

        if (!message) {
            return;
        }


        const belongsToUser =
            Number(message.senderId) ===
                Number(currentUser.id)
            ||
            Number(message.receiverId) ===
                Number(currentUser.id);


        if (!belongsToUser) {

            return;

        }


        addMessage(
            message
        );


        if (
            selectedFriend &&
            (
                Number(message.senderId) ===
                    Number(selectedFriend.id)
                ||
                Number(message.receiverId) ===
                    Number(selectedFriend.id)
            )
        ) {

            await loadConversation();

        }


        await displayConversations();

    }
);


/* =========================================================
   MESSAGE SAVED CONFIRMATION
========================================================= */

socket.on(
    "message-saved",
    function (message) {

        if (!message) {
            return;
        }


        addMessage(
            message
        );

    }
);


/* =========================================================
   MARK READ
========================================================= */

socket.on(
    "message-read",
    function (data) {

        if (!data) {
            return;
        }


        messages.forEach(
            message => {

                if (
                    String(message.id) ===
                    String(data.messageId)
                ) {

                    message.read =
                        true;

                }

            }
        );


        saveCachedMessages();


        displayConversations();

    }
);


/* =========================================================
   FILE READER
========================================================= */

function readFileAsDataURL(
    file
) {

    return new Promise(
        function (
            resolve,
            reject
        ) {

            const reader =
                new FileReader();


            reader.onload =
                function () {

                    resolve(
                        reader.result
                    );

                };


            reader.onerror =
                function () {

                    reject(
                        new Error(
                            "Could not read file."
                        )
                    );

                };


            reader.readAsDataURL(
                file
            );

        }
    );

}


/* =========================================================
   TIME
========================================================= */

function formatTime(
    timestamp
) {

    const date =
        new Date(
            timestamp
        );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return "";

    }


    return date.toLocaleTimeString(
        [],
        {
            hour:
                "2-digit",

            minute:
                "2-digit"
        }
    );

}


/* =========================================================
   SEND TEXT / MEDIA
========================================================= */
async function sendTextOrMediaMessage() {

    if (!selectedFriend) {

        alert(
            "Open a conversation first."
        );

        return;
    }


    const text =
        messageInput.value.trim();


    const mediaFile =
        mediaInput.files[0];


    if (!text && !mediaFile) {
        return;
    }


    let mediaData = null;


    if (mediaFile) {

        try {

            mediaData =
                await readFileAsDataURL(
                    mediaFile
                );

        }

        catch (error) {

            console.error(
                "Could not read media:",
                error
            );

            return;
        }
    }


    const newMessage = {

        id:
            Date.now() +
            "-" +
            Math.random()
                .toString(36)
                .slice(2, 9),

        conversationId:
            createConversationId(
                currentUser,
                selectedFriend
            ),

        senderId:
            Number(
                currentUser.id
            ),

        receiverId:
            Number(
                selectedFriend.id
            ),

        text:
            text,

        media:
            mediaData,

        mediaType:
            mediaFile
                ? mediaFile.type
                : null,

        timestamp:
            new Date().toISOString(),

        read:
            false
    };


    /*
        Add the message immediately.
    */

    addMessage(
        newMessage
    );


    /*
        Show the message immediately
        without reloading the conversation.
    */

    const conversationId =
        createConversationId(
            currentUser,
            selectedFriend
        );


    const conversation =
        messages
            .filter(
                message =>
                    message.conversationId ===
                    conversationId
            )
            .sort(
                (a, b) =>
                    new Date(a.timestamp) -
                    new Date(b.timestamp)
            );


    messagesContainer.innerHTML = "";


    conversation.forEach(
        renderMessage
    );


    messagesContainer.scrollTop =
        messagesContainer.scrollHeight;


    /*
        Send to server in the background.
    */

    sendMessageToServer(
        newMessage
    );


    /*
        Clear composer.
    */

    messageInput.value =
        "";

    mediaInput.value =
        "";


    /*
        Keep the current conversation open.
    */

    messageInput.focus();
}


/* =========================================================
   MESSAGE FORM
========================================================= */

messageForm.addEventListener(
    "submit",
    async function (event) {

        event.preventDefault();

        await sendTextOrMediaMessage();

    }
);


/* =========================================================
   VOICE MESSAGE RECORDING
========================================================= */

recordButton.addEventListener(
    "click",
    async function () {

        if (!selectedFriend) {

            recordingStatus.textContent =
                "Open a conversation first.";

            return;

        }


        try {

            const stream =
                await navigator
                    .mediaDevices
                    .getUserMedia({
                        audio: true
                    });


            mediaRecorder =
                new MediaRecorder(
                    stream
                );


            audioChunks =
                [];


            mediaRecorder.ondataavailable =
                function (event) {

                    if (
                        event.data.size >
                        0
                    ) {

                        audioChunks.push(
                            event.data
                        );

                    }

                };


            mediaRecorder.onstop =
                async function () {

                    const audioBlob =
                        new Blob(
                            audioChunks,
                            {
                                type:
                                    "audio/webm"
                            }
                        );


                    const audioData =
                        await readFileAsDataURL(
                            audioBlob
                        );


                    sendVoiceMessage(
                        audioData
                    );


                    stream
                        .getTracks()
                        .forEach(
                            track =>
                                track.stop()
                        );

                };


            mediaRecorder.start();


            isRecording =
                true;


            recordButton.disabled =
                true;


            stopButton.disabled =
                false;


            recordingStatus.textContent =
                "🔴 Recording...";

        }

        catch (error) {

            console.error(
                "Microphone error:",
                error
            );


            recordingStatus.textContent =
                "Microphone permission was denied.";

        }

    }
);


/* =========================================================
   STOP VOICE RECORDING
========================================================= */

stopButton.addEventListener(
    "click",
    function () {

        if (
            mediaRecorder &&
            isRecording
        ) {

            mediaRecorder.stop();


            isRecording =
                false;


            recordButton.disabled =
                false;


            stopButton.disabled =
                true;


            recordingStatus.textContent =
                "Voice message recorded.";

        }

    }
);


/* =========================================================
   VOICE MESSAGE
========================================================= */

function sendVoiceMessage(
    audioData
) {

    if (!selectedFriend) {
        return;
    }


    const newMessage = {

        id:
            Date.now() +
            "-" +
            Math.random()
                .toString(36)
                .slice(2, 9),

        conversationId:
            createConversationId(
                currentUser,
                selectedFriend
            ),

        senderId:
            Number(
                currentUser.id
            ),

        receiverId:
            Number(
                selectedFriend.id
            ),

        text:
            "",

        media:
            audioData,

        mediaType:
            "audio/webm",

        timestamp:
            new Date()
                .toISOString(),

        read:
            false

    };


    addMessage(
        newMessage
    );


    sendMessageToServer(
        newMessage
    );


    loadConversation();

    displayConversations();

}


/* =========================================================
   LOCATION
========================================================= */

locationButton.addEventListener(
    "click",
    function () {

        if (!selectedFriend) {

            locationStatus.textContent =
                "Open a conversation first.";

            return;

        }


        if (
            !navigator.geolocation
        ) {

            locationStatus.textContent =
                "Location is not supported.";

            return;

        }


        locationStatus.textContent =
            "📍 Getting your location...";


        navigator.geolocation.getCurrentPosition(

            function (position) {

                const newMessage = {

                    id:
                        Date.now() +
                        "-" +
                        Math.random()
                            .toString(36)
                            .slice(2, 9),

                    conversationId:
                        createConversationId(
                            currentUser,
                            selectedFriend
                        ),

                    senderId:
                        Number(
                            currentUser.id
                        ),

                    receiverId:
                        Number(
                            selectedFriend.id
                        ),

                    text:
                        "📍 Location shared",

                    media:
                        null,

                    mediaType:
                        "location",

                    latitude:
                        position.coords.latitude,

                    longitude:
                        position.coords.longitude,

                    timestamp:
                        new Date()
                            .toISOString(),

                    read:
                        false

                };


                addMessage(
                    newMessage
                );


                sendMessageToServer(
                    newMessage
                );


                locationStatus.textContent =
                    "📍 Location sent.";


                loadConversation();

                displayConversations();

            },

            function (error) {

                console.error(
                    error
                );


                locationStatus.textContent =
                    "Unable to get your location.";

            }

        );

    }
);


/* =========================================================
   DISPLAY CONVERSATIONS
========================================================= */

async function displayConversations() {

    await getUsers();

    conversationsList.innerHTML =
        "";


    const friendIds =
        Array.isArray(
            currentUser.friends
        )
            ? currentUser.friends
            : [];


    if (
        friendIds.length ===
        0
    ) {

        conversationsList.innerHTML =
            "<p>Add friends to start chatting.</p>";

        return;

    }


    friendIds.forEach(
        function (friendId) {

            const friend =
                findUserById(
                    friendId
                );


            if (!friend) {
                return;
            }


            const conversationId =
                createConversationId(
                    currentUser,
                    friend
                );


            const conversation =
                messages
                    .filter(
                        message =>
                            message.conversationId ===
                            conversationId
                    )
                    .sort(
                        (a, b) =>
                            new Date(
                                a.timestamp
                            ) -
                            new Date(
                                b.timestamp
                            )
                    );


            const lastMessage =
                conversation[
                    conversation.length - 1
                ];


            const unread =
                conversation.filter(
                    message =>
                        Number(
                            message.receiverId
                        ) ===
                            Number(
                                currentUser.id
                            )
                        &&
                        !message.read
                ).length;


            let preview =
                "Start a conversation";


            if (lastMessage) {

                if (
                    lastMessage.text
                ) {

                    preview =
                        lastMessage.text;

                }

                else if (
                    lastMessage.mediaType ===
                    "location"
                ) {

                    preview =
                        "📍 Location";

                }

                else if (
                    lastMessage.mediaType ===
                    "audio/webm"
                ) {

                    preview =
                        "🎤 Voice message";

                }

                else if (
                    lastMessage.mediaType &&
                    lastMessage.mediaType.startsWith(
                        "image/"
                    )
                ) {

                    preview =
                        "📷 Photo";

                }

                else if (
                    lastMessage.mediaType &&
                    lastMessage.mediaType.startsWith(
                        "video/"
                    )
                ) {

                    preview =
                        "🎥 Video";

                }

            }


            const conversationBox =
                document.createElement(
                    "div"
                );


            conversationBox.innerHTML = `

                <button
                    type="button"
                    class="conversationButton"
                >

                    <strong>
                        ${escapeHTML(
                            friend.name
                        )}
                    </strong>

                    <br>

                    <span>
                        ${escapeHTML(
                            preview
                        )}
                    </span>

                    ${
                        unread > 0
                            ? `
                                <strong>
                                    🔴 ${unread}
                                </strong>
                              `
                            : ""
                    }

                </button>

            `;


            const button =
                conversationBox.querySelector(
                    ".conversationButton"
                );


            button.addEventListener(
                "click",
                function () {

                    openChat(
                        friend
                    );

                }
            );


            conversationsList.appendChild(
                conversationBox
            );

        }
    );

}


/* =========================================================
   OPEN CHAT
========================================================= */

async function openChat(friend) {

    selectedFriend = friend;

    localStorage.setItem(
    "nexaActiveConversation",
    String(friend.id)
);


    chatSection.style.display =
        "flex";


    chatWith.textContent =
        friend.name;


    const chatAvatar =
        document.getElementById(
            "chatAvatar"
        );


    if (chatAvatar) {

        chatAvatar.textContent =
            String(friend.name || "U")
                .trim()
                .charAt(0)
                .toUpperCase();

    }


    const chatOnlineStatus =
        document.getElementById(
            "chatOnlineStatus"
        );


    if (chatOnlineStatus) {

        chatOnlineStatus.textContent =
            "NEXA member";

    }


    const shell =
        document.querySelector(
            ".messages-shell"
        );


    if (shell) {

        shell.classList.add(
            "chat-open"
        );

    }


    await loadConversation();


    markMessagesAsRead(friend);
}


/* =========================================================
   MARK READ
========================================================= */

function markMessagesAsRead(
    friend
) {

    const conversationId =
        createConversationId(
            currentUser,
            friend
        );


    messages.forEach(
        function (message) {

            if (
                message.conversationId ===
                    conversationId
                &&
                Number(
                    message.receiverId
                ) ===
                    Number(
                        currentUser.id
                    )
            ) {

                message.read =
                    true;

            }

        }
    );


    saveCachedMessages();


    messages
        .filter(
            message =>
                message.conversationId ===
                    conversationId
                &&
                Number(
                    message.receiverId
                ) ===
                    Number(
                        currentUser.id
                    )
        )
        .forEach(
            message => {

                socket.emit(
                    "mark-messages-read",
                    {
                        messageId:
                            message.id,

                        userId:
                            currentUser.id
                    }
                );

            }
        );


    displayConversations();

}

async function loadConversationFromMemory() {

    if (!selectedFriend) {
        return;
    }


    const conversationId =
        createConversationId(
            currentUser,
            selectedFriend
        );


    const conversation =
        messages
            .filter(
                message =>
                    message.conversationId ===
                    conversationId
            )
            .sort(
                (a, b) =>
                    new Date(
                        a.timestamp
                    ) -
                    new Date(
                        b.timestamp
                    )
            );


    messagesContainer.innerHTML =
        "";


    if (
        conversation.length ===
        0
    ) {

        messagesContainer.innerHTML =
            "<p>No messages yet. Say hello!</p>";

        return;
    }


    conversation.forEach(
        renderMessage
    );


    messagesContainer.scrollTop =
        messagesContainer.scrollHeight;
}

/* =========================================================
   LOAD CONVERSATION
========================================================= */

async function loadConversation() {

    if (!selectedFriend) {
        return;
    }


    await loadMessagesFromServer();


    const conversationId =
        createConversationId(
            currentUser,
            selectedFriend
        );


    const conversation =
        messages
            .filter(
                message =>
                    message.conversationId ===
                    conversationId
            )
            .sort(
                (a, b) =>
                    new Date(
                        a.timestamp
                    ) -
                    new Date(
                        b.timestamp
                    )
            );


    messagesContainer.innerHTML =
        "";


    if (
        conversation.length ===
        0
    ) {

        messagesContainer.innerHTML =
            "<p>No messages yet. Say hello!</p>";

        return;

    }


    conversation.forEach(
        renderMessage
    );


    messagesContainer.scrollTop =
        messagesContainer.scrollHeight;

}


/* =========================================================
   RENDER MESSAGE
========================================================= */
function renderMessage(message) {

    const messageElement =
        document.createElement("div");

    const isMine =
        Number(message.senderId) ===
        Number(currentUser.id);

    const sender =
        isMine
            ? "You"
            : (
                selectedFriend
                    ? selectedFriend.name
                    : "User"
            );

    messageElement.className =
        "nexa-message " +
        (isMine ? "sent" : "received");


    let mediaHTML = "";


    if (
        message.media &&
        message.mediaType
    ) {

        if (
            message.mediaType.startsWith("image/")
        ) {

            mediaHTML = `
                <div class="nexa-message-media">
                    <img
                        src="${message.media}"
                        alt="Shared image"
                    >
                </div>
            `;

        }

        else if (
            message.mediaType.startsWith("video/")
        ) {

            mediaHTML = `
                <div class="nexa-message-media">
                    <video
                        src="${message.media}"
                        controls
                    ></video>
                </div>
            `;

        }

        else if (
            message.mediaType === "audio/webm"
        ) {

            mediaHTML = `
                <div class="nexa-message-media">
                    <audio
                        src="${message.media}"
                        controls
                    ></audio>
                </div>
            `;

        }

    }


    if (
        message.mediaType === "location"
    ) {

        const mapURL =
            "https://www.google.com/maps?q=" +
            encodeURIComponent(
                message.latitude +
                "," +
                message.longitude
            );

        mediaHTML = `
            <div class="locationMessage">

                <strong>
                    📍 Location shared
                </strong>

                <a
                    href="${mapURL}"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    View Location
                </a>

            </div>
        `;
    }


    const textHTML =
        message.text
            ? `
                <p class="nexa-message-text">
                    ${escapeHTML(message.text)}
                </p>
              `
            : "";


    messageElement.innerHTML = `

        <div class="nexa-message-bubble">

            <div class="nexa-message-sender">
                ${escapeHTML(sender)}
            </div>

            ${textHTML}

            ${mediaHTML}

            <small class="nexa-message-time">
                ${formatTime(message.timestamp)}
            </small>

        </div>

    `;


    messagesContainer.appendChild(
        messageElement
    );
}


/* =========================================================
   ESCAPE HTML
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


/* =========================================================
   PEER CONNECTION
========================================================= */

function createPeerConnection(
    otherUserId
) {

    const connection =
        new RTCPeerConnection(
            rtcConfiguration
        );


    connection.onicecandidate =
        function (event) {

            if (
                event.candidate
            ) {

                socket.emit(
                    "ice-candidate",
                    {

                        receiverId:
                            Number(
                                otherUserId
                            ),

                        senderId:
                            Number(
                                currentUser.id
                            ),

                        candidate:
                            event.candidate

                    }
                );

            }

        };


    connection.ontrack =
        function (event) {

            remoteStream =
                event.streams[0];


            if (
                activeCall &&
                activeCall.callType ===
                    "video"
            ) {

                remoteCallArea.style.display =
                    "block";


                remoteVideo.style.display =
                    "block";


                remoteAudio.style.display =
                    "none";


                remoteVideo.srcObject =
                    remoteStream;


                remoteVideo.play()
                    .catch(
                        () => {}
                    );

            }

            else {

                remoteCallArea.style.display =
                    "block";


                remoteVideo.style.display =
                    "none";


                remoteAudio.style.display =
                    "block";


                remoteAudio.srcObject =
                    remoteStream;


                remoteAudio.play()
                    .catch(
                        () => {}
                    );

            }

        };


    connection.onconnectionstatechange =
        function () {

            console.log(
                "WebRTC state:",
                connection.connectionState
            );


            if (
                connection.connectionState ===
                    "connected"
            ) {

                callInProgress =
                    true;


                endCallButton.style.display =
                    "inline-block";


                callStatus.textContent =
                    "Connected";

            }


            if (
                connection.connectionState ===
                    "failed"
            ) {

                endCall();

            }


            if (
                connection.connectionState ===
                    "closed"
            ) {

                endCall(
                    false
                );

            }

        };


    return connection;

}


/* =========================================================
   START VOICE CALL
========================================================= */

async function startVoiceCall() {

    if (!selectedFriend) {

        alert(
            "Open a conversation first."
        );

        return;

    }


    if (callInProgress) {
        return;
    }


    try {

        callInProgress =
            true;


        callStatus.textContent =
            "Calling " +
            selectedFriend.name +
            "...";


        localStream =
            await navigator
                .mediaDevices
                .getUserMedia({
                    audio: true,
                    video: false
                });


        peerConnection =
            createPeerConnection(
                selectedFriend.id
            );


        localStream
            .getTracks()
            .forEach(
                track =>
                    peerConnection.addTrack(
                        track,
                        localStream
                    )
            );


        activeCall = {

            callId:
                Date.now(),

            callerId:
                Number(
                    currentUser.id
                ),

            receiverId:
                Number(
                    selectedFriend.id
                ),

            callerName:
                currentUser.name,

            callType:
                "voice"

        };


        const offer =
            await peerConnection
                .createOffer();


        await peerConnection
            .setLocalDescription(
                offer
            );


        activeCall.offer =
            offer;


        socket.emit(
            "call-user",
            activeCall
        );


        endCallButton.style.display =
            "inline-block";

    }

    catch (error) {

        console.error(
            "Voice call error:",
            error
        );


        endCall(
            false
        );


        alert(
            "Could not start the voice call. Please allow microphone access."
        );

    }

}


/* =========================================================
   START VIDEO CALL
========================================================= */

async function startVideoCall() {

    if (!selectedFriend) {

        alert(
            "Open a conversation first."
        );

        return;

    }


    if (callInProgress) {
        return;
    }


    try {

        callInProgress =
            true;


        callStatus.textContent =
            "Calling " +
            selectedFriend.name +
            "...";


        localStream =
            await navigator
                .mediaDevices
                .getUserMedia({
                    audio: true,
                    video: true
                });


        peerConnection =
            createPeerConnection(
                selectedFriend.id
            );


        localStream
            .getTracks()
            .forEach(
                track =>
                    peerConnection.addTrack(
                        track,
                        localStream
                    )
            );


        activeCall = {

            callId:
                Date.now(),

            callerId:
                Number(
                    currentUser.id
                ),

            receiverId:
                Number(
                    selectedFriend.id
                ),

            callerName:
                currentUser.name,

            callType:
                "video"

        };


        const offer =
            await peerConnection
                .createOffer();


        await peerConnection
            .setLocalDescription(
                offer
            );


        activeCall.offer =
            offer;


        socket.emit(
            "call-user",
            activeCall
        );


        endCallButton.style.display =
            "inline-block";

    }

    catch (error) {

        console.error(
            "Video call error:",
            error
        );


        endCall(
            false
        );


        alert(
            "Could not start the video call. Please allow camera and microphone access."
        );

    }

}


/* =========================================================
   INCOMING CALL
========================================================= */

socket.on(
    "incoming-call",
    function (data) {

        if (!data) {
            return;
        }


        activeCall = {

            callId:
                data.callId,

            callerId:
                Number(
                    data.callerId
                ),

            receiverId:
                Number(
                    currentUser.id
                ),

            callerName:
                data.callerName ||
                "Someone",

            callType:
                data.callType ||
                "voice",

            offer:
                data.offer

        };


        incomingCaller.textContent =
            activeCall.callerName +
            " is calling you";


        const icon =
            document.getElementById(
                "incomingCallIcon"
            );


        if (icon) {

            icon.textContent =
                activeCall.callType ===
                "video"
                    ? "📹"
                    : "📞";

        }


        const title =
            incomingCall.querySelector(
                "h2"
            );


        if (title) {

            title.textContent =
                activeCall.callType ===
                "video"
                    ? "Incoming Video Call"
                    : "Incoming Voice Call";

        }


        incomingCall.style.display =
            "flex";

    }
);


/* =========================================================
   ACCEPT CALL
========================================================= */

acceptCallButton.addEventListener(
    "click",
    async function () {

        if (
            !activeCall ||
            !activeCall.offer
        ) {

            return;

        }


        try {

            callInProgress =
                true;


            const isVideo =
                activeCall.callType ===
                "video";


            callStatus.textContent =
                "Connecting...";


            localStream =
                await navigator
                    .mediaDevices
                    .getUserMedia(
                        {
                            audio: true,
                            video: isVideo
                        }
                    );


            peerConnection =
                createPeerConnection(
                    activeCall.callerId
                );


            localStream
                .getTracks()
                .forEach(
                    track =>
                        peerConnection.addTrack(
                            track,
                            localStream
                        )
                );


            await peerConnection
                .setRemoteDescription(
                    new RTCSessionDescription(
                        activeCall.offer
                    )
                );


            for (
                const candidate
                of pendingIceCandidates
            ) {

                try {

                    await peerConnection
                        .addIceCandidate(
                            candidate
                        );

                }

                catch (error) {

                    console.error(
                        "ICE error:",
                        error
                    );

                }

            }


            pendingIceCandidates =
                [];


            const answer =
                await peerConnection
                    .createAnswer();


            await peerConnection
                .setLocalDescription(
                    answer
                );


            socket.emit(
                "answer-call",
                {

                    callId:
                        activeCall.callId,

                    callerId:
                        activeCall.callerId,

                    answer:
                        answer,

                    answererId:
                        currentUser.id

                }
            );


            incomingCall.style.display =
                "none";


            endCallButton.style.display =
                "inline-block";


            callStatus.textContent =
                "Connecting...";

        }

        catch (error) {

            console.error(
                "Accept call error:",
                error
            );


            endCall(
                false
            );

        }

    }
);


/* =========================================================
   DECLINE CALL
========================================================= */

declineCallButton.addEventListener(
    "click",
    function () {

        if (!activeCall) {
            return;
        }


        socket.emit(
            "decline-call",
            {

                callerId:
                    activeCall.callerId

            }
        );


        incomingCall.style.display =
            "none";


        activeCall =
            null;


        callStatus.textContent =
            "Call declined.";

    }
);


/* =========================================================
   CALL ANSWERED
========================================================= */

socket.on(
    "call-answered",
    async function (data) {

        if (
            !peerConnection ||
            !data ||
            !data.answer
        ) {

            return;

        }


        try {

            await peerConnection
                .setRemoteDescription(
                    new RTCSessionDescription(
                        data.answer
                    )
                );


            for (
                const candidate
                of pendingIceCandidates
            ) {

                try {

                    await peerConnection
                        .addIceCandidate(
                            candidate
                        );

                }

                catch (error) {

                    console.error(
                        "ICE error:",
                        error
                    );

                }

            }


            pendingIceCandidates =
                [];


            callStatus.textContent =
                "Connecting...";

        }

        catch (error) {

            console.error(
                "Call answer error:",
                error
            );


            endCall(
                false
            );

        }

    }
);


/* =========================================================
   ICE CANDIDATE
========================================================= */

socket.on(
    "ice-candidate",
    async function (data) {

        if (
            !data ||
            !data.candidate
        ) {

            return;

        }


        const candidate =
            new RTCIceCandidate(
                data.candidate
            );


        if (
            peerConnection &&
            peerConnection.remoteDescription
        ) {

            try {

                await peerConnection
                    .addIceCandidate(
                        candidate
                    );

            }

            catch (error) {

                console.error(
                    "ICE candidate error:",
                    error
                );

            }

        }

        else {

            pendingIceCandidates.push(
                candidate
            );

        }

    }
);


/* =========================================================
   CALL DECLINED
========================================================= */

socket.on(
    "call-declined",
    function () {

        alert(
            "The call was declined."
        );


        endCall(
            false
        );

    }
);


/* =========================================================
   CALL ENDED
========================================================= */

socket.on(
    "call-ended",
    function () {

        callStatus.textContent =
            "Call ended.";

        endCall(
            false
        );

    }
);


/* =========================================================
   END CALL
========================================================= */

function endCall(
    notifyServer = true
) {

    if (
        notifyServer &&
        activeCall
    ) {

        const otherUserId =
            Number(
                activeCall.callerId ===
                Number(currentUser.id)
                    ? activeCall.receiverId
                    : activeCall.callerId
            );


        if (otherUserId) {

            socket.emit(
                "end-call",
                {

                    receiverId:
                        otherUserId

                }
            );

        }

    }


    if (peerConnection) {

        peerConnection.close();

        peerConnection =
            null;

    }


    if (localStream) {

        localStream
            .getTracks()
            .forEach(
                track =>
                    track.stop()
            );

        localStream =
            null;

    }


    remoteStream =
        null;


    remoteAudio.srcObject =
        null;


    remoteVideo.srcObject =
        null;


    remoteCallArea.style.display =
        "none";


    remoteVideo.style.display =
        "none";


    remoteAudio.style.display =
        "block";


    incomingCall.style.display =
        "none";


    endCallButton.style.display =
        "none";


    callStatus.textContent =
        "";


    pendingIceCandidates =
        [];


    activeCall =
        null;


    callInProgress =
        false;

}


/* =========================================================
   CALL BUTTONS
========================================================= */

voiceCallButton.addEventListener(
    "click",
    startVoiceCall
);


videoCallButton.addEventListener(
    "click",
    startVideoCall
);


endCallButton.addEventListener(
    "click",
    function () {

        endCall(
            true
        );

    }
);


/* =========================================================
   OPEN FRIEND FROM URL
========================================================= */

async function openFriendFromURL() {

    const params =
        new URLSearchParams(
            window.location.search
        );


    const friendId =
        Number(
            params.get("user")
        );


    if (!friendId) {
        return;
    }


    await getUsers();


    const friend =
        findUserById(
            friendId
        );


    if (friend) {

        await openChat(
            friend
        );

    }

}

const backToConversations =
    document.getElementById(
        "backToConversations"
    );


if (backToConversations) {

    backToConversations.addEventListener(
        "click",
        function () {

            const shell =
                document.querySelector(
                    ".messages-shell"
                );

            if (shell) {

                shell.classList.remove(
                    "chat-open"
                );

            }

        }
    );
}


/* =========================================================
   INITIALIZE
========================================================= */

async function initializeNEXA() {

    console.log(
        "Initializing NEXA messaging..."
    );


    await getUsers();

    await loadMessagesFromServer();

    await displayConversations();

    await openFriendFromURL();

    const savedFriendId =
    localStorage.getItem(
        "nexaActiveConversation"
    );

if (savedFriendId) {

    const friend =
        findUserById(
            Number(savedFriendId)
        );

    if (friend) {

        await openChat(
            friend
        );

    }
}


    console.log(
        "NEXA messaging initialized."
    );

}


initializeNEXA();