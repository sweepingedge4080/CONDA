// Feature: Typing indicators
const { rooms } = require('./roomManager');

function handleTyping(socket, io) {
  socket.on('typing', (data) => {
    const { roomId, isTyping } = data;
    
    if (!roomId) {
      console.log('⚠️ Typing event missing roomId');
      return;
    }
    
    const room = rooms.get(roomId);
    if (!room) {
      console.log(`⚠️ Room ${roomId} not found for typing event`);
      return;
    }
    
    // Check if user is in this room
    if (!room.users.has(socket.id)) {
      console.log(`⚠️ User ${socket.id} not in room ${roomId}`);
      return;
    }
    
    // Broadcast typing status to others in the room
    socket.to(roomId).emit('user-typing', {
      userId: socket.id,
      isTyping: isTyping
    });
  });
}

module.exports = {
  handleTyping
};
