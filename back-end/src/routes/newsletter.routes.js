// Đường dẫn cho đăng ký/hủy nhận bản tin; nối URL tới controller.
// Những middleware được khai báo trên route sẽ chạy trước handler theo thứ tự từ trái sang phải.
const express = require('express');
const newsletterController = require('../controllers/newsletter.controllers');
const router = express.Router();
router.post('/subscribe', newsletterController.subscribe);
router.get('/unsubscribe/:token', newsletterController.confirmUnsubscribe);
router.post('/unsubscribe/:token', newsletterController.unsubscribe);
module.exports = router;
