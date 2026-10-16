const db = require('../configs/database.config');

/**
 * Lấy danh sách khuyến mãi ĐANG DIỄN RA (valid_from <= bây giờ <= valid_to)
 * filters: { keyword, is_flash_sale } - is_flash_sale: true / false / null (null = lấy tất cả)
 * Sắp xếp: chương trình sắp kết thúc đứng trước
 */
const getActivePromotions = async (filters, pagination) => {
    const { keyword, is_flash_sale } = filters;

    const conditions = ['pr.valid_from <= NOW()', 'pr.valid_to >= NOW()'];
    const params = [];

    if (keyword) {
        conditions.push('(pr.name LIKE ? OR pr.code LIKE ?)');
        params.push(`%${keyword}%`, `%${keyword}%`);
    }

    if (is_flash_sale !== null) {
        conditions.push('pr.is_flash_sale = ?');
        params.push(is_flash_sale ? 1 : 0);
    }

    const whereSql = 'WHERE ' + conditions.join(' AND ');

    // 1. Đếm tổng số khuyến mãi (để tính totalPages)
    const [countRows] = await db.execute(`SELECT COUNT(*) AS total FROM promotions pr ${whereSql}`, params);

    // 2. Lấy dữ liệu của trang hiện tại (LIMIT/OFFSET truyền dạng chuỗi, xem ghi chú ở product.services.js)
    const [promotions] = await db.execute(
        `SELECT pr.id, pr.code, pr.name, pr.discount_value, pr.discount_type, pr.promotion_scope,
                pr.is_flash_sale, pr.min_order_value, pr.valid_from, pr.valid_to,
                (SELECT COUNT(*) FROM promotion_products pp WHERE pp.promotion_id = pr.id) AS product_count
         FROM promotions pr
         ${whereSql}
         ORDER BY pr.valid_to ASC, pr.id ASC
         LIMIT ? OFFSET ?`,
        [...params, String(pagination.pageSize), String(pagination.offset)]
    );

    return {
        promotions,
        totalElements: countRows[0].total
    };
};

module.exports = { getActivePromotions };
