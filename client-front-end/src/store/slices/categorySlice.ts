import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import categoryService from '../../services/categoryService';
import type { Category } from '../../types/category';

// Danh mục được dùng ở nhiều nơi (thanh điều hướng, ô tìm kiếm, trang chủ...)
// nên lưu vào Redux để chỉ cần gọi API 1 lần cho cả ứng dụng
interface CategoryState {
  items: Category[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed'; // idle = chưa tải lần nào
}

const initialState: CategoryState = {
  items: [],
  status: 'idle',
};

// Gọi API lấy tất cả danh mục (tối đa 100 - đủ dùng cho cửa hàng)
export const fetchCategories = createAsyncThunk('category/fetchCategories', async () => {
  const response = await categoryService.getCategories({ pageSize: 100 });
  return response.data;
});

const categorySlice = createSlice({
  name: 'category',
  initialState,
  reducers: {},
  // Cập nhật state theo từng giai đoạn của lời gọi API
  extraReducers: (builder) => {
    builder
      .addCase(fetchCategories.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchCategories.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchCategories.rejected, (state) => {
        state.status = 'failed';
      });
  },
});

export default categorySlice.reducer;
