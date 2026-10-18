const express = require('express');
const controller = require('../controllers/shopping.controllers');
const { verifyToken } = require('../middlewares/auth.middleware');
const router = express.Router();

router.use(verifyToken);
router.get('/', controller.getCart);
router.post('/items', controller.addCartItem);
router.patch('/items/:id', controller.updateCartItem);
router.delete('/items/:id', controller.removeCartItem);

module.exports = router;
