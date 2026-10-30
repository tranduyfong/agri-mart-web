const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { io } = require('socket.io-client');

// Luôn tạo DB tạm và SMTP giả, không đọc cấu hình Atlas hoặc gửi email thật.
process.env.JWT_SECRET = 'staff-integration-test-secret';
process.env.EMAIL_USER = 'test@example.invalid';
process.env.EMAIL_PASS = 'test-only';
process.env.VNP_TMN_CODE = 'TEST';
process.env.VNP_HASH_SECRET = 'test-only';
process.env.VNP_RETURN_URL = 'http://localhost:5173/vnpay-return';
process.env.SHIPPING_FEE = '15000';
const User = require('../src/models/user');
const Product = require('../src/models/product');
const Order = require('../src/models/order');
const GoodsReceipt = require('../src/models/goodsReceipt');
const Subscriber = require('../src/models/subscriber');
const Newsletter = require('../src/models/newsletter');
const ChatRoom = require('../src/models/chatRoom');
const ChatMessage = require('../src/models/chatMessage');
const ProductChange = require('../src/models/productChange');
const orderService = require('../src/services/order.services');
const { getToday } = require('../src/utils/date.util');
let database, server, staff, customer, token, customerToken, otherToken, limitedToken, adminToken;
let baseUrl,
    logs = '';
const uploadedPaths = [];
const cwd = path.resolve(__dirname, '..');
const headers = (accessToken) => ({ Authorization: 'Bearer ' + accessToken });
const api = async (url, method = 'GET', body, accessToken = token, expected = 200) => {
    const response = await fetch(baseUrl + url, {
        method,
        headers: { ...headers(accessToken), ...(body instanceof FormData ? {} : { 'Content-Type': 'application/json' }) },
        body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body)
    });
    const result = await response.json();
    assert.equal(response.status, expected, method + ' ' + url + ': ' + JSON.stringify(result));
    assert.ok(result.requestId);
    assert.ok(result.serverTime);
    return result;
};
const sign = (user) => jwt.sign({ userId: user._id.toString(), tokenVersion: 0 }, process.env.JWT_SECRET);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const connectOrders = async (accessToken) => {
    const socket = io(baseUrl.replace('/api', ''), { auth: { token: accessToken }, autoConnect: false, reconnection: false });
    await new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            socket.disconnect();
            reject(new Error('Socket connection timed out'));
        }, 5000);
        socket.once('connect', () => {
            clearTimeout(timer);
            resolve();
        });
        socket.once('connect_error', (error) => {
            clearTimeout(timer);
            socket.disconnect();
            reject(error);
        });
        socket.connect();
    });
    return socket;
};
const waitUntil = async (condition) => {
    const deadline = Date.now() + 5000;
    while (!condition() && Date.now() < deadline) await sleep(25);
    assert.ok(condition(), 'Expected realtime event within 5 seconds');
};

before(
    async () => {
        database = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
        process.env.MONGODB_URL = database.getUri('staff-test');
        await mongoose.connect(process.env.MONGODB_URL);
        const seed = spawn(process.execPath, ['seed.js'], { cwd, env: process.env, stdio: 'pipe' });
        let seedLog = '';
        seed.stdout.on('data', (chunk) => {
            seedLog += chunk;
        });
        seed.stderr.on('data', (chunk) => {
            seedLog += chunk;
        });
        const exit = await new Promise((resolve) => seed.on('exit', resolve));
        assert.equal(exit, 0, seedLog);
        staff = await User.findOne({ role: 'STAFF' });
        customer = await User.findOne({ role: 'CUSTOMER' });
        token = sign(staff);
        adminToken = sign(await User.findOne({ role: 'ADMIN' }));
        customerToken = sign(customer);
        const other = await User.create({
            email: 'other@example.invalid',
            password_hash: 'unused',
            full_name: 'Other staff',
            role: 'STAFF',
            status: 'ACTIVE',
            permissions: staff.permissions
        });
        otherToken = sign(other);
        const limited = await User.create({
            email: 'limited@example.invalid',
            password_hash: 'unused',
            full_name: 'Limited staff',
            role: 'STAFF',
            status: 'ACTIVE'
        });
        limitedToken = sign(limited);
        const port = 18000 + Math.floor(Math.random() * 1000);
        baseUrl = 'http://localhost:' + port + '/api';
        server = spawn(process.execPath, ['tests/staffServer.fixture.js'], {
            cwd,
            env: { ...process.env, PORT: String(port), NODE_ENV: 'test', PUBLIC_API_URL: baseUrl },
            stdio: 'pipe'
        });
        server.stdout.on('data', (chunk) => {
            logs += chunk;
        });
        server.stderr.on('data', (chunk) => {
            logs += chunk;
        });
        let ready = false;
        for (let count = 0; count < 600; count++) {
            if (server.exitCode !== null) break;
            try {
                const response = await fetch(baseUrl + '/staff/session', { headers: headers(token), signal: AbortSignal.timeout(1000) });
                if (response.ok) {
                    ready = true;
                    break;
                }
            } catch {
                /* Đợi server. */
            }
            await sleep(100);
        }
        assert.ok(ready, logs);
    },
    { timeout: 120000 }
);

