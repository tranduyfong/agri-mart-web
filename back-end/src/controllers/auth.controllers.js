const authService = require('../services/auth.services');
const { successResponse, errorResponse } = require('../utils/response.util');

const register = async (req, res) => {
    try {
        const { full_name, email, password, phone } = req.body || {};
        if (
            typeof full_name !== 'string' ||
            !full_name.trim() ||
            full_name.trim().length > 150 ||
            typeof email !== 'string' ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
            typeof password !== 'string' ||
            password.trim().length < 6 ||
            Buffer.byteLength(password, 'utf8') > 72 ||
            (phone != null && phone !== '' && (typeof phone !== 'string' || !/^(0|\+84)[35789]\d{8}$/.test(phone.trim())))
        ) {
            return errorResponse(res, 'VALIDATION_FAILED', 'Họ tên, email, mật khẩu hoặc số điện thoại không hợp lệ', 400);
        }

        // phone không bắt buộc, nếu không gửi lên thì lưu NULL
        const result = await authService.registerUser({ full_name: full_name.trim(), email, password, phone: phone?.trim() || null });

        return successResponse(res, result, null, 'Đăng ký tài khoản thành công', 201);
    } catch (error) {
        if (error.message === 'USER_ALREADY_EXISTS' || error.code === 11000) {
            return errorResponse(res, 'USER_ALREADY_EXISTS', 'Thông tin Email hoặc Số điện thoại đã tồn tại', 400);
        }
        return errorResponse(res, 'INTERNAL_SERVER_ERROR', 'Something went wrong', 500, null, error.message);
    }
};

const verifyEmail = async (req, res) => {
    try {
        const { email, otp } = req.body || {};
        if (typeof email !== 'string' || !email.trim() || !/^\d{6}$/.test(String(otp))) {
            return errorResponse(res, 'VALIDATION_FAILED', 'Email và mã xác minh 6 chữ số là bắt buộc', 400);
        }

        await authService.verifyEmailAccount(email, otp);

        return successResponse(res, null, null, 'Xác minh tài khoản thành công! Bạn có thể đăng nhập.', 200);
    } catch (error) {
        if (error.name === 'VersionError') {
            return errorResponse(res, 'CONFLICT', 'Tài khoản vừa thay đổi. Vui lòng thử lại.', 409);
        }
        if (error.message === 'ACCOUNT_LOCKED') {
            return errorResponse(res, 'ACCOUNT_LOCKED', 'Tài khoản đã bị khóa', 403);
        }
        if (error.message === 'USER_NOT_FOUND') return errorResponse(res, 'RESOURCE_NOT_FOUND', 'Tài khoản không tồn tại', 404);
        if (error.message === 'ALREADY_VERIFIED')
            return errorResponse(res, 'VALIDATION_FAILED', 'Tài khoản đã được xác minh trước đó', 400);
        if (error.message === 'INVALID_OTP') return errorResponse(res, 'VALIDATION_FAILED', 'Mã xác minh không chính xác', 400);
        if (error.message === 'OTP_EXPIRED') return errorResponse(res, 'VALIDATION_FAILED', 'Mã xác minh đã hết hạn', 400);
        if (error.message === 'OTP_TOO_MANY_ATTEMPTS')
            return errorResponse(res, 'OTP_TOO_MANY_ATTEMPTS', 'Bạn đã nhập sai quá nhiều lần, vui lòng yêu cầu gửi lại mã mới', 400);

        return errorResponse(res, 'INTERNAL_SERVER_ERROR', 'Lỗi hệ thống', 500, null, error.message);
    }
};

const resendVerifyEmail = async (req, res) => {
    try {
        const { email } = req.body || {};
        if (typeof email !== 'string' || !email.trim()) {
            return errorResponse(res, 'VALIDATION_FAILED', 'Email là bắt buộc', 400);
        }

        await authService.resendVerifyEmail(email);

        return successResponse(res, null, null, 'Mã xác minh mới đã được gửi đến email của bạn');
    } catch (error) {
        if (error.name === 'VersionError') {
            return errorResponse(res, 'CONFLICT', 'Tài khoản vừa thay đổi. Vui lòng thử lại.', 409);
        }
        if (error.message === 'ACCOUNT_LOCKED') {
            return errorResponse(res, 'ACCOUNT_LOCKED', 'Tài khoản đã bị khóa', 403);
        }
        if (error.message === 'USER_NOT_FOUND') return errorResponse(res, 'RESOURCE_NOT_FOUND', 'Tài khoản không tồn tại', 404);
        if (error.message === 'ALREADY_VERIFIED')
            return errorResponse(res, 'VALIDATION_FAILED', 'Tài khoản đã được xác minh trước đó', 400);

        return errorResponse(res, 'INTERNAL_SERVER_ERROR', 'Lỗi hệ thống khi gửi email', 500, null, error.message);
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body || {};
        if (typeof email !== 'string' || !email.trim() || typeof password !== 'string' || !password) {
            return errorResponse(res, 'VALIDATION_FAILED', 'Email và mật khẩu là bắt buộc', 400);
        }

        const result = await authService.loginUser(email, password);

        return successResponse(res, result, null, 'Đăng nhập thành công!', 200);
    } catch (error) {
        if (error.message === 'INVALID_CREDENTIALS') {
            return errorResponse(res, 'INVALID_CREDENTIALS', 'Email hoặc mật khẩu không đúng!', 400);
        }
        if (error.message === 'ACCOUNT_LOCKED') {
            return errorResponse(res, 'ACCOUNT_LOCKED', 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Admin!', 403);
        }
        if (error.message === 'ACCOUNT_UNVERIFIED') {
            return errorResponse(
                res,
                'ACCOUNT_UNVERIFIED',
                'Tài khoản chưa được xác minh. Vui lòng kiểm tra email để kích hoạt tài khoản!',
                403
            );
        }
        return errorResponse(res, 'INTERNAL_SERVER_ERROR', 'Lỗi hệ thống', 500, null, error.message);
    }
};

const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body || {};
        if (typeof email !== 'string' || !email.trim()) {
            return errorResponse(res, 'VALIDATION_FAILED', 'Email là bắt buộc', 400);
        }

        await authService.requestPasswordReset(email);

        return successResponse(res, null, null, 'Mã OTP đã được gửi đến email của bạn');
    } catch (error) {
        if (error.name === 'VersionError') {
            return errorResponse(res, 'CONFLICT', 'Tài khoản vừa thay đổi. Vui lòng thử lại.', 409);
        }
        if (error.message === 'ACCOUNT_LOCKED') {
            return errorResponse(res, 'ACCOUNT_LOCKED', 'Tài khoản đã bị khóa', 403);
        }
        if (error.message === 'USER_NOT_FOUND') {
            return errorResponse(res, 'RESOURCE_NOT_FOUND', 'Email không tồn tại trong hệ thống', 404);
        }
        return errorResponse(res, 'INTERNAL_SERVER_ERROR', 'Lỗi hệ thống khi gửi email', 500, null, error.message);
    }
};

