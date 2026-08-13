const socket = io();

// DOM Elements
const messagesDiv = document.getElementById('messages');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const findPartnerBtn = document.getElementById('findPartnerBtn');
const disconnectBtn = document.getElementById('disconnectBtn');
const statusDiv = document.getElementById('status');
const typingIndicator = document.getElementById('typingIndicator');
const emojiBtn = document.getElementById('emojiBtn');
const emojiPicker = document.getElementById('emojiPicker');
const themeToggle = document.getElementById('themeToggle');

let currentRoom = null;
let isConnected = false;
let typingTimeout = null;
let userScrolledUp = false;
let isDarkMode = false;

// Theme functions
function toggleTheme() {
    isDarkMode = !isDarkMode;
    if (isDarkMode) {
        document.documentElement.setAttribute('data-theme', 'dark');
        themeToggle.textContent = '☀️';
        localStorage.setItem('theme', 'dark');
    } else {
        document.documentElement.removeAttribute('data-theme');
        themeToggle.textContent = '🌙';
        localStorage.setItem('theme', 'light');
    }
}

function loadTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        isDarkMode = true;
        document.documentElement.setAttribute('data-theme', 'dark');
        themeToggle.textContent = '☀️';
    } else {
        isDarkMode = false;
        document.documentElement.removeAttribute('data-theme');
        themeToggle.textContent = '🌙';
    }
}

