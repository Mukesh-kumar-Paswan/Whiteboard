const express = require('express');
const crypto = require('crypto');
const Board = require('../models/Board');
const { protect, optionalAuth } = require('../middleware/authMiddleware');

const router = express.Router();

const generateRoomId = () => {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
};

// GET /api/boards/my-boards
router.get('/my-boards', protect, async (req, res) => {
  try {
    const boards = await Board.find({ owner: req.user._id })
      .sort({ updatedAt: -1 })
      .select('roomId name ownerName defaultPermission password pages snapshots updatedAt createdAt');

    const formatted = boards.map((board) => ({
      _id: board._id,
      roomId: board.roomId,
      name: board.name,
      ownerName: board.ownerName,
      defaultPermission: board.defaultPermission,
      hasPassword: Boolean(board.password),
      pagesCount: board.pages.length,
      snapshotsCount: board.snapshots.length,
      updatedAt: board.updatedAt,
      createdAt: board.createdAt,
    }));

    return res.status(200).json(formatted);
  } catch (error) {
    console.error('Fetch my boards error:', error.message);
    return res.status(500).json({ message: 'Failed to load your boards' });
  }
});

// POST /api/boards
router.post('/', optionalAuth, async (req, res) => {
  try {
    const { name, password = '', defaultPermission = 'editor', guestName = 'Guest' } = req.body;

    let roomId = generateRoomId();
    while (await Board.findOne({ roomId })) {
      roomId = generateRoomId();
    }

    const validPermission = ['editor', 'viewer'].includes(defaultPermission)
      ? defaultPermission
      : 'editor';

    const board = await Board.create({
      roomId,
      name: name && name.trim() ? name.trim() : 'Untitled Architecture',
      owner: req.user ? req.user._id : null,
      ownerName: req.user ? req.user.name : guestName.trim() || 'Guest',
      password: password.trim(),
      defaultPermission: validPermission,
      pages: [{ id: 'page-1', name: 'Page 1', elements: [] }],
      snapshots: [],
      messages: [],
    });

    return res.status(201).json({
      roomId: board.roomId,
      name: board.name,
      owner: board.owner,
      ownerName: board.ownerName,
      defaultPermission: board.defaultPermission,
      hasPassword: Boolean(board.password),
      password: board.password,
      pages: board.pages,
      snapshots: board.snapshots,
      messages: board.messages,
      permission: 'editor',
    });
  } catch (error) {
    console.error('Create board error:', error.message);
    return res.status(500).json({ message: 'Failed to create board' });
  }
});

// POST /api/boards/:roomId/join
router.post('/:roomId/join', optionalAuth, async (req, res) => {
  try {
    const roomId = req.params.roomId.trim().toUpperCase();
    const { password = '', requestedRole } = req.body;

    const board = await Board.findOne({ roomId });
    if (!board) {
      return res.status(404).json({ message: 'Room not found' });
    }

    const isOwner =
      Boolean(req.user) &&
      Boolean(board.owner) &&
      board.owner.toString() === req.user._id.toString();

    if (board.password && !isOwner && password !== board.password) {
      return res.status(403).json({
        requiresPassword: true,
        roomName: board.name,
        message: password ? 'Incorrect room password' : 'This room requires a password',
      });
    }

    let permission = board.defaultPermission;
    if (isOwner) {
      permission = 'editor';
    } else if (requestedRole === 'viewer' || requestedRole === 'editor') {
      permission = requestedRole;
    }

    return res.status(200).json({
      roomId: board.roomId,
      name: board.name,
      owner: board.owner,
      ownerName: board.ownerName,
      defaultPermission: board.defaultPermission,
      hasPassword: Boolean(board.password),
      password: board.password,
      pages: board.pages,
      snapshots: board.snapshots,
      messages: board.messages,
      permission,
      isOwner,
    });
  } catch (error) {
    console.error('Join board error:', error.message);
    return res.status(500).json({ message: 'Failed to join room' });
  }
});

