const express = require('express');

const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middleware/auth.middleware');

const router = express.Router();

router.post('/register', authController.register.bind(authController));
router.post('/login', authController.login.bind(authController));
router.post('/google', authController.google.bind(authController));
router.post('/verify-email', authController.verifyEmail.bind(authController));
router.get('/me', authMiddleware, authController.me.bind(authController));

module.exports = router;