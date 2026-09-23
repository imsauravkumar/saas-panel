const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Workspace = require('../models/Workspace');
const { logActivity } = require('../middleware/activityLogger');

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '7d', // Reduced from 30d for security
  });
};

/**
 * Register the first Admin account and Workspace (Workspace Owner)
 */
const registerAdmin = async (req, res) => {
  try {
    const { name, email, password, workspaceName, post } = req.body;

    if (!name || !email || !password || !workspaceName) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, password, and workspace name are all required.'
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email address already exists.'
      });
    }

    // 1. Create Workspace
    const workspace = await Workspace.create({
      name: workspaceName.trim(),
      ownerId: null, // will update immediately below
    });

    // 2. Create Owner Admin User
    const adminUser = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      role: 'admin',
      post: post || 'Workspace Owner',
      department: 'Leadership',
      workspaceId: workspace._id,
      status: 'active',
      mustResetPassword: false,
      mustChangePassword: false,
    });

    // Link owner to workspace
    workspace.ownerId = adminUser._id;
    await workspace.save();

    await logActivity({
      actorId: adminUser._id,
      action: 'WORKSPACE_CREATED',
      targetType: 'workspace',
      targetId: workspace._id,
      details: `Workspace "${workspace.name}" created by ${adminUser.name}`,
      workspaceId: workspace._id,
    });

    const token = signToken(adminUser._id);

    return res.status(201).json({
      success: true,
      message: 'Workspace and administrator account created successfully!',
      token,
      user: {
        id: adminUser._id,
        name: adminUser.name,
        email: adminUser.email,
        role: adminUser.role,
        post: adminUser.post,
        department: adminUser.department,
        avatar: adminUser.avatar,
        mustChangePassword: adminUser.mustChangePassword,
        workspaceId: workspace._id,
        workspaceName: workspace.name,
      }
    });
  } catch (error) {
    console.error('[Auth Register Admin Error]:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error creating workspace' });
  }
};

/**
 * Common Login for Admin and Users
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide both email and password.' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password').populate('workspaceId');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials. Please check your email and password.' });
    }

    if (user.status === 'disabled') {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact your workspace administrator.'
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials. Please check your email and password.' });
    }

    await User.findByIdAndUpdate(user._id, { lastLogin: new Date() });

    const token = signToken(user._id);

    return res.status(200).json({
      success: true,
      message: 'Logged in successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        post: user.post,
        department: user.department,
        avatar: user.avatar,
        groupIds: user.groupIds,
        mustChangePassword: user.mustChangePassword ?? user.mustResetPassword ?? false,
        workspaceId: user.workspaceId?._id || user.workspaceId,
        workspaceName: user.workspaceId?.name || 'SAAS Workspace',
      }
    });
  } catch (error) {
    console.error('[Auth Login Error]:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error during login' });
  }
};

/**
 * Get current authenticated user profile
 */
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('workspaceId').populate('groupIds', 'name avatar chatPermission');
    return res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        post: user.post,
        department: user.department,
        avatar: user.avatar,
        phone: user.phone,
        groupIds: user.groupIds,
        mustChangePassword: user.mustChangePassword,
        workspaceId: user.workspaceId?._id || user.workspaceId,
        workspaceName: user.workspaceId?.name || 'SAAS Workspace',
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch user profile' });
  }
};

/**
 * Update password (used for first login password reset or self update)
 */
const updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters.' });
    }

    const user = await User.findById(req.user._id).select('+password');

    // If user is not in forced reset state, verify current password
    if (!user.mustChangePassword && currentPassword) {
      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        return res.status(400).json({ success: false, message: 'Current password does not match.' });
      }
    }

    user.password = newPassword;
    user.mustChangePassword = false;
    user.mustResetPassword = false;
    await user.save();

    await logActivity({
      actorId: user._id,
      action: 'PASSWORD_UPDATED',
      targetType: 'user',
      targetId: user._id,
      details: `${user.name} updated their password`,
      workspaceId: user.workspaceId,
    });

    return res.status(200).json({
      success: true,
      message: 'Password updated successfully!',
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to update password' });
  }
};

module.exports = {
  registerAdmin,
  login,
  getMe,
  updatePassword,
};
