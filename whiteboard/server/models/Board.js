const mongoose = require('mongoose');

const pageSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
      default: 'Page 1',
    },
    elements: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
  },
  { _id: false }
);

const snapshotSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    createdBy: {
      type: String,
      default: 'Anonymous',
    },
    pages: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const messageSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
    },
    senderId: {
      type: String,
      required: true,
    },
    senderName: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['text', 'audio'],
      default: 'text',
    },
    text: {
      type: String,
      default: '',
    },
    audioData: {
      type: String,
      default: '',
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const boardSchema = new mongoose.Schema(
  {
    roomId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    name: {
      type: String,
      required: [true, 'Board name is required'],
      trim: true,
      default: 'Untitled Architecture',
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    ownerName: {
      type: String,
      default: 'Guest',
    },
    password: {
      type: String,
      default: '',
    },
    defaultPermission: {
      type: String,
      enum: ['editor', 'viewer'],
      default: 'editor',
    },
    pages: {
      type: [pageSchema],
      default: () => [{ id: 'page-1', name: 'Page 1', elements: [] }],
    },
    snapshots: {
      type: [snapshotSchema],
      default: [],
    },
    messages: {
      type: [messageSchema],
      default: [],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Board', boardSchema);