// Helper function to format timestamps
function formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    // If today, show time only
    if (date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // If yesterday
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
        return 'Yesterday ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // If within last 7 days
    if (diffDays < 7) {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return days[date.getDay()] + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // Otherwise show full date
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Scroll functions
function scrollToBottom() {
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function smartScrollToBottom() {
    // Only auto-scroll if user hasn't manually scrolled up
    if (!userScrolledUp) {
        scrollToBottom();
    }
}

// Add "Jump to Bottom" button
function addScrollButton() {
    const container = document.querySelector('.messages-wrapper');
    const button = document.createElement('button');
    button.id = 'scrollToBottomBtn';
    button.textContent = '↓';
    
    container.appendChild(button);
    
    button.addEventListener('click', () => {
        scrollToBottom();
        userScrolledUp = false;
        button.style.display = 'none';
    });
    
    messagesDiv.addEventListener('scroll', () => {
        const isAtBottom = messagesDiv.scrollHeight - messagesDiv.scrollTop <= messagesDiv.clientHeight + 10;
        // Only update userScrolledUp if they manually scrolled
        if (!isAtBottom) {
            userScrolledUp = true;
            button.style.display = 'block';
        } else {
            userScrolledUp = false;
            button.style.display = 'none';
        }
    });
    
    return button;
}

// Emoji functions
function toggleEmojiPicker() {
    if (emojiPicker.style.display === 'none') {
        emojiPicker.style.display = 'block';
    } else {
        emojiPicker.style.display = 'none';
    }
}

function insertEmoji(emoji) {
    const cursorPos = messageInput.selectionStart;
    const textBefore = messageInput.value.substring(0, cursorPos);
    const textAfter = messageInput.value.substring(cursorPos);
    messageInput.value = textBefore + emoji + textAfter;
    messageInput.focus();
    const newCursorPos = cursorPos + emoji.length;
    messageInput.setSelectionRange(newCursorPos, newCursorPos);
    emojiPicker.style.display = 'none';
    
    // Trigger input event for typing indicator
    messageInput.dispatchEvent(new Event('input'));
}

// UI Functions
function addMessage(message, isOwn, timestamp) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isOwn ? 'own' : 'other'}`;
    
    // Create message content with text and timestamp
    const textSpan = document.createElement('span');
    textSpan.textContent = message;
    
    const timeSpan = document.createElement('span');
    timeSpan.className = 'timestamp';
    timeSpan.textContent = formatTime(timestamp);
    
    messageDiv.appendChild(textSpan);
    messageDiv.appendChild(timeSpan);
    
    messagesDiv.appendChild(messageDiv);
    
    // Scroll to bottom after adding message
    scrollToBottom();
}

function addSystemMessage(message) {
    const systemDiv = document.createElement('div');
    systemDiv.className = 'system-message';
    systemDiv.textContent = message;
    messagesDiv.appendChild(systemDiv);
    
    // Scroll to bottom after adding system message
    scrollToBottom();
}

function resetToDisconnectedState() {
    messageInput.disabled = true;
    sendButton.disabled = true;
    messageInput.value = '';
    typingIndicator.textContent = '';
    findPartnerBtn.disabled = false;
    findPartnerBtn.textContent = 'Find Partner';
    emojiBtn.disabled = true;
    emojiPicker.style.display = 'none';
}

function sendMessage() {
    const message = messageInput.value.trim();
    if (!message || !currentRoom || !isConnected) {
        return;
    }
    
    const messageData = {
        roomId: currentRoom,
        message: message,
        timestamp: new Date().toISOString()
    };
    
    socket.emit('send-message', messageData);
    
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
    if (!currentRoom) {
        resetToDisconnectedState();
        return;
    }
    
    socket.emit('leave-room', currentRoom);
    resetToDisconnectedState();
    messagesDiv.innerHTML = '<div class="system-message">You disconnected. Click "Find Partner" to start again.</div>';
    currentRoom = null;
    isConnected = false;
    userScrolledUp = false;
    statusDiv.textContent = 'Disconnected';
    statusDiv.style.background = 'rgba(244, 67, 54, 0.8)';
}

// Socket event handlers
socket.on('connect', () => {
    statusDiv.textContent = 'Connected';
    statusDiv.style.background = 'rgba(76, 175, 80, 0.8)';
    findPartnerBtn.disabled = false;
    emojiBtn.disabled = true;
    addSystemMessage('Connected to server! Click "Find Partner" to start.');
});

socket.on('disconnect', () => {
    statusDiv.textContent = 'Disconnected';
    statusDiv.style.background = 'rgba(244, 67, 54, 0.8)';
    findPartnerBtn.disabled = true;
    messageInput.disabled = true;
    sendButton.disabled = true;
    emojiBtn.disabled = true;
    addSystemMessage('Disconnected from server.');
});

socket.on('connect_error', (error) => {
    console.error('Connection error:', error);
    statusDiv.textContent = 'Connection error';
    statusDiv.style.background = 'rgba(244, 67, 54, 0.8)';
    addSystemMessage('Unable to connect to server. Retrying...');
});

socket.on('reconnect', () => {
    statusDiv.textContent = 'Reconnected';
    statusDiv.style.background = 'rgba(76, 175, 80, 0.8)';
    addSystemMessage('Reconnected to server!');
    if (currentRoom) {
        socket.emit('join-room', currentRoom);
    }
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
    emojiBtn.disabled = !isConnected;
    findPartnerBtn.disabled = true;
    findPartnerBtn.textContent = 'Finding...';
    
    if (data.isAlone) {
        statusDiv.textContent = 'Waiting for partner...';
        statusDiv.style.background = 'rgba(255, 193, 7, 0.8)';
        addSystemMessage(data.message || 'Waiting for a partner...');
        setTimeout(() => {
            findPartnerBtn.disabled = false;
            findPartnerBtn.textContent = 'Cancel';
        }, 1000);
    } else {
        statusDiv.textContent = 'Connected with partner!';
        statusDiv.style.background = 'rgba(76, 175, 80, 0.8)';
        addSystemMessage('Connected! Say hello to your new partner!');
        findPartnerBtn.disabled = false;
        findPartnerBtn.textContent = 'Find New Partner';
    }
});

socket.on('partner-found', (data) => {
    isConnected = true;
    messageInput.disabled = false;
    sendButton.disabled = false;
    emojiBtn.disabled = false;
    statusDiv.textContent = 'Connected with partner!';
    statusDiv.style.background = 'rgba(76, 175, 80, 0.8)';
    addSystemMessage('🎉 ' + data.message);
    findPartnerBtn.disabled = false;
    findPartnerBtn.textContent = 'Find New Partner';
});

socket.on('partner-disconnected', (data) => {
    isConnected = false;
    messageInput.disabled = true;
    sendButton.disabled = true;
    emojiBtn.disabled = true;
    statusDiv.textContent = 'Partner disconnected';
    statusDiv.style.background = 'rgba(244, 67, 54, 0.8)';
    addSystemMessage(data.message || 'Your partner has disconnected');
    findPartnerBtn.disabled = false;
    findPartnerBtn.textContent = 'Find New Partner';
    emojiPicker.style.display = 'none';
});

socket.on('room-left', (data) => {
    addSystemMessage(data.message || 'You left the room');
    resetToDisconnectedState();
    currentRoom = null;
    isConnected = false;
    statusDiv.textContent = 'Disconnected';
    statusDiv.style.background = 'rgba(244, 67, 54, 0.8)';
    findPartnerBtn.disabled = false;
    findPartnerBtn.textContent = 'Find Partner';
    emojiPicker.style.display = 'none';
});

// Message events
socket.on('receive-message', (data) => {
    addMessage(data.message, data.isOwn, data.timestamp);
});

// Typing events
socket.on('user-typing', (data) => {
    if (data.isTyping) {
        typingIndicator.textContent = 'Partner is typing...';
    } else {
        typingIndicator.textContent = '';
    }
});

// Event Listeners
sendButton.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

findPartnerBtn.addEventListener('click', findPartner);
disconnectBtn.addEventListener('click', disconnect);
emojiBtn.addEventListener('click', toggleEmojiPicker);
themeToggle.addEventListener('click', toggleTheme);

// Emoji click handler
document.querySelectorAll('.emoji-item').forEach(item => {
    item.addEventListener('click', () => {
        insertEmoji(item.dataset.emoji);
    });
});

// Close emoji picker when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.emoji-picker') && !e.target.closest('.emoji-btn')) {
        emojiPicker.style.display = 'none';
    }
});

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

// Load saved theme on startup
loadTheme();

// Initial state
findPartnerBtn.disabled = true;
statusDiv.textContent = 'Connecting...';
emojiBtn.disabled = true;

// Initialize scroll button when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    addScrollButton();
});
