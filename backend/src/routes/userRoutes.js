const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/userController');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { validate, createUserSchema, changePasswordSchema } = require('../middleware/validate');
const { userCreateLimiter } = require('../middleware/rateLimiters');
const upload = require('../middleware/upload');

router.use(authenticate);

// Self routes
router.get('/me', getMyProfile);
router.get('/me/activity', getMyActivity);
router.put('/me/avatar', upload.single('avatar'), updateMyAvatar);
router.put('/me/password', validate(changePasswordSchema), changeMyPassword);
router.put('/me/notification-preferences', updateNotificationPreferences);
router.put('/profile', updateProfile);

// Admin-only Bulk Actions
router.post('/bulk-action', requireAdmin, bulkUserAction);

// Admin User Directory & CRUD
router.get('/', requireAdmin, getUsers);
router.post('/', requireAdmin, userCreateLimiter, validate(createUserSchema), createUser);
router.get('/:id', getUserById);
router.put('/:id', requireAdmin, updateUser);
router.patch('/:id/status', requireAdmin, toggleUserStatus);
router.patch('/:id/post', requireAdmin, updateUserPost);
router.post('/:id/reset-password', requireAdmin, adminResetUserPassword);
router.delete('/:id', requireAdmin, deleteUser);

module.exports = router;
