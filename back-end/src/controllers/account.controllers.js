const mongoose = require('mongoose');
const accountService = require('../services/account.services');
const { successResponse, errorResponse } = require('../utils/response.util');

const PHONE_PATTERN = /^(0|\+84)[35789]\d{8}$/;

const getAccount = async (req, res) => {
    try {
        const user = await accountService.getProfile(req.user.userId);
        const addresses = await accountService.getAddresses(req.user.userId);
        return successResponse(res, { user, addresses });
    } catch (error) {
        if (error.message === 'USER_NOT_FOUND') {
            return errorResponse(res, 'RESOURCE_NOT_FOUND', 'Tài khoản không tồn tại', 404);
        }
        return errorResponse(res, 'INTERNAL_SERVER_ERROR', 'Lỗi hệ thống', 500, null, error.message);
    }
};

const updateProfile = async (req, res) => {
    try {
        const { full_name, phone } = req.body || {};
        if (
            typeof full_name !== 'string' ||
            !full_name.trim() ||
            full_name.trim().length > 150 ||
            (phone != null && phone !== '' && (typeof phone !== 'string' || !PHONE_PATTERN.test(phone.trim())))
        ) {
            return errorResponse(res, 'VALIDATION_FAILED', 'Họ tên hoặc số điện thoại không hợp lệ', 400);
        }

        const user = await accountService.updateProfile(req.user.userId, {
            full_name: full_name.trim(),
            phone: phone?.trim() || null
        });
        return successResponse(res, user, null, 'Đã cập nhật thông tin cá nhân');
    } catch (error) {
        if (error.message === 'PHONE_ALREADY_EXISTS' || error.code === 11000) {
            return errorResponse(res, 'PHONE_ALREADY_EXISTS', 'Số điện thoại đã được dùng cho tài khoản khác', 409);
        }
        if (error.name === 'VersionError') {
            return errorResponse(res, 'CONFLICT', 'Tài khoản vừa thay đổi. Vui lòng thử lại.', 409);
        }
        return errorResponse(res, 'INTERNAL_SERVER_ERROR', 'Lỗi hệ thống', 500, null, error.message);
    }
};

const getAddresses = async (req, res) => {
    try {
        const addresses = await accountService.getAddresses(req.user.userId);
        return successResponse(res, addresses);
    } catch (error) {
        return errorResponse(res, 'INTERNAL_SERVER_ERROR', 'Lỗi hệ thống', 500, null, error.message);
    }
};

const getDefaultAddress = async (req, res) => {
    try {
        const address = await accountService.getDefaultAddress(req.user.userId);
        return successResponse(res, address);
    } catch (error) {
        return errorResponse(res, 'INTERNAL_SERVER_ERROR', 'Lỗi hệ thống', 500, null, error.message);
    }
};

const saveAddress = async (req, res) => {
    try {
        const { recipient_name, phone, province_code, ward_code, street_address = '', hamlet = '', is_default = false } = req.body || {};

        if (
            (req.params.id && !mongoose.isObjectIdOrHexString(req.params.id)) ||
            typeof recipient_name !== 'string' ||
            !recipient_name.trim() ||
            recipient_name.trim().length > 150 ||
            typeof phone !== 'string' ||
            !PHONE_PATTERN.test(phone.trim()) ||
            !/^\d+$/.test(String(province_code)) ||
            Number(province_code) <= 0 ||
            !/^\d+$/.test(String(ward_code)) ||
            Number(ward_code) <= 0 ||
            typeof street_address !== 'string' ||
            street_address.trim().length > 300 ||
            typeof hamlet !== 'string' ||
            hamlet.trim().length > 150 ||
            (!street_address.trim() && !hamlet.trim()) ||
            typeof is_default !== 'boolean'
        ) {
            return errorResponse(res, 'VALIDATION_FAILED', 'Tên người nhận, số điện thoại hoặc địa chỉ không hợp lệ', 400);
        }

        const addresses = await accountService.saveAddress(req.user.userId, req.params.id, {
            recipient_name: recipient_name.trim(),
            phone: phone.trim(),
            province_code,
            ward_code,
            street_address: street_address.trim(),
            hamlet: hamlet.trim(),
            is_default
        });
        return successResponse(res, addresses, null, req.params.id ? 'Đã cập nhật địa chỉ' : 'Đã thêm địa chỉ');
    } catch (error) {
        if (error.message === 'ADDRESS_NOT_FOUND') {
            return errorResponse(res, 'RESOURCE_NOT_FOUND', 'Địa chỉ không tồn tại trong tài khoản của bạn', 404);
        }
        if (error.message === 'PROVINCE_NOT_FOUND' || error.message === 'WARD_NOT_FOUND') {
            return errorResponse(res, 'VALIDATION_FAILED', 'Tỉnh hoặc phường/xã đã chọn không hợp lệ', 400);
        }
        if (error.message === 'ADDRESS_API_UNAVAILABLE') {
            return errorResponse(res, 'ADDRESS_API_UNAVAILABLE', 'Chưa tải được danh sách địa chỉ. Vui lòng thử lại.', 503);
        }
        if (error.name === 'VersionError') {
            return errorResponse(res, 'CONFLICT', 'Sổ địa chỉ vừa thay đổi. Vui lòng thử lại.', 409);
        }
        return errorResponse(res, 'INTERNAL_SERVER_ERROR', 'Lỗi hệ thống', 500, null, error.message);
    }
};

