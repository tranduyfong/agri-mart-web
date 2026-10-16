const express = require('express');
const categoryController = require('../controllers/category.controllers');

const router = express.Router();

// ================= KHÁCH HÀNG (không cần đăng nhập) =================

// 1. Danh sách danh mục: ?keyword=&pageNumber=0&pageSize=20
router.get('/', categoryController.getCategories);

module.exports = router;
