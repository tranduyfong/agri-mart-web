// Luồng đặt hàng và thanh toán: tính lại tiền/kho, tạo đơn chờ xác nhận, xử lý VNPay và hoàn kho khi cần.
const crypto = require('crypto');
const mongoose = require('mongoose');
const { ProductCode } = require('vnpay');
const User = require('../models/user');
const Product = require('../models/product');
const Promotion = require('../models/promotion');
const Order = require('../models/order');
const { notifyOrdersChanged } = require('../utils/orderEvents.util');
const GoodsReceipt = require('../models/goodsReceipt');
const { getAllocationCost } = require('../utils/report.util');
const cartService = require('./cart.services');
const promotionService = require('./promotion.services');
const { calculateCouponDiscount } = require('../utils/promotion.util');
const vnpayInstance = require('../configs/vnpay.config');
const { availableStock, getSaleQuote } = require('../utils/productStock.util');
const { normalizeSearch } = require('../utils/string.util');
const { getToday, parseDate, formatVnpayDate, parseVnpayDate } = require('../utils/date.util');

// Đọc phí giao từ cấu hình và kiểm tra là số tiền nguyên không âm.
const getShippingFee = () => {
    const fee = Number(process.env.SHIPPING_FEE || 15000);
    if (!Number.isSafeInteger(fee) || fee < 0) throw new Error('INVALID_SHIPPING_CONFIG');
    return fee;
};

// Tính lại sản phẩm, lượng tồn, giá và mã giảm cho giỏ hoặc mua ngay; bước này chưa tạo đơn.
const getPreview = async (userId, cartItemIds, checkoutKey, couponCode = '', buyNow) => {
    if (checkoutKey) {
        // Lựa chọn này đã đặt thành đơn thì trả đơn cũ để frontend mở kết quả, thay vì tính lại như một lần mua mới.
        const existing = await Order.findOne({ user_id: userId, checkout_key: checkoutKey });
        if (existing) return { checkout: await getCheckout(userId, existing.checkout_code) };
    }
    let items;
    if (buyNow) {
        const selections = Array.isArray(buyNow) ? buyNow : [buyNow];
        items = [];
        for (const selection of selections) {
            const product = await Product.findOne({ 'variants._id': selection.variant_id, status: 'PUBLISHED' }).populate('category_id', 'name');
            const variant = product?.variants.id(selection.variant_id);
            if (!variant) throw new Error('PRODUCT_NOT_FOUND');
            const discounts = await require('./product.services').getProductDiscounts([product._id]);
            items.push({
                product_id: product.id,
                variant_id: variant._id.toString(),
                name: product.name,
                variant_name: variant.name,
                category_name: product.category_id?.name || '',
                unit: variant.unit,
                quantity: selection.quantity,
                ...getSaleQuote(variant, selection.quantity, discounts[product.id] || 0),
                step_quantity: variant.step_quantity,
                stock_quantity: availableStock(variant),
                status: product.status,
                thumbnail_url: product.images[0] || null,
                discount_percent: discounts[product.id] || 0
            });
        }
    } else {
        const cart = await cartService.getCart(userId);
        items = cart.filter((item) => cartItemIds.includes(item.id));
        if (items.length !== cartItemIds.length || !items.length) throw new Error('CART_CHANGED');
    }

    let subtotal = 0;
    let total = 0;
    for (const item of items) {
        const step = Math.round(item.step_quantity * 1000);
        const quantity = Math.round(item.quantity * 1000);
        if (
            item.status !== 'PUBLISHED' ||
            !Number.isFinite(item.quantity) ||
            item.quantity > item.stock_quantity ||
            item.quantity <= 0 ||
            Math.abs(item.quantity * 1000 - quantity) > 0.00001 ||
            quantity % step !== 0
        ) {
            throw new Error('INSUFFICIENT_STOCK');
        }

        item.discount_percent = Math.min(100, Math.max(0, item.discount_percent || 0));
        item.price ??= Math.round(item.list_price * (1 - item.discount_percent / 100));
        item.line_total ??= Math.round(item.price * item.quantity);
        subtotal += item.line_subtotal ?? Math.round(item.list_price * item.quantity);
        total += item.line_total;
    }

    const shippingFee = getShippingFee();
    const coupon = couponCode ? calculateCouponDiscount(await promotionService.getCoupon(couponCode), items, shippingFee) : null;
    const couponDiscount = coupon?.discount_amount || 0;
    return {
        items,
        subtotal,
        discount_amount: subtotal - total + couponDiscount,
        shipping_fee: shippingFee,
        total: total + shippingFee - couponDiscount,
        coupon: coupon ? { code: coupon.code, name: coupon.name, discount_amount: couponDiscount } : null,
        vnpay_available: !!vnpayInstance && !!process.env.VNP_RETURN_URL && total + shippingFee - couponDiscount > 0
    };
};

