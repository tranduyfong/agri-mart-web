const { getService } = require('../services/auth.services');
const { successResponse } = require('../utils/response.util');

const register = async (req, res, next) => {
    try {
        const result = await getService().register(req.input);
        const message = req.locale === 'en'
            ? 'Verification code sent.'
            : 'Đã gửi mã xác minh qua email.';

        res.setHeader('Cache-Control', 'no-store');

        return successResponse(res, result, null, message, 201);
    } catch (error) {
        next(error);
    }
};

const resend = async (req, res, next) => {
    try {
        const result = await getService().requestCode(req.input.email, 'REGISTER');
        const message = req.locale === 'en'
            ? 'If the account is pending and eligible, an email will be sent.'
            : 'Nếu tài khoản đang chờ xác minh và đủ điều kiện gửi lại, email sẽ được gửi.';

        res.setHeader('Cache-Control', 'no-store');

        return successResponse(res, result, null, message, 200);
    } catch (error) {
        next(error);
    }
};

const verifyEmail = async (req, res, next) => {
    try {
        const result = await getService().verify(req.input.email, req.input.code, 'REGISTER');
        const message = req.locale === 'en'
            ? 'Email verified. You can sign in.'
            : 'Email đã được xác minh. Bạn có thể đăng nhập.';

        res.setHeader('Cache-Control', 'no-store');

        return successResponse(res, result, null, message, 200);
    } catch (error) {
        next(error);
    }
};

const login = async (req, res, next) => {
    try {
        const result = await getService().login(req.input.email, req.input.password);
        const message = req.locale === 'en'
            ? 'Signed in.'
            : 'Đăng nhập thành công.';

        res.setHeader('Cache-Control', 'no-store');

        return successResponse(res, result, null, message, 200);
    } catch (error) {
        next(error);
    }
};

const forgot = async (req, res, next) => {
    try {
        const result = await getService().requestCode(req.input.email, 'RESET_PASSWORD');
        const message = req.locale === 'en'
            ? 'If the account is eligible, a reset code will be sent.'
            : 'Nếu email thuộc tài khoản hợp lệ và đủ điều kiện gửi lại, mã khôi phục sẽ được gửi.';

        res.setHeader('Cache-Control', 'no-store');

        return successResponse(res, result, null, message, 200);
    } catch (error) {
        next(error);
    }
};

const verifyReset = async (req, res, next) => {
    try {
        const result = await getService().verify(req.input.email, req.input.code, 'RESET_PASSWORD');
        const message = req.locale === 'en'
            ? 'Code verified. Set a new password within 10 minutes.'
            : 'Mã hợp lệ. Hãy đặt mật khẩu mới trong 10 phút.';

        res.setHeader('Cache-Control', 'no-store');

        return successResponse(res, result, null, message, 200);
    } catch (error) {
        next(error);
    }
};

const reset = async (req, res, next) => {
    try {
        const result = await getService().reset(req.input.resetToken, req.input.newPassword);
        const message = req.locale === 'en'
            ? 'Password reset. Sign in again.'
            : 'Đã đặt lại mật khẩu. Vui lòng đăng nhập lại.';

        res.setHeader('Cache-Control', 'no-store');

        return successResponse(res, result, null, message, 200);
    } catch (error) {
        next(error);
    }
};

const change = async (req, res, next) => {
    try {
        const result = await getService().changePassword(req.auth, req.input.currentPassword, req.input.newPassword);
        const message = req.locale === 'en'
            ? 'Password changed. All sessions revoked.'
            : 'Đã đổi mật khẩu và thu hồi các phiên đăng nhập.';

        res.setHeader('Cache-Control', 'no-store');

        return successResponse(res, result, null, message, 200);
    } catch (error) {
        next(error);
    }
};

const logout = async (req, res, next) => {
    try {
        const result = await getService().logout(req.auth);
        const message = req.locale === 'en'
            ? 'Signed out on all devices.'
            : 'Đã đăng xuất khỏi tất cả thiết bị.';

        res.setHeader('Cache-Control', 'no-store');

        return successResponse(res, result, null, message, 200);
    } catch (error) {
        next(error);
    }
};

const me = (req, res) => {
    const message = req.locale === 'en' ? 'Account details.' : 'Thông tin tài khoản.';

    res.setHeader('Cache-Control', 'no-store');

    return successResponse(res, req.auth.user, null, message);
};

module.exports = {
    register,
    resend,
    verifyEmail,
    login,
    forgot,
    verifyReset,
    reset,
    change,
    logout,
    me
};
