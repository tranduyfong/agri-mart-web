const User = require('../models/user');
const { errorResponse } = require('../utils/response.util');

// Mỗi nhân viên dùng cùng một kho; quyền chức năng vẫn đọc từ tài khoản trong DB.
const loadStaffContext = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.userId).select('full_name email role permissions');
        if (!user) return errorResponse(res, 'UNAUTHORIZED', 'Tài khoản không còn tồn tại', 401);
        req.staff = { user };
        next();
    } catch (error) {
        return errorResponse(res, 'INTERNAL_SERVER_ERROR', 'Không thể tải thông tin nhân viên', 500, null, error.message);
    }
};

module.exports = { loadStaffContext };
