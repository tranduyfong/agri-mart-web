const service = require('../services/supplier.services');
const { successResponse } = require('../utils/response.util');
const { staffErrorResponse } = require('../utils/staffError.util');
const { getPagination, buildPagination } = require('../utils/pagination.util');

const getSuppliers = async (req, res) => {
    try {
        const page = getPagination(req.query);
        const keyword = typeof req.query.keyword === 'string' ? req.query.keyword.trim().slice(0, 120) : '';
        const result = await service.getSuppliers(keyword, page);
        return successResponse(res, result.items, buildPagination(page.pageNumber, page.pageSize, result.totalElements));
    } catch (error) { return staffErrorResponse(res, error); }
};
const getSupplier = async (req, res) => {
    try { return successResponse(res, await service.getSupplier(req.params.id)); }
    catch (error) { return staffErrorResponse(res, error); }
};
const getSupplierItems = async (req, res) => {
    try {
        const page = getPagination(req.query), result = await service.getSupplierItems(req.params.id, page);
        return successResponse(res, result.items, buildPagination(page.pageNumber, page.pageSize, result.totalElements));
    } catch (error) { return staffErrorResponse(res, error); }
};
const saveSupplier = async (req, res) => {
    try { return successResponse(res, await service.saveSupplier(req.params.id, req.body || {}), null, 'Đã lưu nhà cung cấp', req.params.id ? 200 : 201); }
    catch (error) { return staffErrorResponse(res, error); }
};
module.exports = { getSuppliers, getSupplier, getSupplierItems, saveSupplier };
