const mongoose = require('mongoose');
const wishlistService = require('../services/wishlist.services');
const { successResponse, errorResponse } = require('../utils/response.util');

const getWishlist = async (req, res) => {
    try {
        const products = await wishlistService.getWishlist(req.user.userId);
        return successResponse(res, products);
    } catch (error) {
        return errorResponse(res, 'INTERNAL_SERVER_ERROR', 'Lỗi hệ thống', 500, null, error.message);
    }
};

const addWishlistItem = async (req, res) => {
    try {
        if (!mongoose.isObjectIdOrHexString(req.params.id)) {
            return errorResponse(res, 'VALIDATION_FAILED', 'Mã sản phẩm không hợp lệ', 400);
        }

        await wishlistService.addWishlistItem(req.user.userId, req.params.id);
        const products = await wishlistService.getWishlist(req.user.userId);
        return successResponse(res, products, null, 'Đã thêm vào danh sách yêu thích');
    } catch (error) {
        if (error.message === 'PRODUCT_NOT_FOUND') {
            return errorResponse(res, 'RESOURCE_NOT_FOUND', 'Sản phẩm không tồn tại hoặc đã ngừng bán', 404);
        }
        return errorResponse(res, 'INTERNAL_SERVER_ERROR', 'Lỗi hệ thống', 500, null, error.message);
    }
};

const removeWishlistItem = async (req, res) => {
    try {
        if (!mongoose.isObjectIdOrHexString(req.params.id)) {
            return errorResponse(res, 'VALIDATION_FAILED', 'Mã sản phẩm không hợp lệ', 400);
        }

        await wishlistService.removeWishlistItem(req.user.userId, req.params.id);
        const products = await wishlistService.getWishlist(req.user.userId);
        return successResponse(res, products, null, 'Đã xóa khỏi danh sách yêu thích');
    } catch (error) {
        return errorResponse(res, 'INTERNAL_SERVER_ERROR', 'Lỗi hệ thống', 500, null, error.message);
    }
};

module.exports = { getWishlist, addWishlistItem, removeWishlistItem };
