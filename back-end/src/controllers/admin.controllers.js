// Nhận request của nhóm quản trị tài khoản, xét duyệt và báo cáo, kiểm tra đầu vào và gọi service;
// successResponse/errorResponse thống nhất dữ liệu trả cho frontend.
const accountService = require('../services/adminAccount.services');
const reportService = require('../services/adminReport.services');
const { successResponse } = require('../utils/response.util');
const { staffErrorResponse } = require('../utils/staffError.util');
const { getPagination, buildPagination } = require('../utils/pagination.util');
// Lấy bộ lọc từ query để truyền về service theo cùng một cách giữa các API quản trị.
const filters = (query) => ({
    keyword: typeof query.keyword === 'string' ? query.keyword.trim().slice(0, 120) : '',
    role: query.role,
    status: query.status
});

// Trả phiên làm việc đã được kiểm tra cho ứng dụng quản lý.
const getSession = async (req, res) => {
    try {
        return successResponse(res, await reportService.getSession(req.user.userId));
    } catch (error) {
        return staffErrorResponse(res, error);
    }
};
// Trả dữ liệu tham chiếu như danh mục/nhà cung cấp/quyền để điền các ô chọn.
const getLookups = async (req, res) => {
    try {
        return successResponse(res, await reportService.getLookups(req.user.userId));
    } catch (error) {
        return staffErrorResponse(res, error);
    }
};
// Đọc bộ lọc và phân trang trước khi lấy danh sách tài khoản cho admin.
const getAccounts = async (req, res) => {
    try {
        const page = getPagination(req.query),
            result = await accountService.getAccounts(filters(req.query), page);
        return successResponse(res, result.items, buildPagination(page.pageNumber, page.pageSize, result.totalElements));
    } catch (error) {
        return staffErrorResponse(res, error);
    }
};
// Trả thông tin tài khoản; phạm vi người được xem được xác định từ phiên/route hiện tại.
const getAccount = async (req, res) => {
    try {
        return successResponse(res, await accountService.getAccount(req.params.id));
    } catch (error) {
        return staffErrorResponse(res, error);
    }
};
// Chuyển payload tạo nhân viên cho service kiểm tra và trả kết quả theo định dạng chung.
const createStaff = async (req, res) => {
    try {
        return successResponse(res, await accountService.createStaff(req.body || {}), null, 'Đã tạo tài khoản nhân viên', 201);
    } catch (error) {
        return staffErrorResponse(res, error);
    }
};
// Gửi thay đổi thông tin tài khoản/email cho nghiệp vụ quản trị xử lý.
const updateAccount = async (req, res) => {
    try {
        return successResponse(res, await accountService.updateAccount(req.params.id, req.body || {}), null, 'Đã cập nhật tài khoản');
    } catch (error) {
        return staffErrorResponse(res, error);
    }
};
// Nhận hành động khóa/mở và trạng thái dự kiến để backend kiểm tra trước khi đổi.
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
// Chỉ chuyển các quyền cần lưu cho service quản trị, nơi kiểm tra mã quyền và xung đột.
const savePermissions = async (req, res) => {
    try {
        return successResponse(res, await accountService.savePermissions(req.params.id, req.body || {}), null, 'Đã lưu phân quyền');
    } catch (error) {
        return staffErrorResponse(res, error);
    }
};
// Đọc khoảng ngày/bộ lọc rồi trả số liệu doanh thu do service tổng hợp.
const getRevenue = async (req, res) => {
    try {
        return successResponse(res, await reportService.getRevenue(req.query));
    } catch (error) {
        return staffErrorResponse(res, error);
    }
};
// Lấy báo cáo nhập/bán/tồn theo khoảng ngày, sản phẩm và phân trang.
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
