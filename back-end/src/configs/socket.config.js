// Khởi tạo Socket.IO và xác thực kết nối bằng JWT, trạng thái tài khoản và quyền hiện tại trong database.
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/user');

let io;

// Đọc quyền hiện tại từ DB để phiên Socket không giữ quyền đã bị thu hồi.
const getSocketUser = async (token) => {
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
        if (!mongoose.isObjectIdOrHexString(decoded.userId)) return null;

        const user = await User.findById(decoded.userId).select('role status permissions +token_version').lean();
        if (!user || user.status !== 'ACTIVE' || (decoded.tokenVersion ?? 0) !== user.token_version) return null;
        return user;
    } catch {
        return null;
    }
};

// Kiểm tra nhóm quyền cụ thể, thay vì cho mọi nhân viên nhận mọi loại thông báo.
const hasSocketPermission = (user, permission) => user?.role === 'ADMIN' || (user?.role === 'STAFF' && !!user.permissions?.includes(permission));
// Khách dùng Socket để chat; nhân viên phải có quyền đơn hàng hoặc hỗ trợ.
const canConnect = (user) => user?.role === 'CUSTOMER' || hasSocketPermission(user, 'ORDER_MANAGE') || hasSocketPermission(user, 'SUPPORT_MANAGE');
// Chỉ những kết nối có quyền ORDER_MANAGE mới được theo dõi đơn hàng.
const canWatchOrders = async (token) => hasSocketPermission(await getSocketUser(token), 'ORDER_MANAGE');

module.exports = {
    init: (httpServer) => {
        io = new Server(httpServer, {
            cors: {
                origin: '*',
                methods: ['GET', 'POST']
            }
        });

        // Middleware bắt tay Socket: token/quyền không hợp lệ bị từ chối trước khi kết nối.
        io.use(async (socket, next) => {
            if (canConnect(await getSocketUser(socket.handshake.auth?.token))) return next();
            return next(new Error('FORBIDDEN'));
        });

        io.on('connection', (socket) => {
            // Một kết nối đang mở cũng phải được kiểm tra lại để khóa tài khoản/thu hồi phiên có hiệu lực.
            const timer = setInterval(async () => {
                if (!canConnect(await getSocketUser(socket.handshake.auth?.token))) socket.disconnect(true);
            }, 30000);

            timer.unref();
            socket.on('disconnect', () => clearInterval(timer));
        });

        return io;
    },

    getIO: () => io,

    canWatchOrders,
    getSocketUser,
    hasSocketPermission,
    canConnect
};
