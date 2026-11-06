const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const path = require('node:path');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const User = require('../src/models/user');
const Product = require('../src/models/product');
const Category = require('../src/models/category');
const Promotion = require('../src/models/promotion');
const ChatRoom = require('../src/models/chatRoom');
const ChatMessage = require('../src/models/chatMessage');
const Order = require('../src/models/order');

let database, server, baseUrl, staffToken, products, logs = '';
const secret = 'ai-integration-only-secret';
const sign = (user) => jwt.sign({ userId: user.id, tokenVersion: 0 }, secret);
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const waitFor = async (check) => {
    for (let index = 0; index < 200; index++) { const result = await check(); if (result) return result; await pause(50); }
    assert.fail('Timed out waiting for AI test condition: ' + logs.slice(-500));
};
const api = async (token, url, method = 'GET', body, status = 200) => {
    const response = await fetch(baseUrl + url, { method, headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body) });
    const result = await response.json();
    assert.equal(response.status, status, JSON.stringify(result));
    return result.data;
};
let customerIndex = 0;
const customer = async () => {
    const user = await User.create({ email: 'ai-' + (++customerIndex) + '@example.invalid', password_hash: 'unused', full_name: 'Khách thử AI',
        role: 'CUSTOMER', status: 'ACTIVE', addresses: [{ recipient_name: 'Khách thử AI', phone: '0900000001', address_line: 'Địa chỉ thử', is_default: true }] });
    return { user, token: sign(user) };
};
const send = (token, content, clientId = randomUUID()) => api(token, '/chat/messages', 'POST', { content, client_id: clientId });
const reply = (id) => waitFor(async () => {
    const room = await ChatRoom.findById(id).lean();
    if (room.ai_pending) return false;
    return ChatMessage.findOne({ room_id: id, sender_type: 'AI' }).sort({ _id: -1 }).lean();
});

before(async () => {
    database = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    const uri = database.getUri('ai-test-only');
    await mongoose.connect(uri);
    const category = await Category.create({ name: 'Rau củ', slug: 'rau-cu-ai-test' });
    const expiry = new Date(Date.now() + 10 * 86400000), expired = new Date(Date.now() - 10 * 86400000);
    products = await Product.create(['Rau cải', 'Cà chua', 'Hết hạn', 'Hết hàng', 'Bản nháp', 'Không đủ bước bán'].map((name, index) => ({
        name, code: 'AI' + index, slug: 'ai-' + index, category_id: category.id,
        status: index === 4 ? 'DRAFT' : 'PUBLISHED', variants: [{ name: 'Bán theo kg', sku: 'AI-SKU' + index, unit: 'kg',
            step_quantity: index === 0 ? 0.5 : 1, list_price: 20000 + index * 10000,
            stocks: [{ batch_code: 'AI-LOT' + index, quantity: index === 3 ? 0 : index === 5 ? 0.2 : 20, expiry_date: index === 2 ? expired : expiry }] }]
    })));
    const staff = await User.create({ email: 'ai-staff@example.invalid', full_name: 'Nhân viên thử', password_hash: 'unused', role: 'STAFF', status: 'ACTIVE', permissions: ['SUPPORT_MANAGE', 'ORDER_MANAGE'] });
    staffToken = sign(staff);
    const port = 21000 + Math.floor(Math.random() * 1000);
    baseUrl = 'http://127.0.0.1:' + port + '/api';
    server = spawn(process.execPath, ['tests/aiServer.fixture.js'], { cwd: path.resolve(__dirname, '..'), stdio: 'pipe', env: {
        ...process.env, PORT: String(port), NODE_ENV: 'test', MONGODB_URL: uri, JWT_SECRET: secret,
        EMAIL_USER: 'test@example.invalid', EMAIL_PASS: 'fake', VNP_TMN_CODE: 'TEST', VNP_HASH_SECRET: 'fake',
        VNP_RETURN_URL: 'http://localhost:5173/vnpay-return', SHIPPING_FEE: '15000'
    } });
    server.stdout.on('data', (chunk) => { logs += chunk; }); server.stderr.on('data', (chunk) => { logs += chunk; });
    await waitFor(async () => { try { return (await fetch(baseUrl + '/staff/session', { headers: { Authorization: 'Bearer ' + staffToken } })).ok; } catch { return false; } });
}, { timeout: 120000 });

after(async () => {
    if (server) { server.kill(); await new Promise((resolve) => server.exitCode !== null ? resolve() : server.once('exit', resolve)); }
    await mongoose.disconnect(); await database?.stop();
});

