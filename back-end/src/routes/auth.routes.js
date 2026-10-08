const express = require('express');
const authController = require('../controllers/auth.controllers');

const router = express.Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.post('/verify-otp-forgot-password', authController.verifyOtpForgotPassword);
router.post('/reset-password', authController.resetPassword);

module.exports = router;