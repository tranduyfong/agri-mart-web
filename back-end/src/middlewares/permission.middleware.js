const db = require('../configs/database.config');
const { errorResponse } = require('../utils/response.util');

const requirePermission = (requiredPermission) => {
    return async (req, res, next) => {
        try {
            // 1. Lấy trạng thái và quyền MỚI NHẤT của user từ DB
            // (tránh trường hợp tài khoản đã bị khóa / đổi quyền nhưng token cũ vẫn còn hạn)
            const [users] = await db.execute(`
                SELECT u.status, r.code AS role_code
                FROM users u
                JOIN roles r ON u.role_id = r.id
                WHERE u.id = ?
            `, [req.user.userId]);

            if (users.length === 0 || users[0].status !== 'ACTIVE') {
                return errorResponse(res, 'FORBIDDEN', 'Tài khoản không tồn tại hoặc đã bị khóa', 403);
            }

            const roleCode = users[0].role_code; // VD: 'ADMIN', 'STAFF', 'CUSTOMER'

            // 2. Nếu là Admin thì có "Kim Bài Miễn Tử", cho qua mọi trạm
            if (roleCode === 'ADMIN') {
                return next();
            }

            // 3. Nếu là khách hàng (CUSTOMER) thì chặn đứng lập tức
            if (roleCode === 'CUSTOMER') {
                return errorResponse(res, 'FORBIDDEN', 'Khách hàng không có quyền thực hiện thao tác này', 403);
            }

            // 4. Nếu là Nhân viên (STAFF), kiểm tra xem Role này có được map với Permission yêu cầu không
            const [rows] = await db.execute(`
                SELECT p.code
                FROM permissions p
                JOIN role_permissions rp ON p.id = rp.permission_id
                JOIN roles r ON r.id = rp.role_id
                WHERE r.code = ? AND p.code = ?
            `, [roleCode, requiredPermission]);

            // Nếu mảng rỗng tức là nhân viên không có quyền này
            if (rows.length === 0) {
                return errorResponse(res, 'FORBIDDEN', `Truy cập từ chối. Nhân viên thiếu quyền hạn: ${requiredPermission}`, 403);
            }

            // Hợp lệ, cho phép đi tiếp vào Controller
            next();
        } catch (error) {
            return errorResponse(res, 'INTERNAL_SERVER_ERROR', 'Lỗi kiểm tra phân quyền hệ thống', 500, null, error.message);
        }
    };
};

module.exports = { requirePermission };