test('AI chỉ chọn hàng công khai, còn hạn, đủ bước bán; giá thẻ lấy ưu đãi thật', async () => {
    const { user, token } = await customer();
    await Promotion.create({ code: 'AI-OFFER', name: 'Giảm rau', discount_type: 'PERCENT', discount_value: 10,
        promotion_scope: 'PRODUCT', requires_code: false, product_ids: [products[0]._id], valid_from: new Date(Date.now() - 86400000), valid_to: new Date(Date.now() + 86400000) });
    const room = await send(token, 'AI_RECOMMEND rau củ');
    await reply(room.id);
    const detail = await api(token, '/chat');
    const ai = detail.messages.at(-1);
    assert.equal(ai.sender_type, 'AI'); assert.equal(ai.recommendations.length, 2);
    assert.deepEqual(new Set(ai.recommendations.map((item) => item.product_id)), new Set(products.slice(0, 2).map((item) => item.id)));
    const first = ai.recommendations.find((item) => item.product_id === products[0].id);
    assert.equal(first.quantity, 0.5); assert.equal(first.price, 18000); assert.equal(first.available, true);
    assert.equal((await api(token, '/chat/summary')).unread_count, 1);
    await api(token, '/chat/' + room.id + '/read', 'POST', { through_id: ai.id });
    assert.equal((await api(token, '/chat/summary')).unread_count, 0);
    assert.equal((await User.findById(user.id)).cart_items.length, 0);
});

test('Ngoài phạm vi và ID sản phẩm bịa không được đưa vào câu trả lời/gợi ý', async () => {
    const { token } = await customer();
    const room = await send(token, 'AI_OFF_TOPIC');
    const offTopic = await reply(room.id);
    assert.match(offTopic.content, /chỉ hỗ trợ/); assert.equal(offTopic.recommendations.length, 0);
    const second = await send(token, 'AI_FAKE');
    await waitFor(async () => (await ChatMessage.countDocuments({ room_id: second.id, sender_type: 'AI' })) === 2);
    const fake = (await api(token, '/chat')).messages.at(-1);
    assert.equal(fake.recommendations.length, 0); assert.doesNotMatch(fake.content, /Sản phẩm bịa/);
});

test('Tồn thay đổi trong lúc AI soạn và sau khi gợi ý đều được kiểm tra lại', async () => {
    const { token } = await customer();
    const room = await send(token, 'AI_SLOW_STOCK');
    await waitFor(() => logs.includes('AI_TEST_CALL:AI_SLOW_STOCK'));
    await Product.updateOne({ _id: products[0]._id }, { $set: { 'variants.0.stocks.0.quantity': 0 } });
    const message = await reply(room.id);
    assert.ok(!message.recommendations.some((item) => item.product_id.equals(products[0]._id)));
    await Product.updateOne({ _id: products[1]._id }, { $set: { 'variants.0.stocks.0.quantity': 0 } });
    const detail = await api(token, '/chat');
    assert.equal(detail.messages.at(-1).recommendations[0].available, false);
    await Product.updateMany({ _id: { $in: products.slice(0, 2).map((item) => item._id) } }, { $set: { 'variants.0.stocks.0.quantity': 20 } });
});

test('Tin mới thay thế câu hỏi cũ khi AI đang nghĩ; không gợi ý số lượng sai bước bán', async () => {
    const { token } = await customer();
    const room = await send(token, 'AI_SLOW_OLD');
    await waitFor(() => logs.includes('AI_TEST_CALL:AI_SLOW_OLD'));
    const next = await send(token, 'AI_NEW');
    const latestId = next.messages.filter((message) => message.sender_type === 'CUSTOMER').at(-1).id;
    const ai = await reply(room.id);
    assert.equal(String(ai.reply_to), latestId);
    assert.equal(await ChatMessage.countDocuments({ room_id: room.id, sender_type: 'AI' }), 1);
    await send(token, 'AI_BAD_QUANTITY');
    await waitFor(async () => (await ChatMessage.countDocuments({ room_id: room.id, sender_type: 'AI' })) === 2);
    const invalid = (await api(token, '/chat')).messages.at(-1);
    assert.equal(invalid.recommendations.length, 0);
});