after(async () => {
    if (server) {
        server.kill();
        await new Promise((resolve) => (server.exitCode !== null ? resolve() : server.on('exit', resolve)));
    }
    await mongoose.disconnect();
    if (database) await database.stop();
    for (const file of uploadedPaths) {
        const absolute = path.resolve(cwd, file);
        if (absolute.startsWith(path.join(cwd, 'uploads') + path.sep) && fs.existsSync(absolute)) fs.unlinkSync(absolute);
    }
});

test('API kiểm tra vai trò và quyền ngay trên server', async () => {
    const session = await api('/staff/session');
    assert.equal('branches' in session.data, false);
    assert.equal('branch_id' in session.data, false);
    await api('/staff/session', 'GET', undefined, customerToken, 403);
    await api('/staff/products', 'GET', undefined, limitedToken, 403);
    await api('/staff/orders/summary', 'GET', undefined, limitedToken, 403);
    const products = await api('/staff/products?keyword=DEMO-SP001-01');
    assert.ok(products.data.some((item) => item.code === 'DEMO-SP001'));
});

test('Danh mục, sản phẩm nháp và ảnh cần được admin duyệt trước khi áp dụng', async () => {
    const category = (await api('/staff/categories', 'POST', { name: 'QA category', slug: 'qa-category' })).data;
    await api('/staff/categories', 'POST', { name: 'Duplicate', slug: 'qa-category' }, token, 400);
    const values = {
        name: 'QA product',
        code: 'QA-PRODUCT',
        category_id: category.id,
        status: 'DRAFT',
        variants: [{ sku: 'QA-SKU', variant_name: 'Gói', unit: 'gói', list_price: 20000, step_quantity: 1 }]
    };
    const pending = (await api('/staff/products', 'POST', values, token, 202)).data;
    assert.equal(await Product.countDocuments({ code: values.code }), 0);
    await api('/admin/product-changes/' + pending.request_id + '/review', 'PATCH', { status: 'APPROVED', note: '' }, token, 403);
    const created = (
        await api('/admin/product-changes/' + pending.request_id + '/review', 'PATCH', { status: 'APPROVED', note: '' }, adminToken)
    ).data.result;
    await api('/staff/products/' + created.productId, 'PUT', { status: 'PUBLISHED' }, token, 400);
    const update = (
        await api(
            '/staff/products/' + created.productId,
            'PUT',
            { status: 'PUBLISHED', image_urls: ['https://example.invalid/product.png'] },
            token,
            202
        )
    ).data;
    assert.equal((await Product.findById(created.productId)).status, 'DRAFT');
    await api('/admin/product-changes/' + update.request_id + '/review', 'PATCH', { status: 'APPROVED', note: '' }, adminToken);
    const detail = (await api('/staff/products/' + created.productId)).data;
    assert.equal(detail.status, 'PUBLISHED');
    const file = new FormData();
    file.set('title', 'Bad upload');
    file.set('type', 'HOME_CAROUSEL');
    file.set('images', new Blob(['html'], { type: 'image/png' }), 'bad.html');
    await api('/staff/banners', 'POST', file, token, 400);
});

test('Nhập kho kiểm tra từng dòng, giao dịch và khóa chống nhập trùng', async () => {
    const product = await Product.findOne({ code: 'DEMO-SP001' });
    const variant = product.variants[0];
    const rows = [
        {
            sku: variant.sku,
            unit: 'Đơn vị từ file không được ghi đè SKU hiện có',
            quantity: 2.5,
            unit_cost: 10000,
            batch_code: 'QA-LOT',
            expiry_date: '2099-12-31'
        }
    ];
    const bad = (await api('/staff/imports/preview', 'POST', { rows: [{ ...rows[0], expiry_date: '2020-01-01' }] })).data;
    assert.equal(bad.error_rows, 1);
    assert.ok(bad.rows[0].errors.length >= 1);
    await api(
        '/staff/imports',
        'POST',
        { rows: [{ ...rows[0], quantity: -1 }], import_key: 'qa-invalid-import-key', source_file: 'test.csv' },
        token,
        400
    );
    const category = (await api('/staff/lookups')).data.categories[0];
    rows.push({
        sku: 'QA-IMPORT-NEW',
        code: 'QA-IMPORT',
        name: 'QA imported product',
        variant_name: 'Bó',
        unit: 'bó',
        category_slug: category.slug,
        list_price: 15000,
        step_quantity: 1,
        quantity: 3,
        unit_cost: 8000,
        batch_code: 'QA-NEW',
        expiry_date: '2099-12-31'
    });
    assert.equal((await api('/staff/imports/preview', 'POST', { rows })).data.error_rows, 0);
    const body = { rows, import_key: 'qa-success-import-key', source_file: 'test.csv' };
    const firstRequest = (await api('/staff/imports', 'POST', body, token, 202)).data;
    const second = (await api('/staff/imports', 'POST', body, token, 202)).data;
    assert.equal(firstRequest.request_id, second.request_id);
    const proposal = (await api('/admin/product-changes/' + firstRequest.request_id, 'GET', undefined, adminToken)).data;
    assert.equal(proposal.rows[0].unit, variant.unit);
    assert.equal(proposal.rows[0].name, product.name);
    assert.equal(proposal.rows[0].row_number, 1);
    assert.equal(await GoodsReceipt.countDocuments({ import_key: body.import_key }), 0);
    assert.equal(await Product.countDocuments({ code: 'QA-IMPORT' }), 0);
    const approved = (
        await api('/admin/product-changes/' + firstRequest.request_id + '/review', 'PATCH', { status: 'APPROVED', note: '' }, adminToken)
    ).data;
    const first = (await api('/staff/imports/' + approved.result.receipt_id)).data;
    await api('/admin/product-changes/' + firstRequest.request_id + '/review', 'PATCH', { status: 'APPROVED', note: '' }, adminToken, 409);
    assert.equal(await GoodsReceipt.countDocuments({ import_key: body.import_key }), 1);
    const saved = await Product.findById(product._id);
    assert.equal(saved.variants[0].stocks.find((stock) => stock.batch_code === 'QA-LOT').quantity, 2.5);
    assert.equal((await Product.findOne({ code: 'QA-IMPORT' })).status, 'DRAFT');
    assert.equal(first.draft_products.length, 1);
    const inventory = (await api('/staff/inventory?keyword=QA-LOT')).data;
    assert.equal(inventory[0].available_quantity, 2.5);
});

