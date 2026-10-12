const authService = require('../services/auth.services');
const { successResponse, errorResponse } = require('../utils/response.util');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;

const register = async (req, res) => {
    try {
        const { full_name, email, password, phone } = req.body;

        if (!email || !password || !full_name) {
            return errorResponse(res, 'VALIDATION_FAILED', 'Tên, Email và Password là bắt buộc', 400);
        }

        if (typeof email !== 'string' || !EMAIL_REGEX.test(email)) {
            return errorResponse(res, 'VALIDATION_FAILED', 'Email không đúng định dạng', 400);
        }

        if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
            return errorResponse(res, 'VALIDATION_FAILED', `Mật khẩu phải là chuỗi có ít nhất ${MIN_PASSWORD_LENGTH} ký tự`, 400);
        }

        // phone không bắt buộc, nếu không gửi lên thì lưu NULL
        const result = await authService.registerUser({ full_name, email, password, phone: phone || null });

        return successResponse(res, result, null, 'Đăng ký tài khoản thành công', 201);
    } catch (error) {
        if (error.message === 'USER_ALREADY_EXISTS' || error.code === 'ER_DUP_ENTRY') {
            return errorResponse(res, 'USER_ALREADY_EXISTS', 'Thông tin Email hoặc Số điện thoại đã tồn tại', 400);
        }
        if (error.message === 'ROLE_NOT_FOUND') {
            return errorResponse(res, 'INTERNAL_SERVER_ERROR', 'Chưa khởi tạo quyền CUSTOMER trong hệ thống', 500);
        }
        return errorResponse(res, 'INTERNAL_SERVER_ERROR', 'Something went wrong', 500, null, error.message);
    }
};

const verifyEmail = async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) {
            return errorResponse(res, 'VALIDATION_FAILED', 'Email và mã xác minh là bắt buộc', 400);
        }

        await authService.verifyEmailAccount(email, otp);

        return successResponse(res, null, null, 'Xác minh tài khoản thành công! Bạn có thể đăng nhập.', 200);
    } catch (error) {
        if (error.message === 'USER_NOT_FOUND') return errorResponse(res, 'RESOURCE_NOT_FOUND', 'Tài khoản không tồn tại', 404);
        if (error.message === 'ALREADY_VERIFIED') return errorResponse(res, 'VALIDATION_FAILED', 'Tài khoản đã được xác minh trước đó', 400);
        if (error.message === 'INVALID_OTP') return errorResponse(res, 'VALIDATION_FAILED', 'Mã xác minh không chính xác', 400);
        if (error.message === 'OTP_EXPIRED') return errorResponse(res, 'VALIDATION_FAILED', 'Mã xác minh đã hết hạn', 400);
        if (error.message === 'OTP_TOO_MANY_ATTEMPTS') return errorResponse(res, 'OTP_TOO_MANY_ATTEMPTS', 'Bạn đã nhập sai quá nhiều lần, vui lòng yêu cầu gửi lại mã mới', 400);

        return errorResponse(res, 'INTERNAL_SERVER_ERROR', 'Lỗi hệ thống', 500, null, error.message);
    }
};

const resendVerifyEmail = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return errorResponse(res, 'VALIDATION_FAILED', 'Email là bắt buộc', 400);
        }

        await authService.resendVerifyEmail(email);

        return successResponse(res, null, null, 'Mã xác minh mới đã được gửi đến email của bạn');
    } catch (error) {
        if (error.message === 'USER_NOT_FOUND') return errorResponse(res, 'RESOURCE_NOT_FOUND', 'Tài khoản không tồn tại', 404);
        if (error.message === 'ALREADY_VERIFIED') return errorResponse(res, 'VALIDATION_FAILED', 'Tài khoản đã được xác minh trước đó', 400);

        return errorResponse(res, 'INTERNAL_SERVER_ERROR', 'Lỗi hệ thống khi gửi email', 500, null, error.message);
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
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
            return errorResponse(res, 'ACCOUNT_UNVERIFIED', 'Tài khoản chưa được xác minh. Vui lòng kiểm tra email để kích hoạt tài khoản!', 403);
        }
        return errorResponse(res, 'INTERNAL_SERVER_ERROR', 'Lỗi hệ thống', 500, null, error.message);
    }
};

const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return errorResponse(res, 'VALIDATION_FAILED', 'Email là bắt buộc', 400);
        }

        await authService.requestPasswordReset(email);

        return successResponse(res, null, null, 'Mã OTP đã được gửi đến email của bạn');
    } catch (error) {
        if (error.message === 'USER_NOT_FOUND') {
            return errorResponse(res, 'RESOURCE_NOT_FOUND', 'Email không tồn tại trong hệ thống', 404);
        }
        return errorResponse(res, 'INTERNAL_SERVER_ERROR', 'Lỗi hệ thống khi gửi email', 500, null, error.message);
    }
};

const verifyOtpForgotPassword = async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) {
            return errorResponse(res, 'VALIDATION_FAILED', 'Email và OTP là bắt buộc', 400);
        }

        await authService.verifyResetOtp(email, otp);

        return successResponse(res, null, null, 'Xác thực OTP thành công');
    } catch (error) {
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
        const { email, otp, newPassword } = req.body;

        if (!email || !otp || !newPassword) {
            return errorResponse(res, 'VALIDATION_FAILED', 'Vui lòng cung cấp đầy đủ email, OTP và mật khẩu mới', 400);
        }

        if (typeof newPassword !== 'string' || newPassword.length < MIN_PASSWORD_LENGTH) {
            return errorResponse(res, 'VALIDATION_FAILED', `Mật khẩu mới phải là chuỗi có ít nhất ${MIN_PASSWORD_LENGTH} ký tự`, 400);
        }

        await authService.resetPassword(email, otp, newPassword);

        return successResponse(res, null, null, 'Đặt lại mật khẩu thành công. Bạn có thể đăng nhập ngay bây giờ.');
    } catch (error) {
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
    register, login, forgotPassword, verifyOtpForgotPassword, resetPassword, verifyEmail, resendVerifyEmail
};
