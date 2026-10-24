const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
// Mọi kết nối, merchant và email đều dùng dữ liệu thử; không đọc URI Atlas thật.
process.env.MONGODB_URL = 'mongodb://127.0.0.1:1/not-used';
process.env.JWT_SECRET = 'admin-test-only-secret';
process.env.EMAIL_USER = 'admin-test@example.invalid';
process.env.EMAIL_PASS = 'test';
process.env.VNP_TMN_CODE = '';
process.env.VNP_HASH_SECRET = '';
process.env.SHIPPING_FEE = '15000';
const User = require('../src/models/user');
const Product = require('../src/models/product');
const Order = require('../src/models/order');
const GoodsReceipt = require('../src/models/goodsReceipt');
const { getToday } = require('../src/utils/date.util');
let database, server, admin, staff, customer, token, staffToken, customerToken, baseUrl;
let log = '';
const cwd = path.resolve(__dirname, '..');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const sign = (user, version = 0) => jwt.sign({ userId: user.id, tokenVersion: version }, process.env.JWT_SECRET);
const api = async (url, method = 'GET', body, accessToken = token, expected = 200) => {
    const response = await fetch(baseUrl + url, {
        method,
        headers: { Authorization: 'Bearer ' + accessToken, 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body)
    });
    const result = await response.json();
    assert.equal(response.status, expected, method + ' ' + url + ': ' + JSON.stringify(result));
    assert.ok(result.requestId);
    assert.ok(result.serverTime);
    return result;
};
before(
    async () => {
        database = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
        process.env.MONGODB_URL = database.getUri('admin-test');
        await mongoose.connect(process.env.MONGODB_URL);
        const seed = spawn(process.execPath, ['seed.js'], { cwd, env: process.env, stdio: 'pipe' });
        let seedLog = '';
        seed.stdout.on('data', (chunk) => {
            seedLog += chunk;
        });
        seed.stderr.on('data', (chunk) => {
            seedLog += chunk;
        });
        assert.equal(await new Promise((resolve) => seed.on('exit', resolve)), 0, seedLog);
        admin = await User.findOne({ role: 'ADMIN' });
        staff = await User.findOne({ role: 'STAFF' });
        customer = await User.findOne({ role: 'CUSTOMER' });
        token = sign(admin);
        staffToken = sign(staff);
        customerToken = sign(customer);
        const port = 19000 + Math.floor(Math.random() * 1000);
        baseUrl = 'http://localhost:' + port + '/api';
        server = spawn(process.execPath, ['tests/adminServer.fixture.js'], {
            cwd,
            env: { ...process.env, PORT: String(port), NODE_ENV: 'test' },
            stdio: 'pipe'
        });
        server.stdout.on('data', (chunk) => {
            log += chunk;
        });
        server.stderr.on('data', (chunk) => {
            log += chunk;
        });
        let ready = false;
        for (let count = 0; count < 600; count++) {
            if (server.exitCode !== null) break;
            try {
                if (
                    (
                        await fetch(baseUrl + '/admin/session', {
                            headers: { Authorization: 'Bearer ' + token },
                            signal: AbortSignal.timeout(1000)
                        })
                    ).ok
                ) {
                    ready = true;
                    break;
                }
            } catch {
                /* Đợi server. */
            }
            await sleep(100);
        }
        assert.ok(ready, log);
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
});

test('Chỉ ADMIN truy cập API quản trị, không trả mật khẩu hoặc mã xác minh', async () => {
    for (const url of ['/admin/session', '/admin/accounts', '/admin/reports/revenue', '/admin/reports/inventory']) {
        await api(url, 'GET', undefined, staffToken, 403);
        await api(url, 'GET', undefined, customerToken, 403);
    }
    const data = await api('/admin/accounts');
    assert.ok(data.data.length >= 3);
    assert.ok(!JSON.stringify(data).includes('password_hash'));
    assert.ok(!JSON.stringify(data).includes('email_verify_token'));
});

test('Session và tài khoản không có dữ liệu cơ sở, không còn API quản lý cơ sở', async () => {
    const session = (await api('/staff/session', 'GET', undefined, staffToken)).data;
    assert.equal('branches' in session, false);
    assert.equal('branch_id' in session, false);
    const response = await fetch(baseUrl + '/admin/branches', { method: 'POST', headers: { Authorization: 'Bearer ' + token } });
    assert.equal(response.status, 404);
});