// Đơn mới có một phiếu duy nhất; lần mua cũ vẫn giữ đủ lịch sử xử lý.
const buildCheckoutSummary = (orders) => {
    const first = orders[0];
    const activeOrders = orders.filter((order) => order.status !== 'CANCELLED');
    const paymentOrders = first.payment_method === 'COD' && activeOrders.length ? activeOrders : orders;
    const stages = ['PENDING', 'CONFIRMED', 'SHIPPING', 'COMPLETED'];
    const status = activeOrders.length ? stages[Math.min(...activeOrders.map((order) => stages.indexOf(order.status)))] : 'CANCELLED';
    return {
        checkout_code: first.checkout_code || first.code,
        order_codes: orders.map((order) => order.code),
        payment_method: first.payment_method,
        payment_status: paymentOrders.every((order) => order.payment_status === 'PAID')
            ? 'PAID'
            : paymentOrders.every((order) => order.payment_status === 'REFUNDED')
              ? 'REFUNDED'
              : 'UNPAID',
        status,
        created_at: first.created_at,
        updated_at: new Date(Math.max(...orders.map((order) => new Date(order.updated_at || order.created_at).getTime()))),
        orders: orders.map((order) => ({
            code: order.code,
            status: order.status,
            payment_status: order.payment_status,
            updated_at: order.updated_at
        })),
        paid_at: first.paid_at,
        transaction_code: first.transaction_code,
        payment_expires_at: first.payment_expires_at,
        confirmed_at: first.confirmed_at,
        payment_ready_at: first.payment_ready_at,
        can_pay:
            first.payment_method === 'VNPAY' &&
            paymentOrders.every((order) => order.status === 'CONFIRMED') &&
            paymentOrders.every((order) => order.payment_status === 'UNPAID') &&
            !!first.payment_expires_at &&
            first.payment_expires_at > new Date(),
        shipping_address: first.shipping_address,
        note: first.note,
        subtotal: orders.reduce((total, order) => total + order.total_amount, 0),
        discount_amount: orders.reduce((total, order) => total + order.discount_amount, 0),
        coupon: first.coupon_code
            ? {
                  code: first.coupon_code,
                  name: first.coupon_name,
                  discount_amount: orders.reduce((total, order) => total + (order.coupon_discount_amount || 0), 0)
              }
            : null,
        shipping_fee: orders.reduce((total, order) => total + order.shipping_fee, 0),
        total: orders.reduce((total, order) => total + order.final_amount, 0),
        cancelled_amount: orders.filter((order) => order.status === 'CANCELLED').reduce((total, order) => total + order.final_amount, 0),
        amount_due: activeOrders.reduce((total, order) => total + order.final_amount, 0),
        items: orders.flatMap((order) =>
            order.items.map((item) => {
                const product = item.product_id;
                const variant = product?.variants?.find((entry) => entry._id.equals(item.variant_id));
                return {
                    product_id: product?._id.toString() || '',
                    variant_id: item.variant_id?.toString() || '',
                    name: item.name || product?.name || 'Sản phẩm không còn kinh doanh',
                    variant_name: item.variant_name || variant?.name || '',
                    category_name: item.category_name || '',
                    unit: item.unit || variant?.unit || '',
                    thumbnail_url: item.name ? item.thumbnail_url : product?.images?.[0] || null,
                    quantity: item.quantity,
                    list_price: item.list_price ?? item.price,
                    price: item.price,
                    line_total: item.line_total ?? Math.round(item.price * item.quantity),
                    price_breakdown: (item.stock_allocations || []).filter((lot) => lot.price != null).map((lot) => ({
                        batch_code: lot.batch_code, expiry_date: lot.expiry_date, quantity: lot.quantity,
                        list_price: lot.list_price, price: lot.price, line_total: Math.round(lot.price * lot.quantity)
                    }))
                };
            })
        )
    };
};

// Chỉ tìm lần mua thuộc đúng user, kể cả các đơn cũ có cách lưu mã khác.
const getCheckout = async (userId, checkoutCode) => {
    const orders = await Order.find({
        user_id: userId,
        $or: [{ checkout_code: checkoutCode }, { code: checkoutCode, checkout_code: null }]
    })
        .populate('items.product_id', 'name images variants')
        .sort({ code: 1 });
    if (!orders.length) throw new Error('ORDER_NOT_FOUND');
    return buildCheckoutSummary(orders);
};

