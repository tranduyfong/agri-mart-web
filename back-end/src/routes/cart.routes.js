// Đường dẫn cho giỏ hàng; nối URL tới controller.
// Những middleware được khai báo trên route sẽ chạy trước handler theo thứ tự từ trái sang phải.
const express = require('express');
const cartController = require('../controllers/cart.controllers');
const { verifyToken } = require('../middlewares/auth.middleware');
const router = express.Router();

router.use(verifyToken);
router.get('/', cartController.getCart);
router.post('/items', cartController.addCartItem);
router.patch('/items/:id', cartController.updateCartItem);
router.delete('/items/:id', cartController.removeCartItem);

module.exports = router;
