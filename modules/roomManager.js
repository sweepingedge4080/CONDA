// Feature: Room creation, joining, and partner matching
const rooms = new Map(); // roomId -> { users: Set, messages: [] }

function createRoom() {
  const roomId = Math.random().toString(36).substring(2, 8);
  rooms.set(roomId, {
    users: new Set(),
    messages: []
  });
  return roomId;
}

function joinRoom(roomId, socketId) {
  const room = rooms.get(roomId);
  if (!room) return false;
  
  room.users.add(socketId);
  return true;
}

function leaveRoom(roomId, socketId) {
  const room = rooms.get(roomId);
  if (!room) return;
  
  room.users.delete(socketId);
  if (room.users.size === 0) {
    rooms.delete(roomId);
  }
}

function findAvailablePartner(socketId) {
  // Find a room with only 1 user (not including the current user)
  for (const [roomId, room] of rooms.entries()) {
    if (room.users.size === 1 && !room.users.has(socketId)) {
      return roomId;
    }
  }
  return null;
}

function handleRoomJoin(socket, io) {
  socket.on('join-room', (roomId) => {
    if (!roomId) {
      // Create new room if no roomId provided
      const newRoomId = createRoom();
      joinRoom(newRoomId, socket.id);
      socket.join(newRoomId);
      socket.emit('room-joined', { roomId: newRoomId, isAlone: true });
      return;
    }
    
    // Check if room exists
    const room = rooms.get(roomId);
    if (!room) {
      socket.emit('error', 'Room does not exist');
      return;
    }
    
    if (room.users.size >= 2) {
      socket.emit('error', 'Room is full');
      return;
    }
    
    joinRoom(roomId, socket.id);
    socket.join(roomId);
    
    // Notify both users they have a partner
    io.to(roomId).emit('partner-found', { 
      roomId,
      message: 'You are now connected with a stranger!'
    });
    
    socket.emit('room-joined', { roomId, isAlone: false });
  });
}

function handleFindPartner(socket, io) {
  socket.on('find-partner', () => {
    // Leave current room if any
    const currentRoom = Array.from(socket.rooms).find(r => r !== socket.id);
    if (currentRoom) {
      leaveRoom(currentRoom, socket.id);
      socket.leave(currentRoom);
    }
    
    // Find available partner
    const existingRoom = findAvailablePartner(socket.id);
    
    if (existingRoom) {
      // Join existing room with a partner
      joinRoom(existingRoom, socket.id);
      socket.join(existingRoom);
      io.to(existingRoom).emit('partner-found', {
        roomId: existingRoom,
        message: 'You are now connected with a stranger!'
      });
      socket.emit('room-joined', { roomId: existingRoom, isAlone: false });
    } else {
      // Create new room and wait
      const newRoomId = createRoom();
      joinRoom(newRoomId, socket.id);
      socket.join(newRoomId);
      socket.emit('room-joined', { 
        roomId: newRoomId, 
        isAlone: true,
        message: 'Waiting for a partner...'
      });
    }
  });
}

module.exports = {
  rooms,
  createRoom,
  joinRoom,
  leaveRoom,
  findAvailablePartner,
  handleRoomJoin,
  handleFindPartner
};
