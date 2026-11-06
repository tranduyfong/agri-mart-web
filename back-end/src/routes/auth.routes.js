// Đường dẫn cho đăng ký/đăng nhập và OTP; nối URL tới controller.
// Những middleware được khai báo trên route sẽ chạy trước handler theo thứ tự từ trái sang phải.
const express = require('express');
const authController = require('../controllers/auth.controllers');

const router = express.Router();

router.post('/register', authController.register);
router.post('/verify-email', authController.verifyEmail);
router.post('/resend-verify-email', authController.resendVerifyEmail);
router.post('/login', authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.post('/verify-otp-forgot-password', authController.verifyOtpForgotPassword);
router.post('/reset-password', authController.resetPassword);

module.exports = router;
