const mongoose = require('mongoose');

const meetingSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Meeting title is required'],
      trim: true,
      minlength: [2, 'Title must be at least 2 characters'],
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      default: '',
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      required: [true, 'Target channel/group is required'],
      index: true,
    },
    dateTime: {
      type: Date,
      required: [true, 'Meeting date and time are required'],
      index: true,
    },
    durationMinutes: {
      type: Number,
      default: 30,
      min: [5, 'Duration must be at least 5 minutes'],
      max: [480, 'Duration cannot exceed 8 hours'],
    },
    endTime: {
      type: Date,
      index: true,
    },
    googleEventId: {
      type: String,
      default: '',
    },
    googleMeetLink: {
      type: String,
      required: [true, 'Google Meet link is required'],
      trim: true,
    },
    isDemoLink: {
      type: Boolean,
      default: false,
    },
    provider: {
      type: String,
      enum: ['google', 'demo'],
      default: 'demo',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    attendeeIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    meetingType: {
      type: String,
      enum: ['general', 'standup', 'sync', 'review', 'demo', 'allhands'],
      default: 'general',
    },
    isInstant: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['upcoming', 'completed', 'cancelled'],
      default: 'upcoming',
      index: true,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    cancelReason: {
      type: String,
      default: '',
      trim: true,
    },
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

// Backward compatibility alias for meetLink
meetingSchema.virtual('meetLink').get(function () {
  return this.googleMeetLink;
});
meetingSchema.virtual('meetLink').set(function (val) {
  this.googleMeetLink = val;
});

meetingSchema.set('toJSON', { virtuals: true });
meetingSchema.set('toObject', { virtuals: true });

meetingSchema.index({ workspaceId: 1, dateTime: 1 });
meetingSchema.index({ workspaceId: 1, status: 1, dateTime: 1 });
meetingSchema.index({ groupId: 1, dateTime: -1 });
meetingSchema.index({ attendeeIds: 1, dateTime: 1 });

module.exports = mongoose.model('Meeting', meetingSchema);