test('Tạo nhân viên với mật khẩu băm, không nâng lên ADMIN qua payload', async () => {
    const result = (
        await api(
            '/admin/accounts',
            'POST',
            {
                email: 'qa-staff@example.invalid',
                full_name: 'QA Staff',
                password: 'Test@12345',
                role: 'ADMIN',
                permissions: ['ORDER_MANAGE']
            },
            token,
            201
        )
    ).data;
    const user = await User.findById(result.id).select('+password_hash');
    assert.equal(user.role, 'STAFF');
    assert.ok(await bcrypt.compare('Test@12345', user.password_hash));
    await api(
        '/admin/accounts',
        'POST',
        { email: 'qa-invalid@example.invalid', full_name: 'Invalid', password: 'Test@12345', permissions: ['USER_MANAGE'] },
        token,
        400
    );
});

test('Phân quyền có kiểm tra xung đột, dùng kho chung và quyền thay đổi có hiệu lực ngay', async () => {
    const before = (await api('/admin/accounts/' + staff.id)).data;
    const changed = (
        await api('/admin/accounts/' + staff.id + '/permissions', 'PUT', {
            expected_updated_at: before.updated_at,
            permissions: ['ORDER_MANAGE']
        })
    ).data;
    assert.deepEqual(changed.permissions, ['ORDER_MANAGE']);
    await api('/staff/products', 'GET', undefined, staffToken, 403);
    assert.equal('assigned_branches' in changed, false);
    await api('/staff/orders', 'GET', undefined, staffToken);
    await api(
        '/admin/accounts/' + staff.id + '/permissions',
        'PUT',
        { expected_updated_at: before.updated_at, permissions: [] },
        token,
        409
    );
    await api(
        '/admin/accounts/' + admin.id + '/permissions',
        'PUT',
        { expected_updated_at: admin.updated_at.toISOString(), permissions: [] },
        token,
        403
    );
});

test('Khóa thu hồi phiên; mở khóa không bỏ qua xác minh email và bảo vệ ADMIN', async () => {
    await api('/admin/accounts/' + admin.id + '/lock', 'PATCH', { action: 'LOCK', expected_status: 'ACTIVE' }, token, 403);
    const pending = await User.create({
        email: 'pending@example.invalid',
        full_name: 'Pending',
        password_hash: 'unused',
        status: 'PENDING'
    });
    await api('/admin/accounts/' + pending.id + '/lock', 'PATCH', { action: 'LOCK', expected_status: 'PENDING' });
    assert.equal(
        (await api('/admin/accounts/' + pending.id + '/lock', 'PATCH', { action: 'UNLOCK', expected_status: 'LOCKED' })).data.status,
        'PENDING'
    );
    await api('/admin/accounts/' + staff.id + '/lock', 'PATCH', { action: 'LOCK', expected_status: 'ACTIVE' });
    await api('/staff/session', 'GET', undefined, staffToken, 403);
    await api('/admin/accounts/' + staff.id + '/lock', 'PATCH', { action: 'UNLOCK', expected_status: 'LOCKED' });
    await api('/staff/session', 'GET', undefined, staffToken, 401);
});

let checkoutCode, reportProduct;
test('Tồn kho chung và giá vốn đơn mới chụp từ đúng lô khi đặt hàng', async () => {
    reportProduct = await Product.findOne({ code: 'DEMO-SP001' });
    const publicList = (await api('/product?keyword=DEMO-SP001', 'GET', undefined, customerToken)).data;
    assert.ok(publicList[0].total_stock > 0);
    const owner = await User.findById(customer.id);
    const cartIds = owner.cart_items.map((item) => String(item._id));
    const key = 'qa-admin-cost-checkout';
    const preview = (await api('/order/preview', 'POST', { cart_item_ids: cartIds, checkout_key: key }, customerToken)).data;
    checkoutCode = (
        await api(
            '/order/checkout',
            'POST',
            {
                cart_item_ids: cartIds,
                checkout_key: key,
                address_id: String(owner.addresses[0]._id),
                recipient_name: 'QA Customer',
                email: owner.email,
                phone: owner.addresses[0].phone,
                payment_method: 'COD',
                expected_total: preview.total
            },
            customerToken,
            201
        )
    ).data.checkout_code;
    const orders = await Order.find({ checkout_code: checkoutCode });
    assert.ok(orders.length);
    for (const order of orders) {
        for (const item of order.items) assert.ok(item.stock_allocations.every((allocation) => Number.isFinite(allocation.unit_cost)));
        const url = '/staff/orders/' + order.id + '/status';
        assert.equal(order.status, 'PENDING');
        await api(url, 'PATCH', { expected_status: 'PENDING', status: 'CONFIRMED', note: 'Đã gọi khách' });
        await api(url, 'PATCH', { expected_status: 'CONFIRMED', status: 'SHIPPING', note: '' });
        await api(url, 'PATCH', { expected_status: 'SHIPPING', status: 'COMPLETED', note: '' });
    }
});

