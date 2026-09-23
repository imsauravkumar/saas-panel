const Announcement = require('../models/Announcement');
const Group = require('../models/Group');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const { notify } = require('../services/notify');

/**
 * Get announcements for current user
 */
const getAnnouncements = async (req, res) => {
  try {
    const { groupId } = req.query;
    let query = { workspaceId: req.user.workspaceId, isDeleted: false };

    if (groupId) {
      query.groupId = groupId;
      query.scope = 'group';
    } else if (req.user.role !== 'admin') {
      query.$or = [
        { scope: 'company' },
        { target: 'company-wide' },
        { groupId: { $in: req.user.groupIds || [] } },
      ];
    }

    const announcements = await Announcement.find(query)
      .populate('createdBy', 'name email avatar post')
      .populate('groupId', 'name avatar')
      .sort({ pinned: -1, isPinned: -1, createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: announcements.length,
      announcements,
    });
  } catch (error) {
    console.error('[Get Announcements Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch announcements' });
  }
};

/**
 * Admin: Create an announcement
 */
const createAnnouncement = async (req, res) => {
  try {
    const { title, body, scope = 'company', target, groupId = null, priority = 'normal', pinned = false, isPinned } = req.body;

    if (!title || !body) {
      return res.status(400).json({ success: false, message: 'Title and content are required.' });
    }

    const finalScope = scope || (target === 'group' ? 'group' : 'company');
    const finalPinned = pinned || isPinned || false;

    let targetGroup = null;
    if (finalScope === 'group') {
      if (!groupId) {
        return res.status(400).json({ success: false, message: 'A channel must be selected for group-scoped announcements.' });
      }
      targetGroup = await Group.findOne({ _id: groupId, workspaceId: req.user.workspaceId, isDeleted: false });
      if (!targetGroup) {
        return res.status(404).json({ success: false, message: 'Selected channel not found.' });
      }
    }

    const announcement = await Announcement.create({
      title: title.trim(),
      body: body.trim(),
      scope: finalScope,
      target: finalScope === 'group' ? 'group' : 'company-wide',
      groupId: finalScope === 'group' ? groupId : null,
      priority,
      pinned: finalPinned,
      isPinned: finalPinned,
      createdBy: req.user._id,
      workspaceId: req.user.workspaceId,
    });

    await ActivityLog.create({
      actorId: req.user._id,
      action: 'announcement.create',
      targetType: 'Announcement',
      targetId: announcement._id,
      details: `${req.user.name} published ${finalScope === 'company' ? 'company-wide' : '#' + targetGroup?.name} announcement "${announcement.title}"`,
      metadata: { scope: finalScope, pinned: finalPinned },
      workspaceId: req.user.workspaceId,
    });

    const populatedAnnouncement = await Announcement.findById(announcement._id)
      .populate('createdBy', 'name email avatar post')
      .populate('groupId', 'name avatar');

    const io = req.app.get('io');
    if (io) {
      io.to(`workspace:${req.user.workspaceId}`).emit('new_announcement', populatedAnnouncement);
      io.to(`workspace_${req.user.workspaceId}`).emit('new_announcement', populatedAnnouncement);
      io.to(`workspace:${req.user.workspaceId}`).emit('announcement:new', populatedAnnouncement);
      io.to(`workspace_${req.user.workspaceId}`).emit('announcement:new', populatedAnnouncement);
      if (finalScope === 'group' && groupId) {
        io.to(`group:${groupId}`).emit('announcement:new', populatedAnnouncement);
        io.to(`group_${groupId}`).emit('new_announcement', populatedAnnouncement);
      }
    }

    // Determine notification audience
    let audienceUserIds = [];
    if (finalScope === 'company') {
      const allActive = await User.find({ workspaceId: req.user.workspaceId, status: 'active' }).select('_id');
      audienceUserIds = allActive.map((u) => u._id);
    } else if (targetGroup) {
      audienceUserIds = targetGroup.memberIds || [];
    }

    // Dispatch unified in-app & email notification
    await notify({
      userIds: audienceUserIds,
      type: 'announcement',
      title: `📢 Announcement: ${announcement.title}`,
      body: announcement.body.slice(0, 140),
      linkTo: 'announcements',
      refId: announcement._id,
      workspaceId: req.user.workspaceId,
      io,
    });

    return res.status(201).json({
      success: true,
      message: 'Announcement published successfully',
      announcement: populatedAnnouncement,
    });
  } catch (error) {
    console.error('[Create Announcement Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to create announcement' });
  }
};

