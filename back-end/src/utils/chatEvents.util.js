const socketConfig = require('../configs/socket.config');

// Chỉ báo sau khi DB đã lưu; nội dung được đọc lại qua API có xác thực.
const notifyChatChanged = (room, onlyUserId = null) => {
    const io = socketConfig.getIO();
    if (!io) return;
    for (const socket of io.sockets.sockets.values()) {
        socketConfig.getSocketUser(socket.handshake.auth?.token).then((user) => {
            if (!socketConfig.canConnect(user)) return socket.disconnect(true);
            const ownNotification = onlyUserId && user._id.toString() === String(onlyUserId);
            const canSeeRoom = !onlyUserId && (
                (user.role === 'CUSTOMER' && user._id.toString() === String(room.customer_id?._id || room.customer_id)) ||
                socketConfig.hasSocketPermission(user, 'SUPPORT_MANAGE')
            );
            if (ownNotification || canSeeRoom) socket.emit('chat:changed', { room_id: String(room._id) });
        });
    }
};
module.exports = { notifyChatChanged };
