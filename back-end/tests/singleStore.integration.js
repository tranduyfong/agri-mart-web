const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const User = require('../src/models/user');
const Product = require('../src/models/product');
const Order = require('../src/models/order');
const GoodsReceipt = require('../src/models/goodsReceipt');
const { getPlan, getBackup, migrate, assertMigrated } = require('../src/services/storeMigration.services');
const { getOrderCost } = require('../src/utils/report.util');
const staffOrder = require('../src/services/staffOrder.services');
let database, customer, admin, product, sources, orderIds;
const runMigration = (apply = false) =>
    promisify(execFile)(process.execPath, ['migrate-single-store.js', ...(apply ? ['--apply'] : [])], {
        cwd: path.resolve(__dirname, '..'),
        env: { ...process.env, MONGODB_URL: database.getUri('single-store-test') },
        timeout: 30000
    });

before(async () => {
    database = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    await mongoose.connect(database.getUri('single-store-test'), { autoIndex: false });
    admin = await User.create({
        email: 'admin@example.invalid',
        full_name: 'Admin',
        password_hash: 'unused',
        role: 'ADMIN',
        status: 'ACTIVE'
    });
    customer = await User.create({ email: 'customer@example.invalid', full_name: 'Customer', password_hash: 'unused', status: 'ACTIVE' });
    sources = [new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId()];
    product = await Product.create({
        code: 'MIGRATION',
        name: 'Sản phẩm chuyển dữ liệu',
        slug: 'migration',
        category_id: new mongoose.Types.ObjectId(),
        variants: [{ sku: 'MIGRATION-KG', name: 'Kg', unit: 'kg', step_quantity: 0.5, list_price: 50000 }]
    });
    const expiry = new Date('2099-12-31T00:00:00Z');
    const stocks = sources.map((id, index) => ({ branch_id: id, batch_code: 'SAME', quantity: index ? 5 : 3, expiry_date: expiry }));
    await Product.collection.updateOne({ _id: product._id }, { $set: { 'variants.0.stocks': stocks } });
    await mongoose.connection.db
        .collection('branches')
        .insertMany(sources.map((_id, index) => ({ _id, code: 'OLD-' + index, name: 'Kho cũ' })));
    await User.collection.updateOne(
        { _id: customer._id },
        {
            $set: {
                assigned_branches: [],
                cart_items: sources.map((id, index) => ({
                    _id: new mongoose.Types.ObjectId(),
                    product_id: product._id,
                    variant_id: product.variants[0]._id,
                    branch_id: id,
                    quantity: index + 1
                }))
            }
        }
    );
    for (let index = 0; index < sources.length; index++) {
        await GoodsReceipt.collection.insertOne({
            branch_id: sources[index],
            created_by: admin._id,
            import_key: 'same-import-key',
            total_amount: 100000,
            created_at: new Date('2026-01-01T00:00:00Z'),
            items: [
                {
                    product_id: product._id,
                    variant_sku: 'MIGRATION-KG',
                    batch_code: 'SAME',
                    quantity: 10,
                    unit_cost: index ? 30000 : 20000,
                    expiry_date: expiry
                }
            ]
        });
    }
    orderIds = [];
    for (let index = 0; index < sources.length; index++) {
        const _id = new mongoose.Types.ObjectId();
        orderIds.push(_id);
        await Order.collection.insertOne({
            _id,
            code: 'OLD-ORDER-' + index,
            checkout_code: 'OLD-CHECKOUT',
            checkout_key: 'same-checkout-key',
            branch_id: sources[index],
            user_id: customer._id,
            status: 'PENDING',
            payment_method: 'COD',
            payment_status: 'UNPAID',
            total_amount: 50000,
            final_amount: 50000,
            shipping_fee: 0,
            shipping_address: { recipient_name: 'Customer', phone: '0900000001', address_line: 'Địa chỉ mẫu' },
            status_history: [{ status: 'PENDING', changed_at: new Date('2026-05-01T00:00:00Z'), note: 'Lịch sử gốc' }],
            created_at: new Date('2026-05-01T00:00:00Z'),
            updated_at: new Date('2026-05-01T00:00:00Z'),
            items: [
                {
                    _id: new mongoose.Types.ObjectId(),
                    product_id: product._id,
                    variant_id: product.variants[0]._id,
                    variant_sku: 'MIGRATION-KG',
                    quantity: 1,
                    price: 50000,
                    stock_allocations: [{ batch_code: 'SAME', quantity: 1, expiry_date: expiry }]
                }
            ]
        });
    }
    await mongoose.connection.db.collection('newsletters').insertOne({ branch_id: sources[0], subject: 'Bản nháp cũ' });
    await mongoose.connection.db
        .collection('chatrooms')
        .insertOne({ branch_id: sources[1], customer_id: customer._id, status: 'AI_ACTIVE' });
    await Order.collection.createIndex(
        { user_id: 1, checkout_key: 1, branch_id: 1 },
        { unique: true, partialFilterExpression: { checkout_key: { $type: 'string' } } }
    );
    await GoodsReceipt.collection.createIndex(
        { branch_id: 1, created_by: 1, import_key: 1 },
        { unique: true, partialFilterExpression: { import_key: { $type: 'string' } } }
    );
});