const verifyOtpForgotPassword = async (req, res) => {
    try {
        const { email, otp } = req.body || {};
        if (typeof email !== 'string' || !email.trim() || !/^\d{6}$/.test(String(otp))) {
            return errorResponse(res, 'VALIDATION_FAILED', 'Email và mã OTP 6 chữ số là bắt buộc', 400);
        }

        await authService.verifyResetOtp(email, otp);

        return successResponse(res, null, null, 'Xác thực OTP thành công');
    } catch (error) {
        if (error.name === 'VersionError') {
            return errorResponse(res, 'CONFLICT', 'Tài khoản vừa thay đổi. Vui lòng thử lại.', 409);
        }
        if (error.message === 'ACCOUNT_LOCKED') {
            return errorResponse(res, 'ACCOUNT_LOCKED', 'Tài khoản đã bị khóa', 403);
        }
        if (error.message === 'USER_NOT_FOUND') {
            return errorResponse(res, 'RESOURCE_NOT_FOUND', 'Email không tồn tại trong hệ thống', 404);
        }
        if (error.message === 'INVALID_OTP') {
            return errorResponse(res, 'VALIDATION_FAILED', 'Mã OTP không chính xác', 400);
        }
        if (error.message === 'OTP_EXPIRED') {
            return errorResponse(res, 'VALIDATION_FAILED', 'Mã OTP đã hết hạn', 400);
        }
        if (error.message === 'OTP_TOO_MANY_ATTEMPTS') {
            return errorResponse(res, 'OTP_TOO_MANY_ATTEMPTS', 'Bạn đã nhập sai quá nhiều lần, vui lòng yêu cầu mã OTP mới', 400);
        }
        return errorResponse(res, 'INTERNAL_SERVER_ERROR', 'Lỗi hệ thống', 500, null, error.message);
    }
};

const resetPassword = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body || {};
        if (
            typeof email !== 'string' ||
            !email.trim() ||
            !/^\d{6}$/.test(String(otp)) ||
            typeof newPassword !== 'string' ||
            newPassword.trim().length < 6 ||
            Buffer.byteLength(newPassword, 'utf8') > 72
        ) {
            return errorResponse(res, 'VALIDATION_FAILED', 'Email, OTP hoặc mật khẩu mới không hợp lệ', 400);
        }

        await authService.resetPassword(email, otp, newPassword);

        return successResponse(res, null, null, 'Đặt lại mật khẩu thành công. Bạn có thể đăng nhập ngay bây giờ.');
    } catch (error) {
        if (error.name === 'VersionError') {
            return errorResponse(res, 'CONFLICT', 'Tài khoản vừa thay đổi. Vui lòng thử lại.', 409);
        }
        if (error.message === 'ACCOUNT_LOCKED') {
            return errorResponse(res, 'ACCOUNT_LOCKED', 'Tài khoản đã bị khóa', 403);
        }
        if (error.message === 'USER_NOT_FOUND' || error.message === 'INVALID_OTP' || error.message === 'OTP_EXPIRED') {
            return errorResponse(res, 'VALIDATION_FAILED', 'Thông tin xác thực không hợp lệ hoặc đã hết hạn', 400);
        }
        if (error.message === 'OTP_TOO_MANY_ATTEMPTS') {
            return errorResponse(res, 'OTP_TOO_MANY_ATTEMPTS', 'Bạn đã nhập sai quá nhiều lần, vui lòng yêu cầu mã OTP mới', 400);
        }
        return errorResponse(res, 'INTERNAL_SERVER_ERROR', 'Lỗi hệ thống', 500, null, error.message);
    }
};

module.exports = {
    register,
    login,
    forgotPassword,
    verifyOtpForgotPassword,
    resetPassword,
    verifyEmail,
    resendVerifyEmail
};
