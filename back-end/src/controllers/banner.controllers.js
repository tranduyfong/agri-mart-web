// Nhận request của nhóm banner công khai, kiểm tra đầu vào và gọi service; successResponse/errorResponse thống nhất
// dữ liệu trả cho frontend.
const bannerService = require('../services/banner.services');
const { successResponse } = require('../utils/response.util');
const { staffErrorResponse } = require('../utils/staffError.util');

// Trả các banner được service xác định đang được phép hiển thị cho khách.
const getPublicBanners = async (req, res) => {
    try {
        return successResponse(res, await bannerService.getPublicBanners());
    } catch (error) {
        return staffErrorResponse(res, error);
    }
};

module.exports = { getPublicBanners };
