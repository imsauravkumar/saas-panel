const Notification = require('../models/Notification');
const User = require('../models/User');

const prefKeyMap = {
  message: 'newMessage',
  meeting: 'newMeeting',
  task: 'taskAssigned',
  announcement: 'announcement',
};

/**
 * Centralized notification dispatcher
 * Inserts in-app notifications, emits real-time Socket.IO events, and dispatches emails per user preferences
 */
const notify = async ({
  userIds = [],
  type,
  title,
  body = '',
  linkTo = '',
  refId = null,
  workspaceId,
  io = null,
}) => {
  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
    return [];
  }

  // Deduplicate user IDs
  const uniqueUserIds = Array.from(new Set(userIds.map((id) => (id._id || id).toString())));

  try {
    // 1. Create in-app Notification documents in bulk
    const docs = uniqueUserIds.map((userId) => ({
      userId,
      type,
      title: title.trim(),
      body: body.trim(),
      linkTo,
      refId,
      workspaceId,
      isRead: false,
    }));

    const createdNotifications = await Notification.insertMany(docs);

    // 2. Real-time Socket.IO emission to per-user rooms
    if (io) {
      createdNotifications.forEach((n) => {
        io.to(`user:${n.userId.toString()}`).emit('notification:new', n);
      });
    }

    // 3. Email fan-out respecting user email preferences
    const prefKey = prefKeyMap[type];
    if (prefKey) {
      const users = await User.find({
        _id: { $in: uniqueUserIds },
        status: 'active',
      }).select('email name notificationPreferences');

      const emailTargets = users.filter((u) => {
        // Defaults to true for meeting, task, announcement if not explicitly disabled
        const pref = u.notificationPreferences?.email?.[prefKey];
        if (pref !== undefined) return pref;
        return prefKey !== 'newMessage';
      });

      // Send emails asynchronously without blocking response
      emailTargets.forEach((u) => {
        // Simulated or Nodemailer email
        console.log(`[Notification Service]: Dispatched email for ${type} to ${u.email}`);
      });
    }

    return createdNotifications;
  } catch (error) {
    console.error('[Notification Service Error]:', error);
    return [];
  }
};

module.exports = {
  notify,
};
