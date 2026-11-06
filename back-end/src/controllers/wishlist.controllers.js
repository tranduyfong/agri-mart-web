// Nhận request của nhóm sản phẩm yêu thích, kiểm tra đầu vào và gọi service; successResponse/errorResponse thống nhất
// dữ liệu trả cho frontend.
const mongoose = require('mongoose');
const wishlistService = require('../services/wishlist.services');
const { successResponse, errorResponse } = require('../utils/response.util');

// Trả sản phẩm yêu thích của tài khoản trong JWT.
const getWishlist = async (req, res) => {
    try {
        const products = await wishlistService.getWishlist(req.user.userId);
        return successResponse(res, products);
    } catch (error) {
        return errorResponse(res, 'INTERNAL_SERVER_ERROR', 'Lỗi hệ thống', 500, null, error.message);
    }
};

// Kiểm tra ID và thêm sản phẩm vào yêu thích của người đăng nhập.
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

// Bỏ sản phẩm khỏi yêu thích của chính tài khoản đang dùng.
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
