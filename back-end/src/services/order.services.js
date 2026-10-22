const crypto = require('crypto');
const mongoose = require('mongoose');
const { ProductCode } = require('vnpay');
const User = require('../models/user');
const Product = require('../models/product');
const Branch = require('../models/branch');
const Promotion = require('../models/promotion');
const Order = require('../models/order');
const cartService = require('./cart.services');
const vnpayInstance = require('../configs/vnpay.config');
const { availableStock } = require('../utils/productStock.util');
const { getToday, parseDate, formatVnpayDate, parseVnpayDate } = require('../utils/date.util');

const getShippingFee = () => {
    const fee = Number(process.env.SHIPPING_FEE || 15000);
    if (!Number.isSafeInteger(fee) || fee < 0) throw new Error('INVALID_SHIPPING_CONFIG');
    return fee;
};

const getPreview = async (userId, cartItemIds, checkoutKey) => {
    if (checkoutKey) {
        const existing = await Order.findOne({ user_id: userId, checkout_key: checkoutKey });
        if (existing) return { checkout: await getCheckout(userId, existing.checkout_code) };
    }
    const cart = await cartService.getCart(userId);
    const items = cart.filter((item) => cartItemIds.includes(item.id));
    if (items.length !== cartItemIds.length || !items.length) throw new Error('CART_CHANGED');

    let subtotal = 0;
    let total = 0;
    for (const item of items) {
        const step = Math.round(item.step_quantity * 1000);
        const quantity = Math.round(item.quantity * 1000);
        if (
            item.status !== 'PUBLISHED' ||
            item.quantity > item.stock_quantity ||
            item.quantity <= 0 ||
            Math.abs(item.quantity * 1000 - quantity) > 0.00001 ||
            quantity % step !== 0
        ) {
            throw new Error('INSUFFICIENT_STOCK');
        }

        item.discount_percent = Math.min(100, Math.max(0, item.discount_percent || 0));
        item.price = Math.round(item.list_price * (1 - item.discount_percent / 100));
        item.line_total = Math.round(item.price * item.quantity);
        subtotal += Math.round(item.list_price * item.quantity);
        total += item.line_total;
    }

    const shippingFee = getShippingFee();
    return {
        items,
        subtotal,
        discount_amount: subtotal - total,
        shipping_fee: shippingFee,
        total: total + shippingFee,
        vnpay_available: !!vnpayInstance && !!process.env.VNP_RETURN_URL
    };
};

const getCheckout = async (userId, checkoutCode) => {
    const orders = await Order.find({ user_id: userId, checkout_code: checkoutCode }).sort({ code: 1 });
    if (!orders.length) throw new Error('ORDER_NOT_FOUND');

    const first = orders[0];
    return {
        checkout_code: checkoutCode,
        order_codes: orders.map((order) => order.code),
        payment_method: first.payment_method,
        payment_status: first.payment_status,
        status: first.status,
        created_at: first.created_at,
        paid_at: first.paid_at,
        transaction_code: first.transaction_code,
        payment_expires_at: first.payment_expires_at,
        shipping_address: first.shipping_address,
        note: first.note,
        subtotal: orders.reduce((total, order) => total + order.total_amount, 0),
        discount_amount: orders.reduce((total, order) => total + order.discount_amount, 0),
        shipping_fee: orders.reduce((total, order) => total + order.shipping_fee, 0),
        total: orders.reduce((total, order) => total + order.final_amount, 0),
        items: orders.flatMap((order) =>
            order.items.map((item) => ({
                product_id: item.product_id.toString(),
                variant_id: item.variant_id.toString(),
                name: item.name,
                variant_name: item.variant_name,
                category_name: item.category_name,
                unit: item.unit,
                thumbnail_url: item.thumbnail_url,
                quantity: item.quantity,
                list_price: item.list_price,
                price: item.price,
                line_total: Math.round(item.price * item.quantity)
            }))
        )
    };
};

