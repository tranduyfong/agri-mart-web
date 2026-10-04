const express = require('express');
const userController = require('../controllers/user.controllers');
const authenticate = require('../middlewares/auth.middleware');
const { profileBody } = require('../middlewares/account-validation.middleware');

const router = express.Router();

router.use(authenticate);

router.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
});

// Thông tin của tài khoản đang đăng nhập; không nhận userId từ client.
router.get('/me', userController.getProfile);
router.patch('/me', profileBody, userController.updateProfile);

module.exports = router;
