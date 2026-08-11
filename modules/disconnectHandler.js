// Feature: Handle user disconnection
const { leaveRoom, rooms } = require('./roomManager');
const { removeUser } = require('./userManager');

function handleDisconnect(socket, io) {
  // Handle both manual leave and actual disconnection
  socket.on('leave-room', (roomId) => {
    console.log(`🚪 User ${socket.id} manually leaving room: ${roomId}`);
    
    if (!roomId) {
      // If no roomId provided, find and leave all rooms
      const userRooms = Array.from(socket.rooms).filter(r => r !== socket.id);
      for (const room of userRooms) {
        leaveRoom(room, socket.id);
        socket.leave(room);
        socket.emit('room-left', { message: `Left room ${room}` });
      }
      return;
    }
    
    const room = rooms.get(roomId);
    if (!room) {
      socket.emit('error', 'Room not found');
      return;
    }
    
    if (!room.users.has(socket.id)) {
      socket.emit('error', 'You are not in this room');
      return;
    }
    
    // Remove user from room
    leaveRoom(roomId, socket.id);
    socket.leave(roomId);
    
    // Notify the user they left
    socket.emit('room-left', { message: 'You left the room' });
    
    // Notify other users in the room that partner disconnected
    socket.to(roomId).emit('partner-disconnected', {
      message: 'Your partner has disconnected'
    });
    
    console.log(`👤 User ${socket.id} left room ${roomId}`);
  });
  
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
