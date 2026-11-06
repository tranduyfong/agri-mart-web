// Đường dẫn cho khuyến mãi đang chạy; nối URL tới controller.
// Những middleware được khai báo trên route sẽ chạy trước handler theo thứ tự từ trái sang phải.
const express = require('express');
const promotionController = require('../controllers/promotion.controllers');

const router = express.Router();

// ================= KHÁCH HÀNG (không cần đăng nhập) =================

// 1. Danh sách khuyến mãi đang diễn ra: ?keyword=&is_flash_sale=true|false&pageNumber=0&pageSize=20
router.get('/active', promotionController.getActivePromotions);

module.exports = router;
