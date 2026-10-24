const mongoose = require('mongoose');
const Order = require('../models/order');
const Product = require('../models/product');
const { escapeRegex } = require('../utils/string.util');
const { getToday, parseDate } = require('../utils/date.util');
const { notifyOrdersChanged } = require('../utils/orderEvents.util');

const getOrders = async (filters, pagination) => {
    // Danh sách đơn hàng của cửa hàng.
    const query = {};
    if (filters.status) {
        if (!['PENDING', 'CONFIRMED', 'SHIPPING', 'COMPLETED', 'CANCELLED'].includes(filters.status)) throw new Error('INVALID_DATA');
        query.status = filters.status;
    }
    if (filters.keyword)
        query.$or = ['code', 'checkout_code', 'shipping_address.phone', 'shipping_address.recipient_name'].map((field) => ({
            [field]: { $regex: escapeRegex(filters.keyword), $options: 'i' }
        }));
    const [orders, totalElements] = await Promise.all([
        Order.find(query)
            .select('code checkout_code shipping_address final_amount status payment_status payment_method created_at')
            .sort({ created_at: -1, _id: -1 })
            .skip(pagination.offset)
            .limit(pagination.pageSize)
            .lean(),
        Order.countDocuments(query)
    ]);
    return {
        items: orders.map((order) => ({
            id: order._id.toString(),
            code: order.code,
            customer_name: order.shipping_address.recipient_name,
            phone: order.shipping_address.phone,
            final_amount: order.final_amount,
            status: order.status,
            payment_status: order.payment_status,
            payment_method: order.payment_method,
            created_at: order.created_at
        })),
        totalElements
    };
};

const getOrder = async (id) => {
    if (!mongoose.isObjectIdOrHexString(id)) throw new Error('RESOURCE_NOT_FOUND');
    const order = await Order.findById(id)
        .populate('items.product_id', 'name variants images')
        .populate('status_history.changed_by', 'full_name')
        .lean();
    if (!order) throw new Error('RESOURCE_NOT_FOUND');
    return {
        ...order,
        id: order._id.toString(),
        items: order.items.map((item) => {
            const variant = item.product_id?.variants?.find((entry) => entry._id.toString() === item.variant_id.toString());
            return {
                ...item,
                product_id: item.product_id?._id.toString(),
                name: item.name || item.product_id?.name || 'Sản phẩm đã ngừng kinh doanh',
                variant_name: item.variant_name || variant?.name,
                unit: item.unit || variant?.unit,
                line_total: Math.round(item.price * item.quantity)
            };
        }),
        status_history: (order.status_history || []).map((entry) => ({ ...entry, staff_name: entry.changed_by?.full_name || 'Hệ thống' }))
    };
};

const updateStatus = async (userId, id, data) => {
    if (!mongoose.isObjectIdOrHexString(id) || typeof data.note !== 'string' || data.note.length > 1000) throw new Error('INVALID_DATA');
    const transitions = { PENDING: ['CONFIRMED', 'CANCELLED'], CONFIRMED: ['SHIPPING', 'CANCELLED'], SHIPPING: ['COMPLETED'] };
    await mongoose.connection.transaction(async (session) => {
        const order = await Order.findById(id).session(session);
        if (!order) throw new Error('RESOURCE_NOT_FOUND');
        if (order.status !== data.expected_status || !transitions[order.status]?.includes(data.status))
            throw new Error('ORDER_INVALID_TRANSITION');
        if (['SHIPPING', 'COMPLETED'].includes(data.status) && order.payment_method !== 'COD' && order.payment_status !== 'PAID')
            throw new Error('ORDER_UNPAID');
        if (
            ['CONFIRMED', 'SHIPPING'].includes(data.status) &&
            order.items.some((item) => item.stock_allocations.some((allocation) => allocation.expiry_date < parseDate(getToday())))
        )
            throw new Error('ORDER_STOCK_EXPIRED');
        if (data.status === 'CANCELLED') {
            for (const item of order.items) {
                if (!item.stock_allocations?.length) throw new Error('ORDER_STOCK_MISSING');
                const product = await Product.findById(item.product_id).session(session);
                const variant = product?.variants.id(item.variant_id);
                if (!variant) throw new Error('ORDER_STOCK_MISSING');
                for (const allocation of item.stock_allocations) {
                    const stock = variant.stocks.find(
                        (lot) => lot.batch_code === allocation.batch_code && lot.expiry_date.getTime() === allocation.expiry_date.getTime()
                    );
                    if (stock) stock.quantity = Math.round((stock.quantity + allocation.quantity) * 1000) / 1000;
                    else variant.stocks.push(allocation.toObject());
                }
                await product.save({ session });
            }
        }
        order.status = data.status;
        if (data.status === 'CONFIRMED') {
            order.confirmed_at = new Date();
            if (order.payment_method === 'VNPAY' && order.payment_status === 'UNPAID') {
                const siblings = order.checkout_code
                    ? await Order.find({
                          checkout_code: order.checkout_code,
                          _id: { $ne: order._id },
                          status: { $ne: 'CANCELLED' }
                      }).session(session)
                    : [];
                if (siblings.every((entry) => entry.status === 'CONFIRMED')) {
                    const readyAt = new Date();
                    const expiresAt = new Date(readyAt.getTime() + 15 * 60 * 1000);
                    order.payment_ready_at = readyAt;
                    order.payment_expires_at = expiresAt;
                    for (const sibling of siblings) {
                        sibling.payment_ready_at = readyAt;
                        sibling.payment_expires_at = expiresAt;
                        await sibling.save({ session });
                    }
                }
            }
        }
        if (data.status === 'COMPLETED' && order.payment_method === 'COD') {
            order.payment_status = 'PAID';
            order.paid_at = new Date();
        }
        order.status_history.push({ status: data.status, changed_by: userId, changed_at: new Date(), note: data.note.trim() });
        await order.save({ session });
    });
    notifyOrdersChanged();
    return getOrder(id);
};

const getSummary = async () => ({ pending_count: await Order.countDocuments({ status: 'PENDING' }) });

module.exports = { getOrders, getOrder, updateStatus, getSummary };
