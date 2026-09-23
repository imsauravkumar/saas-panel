const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  type: {
    type: String,
    enum: ['message', 'meeting', 'task', 'announcement'],
    required: true,
  },
  title: {
    type: String,
    required: [true, 'Notification title is required'],
    trim: true,
  },
  body: {
    type: String,
    default: '',
    trim: true,
  },
  linkTo: {
    type: String,
    required: true,
  },
  refId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
  },
  isRead: {
    type: Boolean,
    default: false,
  },
  workspaceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true,
  },
}, { timestamps: true });

notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