const createCheckout = async (userId, data) => {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 15 * 60 * 1000);
    const checkoutCode = 'DH' + crypto.randomUUID().replace(/-/g, '').toUpperCase();

    const resultCode = await mongoose.connection.transaction(async (session) => {
        const user = await User.findById(userId).session(session);
        if (!user || user.status !== 'ACTIVE') throw new Error('ACCOUNT_UNAVAILABLE');

        // Cùng khóa gửi lại chỉ trả về đơn đã tạo, không trừ kho lần nữa.
        const existing = await Order.findOne({ user_id: userId, checkout_key: data.checkout_key }).session(session);
        if (existing) return existing.checkout_code;

        const address = user.addresses.id(data.address_id);
        if (!address) throw new Error('ADDRESS_NOT_FOUND');
        if (data.payment_method === 'VNPAY' && (!vnpayInstance || !process.env.VNP_RETURN_URL)) {
            throw new Error('VNPAY_NOT_CONFIGURED');
        }

        const selectedItems = data.cart_item_ids.map((id) => user.cart_items.id(id));
        if (selectedItems.some((item) => !item)) throw new Error('CART_CHANGED');

        const shippingAddress = {
            recipient_name: data.recipient_name,
            phone: data.phone,
            email: data.email,
            province_code: address.province_code,
            province_name: address.province_name,
            ward_code: address.ward_code,
            ward_name: address.ward_name,
            hamlet: address.hamlet,
            street_address: address.street_address,
            address_line: address.address_line
        };
        const nowPromotions = await Promotion.find({
            discount_type: 'PERCENT',
            promotion_scope: 'PRODUCT',
            valid_from: { $lte: now },
            valid_to: { $gte: now }
        }).session(session);

        const groups = [];
        for (const cartItem of selectedItems) {
            let group = groups.find((entry) => entry.branch_id.equals(cartItem.branch_id));
            if (!group) {
                if (!(await Branch.exists({ _id: cartItem.branch_id }).session(session))) throw new Error('CART_CHANGED');
                group = { branch_id: cartItem.branch_id, items: [], subtotal: 0, discount: 0 };
                groups.push(group);
            }

            const product = await Product.findOne({ _id: cartItem.product_id, status: 'PUBLISHED' })
                .populate('category_id', 'name')
                .session(session);
            const variant = product?.variants.id(cartItem.variant_id);
            if (!variant) throw new Error('PRODUCT_NOT_FOUND');

            const units = Math.round(cartItem.quantity * 1000);
            const step = Math.round(variant.step_quantity * 1000);
            if (
                cartItem.quantity <= 0 ||
                Math.abs(cartItem.quantity * 1000 - units) > 0.00001 ||
                units % step !== 0 ||
                cartItem.quantity > availableStock(variant, cartItem.branch_id)
            ) {
                throw new Error('INSUFFICIENT_STOCK');
            }

            let discount = 0;
            for (const promotion of nowPromotions) {
                if (promotion.product_ids.some((id) => id.equals(product._id))) {
                    discount = Math.max(discount, Math.min(100, promotion.discount_value));
                }
            }
            const price = Math.round(variant.list_price * (1 - discount / 100));

            // Xuất lô còn hạn, ưu tiên lô hết hạn sớm; lưu lại để hoàn đúng lô nếu thanh toán lỗi.
            const today = parseDate(getToday());
            const stocks = variant.stocks
                .filter((stock) => stock.branch_id.equals(cartItem.branch_id) && stock.expiry_date >= today)
                .sort((a, b) => a.expiry_date - b.expiry_date);
            const allocations = [];
            let remaining = cartItem.quantity;
            for (const stock of stocks) {
                if (remaining <= 0) break;
                const taken = Math.min(stock.quantity, remaining);
                if (taken <= 0) continue;
                stock.quantity = Math.round((stock.quantity - taken) * 1000) / 1000;
                remaining = Math.round((remaining - taken) * 1000) / 1000;
                allocations.push({
                    batch_code: stock.batch_code,
                    quantity: taken,
                    manufactured_date: stock.manufactured_date,
                    expiry_date: stock.expiry_date
                });
            }
            if (remaining > 0) throw new Error('INSUFFICIENT_STOCK');
            await product.save({ session });

            group.items.push({
                product_id: product._id,
                variant_id: variant._id,
                variant_sku: variant.sku,
                name: product.name,
                variant_name: variant.name,
                category_name: product.category_id?.name || '',
                unit: variant.unit,
                thumbnail_url: product.images[0] || null,
                quantity: cartItem.quantity,
                list_price: variant.list_price,
                price,
                stock_allocations: allocations
            });
            group.subtotal += Math.round(variant.list_price * cartItem.quantity);
            group.discount += Math.round(variant.list_price * cartItem.quantity) - Math.round(price * cartItem.quantity);
        }

        const total = groups.reduce((sum, group) => sum + group.subtotal - group.discount, 0) + getShippingFee();
        if (!Number.isSafeInteger(total) || total <= 0) throw new Error('INVALID_AMOUNT');
        if (total !== data.expected_total) throw new Error('PRICE_CHANGED');

        for (let index = 0; index < groups.length; index++) {
            const group = groups[index];
            const shippingFee = index === 0 ? getShippingFee() : 0;
            const order = new Order({
                code: checkoutCode + '-' + (index + 1),
                checkout_code: checkoutCode,
                checkout_key: data.checkout_key,
                user_id: user._id,
                branch_id: group.branch_id,
                total_amount: group.subtotal,
                discount_amount: group.discount,
                shipping_fee: shippingFee,
                final_amount: group.subtotal - group.discount + shippingFee,
                status: data.payment_method === 'COD' ? 'CONFIRMED' : 'PENDING',
                payment_method: data.payment_method,
                payment_status: 'UNPAID',
                payment_expires_at: data.payment_method === 'VNPAY' ? expiresAt : null,
                shipping_address: shippingAddress,
                note: data.note || '',
                items: group.items
            });
            await order.save({ session });
        }

        user.cart_items = user.cart_items.filter((item) => !data.cart_item_ids.includes(item._id.toString()));
        await user.save({ session });
        return checkoutCode;
    });

    return getCheckout(userId, resultCode);
};

