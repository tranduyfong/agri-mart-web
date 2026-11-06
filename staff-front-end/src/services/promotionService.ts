// Các lời gọi API cho khuyến mãi; tách giao tiếp HTTP khỏi component. response.data là thân response Axios, trường
// data bên trong là dữ liệu nghiệp vụ.
import apiClient from './apiClient';
import type { ApiResponse, PaginatedResponse } from '../types/api';
import type { Promotion } from '../types/staff';
const getPromotions = async (query: object) =>
  (await apiClient.get<PaginatedResponse<Promotion>>('/staff/promotions', { params: query })).data;
const getPromotion = async (id: string) =>
  (await apiClient.get<ApiResponse<Promotion>>('/staff/promotions/' + id)).data.data;
// Gọi API để lưu chương trình/mã giảm và ảnh; backend vẫn là nơi kiểm tra quyền và dữ liệu.
const savePromotion = async (id: string | undefined, data: object) =>
  (
    await apiClient.request<ApiResponse<{ id: string }>>({
      url: '/staff/promotions' + (id ? '/' + id : ''),
      method: id ? 'PUT' : 'POST',
      data,
    })
  ).data.data;
// Gọi API để kết thúc ưu đãi; backend vẫn là nơi kiểm tra quyền và dữ liệu.
const endPromotion = async (id: string) => apiClient.patch('/staff/promotions/' + id + '/end');
export default { getPromotions, getPromotion, savePromotion, endPromotion };
