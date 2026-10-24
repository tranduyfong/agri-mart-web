const mongoose = require('mongoose');

// Chỉ script chuyển dữ liệu mới đọc các trường cũ. Hệ thống bán hàng không dùng chúng nữa.
const legacyFilters = {
    products: { 'variants.stocks.branch_id': { $exists: true } },
    users: { $or: [{ assigned_branches: { $exists: true } }, { 'cart_items.branch_id': { $exists: true } }] },
    orders: { $or: [{ branch_id: { $exists: true } }, { source_branch_name: { $exists: true } }] },
    goodsreceipts: { $or: [{ branch_id: { $exists: true } }, { source_branch_name: { $exists: true } }] },
    newsletters: { branch_id: { $exists: true } },
    chatrooms: { branch_id: { $exists: true } },
    branches: {}
};

const oldIndexes = async (name) => {
    const exists = await mongoose.connection.db.listCollections({ name }).hasNext();
    if (!exists) return [];
    const indexes = await mongoose.connection.db.collection(name).indexes();
    return indexes.filter((index) => Object.keys(index.key).some((field) => field.includes('branch')));
};

const getPlan = async () => {
    const affected = {};
    for (const [name, filter] of Object.entries(legacyFilters)) {
        affected[name] = await mongoose.connection.db.collection(name).countDocuments(filter);
    }
    const indexes = {};
    for (const name of ['orders', 'goodsreceipts', 'newsletters']) indexes[name] = (await oldIndexes(name)).map((index) => index.name);
    const obsoleteCollection = await mongoose.connection.db.listCollections({ name: 'branches' }).hasNext();
    return {
        affected,
        indexes,
        needs_migration:
            obsoleteCollection ||
            Object.values(affected).some((count) => count > 0) ||
            Object.values(indexes).some((items) => items.length > 0)
    };
};

const assertMigrated = async () => {
    if ((await getPlan()).needs_migration) {
        throw new Error('Dữ liệu còn dùng cơ sở cũ. Dừng backend rồi chạy: npm run migrate:single-store -- --apply');
    }
};

const getBackup = async () => {
    const collections = {};
    for (const [name, filter] of Object.entries(legacyFilters)) {
        const backupFilter = ['orders', 'goodsreceipts'].includes(name) ? {} : filter;
        collections[name] = await mongoose.connection.db.collection(name).find(backupFilter).toArray();
    }
    return { database: mongoose.connection.name, created_at: new Date(), collections };
};

const renameBatch = (code, sourceId) => (sourceId ? String(sourceId) + '/' + code : code);

// Hai phiếu cũ có thể dùng cùng khóa ở hai cơ sở. Giữ khóa đầu tiên để chống gửi lại.
const clearDuplicateKeys = async (name, ownerField, keyField, session) => {
    const collection = mongoose.connection.db.collection(name);
    const records = await collection
        .find({ [keyField]: { $type: 'string' } }, { session })
        .sort({ _id: 1 })
        .toArray();
    const keys = new Set();
    for (const record of records) {
        const key = String(record[ownerField]) + '|' + record[keyField];
        if (keys.has(key)) await collection.updateOne({ _id: record._id }, { $set: { [keyField]: null } }, { session });
        else keys.add(key);
    }
};

const migrate = async () => {
    const db = mongoose.connection.db;
    await mongoose.connection.transaction(async (session) => {
        // Xử lý khóa trước khi bỏ trường cũ để không va chạm với unique index đang có.
        await clearDuplicateKeys('orders', 'user_id', 'checkout_key', session);
        await clearDuplicateKeys('goodsreceipts', 'created_by', 'import_key', session);
        for (const product of await db.collection('products').find(legacyFilters.products, { session }).toArray()) {
            for (const variant of product.variants) {
                for (const stock of variant.stocks) {
                    stock.batch_code = renameBatch(stock.batch_code, stock.branch_id);
                    delete stock.branch_id;
                }
            }
            await db.collection('products').updateOne({ _id: product._id }, { $set: { variants: product.variants } }, { session });
        }

        for (const receipt of await db.collection('goodsreceipts').find(legacyFilters.goodsreceipts, { session }).toArray()) {
            for (const item of receipt.items) item.batch_code = renameBatch(item.batch_code, receipt.branch_id);
            await db.collection('goodsreceipts').updateOne(
                { _id: receipt._id },
                {
                    $set: { items: receipt.items },
                    $unset: { branch_id: '', source_branch_name: '' }
                },
                { session }
            );
        }

        for (const order of await db.collection('orders').find(legacyFilters.orders, { session }).toArray()) {
            for (const item of order.items) {
                for (const allocation of item.stock_allocations || [])
                    allocation.batch_code = renameBatch(allocation.batch_code, order.branch_id);
            }
            await db.collection('orders').updateOne(
                { _id: order._id },
                {
                    $set: { items: order.items },
                    $unset: { branch_id: '', source_branch_name: '' }
                },
                { session }
            );
        }

        for (const user of await db.collection('users').find(legacyFilters.users, { session }).toArray()) {
            const cart = [];
            for (const item of user.cart_items || []) {
                delete item.branch_id;
                const existing = cart.find((entry) => String(entry.variant_id) === String(item.variant_id));
                if (existing) existing.quantity = Math.round((existing.quantity + item.quantity) * 1000) / 1000;
                else cart.push(item);
            }
            await db.collection('users').updateOne(
                { _id: user._id },
                {
                    $set: { cart_items: cart },
                    $unset: { assigned_branches: '' },
                    $inc: { __v: 1 }
                },
                { session }
            );
        }

        for (const name of ['newsletters', 'chatrooms']) {
            await db.collection(name).updateMany(legacyFilters[name], { $unset: { branch_id: '' } }, { session });
        }
    });

    // MongoDB không cho thay index bên trong transaction cập nhật dữ liệu.
    for (const name of ['orders', 'goodsreceipts', 'newsletters']) {
        for (const index of await oldIndexes(name)) await db.collection(name).dropIndex(index.name);
    }
    await db.collection('orders').createIndex(
        { user_id: 1, checkout_key: 1 },
        {
            unique: true,
            partialFilterExpression: { checkout_key: { $type: 'string' } }
        }
    );
    await db.collection('goodsreceipts').createIndex(
        { created_by: 1, import_key: 1 },
        {
            unique: true,
            partialFilterExpression: { import_key: { $type: 'string' } }
        }
    );
    if (await db.listCollections({ name: 'branches' }).hasNext()) await db.collection('branches').drop();
    return getPlan();
};

module.exports = { getPlan, getBackup, migrate, assertMigrated };
