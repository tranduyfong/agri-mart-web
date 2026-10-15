import apiClient from './apiClient';
import type { ApiResponse } from '../types/api';
import type { AuthUser, LoginResponseData, RegisterRequest } from '../types/auth';

// Các API xác thực (back-end: back-end/src/routes/auth.routes.js)
// Mỗi hàm trả về nguyên response của back-end: { code, message, data, ... }
// Nếu back-end báo lỗi (4xx, 5xx), axios sẽ ném lỗi -> nơi gọi tự bắt bằng try/catch

// Đăng ký tài khoản -> back-end gửi mã xác minh về email
const register = async (data: RegisterRequest) => {
  const response = await apiClient.post<ApiResponse<AuthUser>>('/auth/register', data);
  return response.data;
};

// Xác minh email bằng mã OTP
const verifyEmail = async (email: string, otp: string) => {
  const response = await apiClient.post<ApiResponse<null>>('/auth/verify-email', { email, otp });
  return response.data;
};

// Gửi lại mã xác minh email
const resendVerifyEmail = async (email: string) => {
  const response = await apiClient.post<ApiResponse<null>>('/auth/resend-verify-email', { email });
  return response.data;
};

// Đăng nhập -> trả về thông tin người dùng + accessToken
const login = async (email: string, password: string) => {
  const response = await apiClient.post<ApiResponse<LoginResponseData>>('/auth/login', { email, password });
  return response.data;
};

// Quên mật khẩu: gửi mã OTP về email
const forgotPassword = async (email: string) => {
  const response = await apiClient.post<ApiResponse<null>>('/auth/forgot-password', { email });
  return response.data;
};

// Quên mật khẩu: kiểm tra mã OTP
const verifyForgotPasswordOtp = async (email: string, otp: string) => {
  const response = await apiClient.post<ApiResponse<null>>('/auth/verify-otp-forgot-password', { email, otp });
  return response.data;
};

// Quên mật khẩu: đặt mật khẩu mới (cần gửi lại email + mã OTP)
const resetPassword = async (email: string, otp: string, newPassword: string) => {
  const response = await apiClient.post<ApiResponse<null>>('/auth/reset-password', { email, otp, newPassword });
  return response.data;
};

const authService = {
  register,
  verifyEmail,
  resendVerifyEmail,
  login,
  forgotPassword,
  verifyForgotPasswordOtp,
  resetPassword,
};

export default authService;
