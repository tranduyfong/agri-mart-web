import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';

// Store tổng của ứng dụng, mỗi slice quản lý 1 phần dữ liệu
export const store = configureStore({
  reducer: {
    auth: authReducer,
  },
});

// Kiểu dữ liệu của store, dùng cho useAppSelector / useAppDispatch
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
