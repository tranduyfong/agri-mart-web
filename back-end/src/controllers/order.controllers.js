const mongoose = require('mongoose');
const orderService = require('../services/order.services');
const vnpayInstance = require('../configs/vnpay.config');
const { successResponse, errorResponse } = require('../utils/response.util');

const getPreview = async (req, res) => {
    try {
        const { cart_item_ids, checkout_key } = req.body || {};
        if (
            !Array.isArray(cart_item_ids) ||
            !cart_item_ids.length ||
            cart_item_ids.length > 100 ||
            cart_item_ids.some((id) => !mongoose.isObjectIdOrHexString(id)) ||
            new Set(cart_item_ids).size !== cart_item_ids.length ||
            typeof checkout_key !== 'string' ||
            !/^[a-zA-Z0-9-]{16,80}$/.test(checkout_key)
        ) {
            return errorResponse(res, 'VALIDATION_FAILED', 'Danh sách sản phẩm thanh toán không hợp lệ', 400);
        }
        const preview = await orderService.getPreview(req.user.userId, cart_item_ids, checkout_key);
        return successResponse(res, preview);
    } catch (error) {
        if (error.message === 'CART_CHANGED' || error.message === 'INSUFFICIENT_STOCK') {
            return errorResponse(res, 'CART_CHANGED', 'Giỏ hàng hoặc tồn kho đã thay đổi. Vui lòng kiểm tra lại giỏ hàng.', 409);
        }
        return errorResponse(res, 'INTERNAL_SERVER_ERROR', 'Không thể tải thông tin thanh toán', 500, null, error.message);
    }
};

const checkout = async (req, res) => {
    try {
        const data = req.body || {};
        if (
            !Array.isArray(data.cart_item_ids) ||
            !data.cart_item_ids.length ||
            data.cart_item_ids.length > 100 ||
            data.cart_item_ids.some((id) => !mongoose.isObjectIdOrHexString(id)) ||
            new Set(data.cart_item_ids).size !== data.cart_item_ids.length ||
            !mongoose.isObjectIdOrHexString(data.address_id) ||
            typeof data.checkout_key !== 'string' ||
            !/^[a-zA-Z0-9-]{16,80}$/.test(data.checkout_key) ||
            typeof data.recipient_name !== 'string' ||
            !data.recipient_name.trim() ||
            data.recipient_name.trim().length > 150 ||
            typeof data.phone !== 'string' ||
            !/^(0|\+84)[35789]\d{8}$/.test(data.phone.trim()) ||
            typeof data.email !== 'string' ||
            data.email.length > 254 ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim()) ||
            !['COD', 'VNPAY'].includes(data.payment_method) ||
            !Number.isSafeInteger(data.expected_total) ||
            data.expected_total <= 0 ||
            (data.note !== undefined && (typeof data.note !== 'string' || data.note.length > 1000))
        ) {
            return errorResponse(res, 'VALIDATION_FAILED', 'Thông tin người nhận, địa chỉ hoặc sản phẩm không hợp lệ', 400);
        }

        const order = await orderService.createCheckout(req.user.userId, {
            cart_item_ids: data.cart_item_ids,
            checkout_key: data.checkout_key,
            address_id: data.address_id,
            recipient_name: data.recipient_name.trim(),
            phone: data.phone.trim(),
            email: data.email.trim(),
            note: data.note?.trim(),
            payment_method: data.payment_method,
            expected_total: data.expected_total
        });

        let redirectUrl = null;
        if (
            order.payment_method === 'VNPAY' &&
            order.payment_status !== 'PAID' &&
            order.status !== 'CANCELLED' &&
            new Date(order.payment_expires_at) > new Date()
        ) {
            const ipAddress = req.socket.remoteAddress?.replace('::ffff:', '').replace('::1', '127.0.0.1') || '127.0.0.1';
            redirectUrl = orderService.getPaymentUrl(order, ipAddress);
        }
        return successResponse(res, { checkout_code: order.checkout_code, redirectUrl }, null, 'Đã tạo đơn hàng', 201);
    } catch (error) {
        if (error.message === 'ADDRESS_NOT_FOUND') {
            return errorResponse(res, 'VALIDATION_FAILED', 'Địa chỉ không còn trong sổ địa chỉ của bạn. Vui lòng chọn lại.', 400);
        }
        if (['CART_CHANGED', 'INSUFFICIENT_STOCK', 'PRODUCT_NOT_FOUND', 'PRICE_CHANGED'].includes(error.message)) {
            return errorResponse(res, 'CART_CHANGED', 'Sản phẩm hoặc số lượng không còn khả dụng. Vui lòng kiểm tra lại giỏ hàng.', 409);
        }
        if (error.message === 'VNPAY_NOT_CONFIGURED') {
            return errorResponse(
                res,
                'VNPAY_NOT_CONFIGURED',
                'Thanh toán VNPay chưa sẵn sàng. Vui lòng chọn thanh toán khi nhận hàng.',
                503
            );
        }
        if (error.message === 'INVALID_AMOUNT') {
            return errorResponse(res, 'VALIDATION_FAILED', 'Giá trị đơn hàng không hợp lệ', 400);
        }
        if (error.name === 'VersionError' || error.code === 11000) {
            return errorResponse(res, 'CONFLICT', 'Giỏ hàng vừa thay đổi. Vui lòng thử lại.', 409);
        }
        return errorResponse(res, 'INTERNAL_SERVER_ERROR', 'Không thể tạo đơn hàng. Vui lòng thử lại.', 500, null, error.message);
    }
};