// Gộp theo lần đặt rồi áp dụng bộ lọc và phân trang cho lịch sử mua của khách.
const getMyOrders = async (userId, filters, pagination) => {
    const orders = await Order.find({ user_id: userId })
        .populate('items.product_id', 'name images variants')
        .sort({ created_at: -1, code: 1 });

    const groups = new Map();
    for (const order of orders) {
        const code = order.checkout_code || order.code;
        if (!groups.has(code)) groups.set(code, []);
        groups.get(code).push(order);
    }
    const keyword = normalizeSearch(filters.keyword);
    const result = [...groups.values()].map(buildCheckoutSummary).filter((order) => {
        if (filters.status && order.status !== filters.status) return false;
        const text = [order.checkout_code, ...order.order_codes, ...order.items.map((item) => item.name)].join(' ');
        return !keyword || normalizeSearch(text).includes(keyword);
    });
    return {
        orders: result.slice(pagination.offset, pagination.offset + pagination.pageSize),
        totalElements: result.length
    };
};

// Trong một transaction: kiểm tra địa chỉ/giá/kho, xuất lô, lưu đơn chờ nhân viên và cập nhật giỏ khi cần.
const createCheckout = async (userId, data) => {
    const now = new Date();
    const checkoutCode = 'DH' + crypto.randomUUID().replace(/-/g, '').toUpperCase();

    // Nếu bất kỳ bước ghi đơn/xuất lô nào lỗi, transaction hủy toàn bộ để không mất tồn hoặc tạo đơn thiếu dòng.
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

        let selectedItems;
        if (data.buy_now) {
            const selections = Array.isArray(data.buy_now) ? data.buy_now : [data.buy_now];
            selectedItems = [];
            for (const selection of selections) {
                const product = await Product.findOne({ 'variants._id': selection.variant_id, status: 'PUBLISHED' }).session(session);
                if (!product) throw new Error('PRODUCT_NOT_FOUND');
                selectedItems.push({ product_id: product._id, variant_id: selection.variant_id, quantity: selection.quantity });
            }
        } else selectedItems = data.cart_item_ids.map((id) => user.cart_items.id(id));
        if (selectedItems.some((item) => !item)) throw new Error('CART_CHANGED');
        const costReceipts = await GoodsReceipt.find({
            created_at: { $lte: now }
        })
            .session(session)
            .lean();

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
            requires_code: { $ne: true },
            valid_from: { $lte: now },
            valid_to: { $gte: now }
        }).session(session);

        const items = [];
        let subtotal = 0;
        let discountAmount = 0;
        for (const cartItem of selectedItems) {
            const product = await Product.findOne({ _id: cartItem.product_id, status: 'PUBLISHED' })
                .populate('category_id', 'name')
                .session(session);
            const variant = product?.variants.id(cartItem.variant_id);
            if (!variant) throw new Error('PRODUCT_NOT_FOUND');

            // Đổi lượng thành đơn vị phần nghìn để kiểm tra bội số của step mà hạn chế sai số số thực.
            const units = Math.round(cartItem.quantity * 1000);
            const step = Math.round(variant.step_quantity * 1000);
            if (
                !Number.isFinite(cartItem.quantity) ||
                cartItem.quantity <= 0 ||
                Math.abs(cartItem.quantity * 1000 - units) > 0.00001 ||
                units % step !== 0 ||
                cartItem.quantity > availableStock(variant)
            ) {
                throw new Error('INSUFFICIENT_STOCK');
            }

            let discount = 0;
            for (const promotion of nowPromotions) {
                if (promotion.product_ids.some((id) => id.equals(product._id))) {
                    discount = Math.max(discount, Math.min(100, promotion.discount_value));
                }
            }
            const quote = getSaleQuote(variant, cartItem.quantity, discount);

            // Xuất lô còn hạn, ưu tiên lô hết hạn sớm; lưu lại để hoàn đúng lô nếu thanh toán lỗi.
            const allocations = [];
            for (const part of quote.price_breakdown) {
                const stock = variant.stocks.find((lot) => lot.batch_code === part.batch_code);
                const taken = part.quantity;
                stock.quantity = Math.round((stock.quantity - taken) * 1000) / 1000;
                allocations.push({
                    batch_code: stock.batch_code,
                    quantity: taken,
                    list_price: part.list_price,
                    price: part.price,
                    unit_cost: getAllocationCost(stock, { product_id: product._id, variant_sku: variant.sku }, costReceipts, now),
                    manufactured_date: stock.manufactured_date,
                    expiry_date: stock.expiry_date
                });
            }
            await product.save({ session });

            items.push({
                product_id: product._id,
                variant_id: variant._id,
                variant_sku: variant.sku,
                name: product.name,
                variant_name: variant.name,
                category_name: product.category_id?.name || '',
                unit: variant.unit,
                thumbnail_url: product.images[0] || null,
                quantity: cartItem.quantity,
                list_price: quote.list_price,
                price: quote.price,
                line_total: quote.line_total,
                line_subtotal: quote.line_subtotal,
                stock_allocations: allocations
            });
            subtotal += quote.line_subtotal;
            discountAmount += quote.line_subtotal - quote.line_total;
        }

        const shippingFee = getShippingFee();
        const coupon = data.coupon_code
            ? calculateCouponDiscount(await promotionService.getCoupon(data.coupon_code, session), items, shippingFee)
            : null;
        const couponDiscount = coupon?.discount_amount || 0;
        const total = subtotal - discountAmount + shippingFee - couponDiscount;
        if (!Number.isSafeInteger(total) || total < 0 || (total === 0 && data.payment_method === 'VNPAY'))
            throw new Error('INVALID_AMOUNT');
        // Frontend chỉ gửi tổng đã nhìn thấy; backend tự tính và yêu cầu xem lại nếu giá/ưu đãi đã đổi.
        if (total !== data.expected_total) throw new Error('PRICE_CHANGED');

        await Order.create(
            [
                {
                    code: checkoutCode,
                    checkout_code: checkoutCode,
                    checkout_key: data.checkout_key,
                    purchase_mode: data.buy_now ? 'BUY_NOW' : 'CART',
                    user_id: user._id,
                    total_amount: subtotal,
                    discount_amount: discountAmount + couponDiscount,
                    coupon_code: coupon?.code || null,
                    coupon_name: coupon?.name || null,
                    coupon_discount_amount: couponDiscount,
                    shipping_fee: shippingFee,
                    final_amount: total,
                    promotions:
                        coupon && couponDiscount > 0 ? [{ promotion_id: coupon.promotion_id, discount_amount: couponDiscount }] : [],
                    status: 'PENDING',
                    status_history: [{ status: 'PENDING', note: 'Khách hàng đặt hàng, chờ nhân viên gọi điện xác nhận' }],
                    payment_method: data.payment_method,
                    payment_status: 'UNPAID',
                    payment_expires_at: null,
                    shipping_address: shippingAddress,
                    note: data.note || '',
                    items
                }
            ],
            { session }
        );

        // Chỉ luồng mua từ giỏ mới xóa các dòng đã mua; mua ngay/gợi ý AI giữ nguyên giỏ đang có.
        if (!data.buy_now) {
            user.cart_items = user.cart_items.filter((item) => !data.cart_item_ids.includes(item._id.toString()));
            await user.save({ session });
        }
        return checkoutCode;
    });

    if (resultCode === checkoutCode) notifyOrdersChanged();
    return getCheckout(userId, resultCode);
};

