const { errorResponse } = require('../utils/response.util');

// verifyToken đã đọc role và permissions mới nhất từ User, không lấy quyền trong JWT.
const requirePermission = (permission) => (req, res, next) => {
    if (req.user?.role === 'ADMIN') {
        return next();
    }

    if (req.user?.role === 'STAFF' && req.user.permissions?.includes(permission)) {
        return next();
    }

    return errorResponse(res, 'FORBIDDEN', 'Tài khoản chưa có quyền: ' + permission, 403);
};

module.exports = { requirePermission };
