const categoryService = require('../services/category.services');
const { successResponse, errorResponse } = require('../utils/response.util');
const { getPagination, buildPagination } = require('../utils/pagination.util');

// Danh sách danh mục: ?keyword=&pageNumber=0&pageSize=20
const getCategories = async (req, res) => {
    try {
        const pagination = getPagination(req.query);
        const keyword = typeof req.query.keyword === 'string' ? req.query.keyword.trim() : '';

        const result = await categoryService.getCategories(keyword, pagination);

        return successResponse(res, result.categories,
            buildPagination(pagination.pageNumber, pagination.pageSize, result.totalElements));
    } catch (error) {
        return errorResponse(res, 'INTERNAL_SERVER_ERROR', 'Lỗi hệ thống', 500, null, error.message);
    }
};

module.exports = { getCategories };
