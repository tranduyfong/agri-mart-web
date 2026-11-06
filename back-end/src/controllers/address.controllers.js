// Nhận request của nhóm tỉnh/phường xã, kiểm tra đầu vào và gọi service; successResponse/errorResponse thống nhất dữ
// liệu trả cho frontend.
const addressService = require('../services/address.services');
const { successResponse, errorResponse } = require('../utils/response.util');

// Gọi service địa chỉ và trả danh sách tỉnh; lỗi dịch vụ ngoài được đổi thành response API.
const getProvinces = async (req, res) => {
    try {
        const provinces = await addressService.getProvinces();
        return successResponse(res, provinces);
    } catch (error) {
        return errorResponse(res, 'ADDRESS_API_UNAVAILABLE', 'Chưa tải được danh sách địa chỉ. Vui lòng thử lại.', 503);
    }
};

// Đọc mã tỉnh từ URL rồi lấy danh sách phường/xã tương ứng.
const getWardsByProvince = async (req, res) => {
    try {
        const wards = await addressService.getWardsByProvince(req.params.code);
        return successResponse(res, wards);
    } catch (error) {
        if (error.message === 'INVALID_ADDRESS_CODE') {
            return errorResponse(res, 'VALIDATION_FAILED', 'Mã tỉnh/thành phố không hợp lệ', 400);
        }
        if (error.message === 'PROVINCE_NOT_FOUND') {
            return errorResponse(res, 'RESOURCE_NOT_FOUND', 'Tỉnh/thành phố không tồn tại', 404);
        }
        return errorResponse(res, 'ADDRESS_API_UNAVAILABLE', 'Chưa tải được danh sách địa chỉ. Vui lòng thử lại.', 503);
    }
};

module.exports = { getProvinces, getWardsByProvince };