/**
 * Admin: Edit announcement
 */
const updateAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, body, scope, groupId, priority, pinned } = req.body;

    const announcement = await Announcement.findOne({ _id: id, workspaceId: req.user.workspaceId, isDeleted: false });
    if (!announcement) {
      return res.status(404).json({ success: false, message: 'Announcement not found' });
    }

    if (title) announcement.title = title.trim();
    if (body) announcement.body = body.trim();
    if (scope) {
      announcement.scope = scope;
      announcement.target = scope === 'group' ? 'group' : 'company-wide';
    }
    if (groupId !== undefined) announcement.groupId = scope === 'group' ? groupId : null;
    if (priority) announcement.priority = priority;
    if (pinned !== undefined) {
      announcement.pinned = pinned;
      announcement.isPinned = pinned;
    }

    await announcement.save();

    await ActivityLog.create({
      actorId: req.user._id,
      action: 'announcement.edit',
      targetType: 'Announcement',
      targetId: announcement._id,
      details: `${req.user.name} updated announcement "${announcement.title}"`,
      workspaceId: req.user.workspaceId,
    });

    const populated = await Announcement.findById(announcement._id)
      .populate('createdBy', 'name email avatar post')
      .populate('groupId', 'name avatar');

    const io = req.app.get('io');
    if (io) {
      io.to(`workspace:${req.user.workspaceId}`).emit('announcement:updated', populated);
      io.to(`workspace_${req.user.workspaceId}`).emit('announcement:updated', populated);
    }

    return res.status(200).json({
      success: true,
      message: 'Announcement updated successfully',
      announcement: populated,
    });
  } catch (error) {
    console.error('[Update Announcement Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to update announcement' });
  }
};

/**
 * Admin: Toggle pin status
 */
const togglePin = async (req, res) => {
  try {
    const { id } = req.params;
    const announcement = await Announcement.findOne({ _id: id, workspaceId: req.user.workspaceId, isDeleted: false });

    if (!announcement) {
      return res.status(404).json({ success: false, message: 'Announcement not found' });
    }

    announcement.pinned = !announcement.pinned;
    announcement.isPinned = announcement.pinned;
    await announcement.save();

    await ActivityLog.create({
      actorId: req.user._id,
      action: 'announcement.pin',
      targetType: 'Announcement',
      targetId: announcement._id,
      details: `${req.user.name} ${announcement.pinned ? 'pinned' : 'unpinned'} announcement "${announcement.title}"`,
      workspaceId: req.user.workspaceId,
    });

    return res.status(200).json({
      success: true,
      message: `Announcement ${announcement.pinned ? 'pinned to top' : 'unpinned'}`,
      pinned: announcement.pinned,
    });
  } catch (error) {
    console.error('[Toggle Pin Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to toggle pin status' });
  }
};

/**
 * Admin: Soft delete announcement
 */
const deleteAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const announcement = await Announcement.findOne({ _id: id, workspaceId: req.user.workspaceId, isDeleted: false });

    if (!announcement) {
      return res.status(404).json({ success: false, message: 'Announcement not found' });
    }

    announcement.isDeleted = true;
    await announcement.save();

    await ActivityLog.create({
      actorId: req.user._id,
      action: 'announcement.delete',
      targetType: 'Announcement',
      targetId: id,
      details: `${req.user.name} deleted announcement "${announcement.title}"`,
      workspaceId: req.user.workspaceId,
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`workspace:${req.user.workspaceId}`).emit('announcement:deleted', { announcementId: id });
      io.to(`workspace_${req.user.workspaceId}`).emit('announcement:deleted', { announcementId: id });
    }

    return res.status(200).json({
      success: true,
      message: 'Announcement deleted successfully',
    });
  } catch (error) {
    console.error('[Delete Announcement Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete announcement' });
  }
};

module.exports = {
  getAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  togglePin,
  deleteAnnouncement,
};
