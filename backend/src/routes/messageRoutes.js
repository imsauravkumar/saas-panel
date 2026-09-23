const express = require('express');
const router = express.Router();
const {
  getGroupMessages,
  getDirectMessages,
  getDirectConversations,
  sendMessage,
  editMessage,
  toggleReaction,
  togglePinMessage,
  toggleStarMessage,
  deleteMessage,
  forwardMessage,
  markAsRead,
  getSharedMedia,
  uploadAttachment,
} = require('../controllers/messageController');
const { authenticate } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { uploadLimiter } = require('../middleware/rateLimiters');

router.use(authenticate);

// 1-on-1 Direct Messaging
router.get('/direct-conversations', getDirectConversations);
router.get('/direct/:recipientId', getDirectMessages);

// Channel Messages
router.get('/group/:groupId', getGroupMessages);
router.post('/group/:groupId', sendMessage);

// Universal Send & Manage
router.post('/send', sendMessage);
router.put('/:id', editMessage);
router.delete('/:id', deleteMessage);
router.post('/:id/reaction', toggleReaction);
router.post('/:id/pin', togglePinMessage);
router.post('/:id/star', toggleStarMessage);
router.post('/:id/forward', forwardMessage);
router.post('/read', markAsRead);
router.get('/media', getSharedMedia);

// File Attachment & Voice Note Upload
router.post('/upload', uploadLimiter, upload.single('file'), uploadAttachment);

module.exports = router;
