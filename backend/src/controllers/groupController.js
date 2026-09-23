const Group = require('../models/Group');
const User = require('../models/User');
const Message = require('../models/Message');
const { logActivity } = require('../middleware/activityLogger');
const { canPostInGroup } = require('../utils/canPostInGroup');

/**
 * 1.1 List groups: Admin sees all workspace groups; User sees only joined groups
 * Query params: search
 */
const getGroups = async (req, res) => {
  try {
    const { search } = req.query;
    const query = {
      workspaceId: req.user.workspaceId,
      isDeleted: false,
    };

    if (req.user.role !== 'admin') {
      query.memberIds = req.user._id;
    }

    if (search && search.trim()) {
      query.name = { $regex: search.trim(), $options: 'i' };
    }

    const groups = await Group.find(query)
      .populate('memberIds', 'name email post avatar role status department')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: groups.length,
      groups,
    });
  } catch (error) {
    console.error('[Get Groups Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch groups' });
  }
};

/**
 * 1.3 Get single group by ID (with populated members)
 * Accessible by Admin or members of the group
 */
const getGroupById = async (req, res) => {
  try {
    const { id } = req.params;

    const group = await Group.findOne({
      _id: id,
      workspaceId: req.user.workspaceId,
      isDeleted: false,
    })
      .populate('memberIds', 'name email post avatar role status department')
      .populate('createdBy', 'name email');

    if (!group) {
      return res
        .status(404)
        .json({ success: false, message: 'Group channel not found or has been deleted.' });
    }

    // Ensure user has access
    const isMember = group.memberIds.some((m) => m._id.toString() === req.user._id.toString());
    if (req.user.role !== 'admin' && !isMember) {
      return res
        .status(403)
        .json({ success: false, message: 'Access denied. You are not a member of this channel.' });
    }

    const userCanPost = canPostInGroup(req.user, group);

    return res.status(200).json({
      success: true,
      group,
      canChat: userCanPost,
    });
  } catch (error) {
    console.error('[Get Group Detail Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch group details' });
  }
};

/**
 * 1.2 Admin: Create a new group
 * Body: { name, description, memberIds: [], chatPermission }
 */
const createGroup = async (req, res) => {
  try {
    const {
      name,
      description = '',
      memberIds = [],
      chatPermission = 'everyone',
      avatar = '',
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Group name is required.' });
    }

    // Check unique group name in workspace
    const existingGroup = await Group.findOne({
      workspaceId: req.user.workspaceId,
      name: name.trim(),
      isDeleted: false,
    });

    if (existingGroup) {
      return res
        .status(400)
        .json({ success: false, message: 'A group channel with this name already exists.' });
    }

    // Ensure creator is always a member
    const uniqueMemberIds = Array.from(new Set([...memberIds, req.user._id.toString()]));

    // Verify memberIds exist and are active in the workspace
    const validUsers = await User.find({
      _id: { $in: uniqueMemberIds },
      workspaceId: req.user.workspaceId,
      status: 'active',
    }).select('_id');

    const validUserIds = validUsers.map((u) => u._id);

    const group = await Group.create({
      name: name.trim(),
      description: description?.trim() || '',
      avatar,
      createdBy: req.user._id,
      memberIds: validUserIds,
      chatPermission: ['everyone', 'adminOnly'].includes(chatPermission)
        ? chatPermission
        : 'everyone',
      workspaceId: req.user.workspaceId,
      isDeleted: false,
    });

    // Two-Way Sync: Update User.groupIds
    await User.updateMany(
      { _id: { $in: validUserIds }, workspaceId: req.user.workspaceId },
      { $addToSet: { groupIds: group._id } }
    );

    // Initial system welcome message
    await Message.create({
      groupId: group._id,
      senderId: req.user._id,
      type: 'text',
      content: `🎉 Channel #${group.name} was created by ${req.user.name}. Welcome to the space!`,
    });

    await logActivity({
      actorId: req.user._id,
      action: 'group.create',
      targetType: 'Group',
      targetId: group._id,
      details: `Admin ${req.user.name} created channel #${group.name} (${group.chatPermission})`,
      metadata: {
        name: group.name,
        memberCount: validUserIds.length,
        chatPermission: group.chatPermission,
      },
      workspaceId: req.user.workspaceId,
    });

    const populatedGroup = await Group.findById(group._id)
      .populate('memberIds', 'name email post avatar role status department')
      .populate('createdBy', 'name email');

    // Notify only workspace members via socket
    const io = req.app.get('io');
    if (io) {
      io.to(`workspace:${req.user.workspaceId}`).emit('group:created', populatedGroup);
      io.to(`workspace_${req.user.workspaceId}`).emit('group:created', populatedGroup);
    }

    return res.status(201).json({
      success: true,
      message: 'Group channel created successfully!',
      group: populatedGroup,
    });
  } catch (error) {
    console.error('[Create Group Error]:', error);
    return res
      .status(500)
      .json({ success: false, message: error.message || 'Failed to create group' });
  }
};

