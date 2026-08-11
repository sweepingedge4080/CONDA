// Feature: User tracking and management
const users = new Map(); // socketId -> { connectedAt, lastActivity, currentRoom }

function addUser(socketId) {
  users.set(socketId, {
    connectedAt: new Date().toISOString(),
    lastActivity: new Date().toISOString(),
    currentRoom: null
  });
}

function removeUser(socketId) {
  users.delete(socketId);
}

function updateUserRoom(socketId, roomId) {
  const user = users.get(socketId);
  if (user) {
    user.currentRoom = roomId;
    user.lastActivity = new Date().toISOString();
  }
}

function getUser(socketId) {
  return users.get(socketId);
}

function getActiveUserCount() {
  return users.size;
}

function getUsersInRoom(roomId) {
  const roomUsers = [];
  for (const [socketId, user] of users.entries()) {
    if (user.currentRoom === roomId) {
      roomUsers.push(socketId);
    }
  }
  return roomUsers;
}

module.exports = {
  users,
  addUser,
  removeUser,
  updateUserRoom,
  getUser,
  getActiveUserCount,
  getUsersInRoom
};