const makeOrder = async (code, payment = 'COD', checkoutCode = null) => {
    const product = await Product.findOne({ code: 'DEMO-SP001' });
    const variant = product.variants[0];
    const lot = variant.stocks.find((item) => item.quantity >= 1 && item.expiry_date >= new Date(getToday()));
    lot.quantity -= 1;
    await product.save();
    return Order.create({
        code,
        checkout_code: checkoutCode,
        user_id: customer._id,
        status: payment === 'COD' ? 'CONFIRMED' : 'PENDING',
        payment_method: payment,
        payment_status: 'UNPAID',
        shipping_address: customer.addresses[0].toObject(),
        total_amount: 120000,
        final_amount: 135000,
        shipping_fee: 15000,
        items: [
            {
                product_id: product._id,
                variant_id: variant._id,
                variant_sku: variant.sku,
                name: product.name,
                quantity: 1,
                price: 120000,
                stock_allocations: [
                    { batch_code: lot.batch_code, quantity: 1, expiry_date: lot.expiry_date, manufactured_date: lot.manufactured_date }
                ]
            }
        ]
    });
};

test('Đơn hàng chuyển đúng bước, COD thu tiền khi hoàn tất và hủy chỉ hoàn kho một lần', async () => {
    const order = await makeOrder('QA-COD');
    await api(
        '/staff/orders/' + order.id + '/status',
        'PATCH',
        { expected_status: 'CONFIRMED', status: 'COMPLETED', note: '' },
        token,
        409
    );
    await api('/staff/orders/' + order.id + '/status', 'PATCH', { expected_status: 'CONFIRMED', status: 'SHIPPING', note: 'Bàn giao' });
    const completed = (
        await api('/staff/orders/' + order.id + '/status', 'PATCH', {
            expected_status: 'SHIPPING',
            status: 'COMPLETED',
            note: 'Đã thu tiền'
        })
    ).data;
    assert.equal(completed.payment_status, 'PAID');
    assert.equal(completed.status_history.length, 2);
    const cancelled = await makeOrder('QA-CANCEL');
    const product = await Product.findOne({ code: 'DEMO-SP001' });
    const beforeQuantity = product.variants[0].stocks.reduce((sum, lot) => sum + lot.quantity, 0);
    await api('/staff/orders/' + cancelled.id + '/status', 'PATCH', {
        expected_status: 'CONFIRMED',
        status: 'CANCELLED',
        note: 'Khách yêu cầu'
    });
    await api(
        '/staff/orders/' + cancelled.id + '/status',
        'PATCH',
        { expected_status: 'CONFIRMED', status: 'CANCELLED', note: '' },
        token,
        409
    );
    const afterProduct = await Product.findById(product._id);
    assert.equal(
        afterProduct.variants[0].stocks.reduce((sum, lot) => sum + lot.quantity, 0),
        beforeQuantity + 1
    );
});

test('VNPay callback không mở lại đơn đã hủy, không tự duyệt đơn hoặc hoàn kho hai lần', async () => {
    const checkoutCode = 'QA-VNP-GROUP';
    const first = await makeOrder('QA-VNP1', 'VNPAY', checkoutCode);
    const second = await makeOrder('QA-VNP2', 'VNPAY', checkoutCode);
    await api('/staff/orders/' + first.id + '/status', 'PATCH', {
        expected_status: 'PENDING',
        status: 'CANCELLED',
        note: 'Hủy trước callback'
    });
    const quantity = (await Product.findOne({ code: 'DEMO-SP001' })).variants[0].stocks.reduce((sum, lot) => sum + lot.quantity, 0);
    await orderService.updatePayment({
        vnp_TxnRef: checkoutCode,
        vnp_Amount: 270000,
        vnp_ResponseCode: '00',
        vnp_TransactionStatus: '00',
        vnp_TransactionNo: 'QA-TXN'
    });
    assert.equal((await Order.findById(first._id)).status, 'CANCELLED');
    assert.equal((await Order.findById(first._id)).payment_status, 'PAID');
    assert.equal((await Order.findById(second._id)).status, 'PENDING');
    assert.equal(
        (await Product.findOne({ code: 'DEMO-SP001' })).variants[0].stocks.reduce((sum, lot) => sum + lot.quantity, 0),
        quantity
    );
    const third = await makeOrder('QA-VNP3', 'VNPAY', 'QA-VNP-FAIL');
    await makeOrder('QA-VNP4', 'VNPAY', 'QA-VNP-FAIL');
    await api('/staff/orders/' + third.id + '/status', 'PATCH', { expected_status: 'PENDING', status: 'CANCELLED', note: '' });
    const beforeFail = (await Product.findOne({ code: 'DEMO-SP001' })).variants[0].stocks.reduce((sum, lot) => sum + lot.quantity, 0);
    await orderService.updatePayment({
        vnp_TxnRef: 'QA-VNP-FAIL',
        vnp_Amount: 270000,
        vnp_ResponseCode: '24',
        vnp_TransactionStatus: '02'
    });
    await orderService.updatePayment({
        vnp_TxnRef: 'QA-VNP-FAIL',
        vnp_Amount: 270000,
        vnp_ResponseCode: '24',
        vnp_TransactionStatus: '02'
    });
    assert.equal(
        (await Product.findOne({ code: 'DEMO-SP001' })).variants[0].stocks.reduce((sum, lot) => sum + lot.quantity, 0),
        beforeFail + 1
    );
});

