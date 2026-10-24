const express = require('express');
const authRoutes = require('./auth.routes');
const productRoutes = require('./product.routes');
const categoryRoutes = require('./category.routes');
const promotionRoutes = require('./promotion.routes');
const cartRoutes = require('./cart.routes');
const wishlistRoutes = require('./wishlist.routes');
const accountRoutes = require('./account.routes');
const addressRoutes = require('./address.routes');
const orderRoutes = require('./order.routes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/product', productRoutes);
router.use('/category', categoryRoutes);
router.use('/promotion', promotionRoutes);
router.use('/cart', cartRoutes);
router.use('/wishlist', wishlistRoutes);
router.use('/account', accountRoutes);
router.use('/address', addressRoutes);
router.use('/order', orderRoutes);
router.use('/staff', require('./staff.routes'));
router.use('/admin', require('./admin.routes'));
router.use('/newsletter', require('./newsletter.routes'));
router.use('/banners', require('./banner.routes'));

module.exports = router;
