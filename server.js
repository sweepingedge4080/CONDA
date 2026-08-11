const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
require('dotenv').config();

// Import feature modules (blocks)
const roomManager = require('./modules/roomManager');
const messageHandler = require('./modules/messageHandler');
const userManager = require('./modules/userManager');
const typingHandler = require('./modules/typingHandler');
const disconnectHandler = require('./modules/disconnectHandler');
const routes = require('./routes/index');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.static('public'));
app.use(express.json());
app.use('/', routes);

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

console.log('🚀 Server starting...');
console.log(`📁 Current directory: ${__dirname}`);

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  // Initialize user
  userManager.addUser(socket.id);
  
  // Feature: Room Management
  roomManager.handleRoomJoin(socket, io);
  roomManager.handleFindPartner(socket, io);
  
  // Feature: Messaging
  messageHandler.handleMessage(socket, io);
  
  // Feature: Typing Indicators
  typingHandler.handleTyping(socket, io);
  
  // Feature: Disconnection
  disconnectHandler.handleDisconnect(socket, io);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🌐 Open http://localhost:${PORT} in your browser`);
});
