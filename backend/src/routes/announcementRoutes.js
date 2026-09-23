const express = require('express');
const router = express.Router();
const {
  getAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  togglePin,
  deleteAnnouncement,
} = require('../controllers/announcementController');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { validate, createAnnouncementSchema } = require('../middleware/validate');

router.use(authenticate);

router.get('/', getAnnouncements);

// Admin controls
router.post('/', requireAdmin, validate(createAnnouncementSchema), createAnnouncement);
router.put('/:id', requireAdmin, updateAnnouncement);
router.patch('/:id/pin', requireAdmin, togglePin);
router.delete('/:id', requireAdmin, deleteAnnouncement);

module.exports = router;