const getPaymentUrl = (checkout, ipAddress) => {
    if (!vnpayInstance || !process.env.VNP_RETURN_URL) throw new Error('VNPAY_NOT_CONFIGURED');
    if (checkout.payment_method !== 'VNPAY' || checkout.payment_status === 'PAID' || checkout.status === 'CANCELLED') {
        throw new Error('PAYMENT_UNAVAILABLE');
    }
    if (new Date(checkout.payment_expires_at) <= new Date()) throw new Error('PAYMENT_EXPIRED');

    return vnpayInstance.buildPaymentUrl({
        vnp_Amount: checkout.total,
        vnp_IpAddr: ipAddress,
        vnp_TxnRef: checkout.checkout_code,
        vnp_OrderInfo: 'Thanh toan don hang ' + checkout.checkout_code,
        vnp_OrderType: ProductCode.Other,
        vnp_ReturnUrl: process.env.VNP_RETURN_URL,
        vnp_CreateDate: formatVnpayDate(checkout.created_at),
        vnp_ExpireDate: formatVnpayDate(checkout.payment_expires_at)
    });
};

// Chỉ gọi sau khi chữ ký đã được xác thực ở controller hoặc QueryDR.
const updatePayment = async (payment) => {
    return mongoose.connection.transaction(async (session) => {
        const orders = await Order.find({ checkout_code: payment.vnp_TxnRef, payment_method: 'VNPAY' }).session(session);
        if (!orders.length) throw new Error('ORDER_NOT_FOUND');

        const amount = orders.reduce((total, order) => total + order.final_amount, 0);
        if (payment.vnp_Amount !== amount) throw new Error('PAYMENT_AMOUNT_MISMATCH');

        const success = payment.vnp_ResponseCode === '00' && payment.vnp_TransactionStatus === '00';
        if (orders.every((order) => order.payment_status === 'PAID')) return false;
        if (orders.every((order) => order.status === 'CANCELLED')) {
            if (!success) return false;
            // Nếu ngân hàng báo thu tiền sau khi đơn đã hủy, giữ đơn hủy để cửa hàng kiểm tra/hoàn tiền.
            for (const order of orders) {
                order.payment_status = 'PAID';
                order.payment_response_code = 'LATE_SUCCESS';
                order.paid_at = new Date();
                order.transaction_code = String(payment.vnp_TransactionNo || '');
                await order.save({ session });
            }
            return true;
        }
        if (payment.vnp_ResponseCode === '07' || (payment.vnp_ResponseCode === '00' && payment.vnp_TransactionStatus !== '00')) return true;

        const user = !success ? await User.findById(orders[0].user_id).session(session) : null;
        for (const order of orders) {
            if (success) {
                order.payment_status = 'PAID';
                order.status = 'CONFIRMED';
                order.paid_at = payment.vnp_PayDate ? parseVnpayDate(payment.vnp_PayDate) : new Date();
                order.transaction_code = String(payment.vnp_TransactionNo || '');
            } else {
                // Hoàn đúng cơ sở và lô đã xuất. Transaction ngăn callback lặp hoàn kho hai lần.
                for (const item of order.items) {
                    const product = await Product.findById(item.product_id).session(session);
                    const variant = product?.variants.id(item.variant_id);
                    if (!variant) throw new Error('PRODUCT_NOT_FOUND');

                    for (const allocation of item.stock_allocations) {
                        let stock = variant.stocks.find(
                            (lot) =>
                                lot.branch_id.equals(order.branch_id) &&
                                lot.batch_code === allocation.batch_code &&
                                lot.expiry_date.getTime() === allocation.expiry_date.getTime()
                        );
                        if (stock) {
                            stock.quantity = Math.round((stock.quantity + allocation.quantity) * 1000) / 1000;
                        } else {
                            variant.stocks.push({
                                branch_id: order.branch_id,
                                batch_code: allocation.batch_code,
                                quantity: allocation.quantity,
                                manufactured_date: allocation.manufactured_date,
                                expiry_date: allocation.expiry_date
                            });
                        }
                    }
                    await product.save({ session });
                    if (user) {
                        const cartItem = user.cart_items.find(
                            (entry) => entry.variant_id.equals(item.variant_id) && entry.branch_id.equals(order.branch_id)
                        );
                        if (cartItem) {
                            cartItem.quantity = Math.round((cartItem.quantity + item.quantity) * 1000) / 1000;
                        } else {
                            user.cart_items.push({
                                product_id: item.product_id,
                                variant_id: item.variant_id,
                                branch_id: order.branch_id,
                                quantity: item.quantity
                            });
                        }
                    }
                }
                order.status = 'CANCELLED';
            }
            order.payment_response_code = String(payment.vnp_ResponseCode);
            await order.save({ session });
        }
        if (user) await user.save({ session });
        return true;
    });
};

