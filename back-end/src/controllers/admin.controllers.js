const accountService = require('../services/adminAccount.services');
const reportService = require('../services/adminReport.services');
const { successResponse } = require('../utils/response.util');
const { staffErrorResponse } = require('../utils/staffError.util');
const { getPagination, buildPagination } = require('../utils/pagination.util');
const filters = (query) => ({
    keyword: typeof query.keyword === 'string' ? query.keyword.trim().slice(0, 120) : '',
    role: query.role,
    status: query.status
});

const getSession = async (req, res) => {
    try {
        return successResponse(res, await reportService.getSession(req.user.userId));
    } catch (error) {
        return staffErrorResponse(res, error);
    }
};
const getLookups = async (req, res) => {
    try {
        return successResponse(res, await reportService.getLookups(req.user.userId));
    } catch (error) {
        return staffErrorResponse(res, error);
    }
};
const getAccounts = async (req, res) => {
    try {
        const page = getPagination(req.query),
            result = await accountService.getAccounts(filters(req.query), page);
        return successResponse(res, result.items, buildPagination(page.pageNumber, page.pageSize, result.totalElements));
    } catch (error) {
        return staffErrorResponse(res, error);
    }
};
const getAccount = async (req, res) => {
    try {
        return successResponse(res, await accountService.getAccount(req.params.id));
    } catch (error) {
        return staffErrorResponse(res, error);
    }
};
const createStaff = async (req, res) => {
    try {
        return successResponse(res, await accountService.createStaff(req.body || {}), null, 'Đã tạo tài khoản nhân viên', 201);
    } catch (error) {
        return staffErrorResponse(res, error);
    }
};
const updateAccount = async (req, res) => {
    try {
        return successResponse(res, await accountService.updateAccount(req.params.id, req.body || {}), null, 'Đã cập nhật tài khoản');
    } catch (error) {
        return staffErrorResponse(res, error);
    }
};
const setAccountLock = async (req, res) => {
    try {
        return successResponse(
            res,
            await accountService.setAccountLock(req.params.id, req.body || {}),
            null,
            'Đã cập nhật trạng thái tài khoản'
        );
    } catch (error) {
        return staffErrorResponse(res, error);
    }
};
const savePermissions = async (req, res) => {
    try {
        return successResponse(res, await accountService.savePermissions(req.params.id, req.body || {}), null, 'Đã lưu phân quyền');
    } catch (error) {
        return staffErrorResponse(res, error);
    }
};
const getRevenue = async (req, res) => {
    try {
        return successResponse(res, await reportService.getRevenue(req.query));
    } catch (error) {
        return staffErrorResponse(res, error);
    }
};
const getInventoryReport = async (req, res) => {
    try {
        const page = getPagination(req.query),
            result = await reportService.getInventoryReport(req.query, page);
        return successResponse(
            res,
            result.items,
            buildPagination(page.pageNumber, page.pageSize, result.totalElements),
            'Success',
            200,
            result.meta
        );
    } catch (error) {
        return staffErrorResponse(res, error);
    }
};

module.exports = {
    getSession,
    getLookups,
    getAccounts,
    getAccount,
    createStaff,
    updateAccount,
    setAccountLock,
    savePermissions,
    getRevenue,
    getInventoryReport
};
