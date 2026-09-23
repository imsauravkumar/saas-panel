const mongoose = require('mongoose');
const User = require('../models/User');
const Group = require('../models/Group');
const Task = require('../models/Task');
const ActivityLog = require('../models/ActivityLog');
const { admin, getFirebaseApp } = require('../config/firebase');
const { logActivity } = require('../middleware/activityLogger');

/**
 * 1.1 Admin: Get all workspace users with pagination, search, status & group filters
 * Query params: search, status, groupId, page (default 1), limit (default 20)
 */
const getUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const { search, status, groupId, role } = req.query;
    const query = { workspaceId: req.user.workspaceId };

    if (search && search.trim()) {
      query.$or = [
        { name: { $regex: search.trim(), $options: 'i' } },
        { email: { $regex: search.trim(), $options: 'i' } },
        { post: { $regex: search.trim(), $options: 'i' } },
        { department: { $regex: search.trim(), $options: 'i' } },
      ];
    }

    if (status && ['active', 'disabled'].includes(status)) {
      query.status = status;
    }

    if (role && ['admin', 'user'].includes(role)) {
      query.role = role;
    }

    if (groupId) {
      query.groupIds = groupId;
    }

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .populate('groupIds', 'name avatar chatPermission')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-password');

    return res.status(200).json({
      success: true,
      users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (error) {
    console.error('[Get Users Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch users directory' });
  }
};

/**
 * 1.4 Admin or Self: Get single user detail panel
 * Includes profile summary, groups list, assigned work count, and last 10 activity log entries
 */
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    // Standard users can only inspect their own profile or users in their workspace
    if (req.user.role !== 'admin' && req.user._id.toString() !== id) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const user = await User.findOne({ _id: id, workspaceId: req.user.workspaceId })
      .populate('groupIds', 'name description chatPermission avatar')
      .populate('createdBy', 'name email');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found in this workspace' });
    }

    // Fetch assigned task statistics
    const [openTasksCount, completedTasksCount] = await Promise.all([
      Task.countDocuments({ workspaceId: req.user.workspaceId, assignedTo: user._id, status: { $ne: 'completed' } }),
      Task.countDocuments({ workspaceId: req.user.workspaceId, assignedTo: user._id, status: 'completed' }),
    ]);

    // Fetch last 10 activity log actions for this user (actions where this user was target or actor)
    const recentActivity = await ActivityLog.find({
      workspaceId: req.user.workspaceId,
      $or: [{ targetId: user._id }, { actorId: user._id }],
    })
      .populate('actorId', 'name email avatar')
      .sort({ createdAt: -1 })
      .limit(10);

    return res.status(200).json({
      success: true,
      user,
      stats: {
        openTasksCount,
        completedTasksCount,
        totalTasksCount: openTasksCount + completedTasksCount,
        groupsCount: user.groupIds.length,
      },
      recentActivity,
    });
  } catch (error) {
    console.error('[Get User Detail Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch user details' });
  }
};

/**
 * 1.2 Admin: Create a new user (with Firebase Admin Auth sync + Mongo Doc + Activity Log)
 */
