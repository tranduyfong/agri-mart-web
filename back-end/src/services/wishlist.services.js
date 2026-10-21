const User = require('../models/user');
const Product = require('../models/product');
const productService = require('./product.services');

const getWishlist = async (userId) => {
    const user = await User.findById(userId).select('wishlist');
    if (!user) throw new Error('USER_NOT_FOUND');
    if (!user.wishlist.length) return [];

    const result = await productService.getProducts(
        { product_ids: user.wishlist, status: 'PUBLISHED', sort: 'newest' },
        { pageSize: user.wishlist.length, offset: 0 }
    );

    return result.products;
};

const addWishlistItem = async (userId, productId) => {
    const product = await Product.findOne({ _id: productId, status: 'PUBLISHED' });
    if (!product) throw new Error('PRODUCT_NOT_FOUND');

    await User.findByIdAndUpdate(userId, { $addToSet: { wishlist: productId }, $inc: { __v: 1 } });
};

const removeWishlistItem = async (userId, productId) => {
    await User.findByIdAndUpdate(userId, { $pull: { wishlist: productId }, $inc: { __v: 1 } });
};

module.exports = { getWishlist, addWishlistItem, removeWishlistItem };
