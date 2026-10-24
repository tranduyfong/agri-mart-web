const mongoose = require('mongoose');
const cartService = require('../services/cart.services');
const { successResponse, errorResponse } = require('../utils/response.util');

const getCart = async (req, res) => {
    try {
        const items = await cartService.getCart(req.user.userId);
        return successResponse(res, items);
    } catch (error) {
        return errorResponse(res, 'INTERNAL_SERVER_ERROR', 'Lỗi hệ thống', 500, null, error.message);
    }
};

const addCartItem = async (req, res) => {
    try {
        const { variant_id, quantity } = req.body || {};
        if (!mongoose.isObjectIdOrHexString(variant_id) || !Number.isFinite(quantity) || quantity <= 0) {
            return errorResponse(res, 'VALIDATION_FAILED', 'Quy cách và số lượng không hợp lệ', 400);
        }

        await cartService.addCartItem(req.user.userId, variant_id, quantity);
        const items = await cartService.getCart(req.user.userId);
        return successResponse(res, items, null, 'Đã thêm sản phẩm vào giỏ hàng');
    } catch (error) {
        if (error.message === 'PRODUCT_NOT_FOUND') {
            return errorResponse(res, 'RESOURCE_NOT_FOUND', 'Sản phẩm không tồn tại hoặc đã ngừng bán', 404);
        }
        if (error.message === 'INSUFFICIENT_STOCK') {
            return errorResponse(res, 'INSUFFICIENT_STOCK', 'Số lượng vượt quá tồn kho còn hạn', 409);
        }
        if (error.message === 'INVALID_QUANTITY') {
            return errorResponse(res, 'VALIDATION_FAILED', 'Số lượng phải đúng bước bán và có tối đa 3 chữ số thập phân', 400);
        }
        if (error.name === 'VersionError') {
            return errorResponse(res, 'CONFLICT', 'Giỏ hàng vừa thay đổi. Vui lòng thử lại.', 409);
        }
        return errorResponse(res, 'INTERNAL_SERVER_ERROR', 'Lỗi hệ thống', 500, null, error.message);
    }
};

const updateCartItem = async (req, res) => {
    try {
        const { quantity } = req.body || {};
        if (!mongoose.isObjectIdOrHexString(req.params.id) || !Number.isFinite(quantity) || quantity <= 0) {
            return errorResponse(res, 'VALIDATION_FAILED', 'Mã sản phẩm hoặc số lượng không hợp lệ', 400);
        }

        await cartService.updateCartItem(req.user.userId, req.params.id, quantity);
        const items = await cartService.getCart(req.user.userId);
        return successResponse(res, items, null, 'Đã cập nhật số lượng');
    } catch (error) {
        if (error.message === 'CART_ITEM_NOT_FOUND' || error.message === 'PRODUCT_NOT_FOUND') {
            return errorResponse(res, 'RESOURCE_NOT_FOUND', 'Sản phẩm không còn khả dụng trong giỏ hàng', 404);
        }
        if (error.message === 'INSUFFICIENT_STOCK') {
            return errorResponse(res, 'INSUFFICIENT_STOCK', 'Số lượng vượt quá tồn kho còn hạn', 409);
        }
        if (error.message === 'INVALID_QUANTITY') {
            return errorResponse(res, 'VALIDATION_FAILED', 'Số lượng phải đúng bước bán và có tối đa 3 chữ số thập phân', 400);
        }
        if (error.name === 'VersionError') {
            return errorResponse(res, 'CONFLICT', 'Giỏ hàng vừa thay đổi. Vui lòng thử lại.', 409);
        }
        return errorResponse(res, 'INTERNAL_SERVER_ERROR', 'Lỗi hệ thống', 500, null, error.message);
    }
};

const removeCartItem = async (req, res) => {
    try {
        if (!mongoose.isObjectIdOrHexString(req.params.id)) {
            return errorResponse(res, 'VALIDATION_FAILED', 'Mã sản phẩm không hợp lệ', 400);
        }

        await cartService.removeCartItem(req.user.userId, req.params.id);
        const items = await cartService.getCart(req.user.userId);
        return successResponse(res, items, null, 'Đã xóa sản phẩm khỏi giỏ hàng');
    } catch (error) {
        if (error.message === 'CART_ITEM_NOT_FOUND') {
            return errorResponse(res, 'RESOURCE_NOT_FOUND', 'Sản phẩm không có trong giỏ hàng của bạn', 404);
        }
        if (error.name === 'VersionError') {
            return errorResponse(res, 'CONFLICT', 'Giỏ hàng vừa thay đổi. Vui lòng thử lại.', 409);
        }
        return errorResponse(res, 'INTERNAL_SERVER_ERROR', 'Lỗi hệ thống', 500, null, error.message);
    }
};

module.exports = { getCart, addCartItem, updateCartItem, removeCartItem };
