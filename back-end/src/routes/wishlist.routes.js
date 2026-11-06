// Đường dẫn cho sản phẩm yêu thích; nối URL tới controller.
// Những middleware được khai báo trên route sẽ chạy trước handler theo thứ tự từ trái sang phải.
const express = require('express');
const wishlistController = require('../controllers/wishlist.controllers');
const { verifyToken } = require('../middlewares/auth.middleware');
const router = express.Router();

router.use(verifyToken);
router.get('/', wishlistController.getWishlist);
router.put('/:id', wishlistController.addWishlistItem);
router.delete('/:id', wishlistController.removeWishlistItem);

module.exports = router;
