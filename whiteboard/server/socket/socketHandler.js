const crypto = require('crypto');
const Board = require('../models/Board');

const CURSOR_COLORS = [
  '#EF4444',
  '#F97316',
  '#EAB308',
  '#22C55E',
  '#06B6D4',
  '#3B82F6',
  '#8B5CF6',
  '#EC4899',
];

const activeRooms = new Map();
const saveTimers = new Map();

const getRoomUsers = (roomId) => {
  const room = activeRooms.get(roomId);
  if (!room) return [];
  return Array.from(room.values());
};

const scheduleBoardSave = (roomId, pages) => {
  if (saveTimers.has(roomId)) {
    clearTimeout(saveTimers.get(roomId));
  }

  const timer = setTimeout(async () => {
    try {
      await Board.findOneAndUpdate(
        { roomId },
        { $set: { pages } },
        { new: true }
      );
    } catch (error) {
      console.error(`Auto-save error for room ${roomId}:`, error.message);
    } finally {
      saveTimers.delete(roomId);
    }
  }, 1500);

  saveTimers.set(roomId, timer);
};

const removeUserFromRoom = (io, socket, roomId) => {
  if (!roomId || !activeRooms.has(roomId)) return;

  const room = activeRooms.get(roomId);
  if (room.has(socket.id)) {
    room.delete(socket.id);
    socket.leave(roomId);

    io.to(roomId).emit('cursor-remove', { socketId: socket.id });
    io.to(roomId).emit('room-users', getRoomUsers(roomId));

    if (room.size === 0) {
      activeRooms.delete(roomId);
    }
  }
};

const initSocketHandler = (io) => {
  io.on('connection', (socket) => {
    socket.on('join-room', ({ roomId, userId, userName, permission = 'editor', activePageId = 'page-1' }) => {
      if (!roomId) return;

      const normalizedRoomId = roomId.trim().toUpperCase();

      if (socket.data.roomId && socket.data.roomId !== normalizedRoomId) {
        removeUserFromRoom(io, socket, socket.data.roomId);
      }

      socket.join(normalizedRoomId);

      if (!activeRooms.has(normalizedRoomId)) {
        activeRooms.set(normalizedRoomId, new Map());
      }

      const room = activeRooms.get(normalizedRoomId);
      const color = CURSOR_COLORS[room.size % CURSOR_COLORS.length];

      const userInfo = {
        socketId: socket.id,
        userId: userId || socket.id,
        userName: userName && userName.trim() ? userName.trim() : 'Guest',
        permission,
        color,
        activePageId,
      };

      room.set(socket.id, userInfo);
      socket.data.roomId = normalizedRoomId;
      socket.data.userInfo = userInfo;

      io.to(normalizedRoomId).emit('room-users', getRoomUsers(normalizedRoomId));
    });

    socket.on('cursor-move', ({ roomId, x, y, pageId }) => {
      const normalizedRoomId = roomId ? roomId.trim().toUpperCase() : socket.data.roomId;
      const userInfo = socket.data.userInfo;
      if (!normalizedRoomId || !userInfo) return;

      socket.to(normalizedRoomId).emit('cursor-update', {
        socketId: socket.id,
        userId: userInfo.userId,
        userName: userInfo.userName,
        color: userInfo.color,
        x,
        y,
        pageId,
      });
    });

    socket.on('canvas-update', ({ roomId, pages }) => {
      const normalizedRoomId = roomId ? roomId.trim().toUpperCase() : socket.data.roomId;
      const userInfo = socket.data.userInfo;
      if (!normalizedRoomId || !Array.isArray(pages)) return;
      if (userInfo && userInfo.permission === 'viewer') return;

      socket.to(normalizedRoomId).emit('canvas-sync', {
        pages,
        senderSocketId: socket.id,
      });

      scheduleBoardSave(normalizedRoomId, pages);
    });

    socket.on('board-meta-update', ({ roomId, name, defaultPermission, hasPassword }) => {
      const normalizedRoomId = roomId ? roomId.trim().toUpperCase() : socket.data.roomId;
      if (!normalizedRoomId) return;

      socket.to(normalizedRoomId).emit('board-meta-sync', {
        name,
        defaultPermission,
        hasPassword,
      });
    });

    socket.on('snapshot-restored', ({ roomId, pages }) => {
      const normalizedRoomId = roomId ? roomId.trim().toUpperCase() : socket.data.roomId;
      if (!normalizedRoomId || !Array.isArray(pages)) return;

      socket.to(normalizedRoomId).emit('canvas-sync', {
        pages,
        senderSocketId: socket.id,
        restored: true,
      });
    });

    socket.on('send-message', async ({ roomId, type = 'text', text = '', audioData = '' }) => {
      const normalizedRoomId = roomId ? roomId.trim().toUpperCase() : socket.data.roomId;
      const userInfo = socket.data.userInfo;
      if (!normalizedRoomId || !userInfo) return;

      if (type === 'text' && !text.trim()) return;
      if (type === 'audio' && !audioData) return;

      const message = {
        id: crypto.randomUUID(),
        senderId: userInfo.userId,
        senderName: userInfo.userName,
        type,
        text: type === 'text' ? text.trim() : '',
        audioData: type === 'audio' ? audioData : '',
        createdAt: new Date().toISOString(),
      };

      io.to(normalizedRoomId).emit('receive-message', message);

      try {
        await Board.findOneAndUpdate(
          { roomId: normalizedRoomId },
          {
            $push: {
              messages: {
                $each: [message],
                $slice: -100,
              },
            },
          }
        );
      } catch (error) {
        console.error(`Save message error for room ${normalizedRoomId}:`, error.message);
      }
    });

    socket.on('leave-room', ({ roomId } = {}) => {
      const targetRoomId = roomId ? roomId.trim().toUpperCase() : socket.data.roomId;
      removeUserFromRoom(io, socket, targetRoomId);
      socket.data.roomId = null;
    });

    socket.on('disconnect', () => {
      if (socket.data.roomId) {
        removeUserFromRoom(io, socket, socket.data.roomId);
      }
    });
  });
};

module.exports = initSocketHandler;