const checkPayment = async (userId, checkoutCode) => {
    const checkout = await getCheckout(userId, checkoutCode);
    if (!vnpayInstance || checkout.payment_method !== 'VNPAY' || checkout.payment_status === 'PAID' || checkout.status === 'CANCELLED')
        return checkout;

    const query = await vnpayInstance.queryDr({
        vnp_RequestId: crypto.randomUUID().replace(/-/g, ''),
        vnp_TxnRef: checkoutCode,
        vnp_OrderInfo: 'Kiem tra don hang ' + checkoutCode,
        vnp_TransactionDate: formatVnpayDate(checkout.created_at),
        vnp_CreateDate: formatVnpayDate(),
        vnp_IpAddr: '127.0.0.1'
    });

    // SDK chấp nhận response thiếu checksum ở QueryDR, nên phải kiểm tra có chữ ký.
    if (!query.vnp_SecureHash || !query.isVerified || query.vnp_TxnRef !== checkoutCode) throw new Error('PAYMENT_CHECK_FAILED');
    if (query.vnp_ResponseCode === '00' && query.vnp_TransactionStatus === '00') {
        await updatePayment({ ...query, vnp_Amount: Number(query.vnp_Amount) / 100, vnp_ResponseCode: '00', vnp_TransactionStatus: '00' });
    } else if (query.vnp_ResponseCode === '00' && query.vnp_TransactionStatus === '02') {
        await updatePayment({ ...query, vnp_Amount: Number(query.vnp_Amount) / 100, vnp_ResponseCode: '24' });
    } else if (query.vnp_ResponseCode === '91' && new Date(checkout.payment_expires_at).getTime() + 5 * 60 * 1000 < Date.now()) {
        await updatePayment({ vnp_TxnRef: checkoutCode, vnp_Amount: checkout.total, vnp_ResponseCode: '15', vnp_TransactionStatus: '02' });
    } else if (
        query.vnp_ResponseCode === '00' &&
        query.vnp_TransactionStatus === '01' &&
        new Date(checkout.payment_expires_at).getTime() + 5 * 60 * 1000 < Date.now()
    ) {
        await updatePayment({ ...query, vnp_Amount: Number(query.vnp_Amount) / 100, vnp_ResponseCode: '15' });
    }

    return getCheckout(userId, checkoutCode);
};

const checkExpiredPayments = async () => {
    if (!vnpayInstance) return;
    const orders = await Order.find({
        payment_method: 'VNPAY',
        payment_status: 'UNPAID',
        status: 'PENDING',
        payment_expires_at: { $lt: new Date(Date.now() - 5 * 60 * 1000) }
    })
        .select('user_id checkout_code')
        .limit(20);
    const checked = new Set();
    for (const order of orders) {
        if (checked.has(order.checkout_code)) continue;
        checked.add(order.checkout_code);
        try {
            await checkPayment(order.user_id, order.checkout_code);
        } catch {
            // Không hoàn kho khi chưa xác minh được kết quả; lần kiểm tra sau sẽ thử lại.
        }
    }
};

module.exports = { getPreview, getCheckout, createCheckout, getPaymentUrl, updatePayment, checkPayment, checkExpiredPayments };
