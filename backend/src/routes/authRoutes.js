const express = require('express');
const router = express.Router();
const { registerAdmin, login, getMe, updatePassword } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

router.post('/register-admin', registerAdmin);
router.post('/login', login);
router.get('/me', authenticate, getMe);
router.put('/update-password', authenticate, updatePassword);

module.exports = router;
