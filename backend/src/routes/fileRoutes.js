const express = require('express');
const router = express.Router();
const { getFiles } = require('../controllers/fileController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// Aggregated files across channels
router.get('/', getFiles);

module.exports = router;
