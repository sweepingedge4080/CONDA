// Feature: Handle user disconnection
const { leaveRoom, rooms } = require('./roomManager');
const { removeUser } = require('./userManager');

function handleDisconnect(socket, io) {
  socket.on('disconnect', () => {
    console.log('❌ Client disconnected:', socket.id);
    
    // Find and leave all rooms this user is in
    let disconnectedRooms = [];
    for (const [roomId, room] of rooms.entries()) {
      if (room.users.has(socket.id)) {
        leaveRoom(roomId, socket.id);
        socket.leave(roomId);
        disconnectedRooms.push(roomId);
        
        // Notify remaining users
        if (room.users.size > 0) {
          io.to(roomId).emit('partner-disconnected', {
            message: 'Your partner has disconnected'
          });
          console.log(`📢 Notified remaining users in room ${roomId}`);
        }
      }
    }
    
    // Clean up empty rooms
    for (const roomId of disconnectedRooms) {
      const room = rooms.get(roomId);
      if (room && room.users.size === 0) {
        rooms.delete(roomId);
        console.log(`🗑️ Removed empty room: ${roomId}`);
      }
    }
    
    // Remove user from tracking
    removeUser(socket.id);
    console.log(`👤 Removed user ${socket.id} from tracking`);
  });
}

module.exports = {
  handleDisconnect
};
