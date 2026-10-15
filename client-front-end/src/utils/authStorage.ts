import type { AuthUser } from '../types/auth';

// Lưu thông tin đăng nhập vào localStorage để F5 (tải lại trang) vẫn giữ trạng thái đăng nhập

const ACCESS_TOKEN_KEY = 'accessToken';
const USER_KEY = 'user';

export const saveAuth = (user: AuthUser, accessToken: string) => {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const getSavedAccessToken = () => {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
};

export const getSavedUser = (): AuthUser | null => {
  const userText = localStorage.getItem(USER_KEY);
  if (!userText) return null;

  try {
    return JSON.parse(userText);
  } catch {
    return null; // Dữ liệu bị lỗi thì coi như chưa đăng nhập
  }
};

export const clearAuth = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};
