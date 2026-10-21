const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/user');
const { errorResponse } = require('../utils/response.util');

const verifyToken = async (req, res, next) => {
    const header = req.headers.authorization;

    if (!header?.startsWith('Bearer ')) {
        return errorResponse(res, 'UNAUTHORIZED', 'Truy cập bị từ chối. Không tìm thấy token.', 401);
    }

    try {
        const decoded = jwt.verify(header.slice(7), process.env.JWT_SECRET, {
            algorithms: ['HS256']
        });

        if (typeof decoded !== 'object' || !mongoose.isObjectIdOrHexString(decoded.userId)) {
            return errorResponse(res, 'INVALID_TOKEN', 'Token không hợp lệ', 401);
        }

        const user = await User.findById(decoded.userId).select('+token_version');

        if (!user) {
            return errorResponse(res, 'UNAUTHORIZED', 'Tài khoản không còn tồn tại', 401);
        }

        if (user.status !== 'ACTIVE') {
            return errorResponse(res, 'FORBIDDEN', 'Tài khoản không khả dụng', 403);
        }

        if ((decoded.tokenVersion ?? 0) !== user.token_version) {
            return errorResponse(res, 'SESSION_REVOKED', 'Phiên đăng nhập đã kết thúc. Vui lòng đăng nhập lại.', 401);
        }

        req.user = {
            userId: String(user._id),
            role: user.role,
            permissions: user.permissions,
            tokenVersion: user.token_version
        };

        return next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return errorResponse(res, 'TOKEN_EXPIRED', 'Token đã hết hạn', 401);
        }

        if (['JsonWebTokenError', 'NotBeforeError'].includes(error.name)) {
            return errorResponse(res, 'INVALID_TOKEN', 'Token không hợp lệ', 401);
        }

        return errorResponse(res, 'INTERNAL_SERVER_ERROR', 'Không thể xác thực tài khoản', 500);
    }
};

const verifyAdmin = (req, res, next) => {
    if (req.user?.role === 'ADMIN') return next();
    return errorResponse(res, 'FORBIDDEN', 'Chỉ dành cho Admin', 403);
};

const verifyAdminOrStaff = (req, res, next) => {
    if (['ADMIN', 'STAFF'].includes(req.user?.role)) return next();
    return errorResponse(res, 'FORBIDDEN', 'Yêu cầu quyền Admin hoặc Nhân viên', 403);
};

module.exports = { verifyToken, verifyAdmin, verifyAdminOrStaff };
