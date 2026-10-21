const addressService = require('../services/address.services');
const { successResponse, errorResponse } = require('../utils/response.util');

const getProvinces = async (req, res) => {
    try {
        const provinces = await addressService.getProvinces();
        return successResponse(res, provinces);
    } catch (error) {
        return errorResponse(res, 'ADDRESS_API_UNAVAILABLE', 'Chưa tải được danh sách địa chỉ. Vui lòng thử lại.', 503);
    }
};

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
