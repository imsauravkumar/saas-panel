const ActivityLog = require('../models/ActivityLog');

/**
 * Admin: Get activity audit logs
 */
const getActivityLogs = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const { targetType, action, actorId, startDate, endDate } = req.query;

    const query = { workspaceId: req.user.workspaceId };
    if (targetType) query.targetType = targetType;
    if (action) query.action = action;
    if (actorId) query.actorId = actorId;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const logs = await ActivityLog.find(query)
      .populate('actorId', 'name email avatar role post')
      .sort({ createdAt: -1, timestamp: -1 })
      .limit(limit);

    return res.status(200).json({
      success: true,
      count: logs.length,
      logs,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch activity logs' });
  }
};

module.exports = {
  getActivityLogs,
};