// PUT /api/boards/:roomId
router.put('/:roomId', optionalAuth, async (req, res) => {
  try {
    const roomId = req.params.roomId.trim().toUpperCase();
    const { name, pages, defaultPermission, password } = req.body;

    const board = await Board.findOne({ roomId });
    if (!board) {
      return res.status(404).json({ message: 'Room not found' });
    }

    if (typeof name === 'string' && name.trim()) {
      board.name = name.trim();
    }

    if (Array.isArray(pages) && pages.length > 0) {
      board.pages = pages;
      board.markModified('pages');
    }

    if (defaultPermission && ['editor', 'viewer'].includes(defaultPermission)) {
      board.defaultPermission = defaultPermission;
    }

    if (typeof password === 'string') {
      board.password = password.trim();
    }

    await board.save();

    return res.status(200).json({
      message: 'Board saved',
      roomId: board.roomId,
      name: board.name,
      defaultPermission: board.defaultPermission,
      hasPassword: Boolean(board.password),
      password: board.password,
      updatedAt: board.updatedAt,
    });
  } catch (error) {
    console.error('Save board error:', error.message);
    return res.status(500).json({ message: 'Failed to save board' });
  }
});

// POST /api/boards/:roomId/snapshots
router.post('/:roomId/snapshots', optionalAuth, async (req, res) => {
  try {
    const roomId = req.params.roomId.trim().toUpperCase();
    const { name, pages, createdBy } = req.body;

    const board = await Board.findOne({ roomId });
    if (!board) {
      return res.status(404).json({ message: 'Room not found' });
    }

    const pagesToSave = Array.isArray(pages) && pages.length > 0 ? pages : board.pages;

    const newSnapshot = {
      id: crypto.randomUUID(),
      name: name && name.trim() ? name.trim() : `Snapshot ${board.snapshots.length + 1}`,
      createdBy: req.user ? req.user.name : createdBy || 'Guest',
      pages: JSON.parse(JSON.stringify(pagesToSave)),
      createdAt: new Date(),
    };

    board.snapshots.unshift(newSnapshot);
    board.markModified('snapshots');
    await board.save();

    return res.status(201).json({
      snapshot: newSnapshot,
      snapshots: board.snapshots,
    });
  } catch (error) {
    console.error('Create snapshot error:', error.message);
    return res.status(500).json({ message: 'Failed to create snapshot' });
  }
});

// POST /api/boards/:roomId/snapshots/:snapshotId/restore
router.post('/:roomId/snapshots/:snapshotId/restore', optionalAuth, async (req, res) => {
  try {
    const roomId = req.params.roomId.trim().toUpperCase();
    const { snapshotId } = req.params;

    const board = await Board.findOne({ roomId });
    if (!board) {
      return res.status(404).json({ message: 'Room not found' });
    }

    const snapshot = board.snapshots.find((s) => s.id === snapshotId);
    if (!snapshot) {
      return res.status(404).json({ message: 'Snapshot not found' });
    }

    board.pages = JSON.parse(JSON.stringify(snapshot.pages));
    board.markModified('pages');
    await board.save();

    return res.status(200).json({
      message: 'Snapshot restored',
      pages: board.pages,
    });
  } catch (error) {
    console.error('Restore snapshot error:', error.message);
    return res.status(500).json({ message: 'Failed to restore snapshot' });
  }
});

// DELETE /api/boards/:roomId/snapshots/:snapshotId
router.delete('/:roomId/snapshots/:snapshotId', optionalAuth, async (req, res) => {
  try {
    const roomId = req.params.roomId.trim().toUpperCase();
    const { snapshotId } = req.params;

    const board = await Board.findOne({ roomId });
    if (!board) {
      return res.status(404).json({ message: 'Room not found' });
    }

    board.snapshots = board.snapshots.filter((s) => s.id !== snapshotId);
    board.markModified('snapshots');
    await board.save();

    return res.status(200).json({
      snapshots: board.snapshots,
    });
  } catch (error) {
    console.error('Delete snapshot error:', error.message);
    return res.status(500).json({ message: 'Failed to delete snapshot' });
  }
});

// DELETE /api/boards/:roomId
router.delete('/:roomId', protect, async (req, res) => {
  try {
    const roomId = req.params.roomId.trim().toUpperCase();
    const board = await Board.findOne({ roomId });

    if (!board) {
      return res.status(404).json({ message: 'Room not found' });
    }

    if (!board.owner || board.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the board owner can delete this board' });
    }

    await board.deleteOne();

    return res.status(200).json({ message: 'Board deleted successfully' });
  } catch (error) {
    console.error('Delete board error:', error.message);
    return res.status(500).json({ message: 'Failed to delete board' });
  }
});

module.exports = router;