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
const gifBtn = document.getElementById('gifBtn');
const gifPicker = document.getElementById('gifPicker');
const gifSearchInput = document.getElementById('gifSearchInput');
const gifSearchBtn = document.getElementById('gifSearchBtn');
const gifResults = document.getElementById('gifResults');
const themeToggle = document.getElementById('themeToggle');

let currentRoom = null;
let isConnected = false;
let typingTimeout = null;
let userScrolledUp = false;
let isDarkMode = false;

// Giphy API Key
const GIPHY_API_KEY = 'PAOlsMlh2SUpxtBJ6wnwJr3QurG21KZK';
const GIPHY_API_URL = 'https://api.giphy.com/v1/gifs';

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

    if (date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
        return 'Yesterday ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    if (diffDays < 7) {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return days[date.getDay()] + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Scroll functions
function scrollToBottom() {
    requestAnimationFrame(() => {
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    });
}

function forceScrollToBottom() {
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// Add "Jump to Bottom" button
function addScrollButton() {
    const container = document.querySelector('.messages-wrapper');
    const button = document.createElement('button');
    button.id = 'scrollToBottomBtn';
    button.textContent = '↓';
    
    container.appendChild(button);
    
    button.addEventListener('click', () => {
        forceScrollToBottom();
        userScrolledUp = false;
        button.style.display = 'none';
    });
    
    messagesDiv.addEventListener('scroll', () => {
        const isAtBottom = messagesDiv.scrollHeight - messagesDiv.scrollTop <= messagesDiv.clientHeight + 10;
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
        gifPicker.style.display = 'none';
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
    messageInput.dispatchEvent(new Event('input'));
}

// GIF functions
function toggleGifPicker() {
    if (gifPicker.style.display === 'none') {
        gifPicker.style.display = 'block';
        emojiPicker.style.display = 'none';
        loadTrendingGifs();
    } else {
        gifPicker.style.display = 'none';
    }
}

async function loadTrendingGifs() {
    gifResults.innerHTML = '<div class="gif-loading">Loading trending GIFs...</div>';
    try {
        const response = await fetch(`${GIPHY_API_URL}/trending?api_key=${GIPHY_API_KEY}&limit=30&rating=g`);
        const data = await response.json();
        displayGifs(data.data);
    } catch (error) {
        console.error('Error loading trending GIFs:', error);
        gifResults.innerHTML = '<div class="gif-loading">Failed to load GIFs. Please try searching.</div>';
    }
}

async function searchGifs(query) {
    if (!query.trim()) {
        loadTrendingGifs();
        return;
    }
    gifResults.innerHTML = '<div class="gif-loading">Searching...</div>';
    try {
        const response = await fetch(`${GIPHY_API_URL}/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(query)}&limit=30&rating=g`);
        const data = await response.json();
        displayGifs(data.data);
    } catch (error) {
        console.error('Error searching GIFs:', error);
        gifResults.innerHTML = '<div class="gif-loading">Search failed. Please try again.</div>';
    }
}

function displayGifs(gifs) {
    if (!gifs || gifs.length === 0) {
        gifResults.innerHTML = '<div class="gif-loading">No GIFs found</div>';
        return;
    }
    gifResults.innerHTML = '';
    gifs.forEach(gif => {
        const img = document.createElement('img');
        img.className = 'gif-item';
        img.src = gif.images.fixed_width_small.url;
        img.alt = gif.title || 'GIF';
        img.title = gif.title || 'GIF';
        img.addEventListener('click', () => {
            sendGif(gif.images.fixed_width.url);
        });
        gifResults.appendChild(img);
    });
}

function sendGif(gifUrl) {
    if (!currentRoom || !isConnected) {
        return;
    }
    
    const messageData = {
        roomId: currentRoom,
        message: gifUrl,
        isGif: true,
        timestamp: new Date().toISOString()
    };
    
    socket.emit('send-message', messageData);
    gifPicker.style.display = 'none';
    gifSearchInput.value = '';
}

// UI Functions
function addMessage(message, isOwn, timestamp, isGif) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isOwn ? 'own' : 'other'}`;
    
    // Check if it's a GIF by the flag or by checking if it's a URL
    if (isGif || (typeof message === 'string' && (message.startsWith('http') && (message.includes('.gif') || message.includes('giphy.com') || message.includes('media') || message.includes('giphy'))))) {
        const img = document.createElement('img');
        img.className = 'gif-message';
        img.src = message;
        img.alt = 'GIF';
        img.loading = 'lazy';
        img.style.maxWidth = '100%';
        img.style.borderRadius = '8px';
        img.style.maxHeight = '200px';
        img.style.objectFit = 'contain';
        messageDiv.appendChild(img);
    } else {
        const textSpan = document.createElement('span');
        textSpan.textContent = message;
        messageDiv.appendChild(textSpan);
    }
    
    const timeSpan = document.createElement('span');
    timeSpan.className = 'timestamp';
    timeSpan.textContent = formatTime(timestamp);
    messageDiv.appendChild(timeSpan);
    
    messagesDiv.appendChild(messageDiv);
    forceScrollToBottom();
}

function addSystemMessage(message) {
    const systemDiv = document.createElement('div');
    systemDiv.className = 'system-message';
    systemDiv.textContent = message;
    messagesDiv.appendChild(systemDiv);
    forceScrollToBottom();
}

function resetToDisconnectedState() {
    messageInput.disabled = true;
    sendButton.disabled = true;
    messageInput.value = '';
    typingIndicator.textContent = '';
    findPartnerBtn.disabled = false;
    findPartnerBtn.textContent = 'Find Partner';
    emojiBtn.disabled = true;
    gifBtn.disabled = true;
    emojiPicker.style.display = 'none';
    gifPicker.style.display = 'none';
}

function sendMessage() {
    const message = messageInput.value.trim();
    if (!message || !currentRoom || !isConnected) {
        return;
    }
    
    const messageData = {
        roomId: currentRoom,
        message: message,
        isGif: false,
        timestamp: new Date().toISOString()
    };
    
    socket.emit('send-message', messageData);
    messageInput.value = '';
    messageInput.focus();
    setTimeout(() => {
        forceScrollToBottom();
    }, 10);
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
    forceScrollToBottom();
}

// Socket event handlers
socket.on('connect', () => {
    statusDiv.textContent = 'Connected';
    statusDiv.style.background = 'rgba(76, 175, 80, 0.8)';
    findPartnerBtn.disabled = false;
    emojiBtn.disabled = true;
    gifBtn.disabled = true;
    addSystemMessage('Connected to server! Click "Find Partner" to start.');
});

socket.on('disconnect', () => {
    statusDiv.textContent = 'Disconnected';
    statusDiv.style.background = 'rgba(244, 67, 54, 0.8)';
    findPartnerBtn.disabled = true;
    messageInput.disabled = true;
    sendButton.disabled = true;
    emojiBtn.disabled = true;
    gifBtn.disabled = true;
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
    gifBtn.disabled = !isConnected;
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
    forceScrollToBottom();
});

socket.on('partner-found', (data) => {
    isConnected = true;
    messageInput.disabled = false;
    sendButton.disabled = false;
    emojiBtn.disabled = false;
    gifBtn.disabled = false;
    statusDiv.textContent = 'Connected with partner!';
    statusDiv.style.background = 'rgba(76, 175, 80, 0.8)';
    addSystemMessage('🎉 ' + data.message);
    findPartnerBtn.disabled = false;
    findPartnerBtn.textContent = 'Find New Partner';
    forceScrollToBottom();
});

socket.on('partner-disconnected', (data) => {
    isConnected = false;
    messageInput.disabled = true;
    sendButton.disabled = true;
    emojiBtn.disabled = true;
    gifBtn.disabled = true;
    statusDiv.textContent = 'Partner disconnected';
    statusDiv.style.background = 'rgba(244, 67, 54, 0.8)';
    addSystemMessage(data.message || 'Your partner has disconnected');
    findPartnerBtn.disabled = false;
    findPartnerBtn.textContent = 'Find New Partner';
    emojiPicker.style.display = 'none';
    gifPicker.style.display = 'none';
    forceScrollToBottom();
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
    gifPicker.style.display = 'none';
    forceScrollToBottom();
});

// Message events
socket.on('receive-message', (data) => {
    addMessage(data.message, data.isOwn, data.timestamp, data.isGif || false);
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
        e.preventDefault();
    }
});

findPartnerBtn.addEventListener('click', findPartner);
disconnectBtn.addEventListener('click', disconnect);
emojiBtn.addEventListener('click', toggleEmojiPicker);
gifBtn.addEventListener('click', toggleGifPicker);
themeToggle.addEventListener('click', toggleTheme);
gifSearchBtn.addEventListener('click', () => {
    searchGifs(gifSearchInput.value);
});
gifSearchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        searchGifs(gifSearchInput.value);
        e.preventDefault();
    }
});

// Emoji click handler
document.querySelectorAll('.emoji-item').forEach(item => {
    item.addEventListener('click', () => {
        insertEmoji(item.dataset.emoji);
    });
});

// Close pickers when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.emoji-picker') && !e.target.closest('.emoji-btn')) {
        emojiPicker.style.display = 'none';
    }
    if (!e.target.closest('.gif-picker') && !e.target.closest('.gif-btn')) {
        gifPicker.style.display = 'none';
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
gifBtn.disabled = true;

// Initialize scroll button when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    addScrollButton();
    setTimeout(forceScrollToBottom, 100);
});

// Force scroll on resize
window.addEventListener('resize', () => {
    if (!userScrolledUp) {
        forceScrollToBottom();
    }
});
