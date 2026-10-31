const express = require('express');

const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middleware/auth.middleware');
const { changeEmailLimiter, verifyEmailChangeLimiter } = require('../middleware/email-change-limiter');

const router = express.Router();

router.post('/register', authController.register.bind(authController));
router.post('/login', authController.login.bind(authController));
router.post('/google', authController.google.bind(authController));
router.post('/resend-verification', authMiddleware, authController.resendVerificationEmail);
router.post('/verify-email', authController.verifyEmail.bind(authController));
router.get('/me', authMiddleware, authController.me.bind(authController));
router.post('/forgot-password', authController.forgotPassword.bind(authController));
router.post('/reset-password', authController.resetPassword.bind(authController));
router.patch('/profile', authMiddleware, authController.updateProfile.bind(authController));
router.patch('/change-password', authMiddleware, authController.changePassword.bind(authController));
router.post('/change-email', authMiddleware, changeEmailLimiter, authController.requestEmailChange.bind(authController));
router.post('/verify-email-change', verifyEmailChangeLimiter, authController.verifyEmailChange.bind(authController));

module.exports = router;