// Các lời gọi API cho banner và đăng ký bản tin; tách giao tiếp HTTP khỏi component. response.data là thân response
// Axios, trường data bên trong là dữ liệu nghiệp vụ.
import apiClient from './apiClient';
import type { ApiResponse } from '../types/api';
export interface PublicBanner {
  id: string;
  title: string;
  type: 'HOME_CAROUSEL' | 'POPUP';
  image_url: string;
  link_url: string | null;
}
// Gọi API lấy danh sách banner; component chỉ nhận dữ liệu đã tách khỏi lớp Axios.
const getBanners = async () => (await apiClient.get<ApiResponse<PublicBanner[]>>('/banners')).data.data;
// Gọi API để đăng ký email nhận bản tin; backend vẫn là nơi kiểm tra quyền và dữ liệu.
const subscribe = async (email: string) => apiClient.post('/newsletter/subscribe', { email });
export default { getBanners, subscribe };
