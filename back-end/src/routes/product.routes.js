const express = require('express');
const productController = require('../controllers/product.controllers');
const { verifyToken } = require('../middlewares/auth.middleware');
const { requirePermission } = require('../middlewares/permission.middleware');
const { uploadImages } = require('../middlewares/upload.middleware');

const router = express.Router();

// ================= KHÁCH HÀNG (không cần đăng nhập) =================
// Chỉ xem được sản phẩm đang bán (PUBLISHED)

// 1. Danh sách sản phẩm: ?keyword=&pageNumber=0&pageSize=20&category_id=&min_price=&max_price=&sort=
router.get('/', productController.getPublicProducts);
router.get('/:id/related', productController.getRelatedProducts);

// ================= NHÂN VIÊN / ADMIN (cần quyền PRODUCT_MANAGE) =================
// Xem được tất cả sản phẩm (nháp, đang bán, ngừng bán)

// 2. Danh sách sản phẩm (có thêm bộ lọc &status=DRAFT|PUBLISHED|ARCHIVED)
router.get('/manage', verifyToken, requirePermission('PRODUCT_MANAGE'), productController.getManageProducts);

// 3. Chi tiết sản phẩm theo id
router.get('/manage/:id', verifyToken, requirePermission('PRODUCT_MANAGE'), productController.getManageProductDetail);

// 4. Thêm sản phẩm thủ công (Bao gồm text và upload nhiều ảnh ở field "images")
router.post('/', verifyToken, requirePermission('PRODUCT_MANAGE'), uploadImages, productController.addProduct);

// 5. Nhập hàng: FE đọc file Excel rồi gửi danh sách dạng JSON { branch_id, supplier_id, note, items: [...] }
//    SKU chưa có -> tạo sản phẩm mới, SKU đã có -> cộng thêm số lượng tồn kho
router.post('/import', verifyToken, requirePermission('PRODUCT_MANAGE'), productController.importGoods);

// 6. Chỉnh sửa sản phẩm (thông tin, trạng thái, giá, thêm ảnh ở field "images", xóa ảnh)
router.put('/:id', verifyToken, requirePermission('PRODUCT_MANAGE'), uploadImages, productController.updateProduct);

// ================= KHÁCH HÀNG =================
// 7. Chi tiết sản phẩm đang bán theo slug
// Đặt cuối cùng để route "/:slug" không bắt nhầm các route "/manage" ở trên
router.get('/:slug', productController.getPublicProductDetail);

module.exports = router;