// Chỉ tạo URL VNPay khi đơn đã được duyệt, chưa thanh toán và còn thời hạn.
const getPaymentUrl = (checkout, ipAddress) => {
    if (!vnpayInstance || !process.env.VNP_RETURN_URL) throw new Error('VNPAY_NOT_CONFIGURED');
    if (checkout.payment_method !== 'VNPAY' || checkout.payment_status === 'PAID' || checkout.status === 'CANCELLED') {
        throw new Error('PAYMENT_UNAVAILABLE');
    }
    if (checkout.status === 'PENDING') throw new Error('ORDER_NOT_CONFIRMED');
    if (!checkout.can_pay || !checkout.payment_ready_at) throw new Error('PAYMENT_UNAVAILABLE');
    if (new Date(checkout.payment_expires_at) <= new Date()) throw new Error('PAYMENT_EXPIRED');

    return vnpayInstance.buildPaymentUrl({
        vnp_Amount: checkout.total,
        vnp_IpAddr: ipAddress,
        vnp_TxnRef: checkout.checkout_code,
        vnp_OrderInfo: 'Thanh toan don hang ' + checkout.checkout_code,
        vnp_OrderType: ProductCode.Other,
        vnp_ReturnUrl: process.env.VNP_RETURN_URL,
        vnp_CreateDate: formatVnpayDate(checkout.payment_ready_at),
        vnp_ExpireDate: formatVnpayDate(checkout.payment_expires_at)
    });
};

