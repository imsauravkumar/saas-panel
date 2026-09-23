const ActivityLog = require('../models/ActivityLog');

/**
 * Helper to record activity logs in the system
 */
const logActivity = async ({ actorId, action, targetType, targetId = null, details = '', metadata = {}, workspaceId = null }) => {
  try {
    await ActivityLog.create({
      actorId,
      action,
      targetType,
      targetId,
      details,
      metadata,
      workspaceId,
    });
  } catch (error) {
    console.error('[ActivityLog Error]: Failed to record activity log:', error.message);
  }
};

module.exports = {
  logActivity,
};