const createUser = async (req, res) => {
  try {
    const { name, email, password, post = 'Team Member', department = 'General', role = 'user', groupIds = [], sendInviteEmail = false } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Full name, email, and temporary password are required.' });
    }

    const emailLower = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: emailLower });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'A user with this email address already exists.' });
    }

    let firebaseUid = null;
    const firebaseApp = getFirebaseApp();

    // 1. If Firebase Admin is available, create Firebase Auth user and set custom claims
    if (firebaseApp) {
      try {
        const fbUser = await admin.auth().createUser({
          email: emailLower,
          password: password,
          displayName: name.trim(),
        });
        firebaseUid = fbUser.uid;
        await admin.auth().setCustomUserClaims(firebaseUid, { role });
      } catch (fbErr) {
        console.warn('[Firebase Create User Warning]:', fbErr.message);
        // If user already exists in Firebase, try retrieving UID
        try {
          const existingFb = await admin.auth().getUserByEmail(emailLower);
          firebaseUid = existingFb.uid;
        } catch (e) {
          // Continue with fallback uid if local dev
        }
      }
    }

    if (!firebaseUid) {
      firebaseUid = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    }

    // 2. Create MongoDB User Document
    const newUser = await User.create({
      firebaseUid,
      name: name.trim(),
      email: emailLower,
      password, // hashed automatically by model hook
      role,
      post: post.trim(),
      department: department.trim(),
      groupIds: groupIds || [],
      status: 'active',
      mustResetPassword: true,
      mustChangePassword: true,
      createdBy: req.user._id,
      workspaceId: req.user.workspaceId,
    });

    // 3. Two-way sync: Add new user to all assigned Group.memberIds
    if (groupIds && groupIds.length > 0) {
      await Group.updateMany(
        { _id: { $in: groupIds }, workspaceId: req.user.workspaceId },
        { $addToSet: { memberIds: newUser._id } }
      );
    }

    // 4. Log Activity
    await logActivity({
      actorId: req.user._id,
      action: 'user.create',
      targetType: 'User',
      targetId: newUser._id,
      details: `Admin ${req.user.name} provisioned user ${newUser.name} (${newUser.post || 'Member'})`,
      metadata: { post: newUser.post, department: newUser.department, role: newUser.role, groupCount: groupIds.length },
      workspaceId: req.user.workspaceId,
    });

    return res.status(201).json({
      success: true,
      message: `User ${newUser.name} created successfully.`,
      user: {
        id: newUser._id,
        _id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        post: newUser.post,
        department: newUser.department,
        status: newUser.status,
        groupIds: newUser.groupIds,
        mustResetPassword: newUser.mustResetPassword,
        createdAt: newUser.createdAt,
      },
      temporaryPassword: password,
    });
  } catch (error) {
    console.error('[Create User Error]:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to create user' });
  }
};

/**
 * 1.3 Admin: Edit User details (Name, Post/Role label, Department, Group memberships)
 * Email is non-editable
 */
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, post, department, role, groupIds } = req.body;

    const user = await User.findOne({ _id: id, workspaceId: req.user.workspaceId });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (name) user.name = name.trim();
    if (post !== undefined) user.post = post.trim();
    if (department !== undefined) user.department = department.trim();
    if (role && ['admin', 'user'].includes(role)) {
      user.role = role;
      // Sync Firebase custom claims if available
      const firebaseApp = getFirebaseApp();
      if (firebaseApp && user.firebaseUid) {
        try {
          await admin.auth().setCustomUserClaims(user.firebaseUid, { role });
        } catch (fbErr) {
          console.warn('[Firebase Claims Update Warning]:', fbErr.message);
        }
      }
    }

    // Two-Way Sync: Update Group Memberships
    if (groupIds && Array.isArray(groupIds)) {
      const oldGroupIds = user.groupIds.map((g) => g.toString());
      const newGroupIds = groupIds.map((g) => g.toString());

      // Groups removed
      const removedGroupIds = oldGroupIds.filter((g) => !newGroupIds.includes(g));
      if (removedGroupIds.length > 0) {
        await Group.updateMany(
          { _id: { $in: removedGroupIds }, workspaceId: req.user.workspaceId },
          { $pull: { memberIds: user._id } }
        );
      }

      // Groups added
      const addedGroupIds = newGroupIds.filter((g) => !oldGroupIds.includes(g));
      if (addedGroupIds.length > 0) {
        await Group.updateMany(
          { _id: { $in: addedGroupIds }, workspaceId: req.user.workspaceId },
          { $addToSet: { memberIds: user._id } }
        );
      }

      user.groupIds = newGroupIds;
    }

    await user.save();

    await logActivity({
      actorId: req.user._id,
      action: 'user.update',
      targetType: 'User',
      targetId: user._id,
      details: `Admin ${req.user.name} updated profile for ${user.name}`,
      metadata: { post: user.post, department: user.department, role: user.role },
      workspaceId: req.user.workspaceId,
    });

    const populatedUser = await User.findById(user._id).populate('groupIds', 'name avatar chatPermission');

    return res.status(200).json({
      success: true,
      message: 'User details updated successfully',
      user: populatedUser,
    });
  } catch (error) {
    console.error('[Update User Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to update user' });
  }
};

/**
 * Admin: Assign / Update Post / Role label directly
 * PATCH /api/users/:id/post
 */
