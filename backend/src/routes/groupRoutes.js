const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/groupController');
const { getGroupMessages, sendMessage } = require('../controllers/messageController');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { validate, createGroupSchema } = require('../middleware/validate');
const upload = require('../middleware/upload');

router.use(authenticate);

// Public / Member Group endpoints
router.get('/', getGroups);
router.get('/:id', getGroupById);
router.get('/:id/permission-check', checkGroupPermission);
router.get('/:id/messages', getGroupMessages);
router.post('/:id/messages', sendMessage);

// Admin-only Group & Permission Controls
router.post('/', requireAdmin, validate(createGroupSchema), createGroup);
router.put('/:id', requireAdmin, updateGroup);
router.put('/:id/avatar', requireAdmin, upload.single('avatar'), updateGroupAvatar);
router.patch('/:id/permission', requireAdmin, updateGroupPermission);
router.post('/:id/members', requireAdmin, addGroupMembers);
router.delete('/:id/members/:userId', requireAdmin, removeGroupMember);
router.delete('/:id', requireAdmin, deleteGroup);

module.exports = router;
