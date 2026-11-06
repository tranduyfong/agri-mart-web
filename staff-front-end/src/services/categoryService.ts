// Các lời gọi API cho danh mục; tách giao tiếp HTTP khỏi component. response.data là thân response Axios, trường data
// bên trong là dữ liệu nghiệp vụ.
import apiClient from './apiClient';
import type { ApiResponse, PaginatedResponse } from '../types/api';
import type { Category } from '../types/staff';
// Gọi API lấy danh sách danh mục; component chỉ nhận dữ liệu đã tách khỏi lớp Axios.
const getCategories = async (query: object) =>
  (await apiClient.get<PaginatedResponse<Category>>('/staff/categories', { params: query })).data;
// Gọi API để lưu danh mục cùng ảnh; backend vẫn là nơi kiểm tra quyền và dữ liệu.
const saveCategory = async (id: string | undefined, data: FormData) =>
  (
    await apiClient.request<ApiResponse<Category>>({
      url: '/staff/categories' + (id ? '/' + id : ''),
      method: id ? 'PUT' : 'POST',
      data,
    })
  ).data.data;
export default { getCategories, saveCategory };
