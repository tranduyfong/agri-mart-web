const jwt = require('jsonwebtoken');
const { errorResponse } = require('../utils/response.util');

const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return errorResponse(res, 'UNAUTHORIZED', 'Truy cập bị từ chối. Không tìm thấy token.', 401);
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // { userId, role }
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return errorResponse(res, 'TOKEN_EXPIRED', 'Token đã hết hạn', 401);
        }
        return errorResponse(res, 'INVALID_TOKEN', 'Token không hợp lệ', 401);
    }
};

const verifyAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== 'ADMIN') { // Đổi thành ADMIN
        return errorResponse(res, 'FORBIDDEN', 'Truy cập bị từ chối. Chỉ dành cho Admin.', 403);
    }
    next();
};

const verifyAdminOrStaff = (req, res, next) => {
    if (!req.user || (req.user.role !== 'ADMIN' && req.user.role !== 'STAFF')) { // Đổi thành ADMIN và STAFF
        return errorResponse(res, 'FORBIDDEN', 'Truy cập bị từ chối. Yêu cầu quyền Admin hoặc Nhân viên', 403);
    }
    next();
};

module.exports = {
    verifyToken,
    verifyAdmin,
    verifyAdminOrStaff
};