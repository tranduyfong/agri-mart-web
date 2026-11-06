// Đọc/lưu/xóa phiên trong localStorage; chỉ là dữ liệu phía trình duyệt, quyền thật vẫn do backend xác minh.
import type { AuthUser } from '../types/auth';

// Lưu thông tin đăng nhập vào localStorage để F5 (tải lại trang) vẫn giữ trạng thái đăng nhập

const ACCESS_TOKEN_KEY = 'accessToken';
const USER_KEY = 'user';

// Lưu hồ sơ và access token sau khi đăng nhập thành công.
export const saveAuth = (user: AuthUser, accessToken: string) => {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

// Đọc token để khôi phục phiên hoặc gắn vào Authorization của request.
export const getSavedAccessToken = () => {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
};

// Đọc hồ sơ đã lưu để khôi phục giao diện; backend vẫn là nơi xác thực phiên.
export const getSavedUser = (): AuthUser | null => {
  const userText = localStorage.getItem(USER_KEY);
  if (!userText) return null;

  try {
    return JSON.parse(userText);
  } catch {
    return null; // Dữ liệu bị lỗi thì coi như chưa đăng nhập
  }
};

// Xóa dữ liệu phiên khi đăng xuất hoặc token không còn hợp lệ.
export const clearAuth = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};
