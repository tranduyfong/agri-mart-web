import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { AuthUser } from '../../types/auth';
import { getSavedAccessToken, getSavedUser } from '../../utils/authStorage';

// Lưu thông tin người dùng đang đăng nhập
interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
}

// Khi mở lại trang, lấy thông tin đăng nhập đã lưu trong localStorage (nếu có)
const initialState: AuthState = {
  user: getSavedUser(),
  accessToken: getSavedAccessToken(),
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Gọi sau khi đăng nhập thành công
    setCredentials: (state, action: PayloadAction<{ user: AuthUser; accessToken: string }>) => {
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
    },
    // Gọi khi đăng xuất
    logout: (state) => {
      state.user = null;
      state.accessToken = null;
    },
  },
});

export const { setCredentials, logout } = authSlice.actions;
export default authSlice.reducer;
