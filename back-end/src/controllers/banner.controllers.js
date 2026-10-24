const bannerService = require('../services/banner.services');
const { successResponse } = require('../utils/response.util');
const { staffErrorResponse } = require('../utils/staffError.util');

const getPublicBanners = async (req, res) => {
    try {
        return successResponse(res, await bannerService.getPublicBanners());
    } catch (error) {
        return staffErrorResponse(res, error);
    }
};

module.exports = { getPublicBanners };