/**
 * Admin: Update group name, description, avatar and chatPermission
 * PUT /api/groups/:id
 */
const updateGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, avatar, chatPermission } = req.body;

    const group = await Group.findOne({
      _id: id,
      workspaceId: req.user.workspaceId,
      isDeleted: false,
    });
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    if (name && name.trim()) {
      // Check if new name collides with another group
      const duplicate = await Group.findOne({
        _id: { $ne: id },
        workspaceId: req.user.workspaceId,
        name: name.trim(),
        isDeleted: false,
      });
      if (duplicate) {
        return res
          .status(400)
          .json({ success: false, message: 'Another group already exists with this name.' });
      }
      group.name = name.trim();
    }

    if (description !== undefined) group.description = description.trim();
    if (avatar !== undefined) group.avatar = avatar;
    if (chatPermission !== undefined && ['everyone', 'adminOnly'].includes(chatPermission)) {
      group.chatPermission = chatPermission;
    }

    await group.save();

    await logActivity({
      actorId: req.user._id,
      action: 'group.update',
      targetType: 'Group',
      targetId: group._id,
      details: `Admin ${req.user.name} updated details for #${group.name}`,
      metadata: {
        name: group.name,
        description: group.description,
        chatPermission: group.chatPermission,
      },
      workspaceId: req.user.workspaceId,
    });

    const populatedGroup = await Group.findById(group._id)
      .populate('memberIds', 'name email post avatar role status department')
      .populate('createdBy', 'name email');

    const io = req.app.get('io');
    if (io) {
      io.to(`group_${group._id}`).emit('group:updated', populatedGroup);
      io.to(`group:${group._id}`).emit('group:updated', populatedGroup);
      io.to(`workspace:${req.user.workspaceId}`).emit('group:updated', populatedGroup);
      io.to(`workspace_${req.user.workspaceId}`).emit('group:updated', populatedGroup);
      if (chatPermission !== undefined) {
        io.to(`group_${group._id}`).emit('group:permissionChanged', {
          groupId: group._id,
          chatPermission: group.chatPermission,
        });
        io.to(`group:${group._id}`).emit('group:permissionChanged', {
          groupId: group._id,
          chatPermission: group.chatPermission,
        });
        io.to(`workspace:${req.user.workspaceId}`).emit('group:permissionChanged', {
          groupId: group._id,
          chatPermission: group.chatPermission,
        });
        io.to(`workspace_${req.user.workspaceId}`).emit('group:permissionChanged', {
          groupId: group._id,
          chatPermission: group.chatPermission,
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Group updated successfully',
      group: populatedGroup,
    });
  } catch (error) {
    console.error('[Update Group Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to update group' });
  }
};

/**
 * Admin: Update group avatar / icon (Upload photo or remove)
 * PUT /api/groups/:id/avatar
 */
