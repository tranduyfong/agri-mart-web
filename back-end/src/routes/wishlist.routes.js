const express = require('express');
const wishlistController = require('../controllers/wishlist.controllers');
const { verifyToken } = require('../middlewares/auth.middleware');
const router = express.Router();

router.use(verifyToken);
router.get('/', wishlistController.getWishlist);
router.put('/:id', wishlistController.addWishlistItem);
router.delete('/:id', wishlistController.removeWishlistItem);

module.exports = router;
