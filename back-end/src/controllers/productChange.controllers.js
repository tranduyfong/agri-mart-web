const service = require('../services/productChange.services');
const { successResponse, errorResponse } = require('../utils/response.util');
const { staffErrorResponse } = require('../utils/staffError.util');
const { getPagination, buildPagination } = require('../utils/pagination.util');

const getChanges = async (req, res) => {
    try {
        const { status, type } = req.query;
        if ((status && !['PENDING', 'APPROVED', 'REJECTED'].includes(status)) || (type && !['CREATE', 'UPDATE', 'IMPORT'].includes(type)))
            throw new Error('INVALID_DATA');
        const page = getPagination(req.query);
        const result = await service.getChanges(req.user, { status, type }, page);
        return successResponse(res, result.items, buildPagination(page.pageNumber, page.pageSize, result.totalElements));
    } catch (error) {
        return staffErrorResponse(res, error);
    }
};
const getChange = async (req, res) => {
    try {
        return successResponse(res, await service.getChange(req.user, req.params.id));
    } catch (error) {
        return staffErrorResponse(res, error);
    }
};
const reviewChange = async (req, res) => {
    if (req.user.role !== 'ADMIN') return errorResponse(res, 'FORBIDDEN', 'Chỉ quản trị viên được duyệt', 403);
    try {
        return successResponse(res, await service.reviewChange(req.user.userId, req.params.id, req.body || {}));
    } catch (error) {
        return staffErrorResponse(res, error);
    }
};
module.exports = { getChanges, getChange, reviewChange };
