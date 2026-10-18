const express = require('express');
const controller = require('../controllers/shopping.controllers');
const { verifyToken } = require('../middlewares/auth.middleware');
const router = express.Router();

router.use(verifyToken);
router.get('/', controller.getWishlist);
router.put('/:id', controller.addWishlistItem);
router.delete('/:id', controller.removeWishlistItem);

module.exports = router;
