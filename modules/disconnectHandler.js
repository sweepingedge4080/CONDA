// Feature: Handle user disconnection
const { leaveRoom, rooms } = require('./roomManager');
const { removeUser, updateUserRoom } = require('./userManager');

function handleDisconnect(socket, io) {
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    
    // Find and leave all rooms this user is in
    for (const [roomId, room] of rooms.entries()) {
      if (room.users.has(socket.id)) {
        leaveRoom(roomId, socket.id);
        socket.leave(roomId);
        
        // Notify remaining users in the room
        io.to(roomId).emit('partner-disconnected', {
          message: 'Your partner has disconnected'
        });
        
        // If room is empty, clean it up
        if (room.users.size === 0) {
          rooms.delete(roomId);
        }
      }
    }
    
    // Remove user from tracking
    removeUser(socket.id);
  });
}

module.exports = {
  handleDisconnect
};
