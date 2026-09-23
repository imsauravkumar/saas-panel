const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  actorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  action: {
    type: String,
    required: true, // e.g., 'user.create', 'user.update', 'user.disable', 'user.enable', 'user.delete', 'user.assignPost'
    index: true,
  },
  targetType: {
    type: String,
    required: true, // 'User', 'Group', 'Task', 'Meeting', 'Announcement', 'Workspace'
    index: true,
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
    index: true,
  },
  details: {
    type: String,
    default: '',
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  workspaceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true,
    index: true,
  }
}, { timestamps: { createdAt: 'createdAt', updatedAt: false } });

// Backward compatibility timestamp getter
activityLogSchema.virtual('timestamp').get(function() {
  return this.createdAt;
});
activityLogSchema.set('toJSON', { virtuals: true });
activityLogSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
