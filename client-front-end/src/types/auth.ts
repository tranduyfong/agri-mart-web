// Dữ liệu của form đăng nhập
export interface LoginFormValues {
  email: string;
  password: string;
}

// Dữ liệu của form đăng ký
export interface RegisterFormValues {
  lastName: string; // Họ
  firstName: string; // Tên
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

// Dữ liệu của form quên mật khẩu (bước nhập email)
export interface ForgotPasswordFormValues {
  email: string;
}

// Dữ liệu của form đặt lại mật khẩu
export interface ResetPasswordFormValues {
  newPassword: string;
  confirmPassword: string;
}

// Dữ liệu gửi lên API đăng ký (đúng tên trường mà back-end yêu cầu)
export interface RegisterRequest {
  full_name: string;
  email: string;
  password: string;
  phone: string;
}

// Dữ liệu API đăng nhập trả về
export interface LoginResponseData {
  user: AuthUser;
  accessToken: string;
}

// Thông tin người dùng trả về từ API đăng nhập của back-end
export interface AuthUser {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  status: 'ACTIVE' | 'LOCKED' | 'PENDING';
  avatar_url: string | null;
  role: 'ADMIN' | 'STAFF' | 'CUSTOMER';
  permissions: string[];
  role_code: 'ADMIN' | 'STAFF' | 'CUSTOMER';
  created_at: string;
}
