// Feature: Message sending and receiving
const { rooms } = require('./roomManager');

function getRoomMessages(roomId) {
  const room = rooms.get(roomId);
  if (!room) return [];
  return room.messages;
}

function saveMessage(roomId, messageData) {
  const room = rooms.get(roomId);
  if (!room) return false;
  
  room.messages.push({
    ...messageData,
    timestamp: new Date().toISOString()
  });
  
  // Limit message history to 100 messages
  if (room.messages.length > 100) {
    room.messages.shift();
  }
  
  return true;
}

function handleMessage(socket, io) {
  socket.on('send-message', (data) => {
    const { roomId, message } = data;
    
    if (!roomId || !message || message.trim() === '') {
      socket.emit('error', 'Invalid message');
      return;
    }
    
    const room = rooms.get(roomId);
    if (!room) {
      socket.emit('error', 'Room not found');
      return;
    }
    
    // Check if user is in this room
    if (!room.users.has(socket.id)) {
      socket.emit('error', 'You are not in this room');
      return;
    }
    
    // Save and broadcast message
    const messageData = {
      userId: socket.id,
      message: message.trim(),
      timestamp: new Date().toISOString()
    };
    
    saveMessage(roomId, messageData);
    
    // Broadcast to everyone in the room (including sender for UI consistency)
    io.to(roomId).emit('receive-message', {
      ...messageData,
      isOwn: false
    });
    
    // Also send back to sender with isOwn flag
    socket.emit('receive-message', {
      ...messageData,
      isOwn: true
    });
  });
}

module.exports = {
  getRoomMessages,
  saveMessage,
  handleMessage
};