test('Đơn COD cũ có nhiều kiện chỉ thu các kiện còn lại sau khi hủy một phần', async () => {
    const first = await makeOrder('QA-COD-GROUP1', 'COD', 'QA-COD-GROUP');
    const second = await makeOrder('QA-COD-GROUP2', 'COD', 'QA-COD-GROUP');
    await api('/staff/orders/' + first.id + '/status', 'PATCH', { expected_status: 'CONFIRMED', status: 'CANCELLED', note: '' });
    const adminToken = sign(await User.findOne({ role: 'ADMIN' }));
    const url = '/staff/orders/' + second.id + '/status';
    await api(url, 'PATCH', { expected_status: 'CONFIRMED', status: 'SHIPPING', note: '' }, adminToken);
    await api(url, 'PATCH', { expected_status: 'SHIPPING', status: 'COMPLETED', note: '' }, adminToken);
    const summary = (await api('/order/QA-COD-GROUP', 'GET', undefined, customerToken)).data;
    assert.equal(summary.total, 270000);
    assert.equal(summary.cancelled_amount, 135000);
    assert.equal(summary.amount_due, 135000);
    assert.equal(summary.payment_status, 'PAID');
});

test('Khuyến mãi và banner xuất hiện theo thời gian, mã giảm phí giao sử dụng model hiện có', async () => {
    const product = await Product.findOne({ code: 'DEMO-SP002' });
    const promo = {
        code: 'QA-SALE',
        name: 'QA sale',
        promotion_scope: 'PRODUCT',
        discount_type: 'PERCENT',
        discount_value: 30,
        min_order_value: 0,
        requires_code: false,
        valid_from: '2020-01-01',
        valid_to: '2099-12-31',
        product_ids: [product.id]
    };
    const saved = (await api('/staff/promotions', 'POST', promo)).data;
    assert.equal((await api('/product?keyword=DEMO-SP002')).data[0].discount_percent, 30);
    await api('/staff/promotions/' + saved.id + '/end', 'PATCH', {});
    assert.notEqual((await api('/product?keyword=DEMO-SP002')).data[0].discount_percent, 30);
    await api('/staff/promotions', 'POST', {
        ...promo,
        code: 'QA-SHIP',
        promotion_scope: 'SHIPPING',
        discount_type: 'AMOUNT',
        discount_value: 10000,
        product_ids: []
    });
    assert.ok((await api('/staff/promotions?scope=SHIPPING')).data.some((item) => item.code === 'QA-SHIP'));
    const banner = {
        title: 'QA public banner',
        type: 'HOME_CAROUSEL',
        image_url: 'https://example.invalid/banner.png',
        link_url: '/shop',
        is_active: true
    };
    await api('/staff/banners', 'POST', banner);
    await api('/staff/banners', 'POST', { ...banner, title: 'QA future banner', starts_at: '2099-01-01' });
    const visible = (await api('/banners')).data;
    assert.ok(visible.some((item) => item.title === banner.title));
    assert.ok(!visible.some((item) => item.title === 'QA future banner'));
});

test('Bản tin lưu nháp, gửi bằng SMTP giả, khóa gửi lặp và hủy đăng ký', async () => {
    await api('/newsletter/subscribe', 'POST', { email: 'subscriber@example.invalid' });
    const saved = (await api('/staff/newsletters', 'POST', { subject: 'QA newsletter', content: '**Hello** <script>alert(1)</script>' }))
        .data;
    await api('/staff/newsletters/' + saved.id + '/send', 'POST', {}, token, 202);
    await api('/staff/newsletters/' + saved.id + '/send', 'POST', {}, token, 409);
    for (let count = 0; count < 60 && (await Newsletter.findById(saved.id)).status === 'SENDING'; count++) await sleep(50);
    const sent = (await api('/staff/newsletters/' + saved.id)).data;
    assert.equal(sent.status, 'SENT');
    assert.equal(sent.recipients[0].status, 'SENT');
    await api('/staff/newsletters/' + saved.id, 'PUT', { subject: 'Edit', content: 'Edit' }, token, 409);
    const subscriber = await Subscriber.findOne({ email: 'subscriber@example.invalid' }).select('+unsubscribe_token');
    const url = baseUrl + '/newsletter/unsubscribe/' + subscriber.unsubscribe_token;
    await fetch(url);
    assert.equal((await Subscriber.findById(subscriber._id)).is_active, true);
    await fetch(url, { method: 'POST' });
    assert.equal((await Subscriber.findById(subscriber._id)).is_active, false);
});

