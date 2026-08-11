// Feature: Room creation, joining, and partner matching
const rooms = new Map(); // roomId -> { users: Set, messages: [] }

function createRoom() {
  const roomId = Math.random().toString(36).substring(2, 8);
  rooms.set(roomId, {
    users: new Set(),
    messages: []
  });
  console.log(`📝 Created room: ${roomId}`);
  return roomId;
}

function joinRoom(roomId, socketId) {
  const room = rooms.get(roomId);
  if (!room) return false;
  
  room.users.add(socketId);
  console.log(`👤 User ${socketId} joined room ${roomId} (${room.users.size} users)`);
  return true;
}

function leaveRoom(roomId, socketId) {
  const room = rooms.get(roomId);
  if (!room) return;
  
  room.users.delete(socketId);
  console.log(`👋 User ${socketId} left room ${roomId} (${room.users.size} users remaining)`);
  
  if (room.users.size === 0) {
    rooms.delete(roomId);
    console.log(`🗑️ Removed empty room: ${roomId}`);
  }
}

function findAvailablePartner(socketId) {
  // Find a room with only 1 user (not including the current user)
  for (const [roomId, room] of rooms.entries()) {
    if (room.users.size === 1 && !room.users.has(socketId)) {
      console.log(`🔍 Found available room: ${roomId} for user ${socketId}`);
      return roomId;
    }
  }
  console.log(`🔍 No available rooms found for user ${socketId}`);
  return null;
}

function handleRoomJoin(socket, io) {
  socket.on('join-room', (roomId) => {
    console.log(`📥 User ${socket.id} joining room: ${roomId || 'new'}`);
    
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
    console.log(`🔍 User ${socket.id} looking for partner`);
    
    // Leave current room if any
    const currentRoom = Array.from(socket.rooms).find(r => r !== socket.id);
    if (currentRoom) {
      leaveRoom(currentRoom, socket.id);
      socket.leave(currentRoom);
      console.log(`🚪 Left room: ${currentRoom}`);
    }
    
    // Find available partner - only rooms with exactly 1 user
    const existingRoom = findAvailablePartner(socket.id);
    
    if (existingRoom) {
      console.log(`✅ Found existing room: ${existingRoom}`);
      joinRoom(existingRoom, socket.id);
      socket.join(existingRoom);
      
      // Notify both users
      io.to(existingRoom).emit('partner-found', {
        roomId: existingRoom,
        message: 'You are now connected!'
      });
      socket.emit('room-joined', { roomId: existingRoom, isAlone: false });
    } else {
      // Create new room and wait
      const newRoomId = createRoom();
      joinRoom(newRoomId, socket.id);
      socket.join(newRoomId);
      console.log(`🆕 Created new room: ${newRoomId}`);
      
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
