const express = require('express');
const router = express.Router();
const {
  getMeetings,
  getMeetingById,
  createMeeting,
  updateMeeting,
  cancelMeeting,
  deleteMeeting,
} = require('../controllers/meetingController');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { validate, createMeetingSchema } = require('../middleware/validate');

router.use(authenticate);

// List meetings (User: own/attendee, Admin: all)
router.get('/', getMeetings);

// Single meeting detail
router.get('/:id', getMeetingById);

// Mutations (Admins & group members)
router.post('/', validate(createMeetingSchema), createMeeting);
router.put('/:id', updateMeeting);
router.patch('/:id/cancel', cancelMeeting);
router.delete('/:id', deleteMeeting);

module.exports = router;
