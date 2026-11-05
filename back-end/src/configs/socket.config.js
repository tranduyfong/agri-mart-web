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

const hasSocketPermission = (user, permission) => user?.role === 'ADMIN' || (user?.role === 'STAFF' && !!user.permissions?.includes(permission));
const canConnect = (user) => user?.role === 'CUSTOMER' || hasSocketPermission(user, 'ORDER_MANAGE') || hasSocketPermission(user, 'SUPPORT_MANAGE');
const canWatchOrders = async (token) => hasSocketPermission(await getSocketUser(token), 'ORDER_MANAGE');

module.exports = {
    init: (httpServer) => {
        io = new Server(httpServer, {
            cors: {
                origin: '*',
                methods: ['GET', 'POST']
            }
        });

        io.use(async (socket, next) => {
            if (canConnect(await getSocketUser(socket.handshake.auth?.token))) return next();
            return next(new Error('FORBIDDEN'));
        });

        io.on('connection', (socket) => {
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
