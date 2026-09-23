const mongoose = require('mongoose');

const meetingSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Meeting title is required'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      required: true,
    },
    dateTime: {
      type: Date,
      required: [true, 'Date and time are required'],
    },
    durationMinutes: {
      type: Number,
      default: 45,
    },
    googleEventId: {
      type: String,
    },
    googleMeetLink: {
      type: String,
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
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
    },
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
    },
  },
  { timestamps: true }
);

meetingSchema.index({ workspaceId: 1, dateTime: 1 });
meetingSchema.index({ groupId: 1, dateTime: -1 });

module.exports = mongoose.model('Meeting', meetingSchema);
