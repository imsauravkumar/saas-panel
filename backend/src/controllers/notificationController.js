const Notification = require('../models/Notification');
const User = require('../models/User');

/**
 * Get notifications for current user with optional filters
 */
const getNotifications = async (req, res) => {
  try {
    const { unreadOnly, type, page = 1, limit = 40 } = req.query;
    let query = {
      userId: req.user._id,
      workspaceId: req.user.workspaceId,
    };

    if (unreadOnly === 'true') {
      query.isRead = false;
    }

    if (type) {
      query.type = type;
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(query).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit, 10)),
      Notification.countDocuments(query),
      Notification.countDocuments({
        userId: req.user._id,
        workspaceId: req.user.workspaceId,
        isRead: false,
      }),
    ]);

    return res.status(200).json({
      success: true,
      count: notifications.length,
      total,
      unreadCount,
      page: parseInt(page, 10),
      totalPages: Math.ceil(total / parseInt(limit, 10)) || 1,
      notifications,
    });
  } catch (_error) {
    console.error('[Get Notifications Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
  }
};

/**
 * Get unread notification count for badge
 */
const getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      userId: req.user._id,
      workspaceId: req.user.workspaceId,
      isRead: false,
    });

    return res.status(200).json({
      success: true,
      unreadCount: count,
    });
  } catch (_error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch unread count',
      message: 'Failed to fetch unread count',
    });
  }
};

/**
 * Mark a single notification as read
 */
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findOneAndUpdate(
      { _id: id, userId: req.user._id },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found',
        message: 'Notification not found',
      });
    }

    const io = req.app.get('io');
    if (io) {
      io.to(`user:${req.user._id.toString()}`).emit('notification:read', { notificationId: id });
    }

    return res.status(200).json({
      success: true,
      notification,
    });
  } catch (_error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to mark notification as read',
      message: 'Failed to mark notification as read',
    });
  }
};

/**
 * Mark all notifications as read for current user
 */
const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user._id, workspaceId: req.user.workspaceId, isRead: false },
      { isRead: true }
    );

    const io = req.app.get('io');
    if (io) {
      io.to(`user:${req.user._id.toString()}`).emit('notification:read_all');
    }

    return res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
    });
  } catch (_error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to mark all notifications as read',
      message: 'Failed to mark all notifications as read',
    });
  }
};

/**
 * Get notification preferences
 */
const getPreferences = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('notificationPreferences');
    const preferences = user?.notificationPreferences || {
      email: {
        newMessage: false,
        newMeeting: true,
        taskAssigned: true,
        announcement: true,
      },
    };

    return res.status(200).json({
      success: true,
      preferences,
    });
  } catch (_error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch preferences',
      message: 'Failed to fetch preferences',
    });
  }
};

/**
 * Update notification preferences
 */
const updatePreferences = async (req, res) => {
  try {
    const { emailPreferences } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'User not found',
      });
    }

    if (emailPreferences) {
      user.notificationPreferences = {
        email: {
          ...user.notificationPreferences?.email,
          ...emailPreferences,
        },
      };
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Notification preferences updated',
      preferences: user.notificationPreferences,
    });
  } catch (_error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to update preferences',
      message: 'Failed to update preferences',
    });
  }
};

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  getPreferences,
  updatePreferences,
};
