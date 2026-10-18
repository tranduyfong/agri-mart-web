const db = require('../configs/database.config');
const productService = require('./product.services');

const getWishlist = async (userId) => {
    const [[{ total }]] = await db.execute(
        `SELECT COUNT(*) AS total FROM wishlist_items wi JOIN products p ON p.id = wi.product_id
         WHERE wi.user_id = ? AND p.status = 'PUBLISHED'`, [userId]);
    if (total === 0) return [];

    // Dùng lại cách lấy giá, khuyến mãi, ảnh và tồn kho của danh sách sản phẩm
    const result = await productService.getProducts(
        { wishlist_user_id: userId, status: 'PUBLISHED', min_price: null, max_price: null, sort: 'newest' },
        { pageSize: total, offset: 0 });
    return result.products;
};

const addWishlistItem = async (userId, productId) => {
    const [products] = await db.execute('SELECT id FROM products WHERE id = ? AND status = \'PUBLISHED\'', [productId]);
    if (products.length === 0) throw new Error('PRODUCT_NOT_FOUND');
    // PUT có thể gọi lặp lại mà không tạo trùng sản phẩm
    await db.execute('INSERT IGNORE INTO wishlist_items (user_id, product_id) VALUES (?, ?)', [userId, productId]);
};

const removeWishlistItem = async (userId, productId) => {
    await db.execute('DELETE FROM wishlist_items WHERE user_id = ? AND product_id = ?', [userId, productId]);
};

module.exports = { getWishlist, addWishlistItem, removeWishlistItem };
