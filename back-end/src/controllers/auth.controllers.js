const authService = require('../services/auth.services');
const { successResponse, errorResponse } = require('../utils/response.util');

const register = async (req, res) => {
    try {
        const { full_name, email, password, phone } = req.body;

        if (!email || !password || !full_name) {
            return errorResponse(res, 'VALIDATION_FAILED', 'Tên, Email và Password là bắt buộc', 400);
        }

        const result = await authService.registerUser({ full_name, email, password, phone });

        return successResponse(res, result, null, 'Đăng ký tài khoản thành công', 201);
    } catch (error) {
        if (error.message === 'USER_ALREADY_EXISTS') {
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

        return errorResponse(res, 'INTERNAL_SERVER_ERROR', 'Lỗi hệ thống', 500, null, error.message);
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const result = await authService.loginUser(email, password);

        return successResponse(res, result, null, 'Đăng nhập thành công!', 200);
    } catch (error) {
        if (error.message === 'INVALID_CREDENTIALS') {
            return errorResponse(res, 'INVALID_CREDENTIALS', 'Email hoặc mật khẩu không đúng!', 400);
        }
        if (error.message === 'ACCOUNT_LOCKED') {
            return errorResponse(res, 'ACCOUNT_LOCKED', 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Admin!', 403);
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
        return errorResponse(res, 'INTERNAL_SERVER_ERROR', 'Lỗi hệ thống', 500, null, error.message);
    }
};

const resetPassword = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;

        if (!email || !otp || !newPassword) {
            return errorResponse(res, 'VALIDATION_FAILED', 'Vui lòng cung cấp đầy đủ email, OTP và mật khẩu mới', 400);
        }

        if (newPassword.length < 6) {
            return errorResponse(res, 'VALIDATION_FAILED', 'Mật khẩu mới phải có ít nhất 6 ký tự', 400);
        }

        await authService.resetPassword(email, otp, newPassword);

        return successResponse(res, null, null, 'Đặt lại mật khẩu thành công. Bạn có thể đăng nhập ngay bây giờ.');
    } catch (error) {
        if (error.message === 'USER_NOT_FOUND' || error.message === 'INVALID_OTP' || error.message === 'OTP_EXPIRED') {
            return errorResponse(res, 'VALIDATION_FAILED', 'Thông tin xác thực không hợp lệ hoặc đã hết hạn', 400);
        }
        return errorResponse(res, 'INTERNAL_SERVER_ERROR', 'Lỗi hệ thống', 500, null, error.message);
    }
};

module.exports = {
    register, login, forgotPassword, verifyOtpForgotPassword, resetPassword, verifyEmail
};