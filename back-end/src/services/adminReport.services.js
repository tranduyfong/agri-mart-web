const mongoose = require('mongoose');
const Category = require('../models/category');
const User = require('../models/user');
const Product = require('../models/product');
const Order = require('../models/order');
const GoodsReceipt = require('../models/goodsReceipt');
const { STAFF_PERMISSIONS } = require('../utils/permissions.util');
const { getReportRange, completedAt, getOrderCost } = require('../utils/report.util');
const { getToday, parseDate } = require('../utils/date.util');
const { normalizeSearch } = require('../utils/string.util');

const getSession = async (userId) => {
    const user = await User.findById(userId).select('full_name email role');
    if (!user || user.role !== 'ADMIN') throw new Error('RESOURCE_NOT_FOUND');
    return {
        user: { id: user._id.toString(), full_name: user.full_name, email: user.email, role: user.role }
    };
};

const getLookups = async (userId) => ({
    ...(await getSession(userId)),
    permissions: STAFF_PERMISSIONS,
    categories: (await Category.find().sort({ name: 1 }).lean()).map((item) => ({ id: item._id.toString(), name: item.name }))
});

const getRevenue = async (query) => {
    const range = getReportRange(query);
    const [orders, receipts] = await Promise.all([Order.find().lean(), GoodsReceipt.find().lean()]);
    const completed = orders.filter(
        (order) =>
            order.status === 'COMPLETED' &&
            ['PAID', 'REFUNDED'].includes(order.payment_status) &&
            completedAt(order) >= range.start &&
            completedAt(order) < range.end
    );

    const daily = [];
    for (let date = parseDate(range.from); date <= parseDate(range.to); date = new Date(date.getTime() + 86400000))
        daily.push({ date: date.toISOString().slice(0, 10), revenue: 0 });
    let revenue = 0,
        refund = 0,
        knownCost = 0,
        missingCost = 0,
        legacyDates = 0;
    const dayName = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
    for (const order of completed) {
        const cost = getOrderCost(order, receipts);
        revenue += order.final_amount;
        knownCost += cost.amount;
        missingCost += cost.missing;
        if (order.payment_status === 'REFUNDED') refund += order.final_amount;
        if (!(order.status_history || []).some((entry) => entry.status === 'COMPLETED')) legacyDates++;
        const day = daily.find((item) => item.date === dayName.format(completedAt(order)));
        if (day) day.revenue += order.final_amount;
    }
    const paymentRows = ['COD', 'VNPAY', 'MOMO']
        .map((method) => {
            const paid = completed.filter((order) => order.payment_method === method && order.payment_status === 'PAID');
            const pending = orders.filter(
                (order) =>
                    order.payment_method === method &&
                    order.payment_status === 'UNPAID' &&
                    order.status !== 'CANCELLED' &&
                    order.created_at >= range.start &&
                    order.created_at < range.end
            );
            return {
                method,
                paid_count: new Set(paid.map((order) => order.checkout_code || order.code)).size,
                paid_amount: paid.reduce((sum, order) => sum + order.final_amount, 0),
                pending_count: new Set(pending.map((order) => order.checkout_code || order.code)).size
            };
        })
        .filter((row) => row.method !== 'MOMO' || row.paid_count || row.pending_count);
    return {
        from: range.from,
        to: range.to,
        stats: {
            revenue,
            refund_amount: refund,
            order_count: completed.length,
            cost: missingCost ? null : knownCost,
            known_cost: knownCost,
            gross_profit: missingCost ? null : revenue - refund - knownCost
        },
        quality: { missing_cost_lines: missingCost, legacy_completion_dates: legacyDates },
        daily,
        payments: paymentRows
    };
};

const getInventoryReport = async (query, pagination) => {
    const range = getReportRange(query);
    if (query.category_id && (!mongoose.isObjectIdOrHexString(query.category_id) || !(await Category.exists({ _id: query.category_id }))))
        throw new Error('INVALID_DATA');
    const [products, receipts, orders] = await Promise.all([
        Product.find(query.category_id ? { category_id: query.category_id } : {}).lean(),
        GoodsReceipt.find({ created_at: { $gte: range.start, $lt: range.end } }).lean(),
        Order.find({ status: { $in: ['PENDING', 'CONFIRMED', 'COMPLETED'] } }).lean()
    ]);
    const rows = new Map();
    const rowFor = (productId, sku, unit, name) => {
        const key = String(productId) + '|' + sku + '|' + unit;
        if (!rows.has(key))
            rows.set(key, {
                id: key,
                product_id: String(productId),
                name,
                sku,
                unit,
                imported_quantity: 0,
                sold_quantity: 0,
                reserved_quantity: 0,
                stock_quantity: 0,
                available_quantity: 0
            });
        return rows.get(key);
    };
    const today = parseDate(getToday());
    for (const product of products)
        for (const variant of product.variants) {
            const row = rowFor(product._id, variant.sku, variant.unit, product.name);
            for (const lot of variant.stocks) {
                row.stock_quantity += lot.quantity;
                if (lot.expiry_date >= today) row.available_quantity += lot.quantity;
            }
        }
    let importAmount = 0,
        receiptCount = 0,
        missingMetadata = 0;
    for (const receipt of receipts) {
        let included = false;
        for (const item of receipt.items) {
            const product = products.find((entry) => String(entry._id) === String(item.product_id));
            if (!product && query.category_id) continue;
            const variant = product?.variants.find((entry) => entry.sku === item.variant_sku);
            if (!item.unit) missingMetadata++;
            rowFor(
                item.product_id,
                item.variant_sku,
                item.unit || variant?.unit || 'chưa rõ',
                item.name || product?.name || 'Sản phẩm không còn trong danh mục'
            ).imported_quantity += item.quantity;
            importAmount += item.quantity * item.unit_cost;
            included = true;
        }
        if (included) receiptCount++;
    }
    for (const order of orders)
        for (const item of order.items) {
            const product = products.find((entry) => String(entry._id) === String(item.product_id));
            if (!product && query.category_id) continue;
            const variant = product?.variants.find((entry) => String(entry._id) === String(item.variant_id));
            const row = rowFor(
                item.product_id,
                item.variant_sku || variant?.sku || 'chưa rõ',
                item.unit || variant?.unit || 'chưa rõ',
                item.name || product?.name || 'Sản phẩm không còn trong danh mục'
            );
            if (order.status === 'COMPLETED') {
                if (completedAt(order) >= range.start && completedAt(order) < range.end) row.sold_quantity += item.quantity;
            } else row.reserved_quantity += item.quantity;
        }
    const keyword = normalizeSearch(query.keyword || '');
    const matched = [...rows.values()]
        .filter((row) => !keyword || normalizeSearch(row.name + ' ' + row.sku).includes(keyword))
        .sort((a, b) => a.name.localeCompare(b.name, 'vi') || a.sku.localeCompare(b.sku));
    for (const row of matched)
        for (const key of ['imported_quantity', 'sold_quantity', 'reserved_quantity', 'stock_quantity', 'available_quantity'])
            row[key] = Math.round(row[key] * 1000) / 1000;
    return {
        items: matched.slice(pagination.offset, pagination.offset + pagination.pageSize),
        totalElements: matched.length,
        meta: {
            from: range.from,
            to: range.to,
            as_of: new Date(),
            import_amount: Math.round(importAmount),
            receipt_count: receiptCount,
            legacy_receipt_lines: missingMetadata
        }
    };
};

module.exports = { getSession, getLookups, getRevenue, getInventoryReport };
