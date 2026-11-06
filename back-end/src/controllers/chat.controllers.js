// Nhận request của nhóm chat của khách hàng, kiểm tra đầu vào và gọi service; successResponse/errorResponse thống
// nhất dữ liệu trả cho frontend.
const supportService = require('../services/support.services');
const { successResponse } = require('../utils/response.util');
const { staffErrorResponse } = require('../utils/staffError.util');
const { deleteUploadedFiles } = require('../utils/file.util');

// Lấy lịch sử hội thoại; service kiểm tra quyền xem và xử lý mốc tải trang trước.
const getRoom = async (req, res) => {
    try { return successResponse(res, await supportService.getCustomerRoom(req.user.userId, req.query.before)); }
    catch (error) { return staffErrorResponse(res, error); }
};
// Tạo handler đếm tin chưa đọc theo vai trò khách hoặc nhân viên.
const getSummary = (customer) => async (req, res) => {
    try { return successResponse(res, await supportService.getSummary(req.user.userId, customer)); }
    catch (error) { return staffErrorResponse(res, error); }
};
// Nhận chữ/file/client_id, lưu tin và dọn file upload nếu yêu cầu thất bại trước khi giữ được ảnh.
const sendMessage = async (req, res) => {
    try {
        return successResponse(res, await supportService.customerReply(req.user.userId, req.body?.content ?? '', req.files, req.body?.client_id));
    } catch (error) {
        if (!error.keepUploads) deleteUploadedFiles(req.files || []);
        return staffErrorResponse(res, error);
    }
};
// Tạo handler đánh dấu đọc tới through_id trong đúng hội thoại được phép truy cập.
const markRead = (customer) => async (req, res) => {
    try { return successResponse(res, await supportService.markRead(req.user.userId, req.params.id, req.body?.through_id, customer)); }
    catch (error) { return staffErrorResponse(res, error); }
};
const resumeAi = async (req, res) => {
    try { return successResponse(res, await supportService.resumeAi(req.user.userId, req.params.id), null, 'Đã tiếp tục với trợ lý AI'); }
    catch (error) { return staffErrorResponse(res, error); }
};
module.exports = { getRoom, getSummary, sendMessage, markRead, resumeAi };
