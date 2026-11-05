// Được nạp vào staff.integration.js để dùng chung database tạm và server đã cấu hình.
module.exports = ({ test, assert, api, User, ChatRoom, ChatMessage, makeChatCustomer, getTokens,
    sign, connectOrders, waitUntil, uploadedPaths, cwd, getBaseUrl }) => {
    const { randomUUID } = require('node:crypto');
    const fs = require('node:fs'), path = require('node:path');
    const send = (accessToken, content, client_id = randomUUID()) => api('/chat/messages', 'POST', { content, client_id }, accessToken);

    test('Khách gửi đồng thời tạo một hội thoại, gửi lại không nhân đôi, dữ liệu đọc được sau kết nối lại', async () => {
        const { token } = getTokens();
        const customer = await makeChatCustomer('concurrent');
        const [first, second] = await Promise.all([send(customer.token, 'Tin thứ nhất'), send(customer.token, 'Tin thứ hai')]);
        assert.equal(first.data.id, second.data.id);
        assert.equal(await ChatRoom.countDocuments({ customer_id: customer.user._id }), 1);
        const clientId = randomUUID();
        await Promise.all([send(customer.token, 'Gửi một lần', clientId), send(customer.token, 'Gửi một lần', clientId)]);
        assert.equal(await ChatMessage.countDocuments({ sender_id: customer.user._id, client_id: clientId }), 1);
        assert.equal((await api('/chat', 'GET', undefined, customer.token)).data.messages.length, 3);
        assert.equal((await api('/chat/summary', 'GET', undefined, customer.token)).data.unread_count, 0);
        await api('/chat/messages', 'POST', { content: '   ' }, customer.token, 400);
        await api('/chat/messages', 'POST', { content: 'x'.repeat(5001) }, customer.token, 400);
        await api('/chat', 'GET', undefined, token, 403);
    });

    test('Số chưa đọc độc lập theo người đọc, chỉ xóa tới tin đã thấy; khách không đọc hội thoại người khác', async () => {
        const { otherToken, limitedToken } = getTokens();
        const customer = await makeChatCustomer('unread'), stranger = await makeChatCustomer('stranger');
        const room = (await send(customer.token, 'Cần hỗ trợ')).data;
        const firstId = room.messages.at(-1).id;
        await send(customer.token, 'Tin đến sau');
        await api('/staff/support/' + room.id + '/read', 'POST', { through_id: firstId });
        assert.equal((await api('/staff/support/' + room.id)).data.unread_count, 1);
        assert.equal((await api('/staff/support/' + room.id, 'GET', undefined, otherToken)).data.unread_count, 2);
        await api('/chat/' + room.id + '/read', 'POST', { through_id: firstId }, stranger.token, 404);
        await api('/staff/support/' + room.id + '/claim', 'POST', {});
        await api('/staff/support/' + room.id + '/messages', 'POST', { content: 'Cửa hàng đã nhận tin', client_id: randomUUID() });
        assert.equal((await api('/chat/summary', 'GET', undefined, customer.token)).data.unread_count, 1);
        const detail = (await api('/chat', 'GET', undefined, customer.token)).data;
        await api('/chat/' + room.id + '/read', 'POST', { through_id: detail.messages.at(-1).id }, customer.token);
        assert.equal((await api('/chat/summary', 'GET', undefined, customer.token)).data.unread_count, 0);
        await api('/staff/support/' + room.id + '/close', 'POST', {});
        assert.equal((await send(customer.token, 'Tôi cần hỏi thêm')).data.id, room.id);
        assert.equal((await api('/staff/support/' + room.id)).data.status, 'AI_ACTIVE');
        await api('/staff/support/summary', 'GET', undefined, limitedToken, 403);
    });

    test('Gửi ảnh hai chiều, giữ ảnh đã lưu khi gửi lại, từ chối ảnh giả và dọn file khi gửi lỗi', async () => {
        const { token } = getTokens();
        const customer = await makeChatCustomer('images');
        const png = fs.readFileSync(path.join(cwd, 'seed-images/strawberry.png'));
        const form = (content, bytes = png, count = 1, clientId = randomUUID()) => {
            const data = new FormData(); data.set('content', content); data.set('client_id', clientId);
            for (let index = 0; index < count; index++) data.append('images', new Blob([bytes], { type: 'image/png' }), 'chat.png');
            return data;
        };
        const clientId = randomUUID();
        const room = (await api('/chat/messages', 'POST', form('', png, 1, clientId), customer.token)).data;
        const attachment = room.messages.at(-1).attachments[0]; uploadedPaths.push(attachment);
        await api('/chat/messages', 'POST', form('', png, 1, clientId), customer.token);
        assert.equal(await ChatMessage.countDocuments({ sender_id: customer.user._id, client_id: clientId }), 1);
        const image = await fetch(getBaseUrl().replace('/api', '') + '/' + attachment);
        assert.equal(image.status, 200); assert.deepEqual(Buffer.from(await image.arrayBuffer()), png);
        const othersFolder = path.join(cwd, 'uploads/others');
        const before = fs.existsSync(othersFolder) ? fs.readdirSync(othersFolder).sort() : [];
        await api('/chat/messages', 'POST', form('', Buffer.from('<html>not an image</html>')), customer.token, 400);
        await api('/chat/messages', 'POST', form('', png, 4), customer.token, 400);
        await api('/chat/messages', 'POST', form('', Buffer.alloc(5 * 1024 * 1024 + 1)), customer.token, 400);
        await api('/staff/support/' + room.id + '/messages', 'POST', form('Chưa nhận'), token, 409);
        assert.deepEqual(fs.readdirSync(othersFolder).sort(), before);
        await api('/staff/support/' + room.id + '/claim', 'POST', {});
        const reply = (await api('/staff/support/' + room.id + '/messages', 'POST', form('Ảnh từ cửa hàng'))).data;
        uploadedPaths.push(...reply.messages.at(-1).attachments);
        assert.equal((await api('/chat', 'GET', undefined, customer.token)).data.messages.at(-1).attachments.length, 1);
    });

    test('Lịch sử phân trang không mất hoặc lặp tin; đọc tin cuối cập nhật cả lịch sử cũ', async () => {
        const { token } = getTokens();
        const customer = await makeChatCustomer('history');
        const room = (await send(customer.token, 'Mở hội thoại')).data;
        await ChatMessage.insertMany(Array.from({ length: 65 }, (_, index) => ({ room_id: room.id,
            sender_id: customer.user._id, sender_type: 'CUSTOMER', content: 'Tin lịch sử ' + index })));
        const latest = (await api('/staff/support/' + room.id)).data;
        assert.equal(latest.messages.length, 50); assert.equal(latest.has_more, true);
        const older = (await api('/staff/support/' + room.id + '?before=' + latest.messages[0].id)).data;
        assert.equal(older.messages.length, 16); assert.equal(older.has_more, false);
        assert.equal(new Set([...older.messages, ...latest.messages].map((item) => item.id)).size, 66);
        await api('/staff/support/' + room.id + '/read', 'POST', { through_id: latest.messages.at(-1).id });
        assert.equal((await api('/staff/support/' + room.id)).data.unread_count, 0);
        await api('/staff/support/' + room.id + '?before=invalid', 'GET', undefined, token, 400);
    });

    test('Socket chat chỉ báo cho đúng khách và nhân viên hỗ trợ; thu hồi quyền ngắt kết nối', async (t) => {
        const customer = await makeChatCustomer('socket'), stranger = await makeChatCustomer('socket-other');
        const helper = await User.create({ email: 'chat-helper@example.invalid', password_hash: 'unused', full_name: 'Chỉ hỗ trợ',
            role: 'STAFF', status: 'ACTIVE', permissions: ['SUPPORT_MANAGE'] });
        const orderOnly = await User.create({ email: 'chat-orders@example.invalid', password_hash: 'unused', full_name: 'Chỉ đơn hàng',
            role: 'STAFF', status: 'ACTIVE', permissions: ['ORDER_MANAGE'] });
        const sockets = await Promise.all([connectOrders(customer.token), connectOrders(stranger.token), connectOrders(sign(helper)), connectOrders(sign(orderOnly))]);
        t.after(() => sockets.forEach((socket) => socket.disconnect()));
        const events = [[], [], [], []];
        sockets.forEach((socket, index) => socket.on('chat:changed', (event) => events[index].push(event.room_id)));
        const room = (await send(customer.token, 'Tin trực tiếp')).data;
        await waitUntil(() => events[0].includes(room.id) && events[2].includes(room.id));
        assert.deepEqual(events[1], []); assert.deepEqual(events[3], []);
        await api('/staff/support/' + room.id + '/claim', 'POST', {}, sign(helper));
        await api('/staff/support/' + room.id + '/messages', 'POST', { content: 'Đã nhận', client_id: randomUUID() }, sign(helper));
        await waitUntil(() => events[0].filter((id) => id === room.id).length >= 3);
        assert.equal((await api('/chat/summary', 'GET', undefined, customer.token)).data.unread_count, 1);
        await User.updateOne({ _id: helper._id }, { $set: { permissions: [] } });
        const before = events[2].length;
        await send(customer.token, 'Sau khi thu hồi quyền');
        await waitUntil(() => !sockets[2].connected);
        assert.equal(events[2].length, before);
    });
};
