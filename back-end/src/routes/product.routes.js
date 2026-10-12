const express = require('express');
const productController = require('../controllers/product.controllers');
const { verifyToken } = require('../middlewares/auth.middleware');
const { requirePermission } = require('../middlewares/permission.middleware');
const { uploadImages, uploadExcel } = require('../middlewares/upload.middleware');

const router = express.Router();

// 1. Thêm sản phẩm thủ công (Bao gồm text và upload nhiều ảnh ở field "images")
router.post('/', verifyToken, requirePermission('PRODUCT_MANAGE'), uploadImages, productController.addProduct);

// 2. Nhập hàng bằng file Excel (file ở field "file"):
//    SKU chưa có -> tạo sản phẩm mới, SKU đã có -> cộng thêm số lượng tồn kho
router.post('/import-excel', verifyToken, requirePermission('PRODUCT_MANAGE'), uploadExcel, productController.importExcel);

module.exports = router;