const updateUserPost = async (req, res) => {
  try {
    const { id } = req.params;
    const { post } = req.body;

    const user = await User.findOne({ _id: id, workspaceId: req.user.workspaceId });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.post = post !== undefined ? post.trim() : user.post;
    await user.save();

    await logActivity({
      actorId: req.user._id,
      action: 'user.assignPost',
      targetType: 'User',
      targetId: user._id,
      details: `Assigned post "${user.post}" to ${user.name}`,
      metadata: { post: user.post },
      workspaceId: req.user.workspaceId,
    });

    return res.status(200).json({
      success: true,
      message: 'Role/Post label updated',
      user,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update user post' });
  }
};

/**
 * Admin: Toggle Active / Disabled Status
 * PATCH /api/users/:id/status
 * Also revokes Firebase refresh tokens on disable immediately blocking active sessions
 */
const toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findOne({ _id: id, workspaceId: req.user.workspaceId });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'You cannot disable your own administrator account.' });
    }

    const newStatus = req.body.status || (user.status === 'active' ? 'disabled' : 'active');
    user.status = newStatus;
    await user.save();

    // Firebase Auth session revocation and disable
    const firebaseApp = getFirebaseApp();
    if (firebaseApp && user.firebaseUid) {
      try {
        await admin.auth().updateUser(user.firebaseUid, { disabled: newStatus === 'disabled' });
        if (newStatus === 'disabled') {
          await admin.auth().revokeRefreshTokens(user.firebaseUid);
        }
      } catch (fbErr) {
        console.warn('[Firebase Auth Disable Warning]:', fbErr.message);
      }
    }

    // Force disconnect active Socket.IO connections if disabled
    if (newStatus === 'disabled') {
      const io = req.app.get('io');
      if (io) {
        io.in(`user:${user._id}`).disconnectSockets(true);
        io.in(`user_${user._id}`).disconnectSockets(true);
      }
    }

    await logActivity({
      actorId: req.user._id,
      action: newStatus === 'active' ? 'user.enable' : 'user.disable',
      targetType: 'User',
      targetId: user._id,
      details: `User ${user.name} account was ${newStatus}`,
      metadata: { status: newStatus },
      workspaceId: req.user.workspaceId,
    });

    return res.status(200).json({
      success: true,
      message: `User account is now ${newStatus}`,
      status: user.status,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to change user status' });
  }
};

/**
 * Admin: Reset User Password (generates new temporary password)
 * POST /api/users/:id/reset-password
 */
const adminResetUserPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { tempPassword } = req.body;

    const user = await User.findOne({ _id: id, workspaceId: req.user.workspaceId }).select('+password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
    const newTempPassword = tempPassword || Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');

    user.password = newTempPassword;
    user.mustResetPassword = true;
    user.mustChangePassword = true;
    await user.save();

    // Sync to Firebase if configured
    const firebaseApp = getFirebaseApp();
    if (firebaseApp && user.firebaseUid) {
      try {
        await admin.auth().updateUser(user.firebaseUid, { password: newTempPassword });
        await admin.auth().revokeRefreshTokens(user.firebaseUid);
      } catch (fbErr) {
        console.warn('[Firebase Password Reset Warning]:', fbErr.message);
      }
    }

    await logActivity({
      actorId: req.user._id,
      action: 'user.resetPassword',
      targetType: 'User',
      targetId: user._id,
      details: `Admin ${req.user.name} generated temporary password for ${user.name}`,
      workspaceId: req.user.workspaceId,
    });

    return res.status(200).json({
      success: true,
      message: 'Temporary password generated successfully.',
      temporaryPassword: newTempPassword,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to reset user password' });
  }
};

/**
 * Admin: Delete a user
 * Cleans up references across Group.memberIds and Task.assignedTo
 */
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    if (id === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'You cannot delete yourself.' });
    }

    const user = await User.findOneAndDelete({ _id: id, workspaceId: req.user.workspaceId });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Clean up references from all groups and tasks
    await Promise.all([
      Group.updateMany({ workspaceId: req.user.workspaceId, memberIds: id }, { $pull: { memberIds: id } }),
      Task.updateMany({ workspaceId: req.user.workspaceId, assignedTo: id }, { $pull: { assignedTo: id } }),
    ]);

    // Delete Firebase Auth user if configured
    const firebaseApp = getFirebaseApp();
    if (firebaseApp && user.firebaseUid) {
      try {
        await admin.auth().deleteUser(user.firebaseUid);
      } catch (fbErr) {
        console.warn('[Firebase User Delete Warning]:', fbErr.message);
      }
    }

    // Force disconnect active Socket.IO connections
    const io = req.app.get('io');
    if (io) {
      io.in(`user:${user._id}`).disconnectSockets(true);
      io.in(`user_${user._id}`).disconnectSockets(true);
    }

    await logActivity({
      actorId: req.user._id,
      action: 'user.delete',
      targetType: 'User',
      targetId: user._id,
      details: `User ${user.name} (${user.email}) was permanently removed from the workspace`,
      metadata: { email: user.email, name: user.name },
      workspaceId: req.user.workspaceId,
    });

    return res.status(200).json({
      success: true,
      message: 'User permanently removed from workspace.',
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to delete user' });
  }
};