const setDefaultAddress = async (req, res) => {
    try {
        if (!mongoose.isObjectIdOrHexString(req.params.id)) {
            return errorResponse(res, 'VALIDATION_FAILED', 'Mã địa chỉ không hợp lệ', 400);
        }

        const addresses = await accountService.setDefaultAddress(req.user.userId, req.params.id);
        return successResponse(res, addresses, null, 'Đã đặt địa chỉ mặc định');
    } catch (error) {
        if (error.message === 'ADDRESS_NOT_FOUND') {
            return errorResponse(res, 'RESOURCE_NOT_FOUND', 'Địa chỉ không tồn tại trong tài khoản của bạn', 404);
        }
        if (error.name === 'VersionError') {
            return errorResponse(res, 'CONFLICT', 'Sổ địa chỉ vừa thay đổi. Vui lòng thử lại.', 409);
        }
        return errorResponse(res, 'INTERNAL_SERVER_ERROR', 'Lỗi hệ thống', 500, null, error.message);
    }
};

const removeAddress = async (req, res) => {
    try {
        if (!mongoose.isObjectIdOrHexString(req.params.id)) {
            return errorResponse(res, 'VALIDATION_FAILED', 'Mã địa chỉ không hợp lệ', 400);
        }

        const addresses = await accountService.removeAddress(req.user.userId, req.params.id);
        return successResponse(res, addresses, null, 'Đã xóa địa chỉ');
    } catch (error) {
        if (error.message === 'ADDRESS_NOT_FOUND') {
            return errorResponse(res, 'RESOURCE_NOT_FOUND', 'Địa chỉ không tồn tại trong tài khoản của bạn', 404);
        }
        if (error.name === 'VersionError') {
            return errorResponse(res, 'CONFLICT', 'Sổ địa chỉ vừa thay đổi. Vui lòng thử lại.', 409);
        }
        return errorResponse(res, 'INTERNAL_SERVER_ERROR', 'Lỗi hệ thống', 500, null, error.message);
    }
};

const changePassword = async (req, res) => {
    try {
        const { current_password, new_password, confirm_password } = req.body || {};
        if (
            typeof current_password !== 'string' ||
            !current_password ||
            typeof new_password !== 'string' ||
            new_password.trim().length < 6 ||
            Buffer.byteLength(new_password, 'utf8') > 72 ||
            confirm_password !== new_password
        ) {
            return errorResponse(
                res,
                'VALIDATION_FAILED',
                'Mật khẩu phải có ít nhất 6 ký tự, tối đa 72 byte và phần nhập lại phải khớp',
                400
            );
        }

        await accountService.changePassword(req.user.userId, req.user.tokenVersion, current_password, new_password);
        return successResponse(res, null, null, 'Đổi mật khẩu thành công. Vui lòng đăng nhập lại.');
    } catch (error) {
        if (error.message === 'WRONG_CURRENT_PASSWORD') {
            return errorResponse(res, 'WRONG_CURRENT_PASSWORD', 'Mật khẩu hiện tại không đúng', 400);
        }
        if (error.message === 'PASSWORD_UNCHANGED') {
            return errorResponse(res, 'PASSWORD_UNCHANGED', 'Mật khẩu mới phải khác mật khẩu hiện tại', 400);
        }
        if (error.message === 'SESSION_REVOKED') {
            return errorResponse(res, 'SESSION_REVOKED', 'Phiên đăng nhập đã kết thúc. Vui lòng đăng nhập lại.', 401);
        }
        if (error.name === 'VersionError') {
            return errorResponse(res, 'CONFLICT', 'Tài khoản vừa thay đổi. Vui lòng thử lại.', 409);
        }
        return errorResponse(res, 'INTERNAL_SERVER_ERROR', 'Lỗi hệ thống', 500, null, error.message);
    }
};

module.exports = {
    getAccount,
    updateProfile,
    getAddresses,
    getDefaultAddress,
    saveAddress,
    setDefaultAddress,
    removeAddress,
    changePassword
};
