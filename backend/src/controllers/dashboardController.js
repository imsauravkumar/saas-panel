const Group = require('../models/Group');
const Message = require('../models/Message');
const Meeting = require('../models/Meeting');
const Task = require('../models/Task');
const Announcement = require('../models/Announcement');
const Notification = require('../models/Notification');
const ActivityLog = require('../models/ActivityLog');
const User = require('../models/User');

/**
 * GET /api/dashboard/summary
 * Consolidated single-query overview for user dashboard
 */
const getDashboardSummary = async (req, res) => {
  try {
    const userId = req.user._id;
    const workspaceId = req.user.workspaceId;

    // 1. Fetch User's Active Groups
    const groups = await Group.find({
      memberIds: userId,
      workspaceId,
      isDeleted: false,
    })
      .select(
        'name description avatar chatPermission memberIds lastMessageAt lastMessagePreview createdAt'
      )
      .sort({ lastMessageAt: -1, createdAt: -1 })
      .lean();

    const userGroupIds = groups.map((g) => g._id);

    // 2. Compute unread count per group in parallel
    const groupsWithUnread = await Promise.all(
      groups.map(async (group) => {
        const unreadCount = await Message.countDocuments({
          groupId: group._id,
          readBy: { $ne: userId },
          deletedAt: null,
        });
        return {
          ...group,
          unreadCount,
        };
      })
    );

    // 3. Next Upcoming Meeting
    const now = new Date();
    const nextMeeting = await Meeting.findOne({
      $or: [{ attendeeIds: userId }, { groupId: { $in: userGroupIds } }, { createdBy: userId }],
      workspaceId,
      dateTime: { $gte: now },
      status: 'upcoming',
    })
      .sort({ dateTime: 1 })
      .populate('createdBy', 'name email avatar role post')
      .populate('groupId', 'name avatar')
      .populate('attendeeIds', 'name avatar role post email')
      .lean();

    // 4. Task Counts & Nearest Tasks
    const oneWeekFromNow = new Date();
    oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);

    const [taskStats, dueThisWeekCount, topTasks] = await Promise.all([
      Task.aggregate([
        { $match: { assignedTo: userId, workspaceId, isDeleted: false } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Task.countDocuments({
        assignedTo: userId,
        workspaceId,
        isDeleted: false,
        status: { $ne: 'completed' },
        deadline: { $lte: oneWeekFromNow },
      }),
      Task.find({
        assignedTo: userId,
        workspaceId,
        isDeleted: false,
      })
        .sort({ deadline: 1, createdAt: -1 })
        .limit(6)
        .populate('assignedTo', 'name avatar post')
        .populate('groupId', 'name')
        .lean(),
    ]);

    const taskCounts = {
      todo: 0,
      inprogress: 0,
      submittedForReview: 0,
      completed: 0,
      reopened: 0,
      dueThisWeek: dueThisWeekCount,
    };
    taskStats.forEach((stat) => {
      if (stat._id === 'todo') taskCounts.todo = stat.count;
      if (stat._id === 'inprogress') taskCounts.inprogress = stat.count;
      if (stat._id === 'submittedForReview') taskCounts.submittedForReview = stat.count;
      if (stat._id === 'completed') taskCounts.completed = stat.count;
      if (stat._id === 'reopened') taskCounts.reopened = stat.count;
    });

    // 5. Recent Announcements (top 3, pinned first)
    const recentAnnouncements = await Announcement.find({
      workspaceId,
      isDeleted: false,
      $or: [{ scope: 'company' }, { groupId: { $in: userGroupIds } }],
    })
      .sort({ pinned: -1, createdAt: -1 })
      .limit(3)
      .populate('createdBy', 'name email avatar role')
      .populate('groupId', 'name')
      .lean();

    // 6. Recent Notifications (last 5)
    const recentActivity = await Notification.find({
      userId,
      workspaceId,
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    return res.status(200).json({
      success: true,
      summary: {
        groupCount: groups.length,
        myGroups: groupsWithUnread,
        nextMeeting,
        taskCounts,
        topTasks,
        recentAnnouncements,
        recentActivity,
      },
    });
  } catch (error) {
    console.error('[Dashboard Summary Error]:', error);
    return res
      .status(500)
      .json({ success: false, message: 'Failed to generate dashboard summary' });
  }
};

/**
 * GET /api/dashboard/admin-summary
 * Consolidated single-query overview for admin dashboard
 */
const getAdminDashboardSummary = async (req, res) => {
  try {
    const workspaceId = req.user.workspaceId;

    const startOfWeek = new Date();
    startOfWeek.setHours(0, 0, 0, 0);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 7);

    const [
      userCount,
      activeGroupCount,
      tasksInProgressCount,
      tasksAwaitingReviewCount,
      meetingsThisWeekCount,
      nextMeeting,
      recentActivity,
    ] = await Promise.all([
      User.countDocuments({ workspaceId, status: { $ne: 'disabled' } }),
      Group.countDocuments({ workspaceId, isDeleted: false }),
      Task.countDocuments({ workspaceId, isDeleted: false, status: { $in: ['inprogress', 'reopened'] } }),
      Task.countDocuments({ workspaceId, isDeleted: false, status: 'submittedForReview' }),
      Meeting.countDocuments({
        workspaceId,
        dateTime: { $gte: startOfWeek, $lte: endOfWeek },
        status: { $ne: 'cancelled' },
      }),
      Meeting.findOne({
        workspaceId,
        dateTime: { $gte: new Date() },
        status: 'upcoming',
      })
        .sort({ dateTime: 1 })
        .populate('createdBy', 'name email avatar role post')
        .populate('groupId', 'name avatar')
        .populate('attendeeIds', 'name avatar role post email')
        .lean(),
      ActivityLog.find({ workspaceId })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('actorId', 'name email avatar role post')
        .lean(),
    ]);

    return res.status(200).json({
      success: true,
      summary: {
        userCount,
        activeGroupCount,
        tasksInProgressCount,
        tasksAwaitingReviewCount,
        meetingsThisWeekCount,
        nextMeeting,
        recentActivity,
      },
    });
  } catch (error) {
    console.error('[Admin Dashboard Summary Error]:', error);
    return res
      .status(500)
      .json({ success: false, message: 'Failed to generate admin dashboard summary' });
  }
};

module.exports = {
  getDashboardSummary,
  getAdminDashboardSummary,
};