test('Hội thoại chỉ nhân viên tiếp nhận được trả lời, tin nhắn và kết thúc được lưu', async () => {
    const room = await ChatRoom.findOne({ customer_id: customer._id });
    await api('/staff/support/' + room.id + '/messages', 'POST', { content: 'Before claim' }, token, 409);
    await api('/staff/support/' + room.id + '/claim', 'POST', {});
    await api('/staff/support/' + room.id + '/claim', 'POST', {}, otherToken, 409);
    await api('/staff/support/' + room.id + '/messages', 'POST', { content: 'Xin chào khách hàng' });
    assert.ok(await ChatMessage.exists({ room_id: room._id, sender_type: 'STAFF', content: 'Xin chào khách hàng' }));
    await api('/staff/support/' + room.id + '/close', 'POST', {});
    await api('/staff/support/' + room.id + '/messages', 'POST', { content: 'After close' }, token, 409);
});

test('Tồn ban đầu lưu cùng phiếu nhập, giá nhập và hạn dùng; dữ liệu sai không tạo sản phẩm dở dang', async () => {
    const category = (await api('/staff/lookups')).data.categories[0];
    const values = {
        name: 'QA initial stock',
        code: 'QA-INITIAL',
        category_id: category.id,
        status: 'PUBLISHED',
        image_urls: ['https://example.invalid/product.png'],
        variants: [
            {
                sku: 'QA-INITIAL-KG',
                variant_name: 'Kg',
                unit: 'kg',
                step_quantity: 0.5,
                list_price: 30000,
                initial_stock: { quantity: 12.5, unit_cost: 20000, batch_code: 'FIRST', expiry_date: '2099-12-31' }
            }
        ]
    };
    const pending = (await api('/staff/products', 'POST', values, token, 202)).data;
    assert.equal(await Product.countDocuments({ code: values.code }), 0);
    const result = (
        await api('/admin/product-changes/' + pending.request_id + '/review', 'PATCH', { status: 'APPROVED', note: '' }, adminToken)
    ).data.result;
    const product = await Product.findById(result.productId);
    assert.equal(product.variants[0].stocks[0].quantity, 12.5);
    const receipt = await GoodsReceipt.findOne({ 'items.product_id': product._id });
    assert.equal(receipt.total_amount, 250000);
    assert.equal(receipt.items[0].unit_cost, 20000);
    const privateDetail = (await api('/staff/products/' + result.productId)).data;
    assert.equal(privateDetail.variants[0].stock_lots[0].unit_cost, 20000);
    const publicDetail = (await api('/product/' + product.slug)).data;
    assert.ok(!('stock_lots' in publicDetail.variants[0]));
    assert.equal(receipt.items[0].expiry_date.toISOString().slice(0, 10), '2099-12-31');
    await api(
        '/staff/products',
        'POST',
        {
            ...values,
            code: 'QA-INVALID-INITIAL',
            variants: [
                {
                    ...values.variants[0],
                    sku: 'QA-INVALID-INITIAL-KG',
                    initial_stock: { ...values.variants[0].initial_stock, expiry_date: '2020-01-01' }
                }
            ]
        },
        token,
        400
    );
    assert.equal(await Product.countDocuments({ code: 'QA-INVALID-INITIAL' }), 0);
    const restricted = await User.create({
        email: 'product-only@example.invalid',
        full_name: 'Product only',
        password_hash: 'unused',
        role: 'STAFF',
        status: 'ACTIVE',
        permissions: ['PRODUCT_MANAGE']
    });
    await api(
        '/staff/products',
        'POST',
        { ...values, code: 'QA-NO-INVENTORY', variants: [{ ...values.variants[0], sku: 'QA-NO-INVENTORY' }] },
        sign(restricted),
        403
    );
    assert.equal(await Product.countDocuments({ code: 'QA-NO-INVENTORY' }), 0);
});

test('Ảnh danh mục và khuyến mãi upload được, xuất hiện ở API khách, giữ hoặc bỏ ảnh khi sửa', async () => {
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aM6kAAAAASUVORK5CYII=', 'base64');
    const categoryForm = new FormData();
    categoryForm.set('name', 'QA image category');
    categoryForm.set('slug', 'qa-image-category');
    categoryForm.set('images', new Blob([png], { type: 'image/png' }), 'category.png');
    const category = (await api('/staff/categories', 'POST', categoryForm)).data;
    uploadedPaths.push(category.image_url);
    assert.ok(category.image_url.startsWith('uploads/'));
    assert.equal((await api('/category?keyword=QA image category')).data[0].image_url, category.image_url);
    const changed = (await api('/staff/categories/' + category.id, 'PUT', { name: 'QA image category edited', slug: category.slug })).data;
    assert.equal(changed.image_url, category.image_url);
    await api(
        '/staff/categories/' + category.id,
        'PUT',
        { name: changed.name, slug: changed.slug, image_url: 'javascript:alert(1)' },
        token,
        400
    );
    const promo = new FormData();
    for (const [key, value] of Object.entries({
        code: 'QA-IMAGE-PROMO',
        name: 'QA image promo',
        promotion_scope: 'SHIPPING',
        discount_type: 'AMOUNT',
        discount_value: 10000,
        min_order_value: 0,
        requires_code: true,
        product_ids: '[]',
        valid_from: '2020-01-01',
        valid_to: '2099-12-31'
    }))
        promo.set(key, String(value));
    promo.set('images', new Blob([png], { type: 'image/png' }), 'promotion.png');
    const saved = (await api('/staff/promotions', 'POST', promo)).data;
    const detail = (await api('/staff/promotions/' + saved.id)).data;
    uploadedPaths.push(detail.image_url);
    assert.equal((await api('/promotion/active?keyword=QA-IMAGE-PROMO')).data[0].image_url, detail.image_url);
    await api('/staff/promotions/' + saved.id, 'PUT', { ...detail, remove_image: true });
    assert.equal((await api('/staff/promotions/' + saved.id)).data.image_url, null);
});

