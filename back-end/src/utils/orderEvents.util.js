const socketConfig = require('../configs/socket.config');

// Chỉ gọi sau khi giao dịch DB thành công. Sự kiện không chứa dữ liệu khách hàng.
const notifyOrdersChanged = () => {
    const io = socketConfig.getIO();
    if (!io) return;
    for (const socket of io.sockets.sockets.values()) {
        socketConfig.canWatchOrders(socket.handshake.auth?.token).then((allowed) => {
            if (allowed) socket.emit('orders:changed');
            else socket.disconnect(true);
        });
    }
};

module.exports = { notifyOrdersChanged };
