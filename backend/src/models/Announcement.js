const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Announcement title is required'],
    trim: true,
  },
  body: {
    type: String,
    required: [true, 'Announcement body is required'],
    trim: true,
  },
  scope: {
    type: String,
    enum: ['company', 'group'],
    default: 'company',
  },
  // Backward compatibility alias for scope
  target: {
    type: String,
    default: function() {
      return this.scope === 'group' ? 'group' : 'company-wide';
    }
  },
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    default: null,
  },
  pinned: {
    type: Boolean,
    default: false,
  },
  isPinned: {
    type: Boolean,
    default: function() {
      return this.pinned !== undefined ? this.pinned : false;
    }
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'urgent'],
    default: 'normal',
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  workspaceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true,
  },
  isDeleted: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true });

announcementSchema.pre('save', function (next) {
  if (this.isModified('scope')) {
    this.target = this.scope === 'group' ? 'group' : 'company-wide';
  }
  if (this.isModified('pinned')) {
    this.isPinned = this.pinned;
  }
  next();
});

announcementSchema.index({ workspaceId: 1, scope: 1, pinned: -1, createdAt: -1 });
announcementSchema.index({ isDeleted: 1 });

module.exports = mongoose.model('Announcement', announcementSchema);
