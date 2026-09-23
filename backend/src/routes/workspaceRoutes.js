const express = require('express');
const router = express.Router();
const { getWorkspaceStats, updateWorkspace } = require('../controllers/workspaceController');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.use(authenticate);

router.get('/stats', getWorkspaceStats);
router.put('/settings', requireAdmin, updateWorkspace);

module.exports = router;
