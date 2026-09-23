const express = require('express');
const router = express.Router();
const { getActivityLogs } = require('../controllers/activityController');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.use(authenticate, requireAdmin);

router.get('/', getActivityLogs);

module.exports = router;
