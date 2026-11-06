// Báo danh sách đơn thay đổi cho các Socket có quyền quản lý đơn hàng.
const socketConfig = require('../configs/socket.config');

// Chỉ gọi sau khi giao dịch DB thành công. Sự kiện không chứa dữ liệu khách hàng.
const notifyOrdersChanged = () => {
    const io = socketConfig.getIO();
    if (!io) return;
    for (const socket of io.sockets.sockets.values()) {
        socketConfig.getSocketUser(socket.handshake.auth?.token).then((user) => {
            if (!socketConfig.canConnect(user)) socket.disconnect(true);
            else if (socketConfig.hasSocketPermission(user, 'ORDER_MANAGE')) socket.emit('orders:changed');
        });
    }
};

module.exports = { notifyOrdersChanged };