const getDetail = async (req, res) => {
    try {
        const order = await orderService.getCheckout(req.user.userId, req.params.code);
        return successResponse(res, order);
    } catch (error) {
        if (error.message === 'ORDER_NOT_FOUND') return errorResponse(res, 'RESOURCE_NOT_FOUND', 'Không tìm thấy đơn hàng của bạn', 404);
        return errorResponse(res, 'INTERNAL_SERVER_ERROR', 'Không thể tải đơn hàng', 500, null, error.message);
    }
};

const getPaymentUrl = async (req, res) => {
    try {
        const order = await orderService.getCheckout(req.user.userId, req.params.code);
        const ipAddress = req.socket.remoteAddress?.replace('::ffff:', '').replace('::1', '127.0.0.1') || '127.0.0.1';
        return successResponse(res, { redirectUrl: orderService.getPaymentUrl(order, ipAddress) });
    } catch (error) {
        if (error.message === 'ORDER_NOT_FOUND') return errorResponse(res, 'RESOURCE_NOT_FOUND', 'Không tìm thấy đơn hàng', 404);
        if (['PAYMENT_EXPIRED', 'PAYMENT_UNAVAILABLE'].includes(error.message)) {
            return errorResponse(res, 'PAYMENT_UNAVAILABLE', 'Phiên thanh toán đã kết thúc. Vui lòng kiểm tra trạng thái đơn hàng.', 409);
        }
        return errorResponse(res, 'VNPAY_UNAVAILABLE', 'Chưa thể mở cổng thanh toán VNPay', 503);
    }
};

const checkPayment = async (req, res) => {
    try {
        return successResponse(res, await orderService.checkPayment(req.user.userId, req.params.code));
    } catch (error) {
        if (error.message === 'ORDER_NOT_FOUND') return errorResponse(res, 'RESOURCE_NOT_FOUND', 'Không tìm thấy đơn hàng', 404);
        return errorResponse(res, 'PAYMENT_CHECK_FAILED', 'Chưa xác minh được giao dịch. Vui lòng thử lại sau.', 503);
    }
};

const vnpayReturn = async (req, res) => {
    try {
        if (
            !vnpayInstance ||
            req.query.vnp_TmnCode !== process.env.VNP_TMN_CODE ||
            Object.values(req.query).some((value) => typeof value !== 'string') ||
            !/^\d+$/.test(req.query.vnp_Amount || '')
        ) {
            return errorResponse(res, 'INVALID_PAYMENT_SIGNATURE', 'Thông tin thanh toán không hợp lệ', 400);
        }

        const payment = vnpayInstance.verifyReturnUrl(req.query);
        if (!payment.isVerified) return errorResponse(res, 'INVALID_PAYMENT_SIGNATURE', 'Chữ ký thanh toán không hợp lệ', 400);
        await orderService.updatePayment(payment);
        return successResponse(res, { checkout_code: payment.vnp_TxnRef });
    } catch (error) {
        if (error.message === 'ORDER_NOT_FOUND') return errorResponse(res, 'RESOURCE_NOT_FOUND', 'Không tìm thấy giao dịch', 404);
        if (error.message === 'PAYMENT_AMOUNT_MISMATCH')
            return errorResponse(res, 'PAYMENT_AMOUNT_MISMATCH', 'Số tiền thanh toán không khớp đơn hàng', 400);
        return errorResponse(res, 'PAYMENT_CHECK_FAILED', 'Chưa xác minh được giao dịch. Vui lòng thử lại.', 503);
    }
};

const vnpayIpn = async (req, res) => {
    try {
        if (
            !vnpayInstance ||
            req.query.vnp_TmnCode !== process.env.VNP_TMN_CODE ||
            Object.values(req.query).some((value) => typeof value !== 'string') ||
            !/^\d+$/.test(req.query.vnp_Amount || '')
        ) {
            return res.json({ RspCode: '97', Message: 'Checksum failed' });
        }

        const payment = vnpayInstance.verifyIpnCall(req.query);
        if (!payment.isVerified) return res.json({ RspCode: '97', Message: 'Checksum failed' });
        const updated = await orderService.updatePayment(payment);
        return res.json(updated ? { RspCode: '00', Message: 'Confirm Success' } : { RspCode: '02', Message: 'Order already confirmed' });
    } catch (error) {
        if (error.message === 'ORDER_NOT_FOUND') return res.json({ RspCode: '01', Message: 'Order not found' });
        if (error.message === 'PAYMENT_AMOUNT_MISMATCH') return res.json({ RspCode: '04', Message: 'Invalid amount' });
        return res.json({ RspCode: '99', Message: 'Unknown error' });
    }
};

module.exports = { getPreview, checkout, getDetail, getPaymentUrl, checkPayment, vnpayReturn, vnpayIpn };
