const express = require('express');
const router = express.Router();
const { getDashboardSummary, getAdminDashboardSummary } = require('../controllers/dashboardController');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.use(authenticate);

// User dashboard consolidated summary
router.get('/summary', getDashboardSummary);

// Admin dashboard consolidated summary
router.get('/admin-summary', requireAdmin, getAdminDashboardSummary);

module.exports = router;