const updateGroupAvatar = async (req, res) => {
  try {
    const { id } = req.params;
    let avatarUrl = req.body ? req.body.avatar : undefined;

    if (req.file) {
      const protocol = req.protocol;
      const host = req.get('host');
      avatarUrl = `${protocol}://${host}/uploads/${req.file.filename}`;
    }

    const group = await Group.findOne({
      _id: id,
      workspaceId: req.user.workspaceId,
      isDeleted: false,
    });
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group channel not found' });
    }

    group.avatar = avatarUrl !== undefined ? avatarUrl : '';
    await group.save();

    const populatedGroup = await Group.findById(group._id)
      .populate('memberIds', 'name email post avatar role status department')
      .populate('createdBy', 'name email');

    const io = req.app.get('io');
    if (io) {
      io.to(`group_${group._id}`).emit('group:updated', populatedGroup);
    }

    return res.status(200).json({
      success: true,
      message: 'Group photo updated successfully',
      avatar: group.avatar,
      group: populatedGroup,
    });
  } catch (error) {
    console.error('[Update Group Avatar Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to update channel photo' });
  }
};

/**
 * 1.5 Admin: Update Chat Posting Permission
 * PATCH /api/groups/:id/permission
 * Body: { chatPermission: 'everyone' | 'adminOnly' }
 */
const updateGroupPermission = async (req, res) => {
  try {
    const { id } = req.params;
    const { chatPermission } = req.body;

    if (!['everyone', 'adminOnly'].includes(chatPermission)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid chat permission value. Must be "everyone" or "adminOnly".',
      });
    }

    const group = await Group.findOne({
      _id: id,
      workspaceId: req.user.workspaceId,
      isDeleted: false,
    });
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    const previousPermission = group.chatPermission;
    group.chatPermission = chatPermission;
    await group.save();

    await logActivity({
      actorId: req.user._id,
      action: 'group.updatePermission',
      targetType: 'Group',
      targetId: group._id,
      details: `Admin ${req.user.name} changed chat permission for #${group.name} to ${chatPermission}`,
      metadata: { from: previousPermission, to: chatPermission },
      workspaceId: req.user.workspaceId,
    });

    // Real-time broadcast to all users in the group room
    const io = req.app.get('io');
    if (io) {
      io.to(`group_${group._id}`).emit('group:permissionChanged', {
        groupId: group._id,
        chatPermission: group.chatPermission,
      });
    }

    return res.status(200).json({
      success: true,
      message: `Chat permission updated to ${chatPermission === 'adminOnly' ? 'Admin Only' : 'Everyone'}`,
      chatPermission: group.chatPermission,
    });
  } catch (error) {
    console.error('[Update Group Permission Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to update chat permission' });
  }
};

/**
 * 1.4 Admin: Add Users to Existing Group
 * POST /api/groups/:id/members
 * Body: { userIds: [] }
 */
const addGroupMembers = async (req, res) => {
  try {
    const { id } = req.params;
    const { userIds = [] } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: 'Please select at least one user to add.' });
    }

    const group = await Group.findOne({
      _id: id,
      workspaceId: req.user.workspaceId,
      isDeleted: false,
    });
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    // Validate users belong to workspace
    const validUsers = await User.find({
      _id: { $in: userIds },
      workspaceId: req.user.workspaceId,
      status: 'active',
    });

    const validIds = validUsers.map((u) => u._id);

    // Two-way sync: Add to Group.memberIds and User.groupIds
    await Promise.all([
      Group.updateOne({ _id: group._id }, { $addToSet: { memberIds: { $each: validIds } } }),
      User.updateMany({ _id: { $in: validIds } }, { $addToSet: { groupIds: group._id } }),
    ]);

    await logActivity({
      actorId: req.user._id,
      action: 'group.addMembers',
      targetType: 'Group',
      targetId: group._id,
      details: `Admin ${req.user.name} added ${validIds.length} members to #${group.name}`,
      metadata: { addedUserCount: validIds.length, userNames: validUsers.map((u) => u.name) },
      workspaceId: req.user.workspaceId,
    });

    const updatedGroup = await Group.findById(group._id)
      .populate('memberIds', 'name email post avatar role status department')
      .populate('createdBy', 'name email');

    // Real-time socket broadcast
    const io = req.app.get('io');
    if (io) {
      io.to(`group_${group._id}`).emit('group:membersAdded', {
        groupId: group._id,
        newMembers: validUsers,
        totalMembersCount: updatedGroup.memberIds.length,
      });
    }

    return res.status(200).json({
      success: true,
      message: `Added ${validIds.length} members to #${group.name}`,
      group: updatedGroup,
    });
  } catch (error) {
    console.error('[Add Members Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to add members' });
  }
};

