const promotionService = require('../services/promotion.services');
const { successResponse, errorResponse } = require('../utils/response.util');
const { getPagination, buildPagination } = require('../utils/pagination.util');

// Đọc bộ lọc is_flash_sale từ query: 'true' / 'false' / không truyền (lấy tất cả)
const getFlashSaleFilter = (value) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return null;
};

// Danh sách khuyến mãi đang diễn ra: ?keyword=&is_flash_sale=true|false&pageNumber=0&pageSize=20
const getActivePromotions = async (req, res) => {
    try {
        const pagination = getPagination(req.query);
        const filters = {
            keyword: typeof req.query.keyword === 'string' ? req.query.keyword.trim() : '',
            is_flash_sale: getFlashSaleFilter(req.query.is_flash_sale)
        };

        const result = await promotionService.getActivePromotions(filters, pagination);

        return successResponse(res, result.promotions,
            buildPagination(pagination.pageNumber, pagination.pageSize, result.totalElements));
    } catch (error) {
        return errorResponse(res, 'INTERNAL_SERVER_ERROR', 'Lỗi hệ thống', 500, null, error.message);
    }
};

module.exports = { getActivePromotions };