test('Báo cáo đúng ngày Việt Nam, toàn cửa hàng và không đổi giá vốn khi nhập lô thêm', async () => {
    const today = getToday(),
        url = '/admin/reports/revenue?from=' + today + '&to=' + today;
    const before = (await api(url)).data;
    assert.equal(before.stats.order_count, 1);
    assert.ok(before.stats.cost > 0);
    assert.equal(before.quality.missing_cost_lines, 0);
    const receipt = await GoodsReceipt.findOne();
    receipt.items[0].unit_cost += 100000;
    await receipt.save();
    const after = (await api(url)).data;
    assert.equal(after.stats.cost, before.stats.cost);
    assert.equal(
        after.daily.reduce((sum, day) => sum + day.revenue, 0),
        after.stats.revenue
    );
    assert.equal('branches' in after, false);
    const legacy = (await api('/admin/reports/revenue?from=2020-01-01&to=2020-01-02')).data;
    assert.equal(legacy.stats.revenue, 0);
    await api('/admin/reports/revenue?from=2026-02-30&to=2026-03-01', 'GET', undefined, token, 400);
});

test('Báo cáo kho tách SKU/đơn vị, lấy tồn hiện tại và thống kê phiếu nhập trong kỳ', async () => {
    const today = getToday();
    const report = await api('/admin/reports/inventory?from=' + today + '&to=' + today + '&pageSize=100');
    assert.ok(report.meta.import_amount > 0);
    assert.equal(report.meta.receipt_count, 1);
    const sku = reportProduct.variants[0].sku;
    const filtered = await api('/admin/reports/inventory?from=' + today + '&to=' + today + '&keyword=' + sku);
    assert.ok(filtered.data.some((row) => row.sku === sku && row.sold_quantity === 1));
    assert.ok(filtered.data.every((row) => typeof row.unit === 'string'));
    const oldOrder = (await Order.findOne({ code: 'DEMO-DH001' })).toObject();
    delete oldOrder._id;
    await Order.create({ ...oldOrder, code: 'QA-LEGACY', created_at: new Date(today + 'T02:00:00Z') });
    const withLegacy = (await api('/admin/reports/revenue?from=' + today + '&to=' + today)).data;
    assert.equal(withLegacy.stats.cost, null);
    assert.ok(withLegacy.quality.missing_cost_lines > 0);
    assert.ok(withLegacy.quality.legacy_completion_dates > 0);
});

test('Admin sửa thông tin/email mọi vai trò, email trùng bị chặn và email mới thu hồi phiên cũ', async () => {
    const extraAdmin = await User.create({
        email: 'extra-admin@example.invalid',
        full_name: 'Extra admin',
        role: 'ADMIN',
        status: 'ACTIVE',
        password_hash: 'unused'
    });
    for (const user of [customer, staff, extraAdmin]) {
        const before = (await api('/admin/accounts/' + user.id)).data;
        const updated = (
            await api('/admin/accounts/' + user.id, 'PUT', {
                full_name: before.full_name + ' edited',
                email: 'edited-' + before.email,
                phone: before.phone,
                expected_updated_at: before.updated_at,
                role: 'ADMIN',
                permissions: ['PRODUCT_MANAGE']
            })
        ).data;
        assert.equal(updated.role, before.role);
        assert.equal(updated.email, 'edited-' + before.email);
        assert.deepEqual(updated.permissions, before.permissions);
        await api(
            '/admin/accounts/' + user.id,
            'PUT',
            { full_name: updated.full_name, email: admin.email, phone: updated.phone, expected_updated_at: updated.updated_at },
            token,
            400
        );
        assert.equal((await User.findById(user._id)).email, updated.email);
        await api(
            '/admin/accounts/' + user.id,
            'PUT',
            { full_name: updated.full_name, email: updated.email, phone: updated.phone, expected_updated_at: before.updated_at },
            token,
            409
        );
    }
    await api('/account', 'GET', undefined, customerToken, 401);
});
