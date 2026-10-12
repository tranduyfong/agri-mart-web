const express = require('express');
const authRoutes = require('./auth.routes');
const productRoutes = require('./product.routes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/product', productRoutes);

module.exports = router;