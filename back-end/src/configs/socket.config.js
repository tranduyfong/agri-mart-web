const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/user');

let io;

// Đọc quyền hiện tại từ DB để phiên Socket không giữ quyền đã bị thu hồi.
const canWatchOrders = async (token) => {
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
        if (!mongoose.isObjectIdOrHexString(decoded.userId)) return false;

        const user = await User.findById(decoded.userId).select('role status permissions +token_version').lean();
        if (!user || user.status !== 'ACTIVE' || (decoded.tokenVersion ?? 0) !== user.token_version) return false;

        return user.role === 'ADMIN' || (user.role === 'STAFF' && user.permissions.includes('ORDER_MANAGE'));
    } catch {
        return false;
    }
};

module.exports = {
    init: (httpServer) => {
        io = new Server(httpServer, {
            cors: {
                origin: '*',
                methods: ['GET', 'POST']
            }
        });

        io.use(async (socket, next) => {
            if (await canWatchOrders(socket.handshake.auth?.token)) return next();
            return next(new Error('FORBIDDEN'));
        });

        io.on('connection', (socket) => {
            const timer = setInterval(async () => {
                if (!(await canWatchOrders(socket.handshake.auth?.token))) socket.disconnect(true);
            }, 30000);

            timer.unref();
            socket.on('disconnect', () => clearInterval(timer));
        });

        return io;
    },

    getIO: () => io,

    canWatchOrders
};
