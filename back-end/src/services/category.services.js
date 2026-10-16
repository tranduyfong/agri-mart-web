const db = require('../configs/database.config');

/**
 * Lấy danh sách danh mục có tìm kiếm và phân trang
 * Kèm ảnh đại diện và số sản phẩm đang bán của từng danh mục
 */
const getCategories = async (keyword, pagination) => {
    const conditions = [];
    const params = [];

    if (keyword) {
        conditions.push('c.name LIKE ?');
        params.push(`%${keyword}%`);
    }

    const whereSql = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    // 1. Đếm tổng số danh mục (để tính totalPages)
    const [countRows] = await db.execute(`SELECT COUNT(*) AS total FROM categories c ${whereSql}`, params);

    // 2. Lấy dữ liệu của trang hiện tại (LIMIT/OFFSET truyền dạng chuỗi, xem ghi chú ở product.services.js)
    const [categories] = await db.execute(
        `SELECT c.id, c.name, c.slug, f.url AS image_url,
                (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.status = 'PUBLISHED') AS product_count
         FROM categories c
         LEFT JOIN files f ON f.id = c.image_file_id
         ${whereSql}
         ORDER BY c.id
         LIMIT ? OFFSET ?`,
        [...params, String(pagination.pageSize), String(pagination.offset)]
    );

    return {
        categories,
        totalElements: countRows[0].total
    };
};

module.exports = { getCategories };