after(async () => {
    await mongoose.disconnect();
    if (database) await database.stop();
});

test('Xem trước và sao lưu không ghi DB; backend phát hiện dữ liệu chưa chuyển', async () => {
    const plan = await getPlan();
    assert.equal(plan.needs_migration, true);
    assert.equal(plan.affected.products, 1);
    assert.equal(plan.affected.orders, 2);
    assert.equal(plan.affected.branches, 2);
    await assert.rejects(assertMigrated(), /migrate:single-store/);
    assert.ok((await runMigration()).stdout.includes('Chỉ xem trước'));
    const backup = mongoose.mongo.BSON.EJSON.parse(mongoose.mongo.BSON.EJSON.stringify(await getBackup()));
    assert.equal(backup.collections.branches.length, 2);
    assert.ok(backup.collections.orders[0]._id instanceof mongoose.Types.ObjectId);
    assert.ok(backup.collections.orders[0].created_at instanceof Date);
    assert.equal((await Product.collection.findOne({ _id: product._id })).variants[0].stocks[0].batch_code, 'SAME');
});

test('Chuyển một cửa hàng giữ tồn, giá vốn, tiền, trạng thái và lịch sử; không còn tham chiếu cơ sở', async (t) => {
    const original = await Order.collection.findOne({ _id: orderIds[0] });
    const result = await runMigration(true);
    const backupPath = result.stdout.match(/Đã sao lưu dữ liệu gốc: (.+)/)?.[1].trim();
    assert.ok(backupPath);
    assert.ok(path.resolve(backupPath).startsWith(path.resolve(__dirname, '../backups') + path.sep));
    t.after(() => fs.unlinkSync(backupPath));
    const originalBackup = mongoose.mongo.BSON.EJSON.parse(fs.readFileSync(backupPath, 'utf8'));
    assert.equal(originalBackup.collections.branches.length, 2);
    assert.equal(originalBackup.collections.orders[0].items[0].stock_allocations[0].batch_code, 'SAME');
    assert.equal((await getPlan()).needs_migration, false);
    await assertMigrated();
    const stocks = (await Product.findById(product._id)).variants[0].stocks;
    assert.equal(
        stocks.reduce((sum, stock) => sum + stock.quantity, 0),
        8
    );
    assert.equal(new Set(stocks.map((stock) => stock.batch_code)).size, 2);
    assert.ok(stocks.every((stock) => !('branch_id' in stock.toObject())));
    const receipts = await GoodsReceipt.find().lean();
    const orders = await Order.find().sort({ code: 1 }).lean();
    assert.equal(getOrderCost(orders[0], receipts).amount, 20000);
    assert.equal(getOrderCost(orders[1], receipts).amount, 30000);
    assert.equal(orders[0].final_amount, original.final_amount);
    assert.equal(orders[0].status, original.status);
    assert.equal(orders[0].created_at.getTime(), original.created_at.getTime());
    assert.deepEqual(orders[0].status_history, original.status_history);
    assert.equal(orders.filter((order) => order.checkout_key === 'same-checkout-key').length, 1);
    assert.equal(receipts.filter((receipt) => receipt.import_key === 'same-import-key').length, 1);
    const user = await User.findById(customer._id);
    assert.equal(user.cart_items.length, 1);
    assert.equal(user.cart_items[0].quantity, 3);
    assert.equal('assigned_branches' in user.toObject(), false);
    assert.equal(await mongoose.connection.db.listCollections({ name: 'branches' }).hasNext(), false);
    assert.equal('branch_id' in (await mongoose.connection.db.collection('chatrooms').findOne()), false);
    assert.equal('branch_id' in (await mongoose.connection.db.collection('newsletters').findOne()), false);
    assert.ok(
        (await Order.collection.indexes()).some((index) => index.unique && Object.keys(index.key).join(',') === 'user_id,checkout_key')
    );
    const again = await migrate();
    assert.equal(again.needs_migration, false);
    assert.equal(
        (await Product.findById(product._id)).variants[0].stocks.reduce((sum, stock) => sum + stock.quantity, 0),
        8
    );
});

test('Hủy đơn cũ sau chuyển trả đúng lô, không trộn giá vốn hoặc hoàn tồn hai lần', async () => {
    await staffOrder.updateStatus(admin.id, String(orderIds[1]), { expected_status: 'PENDING', status: 'CANCELLED', note: '' });
    let stocks = (await Product.findById(product._id)).variants[0].stocks;
    assert.equal(stocks.find((stock) => stock.batch_code === String(sources[1]) + '/SAME').quantity, 6);
    assert.equal(stocks.find((stock) => stock.batch_code === String(sources[0]) + '/SAME').quantity, 3);
    await assert.rejects(
        staffOrder.updateStatus(admin.id, String(orderIds[1]), { expected_status: 'PENDING', status: 'CANCELLED', note: '' }),
        /ORDER_INVALID_TRANSITION/
    );
    stocks = (await Product.findById(product._id)).variants[0].stocks;
    assert.equal(
        stocks.reduce((sum, stock) => sum + stock.quantity, 0),
        9
    );
});