test('COD/VNPay phải được nhân viên duyệt; tạo và duyệt đơn phát sự kiện sau commit, gửi lại không báo trùng', async (t) => {
    const socket = await connectOrders(token);
    t.after(() => socket.disconnect());
    let events = 0;
    socket.on('orders:changed', (...args) => {
        assert.equal(args.length, 0);
        events++;
    });
    const owner = await User.findById(customer.id);
    const ids = owner.cart_items.map((item) => String(item._id));
    const key = 'qa-approval-vnpay-key';
    const preview = (await api('/order/preview', 'POST', { cart_item_ids: ids, checkout_key: key }, customerToken)).data;
    const payload = {
        cart_item_ids: ids,
        checkout_key: key,
        address_id: String(owner.addresses[0]._id),
        recipient_name: owner.full_name,
        phone: owner.addresses[0].phone,
        email: owner.email,
        payment_method: 'VNPAY',
        expected_total: preview.total
    };
    const created = (await api('/order/checkout', 'POST', payload, customerToken, 201)).data;
    await waitUntil(() => events === 1);
    assert.equal(created.redirectUrl, null);
    assert.equal(await Order.countDocuments({ checkout_code: created.checkout_code }), 1);
    const order = await Order.findOne({ checkout_code: created.checkout_code });
    assert.equal(order.items.length, ids.length);
    assert.equal(order.status, 'PENDING');
    assert.equal(order.payment_expires_at, null);
    const pending = (await api('/staff/orders?status=PENDING')).data;
    assert.ok(pending.some((entry) => entry.id === order.id));
    await api('/order/' + created.checkout_code + '/payment-url', 'POST', {}, customerToken, 409);
    const unchanged = (await api('/order/' + created.checkout_code + '/check-payment', 'POST', {}, customerToken)).data;
    assert.equal(unchanged.status, 'PENDING');
    assert.equal((await api('/order/checkout', 'POST', payload, customerToken, 201)).data.checkout_code, created.checkout_code);
    await sleep(200);
    assert.equal(events, 1);
    assert.equal(staff.role, 'STAFF');
    const approval = { expected_status: 'PENDING', status: 'CONFIRMED', note: 'Đã gọi khách' };
    await api('/staff/orders/' + order.id + '/status', 'PATCH', approval, customerToken, 403);
    await api('/staff/orders/' + order.id + '/status', 'PATCH', approval, limitedToken, 403);
    await api('/staff/orders/' + order.id + '/status', 'PATCH', { expected_status: 'PENDING', status: 'CONFIRMED', note: 'Đã gọi khách' });
    await waitUntil(() => events === 2);
    const confirmed = await Order.findById(order._id);
    assert.ok(confirmed.confirmed_at);
    assert.equal(confirmed.payment_expires_at - confirmed.payment_ready_at, 15 * 60 * 1000);
    const link = (await api('/order/' + created.checkout_code + '/payment-url', 'POST', {}, customerToken)).data.redirectUrl;
    assert.ok(link.includes('vnp_TxnRef=' + created.checkout_code));
    await api('/staff/orders/' + order.id + '/status', 'PATCH', { expected_status: 'CONFIRMED', status: 'SHIPPING', note: '' }, token, 409);
    await orderService.updatePayment({
        vnp_TxnRef: created.checkout_code,
        vnp_Amount: preview.total,
        vnp_ResponseCode: '00',
        vnp_TransactionStatus: '00'
    });
    await api('/staff/orders/' + order.id + '/status', 'PATCH', { expected_status: 'CONFIRMED', status: 'SHIPPING', note: '' });
    await orderService.updatePayment({
        vnp_TxnRef: created.checkout_code,
        vnp_Amount: preview.total,
        vnp_ResponseCode: '00',
        vnp_TransactionStatus: '00'
    });
    assert.equal((await Order.findById(order._id)).status, 'SHIPPING');
});

test('Schema và API chỉ dùng một cửa hàng, không tạo model hay collection cơ sở', async () => {
    assert.equal(mongoose.modelNames().includes('Branch'), false);
    assert.equal(Product.schema.path('variants.stocks.branch_id'), undefined);
    assert.equal(Order.schema.path('branch_id'), undefined);
    assert.equal(User.schema.path('assigned_branches'), undefined);
    assert.equal(await mongoose.connection.db.listCollections({ name: 'branches' }).hasNext(), false);
    const summary = (await api('/staff/orders/summary')).data;
    assert.equal((await api('/staff/dashboard')).data.pending, summary.pending_count);
});

