const socket = io();

// DOM Elements
const messagesDiv = document.getElementById('messages');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const findPartnerBtn = document.getElementById('findPartnerBtn');
const disconnectBtn = document.getElementById('disconnectBtn');
const statusDiv = document.getElementById('status');
const typingIndicator = document.getElementById('typingIndicator');

let currentRoom = null;
let isConnected = false;
let typingTimeout = null;

// Socket event handlers
socket.on('connect', () => {
    statusDiv.textContent = 'Connected';
    statusDiv.style.background = 'rgba(76, 175, 80, 0.8)';
    findPartnerBtn.disabled = false;
    addSystemMessage('Connected to server! Click "Find Partner" to start.');
});

socket.on('disconnect', () => {
    statusDiv.textContent = 'Disconnected';
    statusDiv.style.background = 'rgba(244, 67, 54, 0.8)';
    findPartnerBtn.disabled = true;
    messageInput.disabled = true;
    sendButton.disabled = true;
    addSystemMessage('Disconnected from server.');
});

socket.on('error', (error) => {
    addSystemMessage('Error: ' + error);
});

// Room events
socket.on('room-joined', (data) => {
    currentRoom = data.roomId;
    isConnected = !data.isAlone;
    messageInput.disabled = !isConnected;
    sendButton.disabled = !isConnected;
    
    if (data.isAlone) {
        statusDiv.textContent = 'Waiting for partner...';
        statusDiv.style.background = 'rgba(255, 193, 7, 0.8)';
        addSystemMessage(data.message || 'Waiting for a partner...');
    } else {
        statusDiv.textContent = 'Connected with partner!';
        statusDiv.style.background = 'rgba(76, 175, 80, 0.8)';
        addSystemMessage('Connected! Say hello to your new partner!');
    }
});

socket.on('partner-found', (data) => {
    isConnected = true;
    messageInput.disabled = false;
    sendButton.disabled = false;
    statusDiv.textContent = 'Connected with partner!';
    statusDiv.style.background = 'rgba(76, 175, 80, 0.8)';
    addSystemMessage('🎉 ' + data.message);
});

socket.on('partner-disconnected', (data) => {
    isConnected = false;
    messageInput.disabled = true;
    sendButton.disabled = true;
    statusDiv.textContent = 'Partner disconnected';
    statusDiv.style.background = 'rgba(244, 67, 54, 0.8)';
    addSystemMessage(data.message);
    currentRoom = null;
});

// Message events
socket.on('receive-message', (data) => {
    addMessage(data.message, data.isOwn);
});

// Typing events
socket.on('user-typing', (data) => {
    if (data.isTyping) {
        typingIndicator.textContent = 'Partner is typing...';
    } else {
        typingIndicator.textContent = '';
    }
});

// UI Functions
function addMessage(message, isOwn) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isOwn ? 'own' : 'other'}`;
    messageDiv.textContent = message;
    messagesDiv.appendChild(messageDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function addSystemMessage(message) {
    const systemDiv = document.createElement('div');
    systemDiv.className = 'system-message';
    systemDiv.textContent = message;
    messagesDiv.appendChild(systemDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function sendMessage() {
    const message = messageInput.value.trim();
    if (!message || !currentRoom || !isConnected) return;
    
    socket.emit('send-message', {
        roomId: currentRoom,
        message: message
    });
    
    messageInput.value = '';
    messageInput.focus();
}

function findPartner() {
    socket.emit('find-partner');
    addSystemMessage('Searching for a partner...');
    findPartnerBtn.disabled = true;
    findPartnerBtn.textContent = 'Searching...';
}

function disconnect() {
    if (currentRoom) {
        socket.emit('leave-room', currentRoom);
        addSystemMessage('Disconnected from chat');
    }
    isConnected = false;
    messageInput.disabled = true;
    sendButton.disabled = true;
    statusDiv.textContent = 'Disconnected';
    statusDiv.style.background = 'rgba(244, 67, 54, 0.8)';
    currentRoom = null;
    findPartnerBtn.disabled = false;
    findPartnerBtn.textContent = 'Find Partner';
    messagesDiv.innerHTML = '<div class="system-message">Disconnected. Click "Find Partner" to start again.</div>';
}

// Event Listeners
sendButton.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

findPartnerBtn.addEventListener('click', findPartner);
disconnectBtn.addEventListener('click', disconnect);

// Typing indicator
messageInput.addEventListener('input', () => {
    if (!currentRoom || !isConnected) return;
    
    socket.emit('typing', {
        roomId: currentRoom,
        isTyping: true
    });
    
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
        socket.emit('typing', {
            roomId: currentRoom,
            isTyping: false
        });
    }, 1000);
});

// Clean up on page unload
window.addEventListener('beforeunload', () => {
    if (currentRoom) {
        socket.emit('leave-room', currentRoom);
    }
});

// Initial state
findPartnerBtn.disabled = true;
statusDiv.textContent = 'Connecting...';