test('Tiếp nhận khi AI đang nghĩ không phát phản hồi cũ; khách gặp nhân viên thì AI dừng', async () => {
    const first = await customer();
    const room = await send(first.token, 'AI_SLOW_TAKEOVER');
    await waitFor(() => logs.includes('AI_TEST_CALL:AI_SLOW_TAKEOVER'));
    await api(staffToken, '/staff/support/' + room.id + '/claim', 'POST', {});
    await pause(1100);
    assert.equal(await ChatMessage.countDocuments({ room_id: room.id, sender_type: 'AI' }), 0);
    assert.equal((await ChatRoom.findById(room.id)).status, 'STAFF_ACTIVE');
    const second = await customer();
    const waiting = await send(second.token, 'Tôi muốn gặp nhân viên');
    await reply(waiting.id);
    assert.equal((await ChatRoom.findById(waiting.id)).waiting_for_staff, true);
    await send(second.token, 'Tôi cần trao đổi thêm'); await pause(300);
    assert.equal(await ChatMessage.countDocuments({ room_id: waiting.id, sender_type: 'AI' }), 1);
});

test('Lỗi Gemini không khóa chờ nhân viên; gửi lại không nhân đôi và câu mới vẫn tiếp tục được', async () => {
    const first = await customer(), clientId = randomUUID();
    const room = await send(first.token, 'AI_ERROR', clientId);
    await reply(room.id);
    await send(first.token, 'AI_ERROR', clientId);
    assert.equal((await ChatRoom.findById(room.id)).waiting_for_staff, false);
    assert.equal(await ChatMessage.countDocuments({ room_id: room.id, sender_type: 'AI' }), 1);
    await send(first.token, 'AI_NEW rau cho bữa tối');
    await waitFor(async () => (await ChatMessage.countDocuments({ room_id: room.id, sender_type: 'AI' })) === 2);
    const second = await customer();
    const pending = await ChatRoom.create({ customer_id: second.user.id, ai_pending: true });
    await ChatMessage.create({ room_id: pending.id, sender_type: 'CUSTOMER', sender_id: second.user.id, content: 'Khôi phục câu hỏi đang chờ' });
    await reply(pending.id);
    assert.equal(await ChatMessage.countDocuments({ room_id: pending.id, sender_type: 'AI' }), 1);
});

test('Đặt cả nhóm từ AI: kiểm tra kho, không sửa giỏ, một phí giao, vẫn chờ nhân viên duyệt', async () => {
    const { user, token } = await customer();
    const items = products.slice(0, 2).map((product) => ({ variant_id: String(product.variants[0]._id), quantity: product.variants[0].step_quantity }));
    const cartItem = { product_id: products[0]._id, variant_id: products[0].variants[0]._id, quantity: 1 };
    await User.updateOne({ _id: user.id }, { $push: { cart_items: cartItem } });
    const checkoutKey = randomUUID();
    const preview = await api(token, '/order/preview', 'POST', { cart_item_ids: [], buy_now: items, checkout_key: checkoutKey });
    assert.equal(preview.items.length, 2); assert.equal(preview.shipping_fee, 15000);
    const body = { cart_item_ids: [], buy_now: items, checkout_key: checkoutKey, expected_total: preview.total,
        address_id: user.addresses[0].id || String(user.addresses[0]._id), recipient_name: user.full_name,
        phone: '0900000001', email: user.email, payment_method: 'COD' };
    const checkout = await api(token, '/order/checkout', 'POST', body, 201);
    const order = await Order.findOne({ checkout_code: checkout.checkout_code });
    assert.equal(order.status, 'PENDING'); assert.equal(order.items.length, 2);
    assert.equal((await User.findById(user.id)).cart_items.length, 1);
    await api(token, '/order/checkout', 'POST', body, 201);
    assert.equal(await Order.countDocuments({ checkout_code: checkout.checkout_code }), 1);
    await api(token, '/order/preview', 'POST', { buy_now: [items[0], items[0]], checkout_key: randomUUID() }, 400);
    const second = await customer();
    const nextKey = randomUUID();
    const nextPreview = await api(second.token, '/order/preview', 'POST', { buy_now: items, checkout_key: nextKey });
    const stockBefore = (await Product.findById(products[0].id)).variants[0].stocks[0].quantity;
    await Product.updateOne({ _id: products[1].id }, { $set: { 'variants.0.stocks.0.quantity': 0 } });
    await api(second.token, '/order/checkout', 'POST', { ...body, checkout_key: nextKey, expected_total: nextPreview.total,
        address_id: String(second.user.addresses[0]._id), email: second.user.email }, 409);
    assert.equal((await Product.findById(products[0].id)).variants[0].stocks[0].quantity, stockBefore);
    assert.equal(await Order.countDocuments({ user_id: second.user.id }), 0);
    await Product.updateOne({ _id: products[0].id }, { $set: { 'variants.0.stocks.0.quantity': 0 } });
    await api(token, '/order/preview', 'POST', { buy_now: items, checkout_key: randomUUID() }, 409);
});