test('Realtime từ chối khách, nhân viên thiếu quyền và token sai; thu hồi quyền ngắt kết nối đang mở', async (t) => {
    for (const invalid of [customerToken, limitedToken, 'invalid']) {
        await assert.rejects(connectOrders(invalid), /FORBIDDEN/);
    }
    const watcher = await User.create({
        email: 'watcher@example.invalid',
        full_name: 'Watcher',
        password_hash: 'unused',
        role: 'STAFF',
        status: 'ACTIVE',
        permissions: ['ORDER_MANAGE']
    });
    const socket = await connectOrders(sign(watcher));
    t.after(() => socket.disconnect());
    let received = false;
    socket.on('orders:changed', () => {
        received = true;
    });
    await User.updateOne({ _id: watcher._id }, { $set: { permissions: [] } });
    const order = await makeOrder('QA-REVOKE-NOTIFY');
    await api('/staff/orders/' + order.id + '/status', 'PATCH', { expected_status: 'CONFIRMED', status: 'SHIPPING', note: '' });
    await waitUntil(() => !socket.connected);
    assert.equal(received, false);
    await assert.rejects(connectOrders(sign(watcher)), /FORBIDDEN/);
});

test('Mua ngay thanh toán đúng số lượng, không thay đổi giỏ, vẫn cần duyệt đơn và chống đặt lặp', async () => {
    const product = await Product.findOne({ code: 'DEMO-SP001' });
    const variant = product.variants[0];
    const originalCart = (await User.findById(customer._id)).cart_items.toObject();
    const buy_now = { variant_id: variant._id.toString(), quantity: variant.step_quantity };
    const checkout_key = 'qa-direct-purchase-key';
    await api('/order/preview', 'POST', { buy_now: { ...buy_now, quantity: 0 }, checkout_key }, customerToken, 400);
    await api('/order/preview', 'POST', { buy_now: { ...buy_now, quantity: variant.step_quantity / 2 }, checkout_key }, customerToken, 409);
    await api(
        '/order/preview',
        'POST',
        { buy_now, cart_item_ids: [new mongoose.Types.ObjectId().toString()], checkout_key },
        customerToken,
        400
    );
    const preview = (await api('/order/preview', 'POST', { buy_now, checkout_key }, customerToken)).data;
    assert.equal(preview.items.length, 1);
    assert.equal(preview.items[0].quantity, buy_now.quantity);
    assert.equal(preview.items[0].variant_id, buy_now.variant_id);
    assert.deepEqual((await User.findById(customer._id)).cart_items.toObject(), originalCart);
    const body = {
        buy_now,
        checkout_key,
        address_id: customer.addresses[0]._id.toString(),
        recipient_name: 'Mua trực tiếp',
        phone: '0900000001',
        email: customer.email,
        payment_method: 'VNPAY',
        expected_total: preview.total
    };
    const created = (await api('/order/checkout', 'POST', body, customerToken, 201)).data;
    const duplicate = (await api('/order/checkout', 'POST', body, customerToken, 201)).data;
    assert.equal(duplicate.checkout_code, created.checkout_code);
    assert.equal(await Order.countDocuments({ checkout_key }), 1);
    const order = await Order.findOne({ checkout_key });
    assert.equal(order.purchase_mode, 'BUY_NOW');
    assert.equal(order.items[0].quantity, buy_now.quantity);
    await api('/order/' + created.checkout_code + '/payment-url', 'POST', {}, customerToken, 409);
    await api('/staff/orders/' + order.id + '/status', 'PATCH', { expected_status: 'PENDING', status: 'CONFIRMED', note: '' });
    await api('/order/' + created.checkout_code + '/payment-url', 'POST', {}, customerToken);
    await orderService.updatePayment({
        vnp_TxnRef: created.checkout_code,
        vnp_Amount: preview.total,
        vnp_ResponseCode: '24',
        vnp_TransactionStatus: '02'
    });
    assert.equal((await Order.findById(order._id)).status, 'CANCELLED');
    assert.deepEqual((await User.findById(customer._id)).cart_items.toObject(), originalCart);
});

test('Sửa sản phẩm qua API cũ cũng chờ duyệt; người khác không xem được; từ chối giữ nguyên dữ liệu', async () => {
    const product = await Product.findOne({ code: 'DEMO-SP002' });
    const pending = (await api('/product/' + product.id, 'PUT', { name: 'Tên chưa được duyệt', status: 'ARCHIVED' }, token, 202)).data;
    assert.equal((await Product.findById(product._id)).name, product.name);
    assert.equal((await api('/product/' + product.slug)).data.name, product.name);
    await api('/staff/product-changes/' + pending.request_id, 'GET', undefined, otherToken, 404);
    await api('/admin/product-changes', 'GET', undefined, customerToken, 403);
    await api('/staff/products/' + product.id, 'PUT', { name: 'Thay đổi thứ hai' }, token, 409);
    const list = await api('/admin/product-changes?status=PENDING', 'GET', undefined, adminToken);
    assert.ok(list.data.some((change) => change._id === pending.request_id));
    const detail = (await api('/admin/product-changes/' + pending.request_id, 'GET', undefined, adminToken)).data;
    assert.equal(detail.before.name, product.name);
    assert.equal(detail.after.name, 'Tên chưa được duyệt');
    assert.equal('data' in detail, false);
    await api('/admin/product-changes/' + pending.request_id + '/review', 'PATCH', { status: 'REJECTED', note: '' }, adminToken, 400);
    await api(
        '/admin/product-changes/' + pending.request_id + '/review',
        'PATCH',
        { status: 'REJECTED', note: 'Tên sản phẩm chưa phù hợp' },
        adminToken
    );
    assert.equal((await Product.findById(product._id)).status, product.status);
    const rejected = (await api('/staff/product-changes/' + pending.request_id)).data;
    assert.equal(rejected.review_note, 'Tên sản phẩm chưa phù hợp');
    assert.equal(rejected.status, 'REJECTED');
});

