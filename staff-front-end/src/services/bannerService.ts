// Các lời gọi API cho banner; tách giao tiếp HTTP khỏi component. response.data là thân response Axios, trường data
// bên trong là dữ liệu nghiệp vụ.
import apiClient from './apiClient';
import type { ApiResponse, PaginatedResponse } from '../types/api';
import type { Banner } from '../types/staff';
// Gọi API lấy danh sách banner; component chỉ nhận dữ liệu đã tách khỏi lớp Axios.
const getBanners = async (query: object) =>
  (await apiClient.get<PaginatedResponse<Banner>>('/staff/banners', { params: query })).data;
// Gọi API lấy banner cần chỉnh sửa; component chỉ nhận dữ liệu đã tách khỏi lớp Axios.
const getBanner = async (id: string) => (await apiClient.get<ApiResponse<Banner>>('/staff/banners/' + id)).data.data;
// Gọi API để lưu banner cùng ảnh; backend vẫn là nơi kiểm tra quyền và dữ liệu.
const saveBanner = async (id: string | undefined, data: FormData) =>
  (
    await apiClient.request<ApiResponse<{ id: string }>>({
      url: '/staff/banners' + (id ? '/' + id : ''),
      method: id ? 'PUT' : 'POST',
      data,
    })
  ).data.data;
export default { getBanners, getBanner, saveBanner };
