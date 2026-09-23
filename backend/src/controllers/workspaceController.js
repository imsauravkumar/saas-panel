const Workspace = require('../models/Workspace');
const User = require('../models/User');
const Group = require('../models/Group');
const Task = require('../models/Task');
const Meeting = require('../models/Meeting');
const Announcement = require('../models/Announcement');

/**
 * Get workspace details and high level dashboard metrics
 */
const getWorkspaceStats = async (req, res) => {
  try {
    const workspaceId = req.user.workspaceId;
    const workspace = await Workspace.findById(workspaceId).populate('ownerId', 'name email avatar');

    const totalUsers = await User.countDocuments({ workspaceId });
    const activeUsers = await User.countDocuments({ workspaceId, status: 'active' });
    const totalGroups = await Group.countDocuments({ workspaceId, isArchived: false });
    const totalTasks = await Task.countDocuments({ workspaceId });
    const pendingTasks = await Task.countDocuments({ workspaceId, status: { $ne: 'completed' } });
    const completedTasks = await Task.countDocuments({ workspaceId, status: 'completed' });
    const upcomingMeetings = await Meeting.countDocuments({ workspaceId, status: 'upcoming' });
    const totalAnnouncements = await Announcement.countDocuments({ workspaceId });

    return res.status(200).json({
      success: true,
      workspace,
      stats: {
        totalUsers,
        activeUsers,
        totalGroups,
        totalTasks,
        pendingTasks,
        completedTasks,
        upcomingMeetings,
        totalAnnouncements,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch workspace statistics' });
  }
};

/**
 * Admin: Update workspace settings
 */
const updateWorkspace = async (req, res) => {
  try {
    const { name, logo, settings } = req.body;
    const workspace = await Workspace.findById(req.user.workspaceId);

    if (!workspace) {
      return res.status(404).json({ success: false, message: 'Workspace not found' });
    }

    if (name) workspace.name = name.trim();
    if (logo !== undefined) workspace.logo = logo;
    if (settings) workspace.settings = { ...workspace.settings, ...settings };

    await workspace.save();

    return res.status(200).json({
      success: true,
      message: 'Workspace settings updated successfully',
      workspace,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update workspace settings' });
  }
};

module.exports = {
  getWorkspaceStats,
  updateWorkspace,
};