/**
 * Admin: Bulk User Actions (Bulk Disable / Bulk Delete)
 * POST /api/users/bulk-action
 */
const bulkUserAction = async (req, res) => {
  try {
    const { userIds = [], action } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Please select at least one user.' });
    }

    // Filter out current admin user
    const targetIds = userIds.filter((id) => id !== req.user._id.toString());

    if (action === 'disable') {
      await User.updateMany(
        { _id: { $in: targetIds }, workspaceId: req.user.workspaceId },
        { $set: { status: 'disabled' } }
      );

      await logActivity({
        actorId: req.user._id,
        action: 'user.bulkDisable',
        targetType: 'User',
        targetId: null,
        details: `Admin ${req.user.name} bulk disabled ${targetIds.length} users`,
        metadata: { count: targetIds.length, userIds: targetIds },
        workspaceId: req.user.workspaceId,
      });

      return res.status(200).json({
        success: true,
        message: `${targetIds.length} user accounts disabled.`,
      });
    }

    if (action === 'delete') {
      await Promise.all([
        User.deleteMany({ _id: { $in: targetIds }, workspaceId: req.user.workspaceId }),
        Group.updateMany({ workspaceId: req.user.workspaceId, memberIds: { $in: targetIds } }, { $pull: { memberIds: { $in: targetIds } } }),
        Task.updateMany({ workspaceId: req.user.workspaceId, assignedTo: { $in: targetIds } }, { $pull: { assignedTo: { $in: targetIds } } }),
      ]);

      await logActivity({
        actorId: req.user._id,
        action: 'user.bulkDelete',
        targetType: 'User',
        targetId: null,
        details: `Admin ${req.user.name} bulk removed ${targetIds.length} users`,
        metadata: { count: targetIds.length, userIds: targetIds },
        workspaceId: req.user.workspaceId,
      });

      return res.status(200).json({
        success: true,
        message: `${targetIds.length} users removed from the workspace.`,
      });
    }

    return res.status(400).json({ success: false, message: 'Unsupported bulk action' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to process bulk user action' });
  }
};

/**
 * Self: Change own password & clear mustResetPassword flag
 * PUT /api/users/me/password
 */
const changeMyPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters.' });
    }

    const user = await User.findById(req.user._id).select('+password');

    // If not in forced reset state and current password provided, verify it
    if (!user.mustResetPassword && !user.mustChangePassword && currentPassword) {
      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        return res.status(400).json({ success: false, message: 'Current password does not match.' });
      }
    }

    user.password = newPassword;
    user.mustResetPassword = false;
    user.mustChangePassword = false;
    await user.save();

    // Sync with Firebase Auth if configured
    const firebaseApp = getFirebaseApp();
    if (firebaseApp && user.firebaseUid) {
      try {
        await admin.auth().updateUser(user.firebaseUid, { password: newPassword });
      } catch (fbErr) {
        console.warn('[Firebase Auth Password Sync Warning]:', fbErr.message);
      }
    }

    await logActivity({
      actorId: user._id,
      action: 'user.passwordReset',
      targetType: 'User',
      targetId: user._id,
      details: `${user.name} reset their private account password`,
      workspaceId: user.workspaceId,
    });

    return res.status(200).json({
      success: true,
      message: 'Password updated successfully.',
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update password' });
  }
};

/**
 * Self: Get own profile
 * GET /api/users/me
 */
const getMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('workspaceId')
      .populate('groupIds', 'name avatar chatPermission');

    return res.status(200).json({
      success: true,
      user: {
        id: user._id,
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        post: user.post,
        department: user.department,
        avatar: user.avatar,
        phone: user.phone,
        groupIds: user.groupIds,
        mustResetPassword: user.mustResetPassword,
        mustChangePassword: user.mustChangePassword,
        notificationPreferences: user.notificationPreferences || {
          email: {
            newMessage: false,
            newMeeting: true,
            taskAssigned: true,
            announcement: true,
          }
        },
        workspaceId: user.workspaceId?._id || user.workspaceId,
        workspaceName: user.workspaceId?.name || 'SAAS Workspace',
        createdAt: user.createdAt,
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch profile' });
  }
};

/**
 * Self: Update own profile details
 * PUT /api/users/profile
 */
const updateProfile = async (req, res) => {
  try {
    const { name, phone, avatar } = req.body;
    const user = await User.findById(req.user._id);

    if (name) user.name = name.trim();
    if (phone !== undefined) user.phone = phone.trim();
    if (avatar !== undefined) user.avatar = avatar;

    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        post: user.post,
        department: user.department,
        avatar: user.avatar,
        phone: user.phone,
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
};

/**
 * Self: Update user avatar
 * PUT /api/users/me/avatar
 */
const updateMyAvatar = async (req, res) => {
  try {
    let avatarUrl = req.body ? req.body.avatar : undefined;

    if (req.file) {
      const protocol = req.protocol;
      const host = req.get('host');
      avatarUrl = `${protocol}://${host}/uploads/${req.file.filename}`;
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.avatar = avatarUrl !== undefined ? avatarUrl : '';
    await user.save();

    await logActivity({
      actorId: user._id,
      action: 'user.avatarUpdate',
      targetType: 'User',
      targetId: user._id,
      details: `${user.name} updated their profile avatar`,
      workspaceId: user.workspaceId,
    });

    return res.status(200).json({
      success: true,
      message: 'Avatar updated successfully',
      avatar: user.avatar,
      user: {
        id: user._id,
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        post: user.post,
        avatar: user.avatar,
      }
    });
  } catch (error) {
    console.error('[Update Avatar Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to update avatar' });
  }
};

/**
 * Self: Get personal activity summary & metrics
 * GET /api/users/me/activity
 */
const getMyActivity = async (req, res) => {
  try {
    const userId = req.user._id;
    const workspaceId = req.user.workspaceId;

    const [tasksCompleted, meetingsAttended, messagesSent, recentLogs] = await Promise.all([
      Task.countDocuments({ assignedTo: userId, workspaceId, status: 'completed' }),
      Meeting.countDocuments({ attendeeIds: userId, workspaceId, status: 'completed' }),
      Message.countDocuments({ senderId: userId, workspaceId, deletedAt: null }),
      ActivityLog.find({ actorId: userId, workspaceId })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
    ]);

    return res.status(200).json({
      success: true,
      activity: {
        tasksCompleted,
        meetingsAttended,
        messagesSent,
        recentLogs,
      },
    });
  } catch (error) {
    console.error('[Get My Activity Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to load personal activity' });
  }
};

/**
 * Self: Update user notification preferences
 * PUT /api/users/me/notification-preferences
 */
const updateNotificationPreferences = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (!user.notificationPreferences) {
      user.notificationPreferences = {
        email: {
          newMessage: false,
          newMeeting: true,
          taskAssigned: true,
          announcement: true,
        }
      };
    }
    if (!user.notificationPreferences.email) {
      user.notificationPreferences.email = {
        newMessage: false,
        newMeeting: true,
        taskAssigned: true,
        announcement: true,
      };
    }

    if (email && typeof email === 'object') {
      if (email.newMessage !== undefined) user.notificationPreferences.email.newMessage = Boolean(email.newMessage);
      if (email.newMeeting !== undefined) user.notificationPreferences.email.newMeeting = Boolean(email.newMeeting);
      if (email.taskAssigned !== undefined) user.notificationPreferences.email.taskAssigned = Boolean(email.taskAssigned);
      if (email.announcement !== undefined) user.notificationPreferences.email.announcement = Boolean(email.announcement);
    }

    user.markModified('notificationPreferences');
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Notification preferences updated successfully',
      notificationPreferences: user.notificationPreferences,
    });
  } catch (error) {
    console.error('[Update Notification Preferences Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to update notification preferences' });
  }
};

module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  updateUserPost,
  toggleUserStatus,
  adminResetUserPassword,
  deleteUser,
  bulkUserAction,
  changeMyPassword,
  getMyProfile,
  updateProfile,
  updateMyAvatar,
  getMyActivity,
  updateNotificationPreferences,
};