// Chỉ gọi sau khi chữ ký đã được xác thực ở controller hoặc QueryDR.
const updatePayment = async (payment) => {
    const changed = await mongoose.connection.transaction(async (session) => {
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
            // Đơn đã hủy không được mở lại khi callback của lần thanh toán tới.
            if (order.status === 'CANCELLED') {
                if (success) {
                    order.payment_status = 'PAID';
                    order.paid_at = payment.vnp_PayDate ? parseVnpayDate(payment.vnp_PayDate) : new Date();
                    order.transaction_code = String(payment.vnp_TransactionNo || '');
                    order.payment_response_code = String(payment.vnp_ResponseCode);
                    await order.save({ session });
                }
                continue;
            }
            if (success) {
                order.payment_status = 'PAID';
                // Callback chỉ cập nhật tiền, không thay thế việc duyệt đơn của nhân viên
                // và không đưa đơn đang giao/hoàn tất về trạng thái chuẩn bị.
                order.paid_at = payment.vnp_PayDate ? parseVnpayDate(payment.vnp_PayDate) : new Date();
                order.transaction_code = String(payment.vnp_TransactionNo || '');
            } else {
                // Hoàn đúng lô đã xuất. Transaction ngăn callback lặp hoàn kho hai lần.
                for (const item of order.items) {
                    const product = await Product.findById(item.product_id).session(session);
                    const variant = product?.variants.id(item.variant_id);
                    if (!variant) throw new Error('PRODUCT_NOT_FOUND');

                    for (const allocation of item.stock_allocations) {
                        let stock = variant.stocks.find(
                            (lot) =>
                                lot.batch_code === allocation.batch_code && lot.expiry_date.getTime() === allocation.expiry_date.getTime()
                        );
                        if (stock) {
                            stock.quantity = Math.round((stock.quantity + allocation.quantity) * 1000) / 1000;
                        } else {
                            variant.stocks.push({
                                batch_code: allocation.batch_code,
                                quantity: allocation.quantity,
                                list_price: allocation.list_price ?? null,
                                manufactured_date: allocation.manufactured_date,
                                expiry_date: allocation.expiry_date
                            });
                        }
                    }
                    await product.save({ session });
                    if (user) {
                        if (order.purchase_mode === 'BUY_NOW') continue;
                        const cartItem = user.cart_items.find((entry) => entry.variant_id.equals(item.variant_id));
                        if (cartItem) {
                            cartItem.quantity = Math.round((cartItem.quantity + item.quantity) * 1000) / 1000;
                        } else {
                            user.cart_items.push({
                                product_id: item.product_id,
                                variant_id: item.variant_id,
                                quantity: item.quantity
                            });
                        }
                    }
                }
                order.status = 'CANCELLED';
                order.status_history.push({ status: 'CANCELLED', note: 'Giao dịch VNPay không thành công hoặc hết thời gian thanh toán' });
            }
            order.payment_response_code = String(payment.vnp_ResponseCode);
            await order.save({ session });
        }
        if (user) await user.save({ session });
        return true;
    });
    if (changed) notifyOrdersChanged();
    return changed;
};

// Đối soát giao dịch với VNPay và đọc lại thông tin đơn của khách.
const checkPayment = async (userId, checkoutCode) => {
    const checkout = await getCheckout(userId, checkoutCode);
    if (
        !vnpayInstance ||
        checkout.payment_method !== 'VNPAY' ||
        checkout.payment_status === 'PAID' ||
        checkout.status === 'CANCELLED' ||
        checkout.status === 'PENDING' ||
        !checkout.payment_ready_at
    )
        return checkout;

    const query = await vnpayInstance.queryDr({
        vnp_RequestId: crypto.randomUUID().replace(/-/g, ''),
        vnp_TxnRef: checkoutCode,
        vnp_OrderInfo: 'Kiem tra don hang ' + checkoutCode,
        vnp_TransactionDate: formatVnpayDate(checkout.payment_ready_at),
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

// Tác vụ nền kiểm tra các đơn VNPay đến hạn để xử lý trạng thái còn treo.
const checkExpiredPayments = async () => {
    if (!vnpayInstance) return;
    const orders = await Order.find({
        payment_method: 'VNPAY',
        payment_status: 'UNPAID',
        status: 'CONFIRMED',
        payment_expires_at: { $ne: null, $lt: new Date(Date.now() - 5 * 60 * 1000) }
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

module.exports = { getPreview, getCheckout, getMyOrders, createCheckout, getPaymentUrl, updatePayment, checkPayment, checkExpiredPayments };
