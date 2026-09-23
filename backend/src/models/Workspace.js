const mongoose = require('mongoose');

const workspaceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Workspace name is required'],
    trim: true,
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  logo: {
    type: String,
    default: '',
  },
  settings: {
    allowUserGroupCreation: {
      type: Boolean,
      default: false,
    },
    defaultChatPermission: {
      type: String,
      enum: ['everyone', 'adminOnly'],
      default: 'everyone',
    },
  },
}, { timestamps: true });

module.exports = mongoose.model('Workspace', workspaceSchema);