/**
 * 1.3 Admin: Remove Member from Group
 * DELETE /api/groups/:id/members/:userId
 */
const removeGroupMember = async (req, res) => {
  try {
    const { id, userId } = req.params;

    const group = await Group.findOne({
      _id: id,
      workspaceId: req.user.workspaceId,
      isDeleted: false,
    });
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    const targetUser = await User.findById(userId);

    // Two-Way Sync: Remove from Group.memberIds and User.groupIds
    await Promise.all([
      Group.updateOne({ _id: group._id }, { $pull: { memberIds: userId } }),
      User.updateOne({ _id: userId }, { $pull: { groupIds: group._id } }),
    ]);

    await logActivity({
      actorId: req.user._id,
      action: 'group.removeMember',
      targetType: 'Group',
      targetId: group._id,
      details: `Admin ${req.user.name} removed ${targetUser ? targetUser.name : 'user'} from #${group.name}`,
      metadata: { removedUserId: userId },
      workspaceId: req.user.workspaceId,
    });

    // Real-time socket notification
    const io = req.app.get('io');
    if (io) {
      io.to(`group_${group._id}`).emit('group:memberRemoved', {
        groupId: group._id,
        userId,
      });
    }

    return res.status(200).json({
      success: true,
      message: `User removed from #${group.name}`,
    });
  } catch (error) {
    console.error('[Remove Member Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to remove member' });
  }
};

/**
 * 1.5 Admin: Soft Delete Group
 * DELETE /api/groups/:id
 */
const deleteGroup = async (req, res) => {
  try {
    const { id } = req.params;

    const group = await Group.findOne({
      _id: id,
      workspaceId: req.user.workspaceId,
      isDeleted: false,
    });
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    // Soft delete group
    group.isDeleted = true;
    await group.save();

    // Pull group._id from all users
    await User.updateMany({ groupIds: group._id }, { $pull: { groupIds: group._id } });

    await logActivity({
      actorId: req.user._id,
      action: 'group.delete',
      targetType: 'Group',
      targetId: group._id,
      details: `Admin ${req.user.name} deleted group channel #${group.name}`,
      metadata: { name: group.name },
      workspaceId: req.user.workspaceId,
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`group_${group._id}`).emit('group:deleted', { groupId: group._id });
      io.to(`group:${group._id}`).emit('group:deleted', { groupId: group._id });
      io.to(`workspace:${req.user.workspaceId}`).emit('group:deleted', { groupId: group._id });
      io.to(`workspace:${req.user.workspaceId}`).emit('group:listUpdated');
      io.to(`workspace_${req.user.workspaceId}`).emit('group:listUpdated');
    }

    return res.status(200).json({
      success: true,
      message: `Group #${group.name} was successfully deleted.`,
    });
  } catch (error) {
    console.error('[Delete Group Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete group' });
  }
};

/**
 * Permission Check Endpoint
 * GET /api/groups/:id/permission-check
 */
const checkGroupPermission = async (req, res) => {
  try {
    const { id } = req.params;
    const group = await Group.findOne({
      _id: id,
      workspaceId: req.user.workspaceId,
      isDeleted: false,
    });

    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    const canChat = canPostInGroup(req.user, group);

    return res.status(200).json({
      success: true,
      groupId: group._id,
      chatPermission: group.chatPermission,
      canChat,
      isAdmin: req.user.role === 'admin',
    });
  } catch (_error) {
    return res.status(500).json({ success: false, message: 'Failed to check permission' });
  }
};

module.exports = {
  getGroups,
  getGroupById,
  createGroup,
  updateGroup,
  updateGroupAvatar,
  updateGroupPermission,
  addGroupMembers,
  removeGroupMember,
  deleteGroup,
  checkGroupPermission,
};
