const cartService = require('../services/cart.services');
const wishlistService = require('../services/wishlist.services');
const { successResponse, errorResponse } = require('../utils/response.util');

const ERRORS = {
    PRODUCT_NOT_FOUND: ['RESOURCE_NOT_FOUND', 'Sản phẩm không tồn tại hoặc đã ngừng bán', 404],
    CART_ITEM_NOT_FOUND: ['RESOURCE_NOT_FOUND', 'Sản phẩm không có trong giỏ hàng của bạn', 404],
    INSUFFICIENT_STOCK: ['INSUFFICIENT_STOCK', 'Số lượng vượt quá tồn kho còn hạn tại chi nhánh. Vui lòng chọn số lượng ít hơn.', 409],
    INVALID_QUANTITY: ['VALIDATION_FAILED', 'Số lượng phải là bội số của bước bán và có tối đa 3 chữ số thập phân', 400],
    ACCOUNT_UNAVAILABLE: ['FORBIDDEN', 'Tài khoản không khả dụng', 403],
};

const handleError = (res, error) => {
    const details = ERRORS[error.message];
    if (details) return errorResponse(res, ...details);
    return errorResponse(res, 'INTERNAL_SERVER_ERROR', 'Lỗi hệ thống', 500, null, error.message);
};

const isValidId = (value) => (typeof value === 'number' || typeof value === 'string') && /^\d+$/.test(String(value)) && Number.isSafeInteger(Number(value)) && Number(value) > 0;
const isValidQuantity = (value) => typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= 99999999999;

const getCart = async (req, res) => {
    try { return successResponse(res, await cartService.getCart(req.user.userId)); }
    catch (error) { return handleError(res, error); }
};

const addCartItem = async (req, res) => {
    const { variant_id, quantity } = req.body;
    if (!isValidId(variant_id) || !isValidQuantity(quantity)) {
        return errorResponse(res, 'VALIDATION_FAILED', 'Quy cách và số lượng không hợp lệ', 400);
    }
    try {
        await cartService.addCartItem(req.user.userId, variant_id, quantity);
        return successResponse(res, await cartService.getCart(req.user.userId), null, 'Đã thêm sản phẩm vào giỏ hàng');
    } catch (error) { return handleError(res, error); }
};

const updateCartItem = async (req, res) => {
    if (!isValidId(req.params.id) || !isValidQuantity(req.body.quantity)) {
        return errorResponse(res, 'VALIDATION_FAILED', 'Số lượng không hợp lệ', 400);
    }
    try {
        await cartService.updateCartItem(req.user.userId, req.params.id, req.body.quantity);
        return successResponse(res, await cartService.getCart(req.user.userId));
    } catch (error) { return handleError(res, error); }
};

const removeCartItem = async (req, res) => {
    if (!isValidId(req.params.id)) return errorResponse(res, 'VALIDATION_FAILED', 'Mã sản phẩm không hợp lệ', 400);
    try {
        await cartService.removeCartItem(req.user.userId, req.params.id);
        return successResponse(res, await cartService.getCart(req.user.userId));
    } catch (error) { return handleError(res, error); }
};

const getWishlist = async (req, res) => {
    try { return successResponse(res, await wishlistService.getWishlist(req.user.userId)); }
    catch (error) { return handleError(res, error); }
};

const changeWishlist = (isAdding) => async (req, res) => {
    if (!isValidId(req.params.id)) return errorResponse(res, 'VALIDATION_FAILED', 'Mã sản phẩm không hợp lệ', 400);
    try {
        const action = isAdding ? wishlistService.addWishlistItem : wishlistService.removeWishlistItem;
        await action(req.user.userId, req.params.id);
        return successResponse(res, await wishlistService.getWishlist(req.user.userId));
    } catch (error) { return handleError(res, error); }
};

module.exports = { getCart, addCartItem, updateCartItem, removeCartItem, getWishlist, addWishlistItem: changeWishlist(true), removeWishlistItem: changeWishlist(false) };
