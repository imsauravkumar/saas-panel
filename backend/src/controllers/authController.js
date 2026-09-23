const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Workspace = require('../models/Workspace');
const { logActivity } = require('../middleware/activityLogger');

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });
};

/**
 * Register the first Admin account and Workspace (Workspace Owner)
 */
const registerAdmin = async (req, res) => {
  try {
    const { name, email, password, workspaceName, post } = req.body;

    if (!name || !email || !password || !workspaceName) {
      const msg = 'Name, email, password, and workspace name are all required.';
      return res.status(400).json({
        success: false,
        error: msg,
        message: msg,
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      const msg = 'An account with this email address already exists.';
      return res.status(400).json({
        success: false,
        error: msg,
        message: msg,
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
        mustChangePassword: false,
        mustResetPassword: false,
        workspaceId: workspace._id,
        workspaceName: workspace.name,
      },
    });
  } catch (error) {
    console.error('[Auth Register Admin Error]:', error);
    const msg = error.message || 'Server error creating workspace';
    return res.status(500).json({
      success: false,
      error: msg,
      message: msg,
    });
  }
};

/**
 * Common Login for Admin and Users
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      const msg = 'Please provide both email and password.';
      return res.status(400).json({
        success: false,
        error: msg,
        message: msg,
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() })
      .select('+password')
      .populate('workspaceId');

    if (!user) {
      const msg = 'Invalid credentials. Please check your email and password.';
      return res.status(401).json({
        success: false,
        error: msg,
        message: msg,
      });
    }

    if (user.status === 'disabled') {
      const msg = 'Your account has been deactivated. Please contact your workspace administrator.';
      return res.status(403).json({
        success: false,
        error: msg,
        message: msg,
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      const msg = 'Invalid credentials. Please check your email and password.';
      return res.status(401).json({
        success: false,
        error: msg,
        message: msg,
      });
    }

    await User.findByIdAndUpdate(user._id, { lastLogin: new Date() });

    const token = signToken(user._id);
    const requiresReset = Boolean(user.mustChangePassword || user.mustResetPassword);

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
        mustChangePassword: requiresReset,
        mustResetPassword: requiresReset,
        workspaceId: user.workspaceId?._id || user.workspaceId,
        workspaceName: user.workspaceId?.name || 'SAAS Workspace',
      },
    });
  } catch (error) {
    console.error('[Auth Login Error]:', error);
    const msg = error.message || 'Server error during login';
    return res.status(500).json({
      success: false,
      error: msg,
      message: msg,
    });
  }
};

/**
 * Get current authenticated user profile
 */
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('workspaceId')
      .populate('groupIds', 'name avatar chatPermission');

    const requiresReset = Boolean(user.mustChangePassword || user.mustResetPassword);

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
        mustChangePassword: requiresReset,
        mustResetPassword: requiresReset,
        workspaceId: user.workspaceId?._id || user.workspaceId,
        workspaceName: user.workspaceId?.name || 'SAAS Workspace',
      },
    });
  } catch (error) {
    const msg = 'Failed to fetch user profile';
    return res.status(500).json({
      success: false,
      error: msg,
      message: msg,
    });
  }
};

/**
 * Update password (used for first login password reset or self update)
 */
const updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      const msg = 'New password must be at least 6 characters.';
      return res.status(400).json({
        success: false,
        error: msg,
        message: msg,
      });
    }

    const user = await User.findById(req.user._id).select('+password');

    // If user is not in forced reset state, verify current password
    if (!user.mustChangePassword && !user.mustResetPassword && currentPassword) {
      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        const msg = 'Current password does not match.';
        return res.status(400).json({
          success: false,
          error: msg,
          message: msg,
        });
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
    const msg = error.message || 'Failed to update password';
    return res.status(500).json({
      success: false,
      error: msg,
      message: msg,
    });
  }
};

module.exports = {
  registerAdmin,
  login,
  getMe,
  updatePassword,
};
