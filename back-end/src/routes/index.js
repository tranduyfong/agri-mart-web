const express = require('express');
const authRoutes = require('./auth.routes');
const productRoutes = require('./product.routes');
const categoryRoutes = require('./category.routes');
const promotionRoutes = require('./promotion.routes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/product', productRoutes);
router.use('/category', categoryRoutes);
router.use('/promotion', promotionRoutes);

module.exports = router;
