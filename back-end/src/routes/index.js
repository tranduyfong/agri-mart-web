const express = require('express');
const authRoutes = require('./auth.routes');
const productRoutes = require('./product.routes');
const categoryRoutes = require('./category.routes');
const promotionRoutes = require('./promotion.routes');
const cartRoutes = require('./cart.routes');
const wishlistRoutes = require('./wishlist.routes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/product', productRoutes);
router.use('/category', categoryRoutes);
router.use('/promotion', promotionRoutes);
router.use('/cart', cartRoutes);
router.use('/wishlist', wishlistRoutes);

module.exports = router;