test('Duyệt đồng thời chỉ áp dụng một lần; chặn nội dung cũ và quyền người gửi đã bị thu hồi', async () => {
    const product = await Product.findOne({ code: 'DEMO-SP003' });
    const pending = (await api('/staff/products/' + product.id, 'PUT', { description: 'Nội dung đã duyệt' }, token, 202)).data;
    const lot = product.variants[0].stocks.find((entry) => entry.quantity > 1);
    lot.quantity -= 1;
    await product.save();
    const responses = await Promise.all(
        [1, 2].map(() =>
            fetch(baseUrl + '/admin/product-changes/' + pending.request_id + '/review', {
                method: 'PATCH',
                headers: { ...headers(adminToken), 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'APPROVED', note: '' })
            })
        )
    );
    assert.deepEqual(responses.map((response) => response.status).sort(), [200, 409]);
    assert.equal((await Product.findById(product._id)).description, 'Nội dung đã duyệt');
    assert.equal(
        (await Product.findById(product._id)).variants[0].stocks.find((entry) => entry.batch_code === lot.batch_code).quantity,
        lot.quantity
    );
    const stale = (await api('/staff/products/' + product.id, 'PUT', { description: 'Bản cũ' }, token, 202)).data;
    await Product.updateOne({ _id: product._id }, { name: 'Admin vừa chỉnh tên' });
    await api('/admin/product-changes/' + stale.request_id + '/review', 'PATCH', { status: 'APPROVED', note: '' }, adminToken, 409);
    assert.equal((await ProductChange.findById(stale.request_id)).status, 'PENDING');
    await api(
        '/admin/product-changes/' + stale.request_id + '/review',
        'PATCH',
        { status: 'REJECTED', note: 'Gửi lại nội dung mới' },
        adminToken
    );
    const requester = await User.create({
        email: 'review-revoked@example.invalid',
        full_name: 'Revoked',
        password_hash: 'unused',
        status: 'ACTIVE',
        role: 'STAFF',
        permissions: ['PRODUCT_MANAGE']
    });
    const revoked = (
        await api(
            '/product',
            'POST',
            { name: 'Không được áp dụng', code: 'QA-REVOKED', category_id: product.category_id.toString(), status: 'DRAFT', variants: [] },
            sign(requester),
            202
        )
    ).data;
    await User.updateOne({ _id: requester._id }, { permissions: [] });
    await api('/admin/product-changes/' + revoked.request_id + '/review', 'PATCH', { status: 'APPROVED', note: '' }, adminToken, 409);
    assert.equal(await Product.countDocuments({ code: 'QA-REVOKED' }), 0);
});

test('Phiếu nhập qua API cũ cũng chờ duyệt; lỗi khi áp dụng hủy toàn bộ cập nhật và giữ yêu cầu chờ xử lý', async () => {
    const product = await Product.findOne({ code: 'DEMO-SP001' });
    const variant = product.variants[0];
    const pending = (
        await api(
            '/product/import',
            'POST',
            {
                items: [
                    { sku: variant.sku, quantity: 2, unit_cost: 10000, batch_code: 'QA-ATOMIC-FIRST', expiry_date: '2099-12-31' },
                    { sku: variant.sku, quantity: 2, unit_cost: 12000, batch_code: 'QA-ATOMIC-CONFLICT', expiry_date: '2099-12-31' }
                ]
            },
            token,
            202
        )
    ).data;
    assert.ok(!(await Product.findById(product._id)).variants[0].stocks.some((lot) => lot.batch_code === 'QA-ATOMIC-FIRST'));
    product.variants[0].stocks.push({ batch_code: 'QA-ATOMIC-CONFLICT', quantity: 5, expiry_date: new Date('2098-01-01') });
    await product.save();
    const receiptsBefore = await GoodsReceipt.countDocuments();
    await api('/admin/product-changes/' + pending.request_id + '/review', 'PATCH', { status: 'APPROVED', note: '' }, adminToken, 400);
    const unchanged = await Product.findById(product._id);
    assert.ok(!unchanged.variants[0].stocks.some((lot) => lot.batch_code === 'QA-ATOMIC-FIRST'));
    assert.equal(unchanged.variants[0].stocks.find((lot) => lot.batch_code === 'QA-ATOMIC-CONFLICT').quantity, 5);
    assert.equal(await GoodsReceipt.countDocuments(), receiptsBefore);
    assert.equal((await ProductChange.findById(pending.request_id)).status, 'PENDING');
    await api(
        '/admin/product-changes/' + pending.request_id + '/review',
        'PATCH',
        { status: 'REJECTED', note: 'Ngày lô đã thay đổi' },
        adminToken
    );
});
