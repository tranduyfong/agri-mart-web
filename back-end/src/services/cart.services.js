const db = require('../configs/database.config');

// Giá và tồn kho luôn đọc lại từ DB, không nhận giá do FE gửi lên
const getCart = async (userId) => {
    const [items] = await db.execute(
        `SELECT ci.id, ci.quantity, v.id AS variant_id, v.name AS variant_name, v.sku,
                v.unit, v.step_quantity, v.list_price,
                p.id AS product_id, p.name, p.slug, p.status, c.name AS category_name,
                b.id AS branch_id, b.name AS branch_name,
                (SELECT COALESCE(SUM(bs.stock_quantity), 0) FROM branch_stock bs
                  WHERE bs.variant_id = v.id AND bs.branch_id = b.id AND bs.expiry_date >= CURDATE()) AS stock_quantity,
                (SELECT f.url FROM product_images pi JOIN files f ON f.id = pi.file_id
                  WHERE pi.product_id = p.id ORDER BY pi.is_thumbnail DESC, pi.id LIMIT 1) AS thumbnail_url,
                (SELECT MAX(pr.discount_value) FROM promotion_products pp JOIN promotions pr ON pr.id = pp.promotion_id
                  WHERE pp.product_id = p.id AND pr.discount_type = 'PERCENT'
                    AND pr.valid_from <= NOW() AND pr.valid_to >= NOW()) AS discount_percent
         FROM cart_items ci
         JOIN carts cart ON cart.id = ci.cart_id
         JOIN branches b ON b.id = cart.branch_id
         JOIN product_variants v ON v.id = ci.variant_id
         JOIN products p ON p.id = v.product_id
         JOIN categories c ON c.id = p.category_id
         WHERE cart.user_id = ? ORDER BY ci.id DESC`, [userId]);
    return items;
};

// Quy đổi thành số nguyên để kiểm tra chính xác cả bước bán 0.1 / 0.5kg
const validateQuantity = (quantity, stepQuantity) => {
    const scaled = Math.round(quantity * 1000);
    const step = Math.max(1, Math.round(stepQuantity * 1000));
    if (quantity <= 0 || Math.abs(quantity * 1000 - scaled) > 0.00001 || scaled % step !== 0) {
        throw new Error('INVALID_QUANTITY');
    }
};

// Khóa theo tài khoản để hai request thêm đồng thời không tạo trùng dòng hoặc ghi đè số lượng
const withUserCartLock = async (userId, operation) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const [users] = await connection.execute('SELECT id FROM users WHERE id = ? AND status = \'ACTIVE\' FOR UPDATE', [userId]);
        if (users.length === 0) throw new Error('ACCOUNT_UNAVAILABLE');
        await operation(connection);
        await connection.commit();
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

const addCartItem = async (userId, variantId, quantity) => {
    await withUserCartLock(userId, async (connection) => {
        const [variants] = await connection.execute(
            `SELECT v.step_quantity FROM product_variants v JOIN products p ON p.id = v.product_id
             WHERE v.id = ? AND p.status = 'PUBLISHED'`, [variantId]);
        if (variants.length === 0) throw new Error('PRODUCT_NOT_FOUND');
        validateQuantity(quantity, variants[0].step_quantity);

        // Ưu tiên chi nhánh đã có trong giỏ và đủ tồn cho tổng số lượng sau khi thêm.
        // Không cộng tồn từ nhiều chi nhánh thành một dòng giỏ hàng.
        const [branches] = await connection.execute(
            `SELECT bs.branch_id, SUM(bs.stock_quantity) AS stock_quantity,
                    (SELECT COALESCE(SUM(ci.quantity), 0) FROM cart_items ci JOIN carts cart ON cart.id = ci.cart_id
                      WHERE cart.user_id = ? AND cart.branch_id = bs.branch_id AND ci.variant_id = ?) AS cart_quantity
             FROM branch_stock bs WHERE bs.variant_id = ? AND bs.expiry_date >= CURDATE()
             GROUP BY bs.branch_id HAVING stock_quantity >= cart_quantity + ?
             ORDER BY cart_quantity DESC, stock_quantity DESC, bs.branch_id LIMIT 1`, [userId, variantId, variantId, quantity]);
        if (branches.length === 0) throw new Error('INSUFFICIENT_STOCK');
        const branchId = branches[0].branch_id;

        await connection.execute(
            'INSERT INTO carts (user_id, branch_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)', [userId, branchId]);
        const [[cart]] = await connection.execute('SELECT id FROM carts WHERE user_id = ? AND branch_id = ?', [userId, branchId]);
        const [items] = await connection.execute('SELECT id FROM cart_items WHERE cart_id = ? AND variant_id = ? ORDER BY id LIMIT 1', [cart.id, variantId]);
        if (items.length > 0) {
            await connection.execute('UPDATE cart_items SET quantity = quantity + ? WHERE id = ?', [quantity, items[0].id]);
        } else {
            await connection.execute('INSERT INTO cart_items (cart_id, variant_id, quantity) VALUES (?, ?, ?)', [cart.id, variantId, quantity]);
        }
    });
};

const updateCartItem = async (userId, itemId, quantity) => {
    await withUserCartLock(userId, async (connection) => {
        const [items] = await connection.execute(
            `SELECT ci.id, v.step_quantity, p.status,
                    (SELECT COALESCE(SUM(bs.stock_quantity), 0) FROM branch_stock bs
                      WHERE bs.variant_id = ci.variant_id AND bs.branch_id = cart.branch_id AND bs.expiry_date >= CURDATE()) AS stock_quantity
             FROM cart_items ci JOIN carts cart ON cart.id = ci.cart_id
             JOIN product_variants v ON v.id = ci.variant_id JOIN products p ON p.id = v.product_id
             WHERE ci.id = ? AND cart.user_id = ?`, [itemId, userId]);
        if (items.length === 0) throw new Error('CART_ITEM_NOT_FOUND');
        const item = items[0];
        if (item.status !== 'PUBLISHED') throw new Error('PRODUCT_NOT_FOUND');
        validateQuantity(quantity, item.step_quantity);
        if (quantity > item.stock_quantity) throw new Error('INSUFFICIENT_STOCK');
        await connection.execute('UPDATE cart_items SET quantity = ? WHERE id = ?', [quantity, itemId]);
    });
};

const removeCartItem = async (userId, itemId) => {
    await withUserCartLock(userId, async (connection) => {
        await connection.execute(
            'DELETE ci FROM cart_items ci JOIN carts cart ON cart.id = ci.cart_id WHERE ci.id = ? AND cart.user_id = ?', [itemId, userId]);
    });
};

module.exports = { getCart, addCartItem, updateCartItem, removeCartItem };
