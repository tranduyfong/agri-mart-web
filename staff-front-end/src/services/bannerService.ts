import apiClient from './apiClient';
import type { ApiResponse, PaginatedResponse } from '../types/api';
import type { Banner } from '../types/staff';
const getBanners = async (query: object) =>
  (await apiClient.get<PaginatedResponse<Banner>>('/staff/banners', { params: query })).data;
const getBanner = async (id: string) => (await apiClient.get<ApiResponse<Banner>>('/staff/banners/' + id)).data.data;
const saveBanner = async (id: string | undefined, data: FormData) =>
  (
    await apiClient.request<ApiResponse<{ id: string }>>({
      url: '/staff/banners' + (id ? '/' + id : ''),
      method: id ? 'PUT' : 'POST',
      data,
    })
  ).data.data;
export default { getBanners, getBanner, saveBanner };
