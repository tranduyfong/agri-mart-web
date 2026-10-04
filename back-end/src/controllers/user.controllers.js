const { getUserService } = require('../services/user.services');
const { successResponse } = require('../utils/response.util');

const getProfile = async (req, res, next) => {
    try {
        const profile = await getUserService().getProfile(req.auth);
        const message = req.locale === 'en' ? 'Account details.' : 'Thông tin tài khoản.';

        return successResponse(res, profile, null, message);
    } catch (error) {
        next(error);
    }
};

const updateProfile = async (req, res, next) => {
    try {
        const profile = await getUserService().updateProfile(req.auth, req.input);
        const message = req.locale === 'en' ? 'Profile updated.' : 'Đã cập nhật thông tin cá nhân.';

        return successResponse(res, profile, null, message);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getProfile,
    updateProfile
};