test('Giữ lời tư vấn gần gũi, ngữ cảnh sức khỏe/ngân sách và không handoff vì ngân sách thấp', async () => {
    await Product.updateMany({ _id: { $in: products.slice(0, 2).map(item => item._id) } }, { $set: { 'variants.0.stocks.0.quantity': 20 } });
    await Product.create({ code: 'AI-MEAT', name: 'Thịt heo thử', slug: 'ai-meat', category_id: products[0].category_id,
        status: 'PUBLISHED', variants: [{ sku: 'AI-MEAT-KG', name: 'Theo kg', unit: 'kg', step_quantity: 0.5, list_price: 120000,
            stocks: [{ batch_code: 'MEAT', quantity: 20, expiry_date: new Date(Date.now() + 10 * 86400000) }] }] });
    const { token } = await customer();
    const room = await send(token, 'AI_WARM rau và thịt cho người tiểu đường, 3 người dưới 50k');
    const first = await reply(room.id);
    assert.match(first.content, /Mình hiểu/);
    assert.match(first.content, /ngân sách/);
    assert.equal((await ChatRoom.findById(room.id)).waiting_for_staff, false);
    await send(token, 'AI_WARM mình tăng ngân sách lên 300k');
    await waitFor(async () => (await ChatMessage.countDocuments({ room_id: room.id, sender_type: 'AI' })) === 2);
    const result = (await api(token, '/chat')).messages.at(-1);
    assert.match(result.content, /tiểu đường/);
    assert.match(result.content, /hấp hoặc luộc/);
    assert.equal(result.recommendations.length, 2);
    assert.ok(result.recommendations.some(item => item.name.includes('Thịt')));
    assert.ok(result.recommendations.reduce((sum, item) => sum + item.line_total, 0) <= 300000);
    assert.equal((await ChatRoom.findById(room.id)).waiting_for_staff, false);
});

test('Gợi ý vượt ngân sách bị chặn sau một lần sửa, không giả vờ đủ tiền và không khóa chat', async () => {
    const { token } = await customer();
    const room = await send(token, 'AI_OVER_BUDGET rau cho 3 người ngân sách 1000đ');
    const result = await reply(room.id);
    assert.equal(result.recommendations.length, 0);
    assert.match(result.content, /ngân sách/);
    assert.doesNotMatch(result.content, /Bữa này vừa ngân sách/);
    assert.equal((await ChatRoom.findById(room.id)).waiting_for_staff, false);
});

test('Câu mua thực phẩm không bị model khóa chờ nhân viên; phòng cũ kẹt có thể tiếp tục', async () => {
    const first = await customer();
    const room = await send(first.token, 'AI_SHOP_HANDOFF tìm thịt cho 3 người dưới 300k');
    const message = await reply(room.id);
    assert.doesNotMatch(message.content, /đã chuyển/);
    assert.equal((await ChatRoom.findById(room.id)).waiting_for_staff, false);
    await ChatRoom.updateOne({ _id: room.id }, { $set: { waiting_for_staff: true, handoff_reason: null } });
    await send(first.token, 'AI_WARM tìm rau và thịt cho 3 người dưới 300k');
    await waitFor(async () => (await ChatMessage.countDocuments({ room_id: room.id, sender_type: 'AI' })) === 2);
    assert.equal((await ChatRoom.findById(room.id)).waiting_for_staff, false);
});

test('Khách tự tiếp tục với AI, không truy cập phòng người khác hoặc giành phòng đã có nhân viên', async () => {
    const first = await customer(), second = await customer();
    const room = await send(first.token, 'Tôi muốn gặp nhân viên');
    await reply(room.id);
    assert.equal((await ChatRoom.findById(room.id)).handoff_reason, 'CUSTOMER_REQUEST');
    await api(second.token, '/chat/' + room.id + '/resume-ai', 'POST', {}, 404);
    const resumed = await api(first.token, '/chat/' + room.id + '/resume-ai', 'POST', {});
    assert.equal(resumed.waiting_for_staff, false);
    await send(first.token, 'AI_WARM tìm rau cho bữa tối');
    await waitFor(async () => (await ChatMessage.countDocuments({ room_id: room.id, sender_type: 'AI' })) === 2);
    await api(staffToken, '/staff/support/' + room.id + '/claim', 'POST', {});
    await api(first.token, '/chat/' + room.id + '/resume-ai', 'POST', {}, 409);
    assert.equal((await ChatRoom.findById(room.id)).status, 'STAFF_ACTIVE');
});
