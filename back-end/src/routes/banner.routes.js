// Đường dẫn cho banner công khai; nối URL tới controller.
// Những middleware được khai báo trên route sẽ chạy trước handler theo thứ tự từ trái sang phải.
const express = require('express');
const bannerController = require('../controllers/banner.controllers');
const router = express.Router();
router.get('/', bannerController.getPublicBanners);
module.exports = router;
