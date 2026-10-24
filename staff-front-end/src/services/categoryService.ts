import apiClient from './apiClient';
import type { ApiResponse, PaginatedResponse } from '../types/api';
import type { Category } from '../types/staff';
const getCategories = async (query: object) =>
  (await apiClient.get<PaginatedResponse<Category>>('/staff/categories', { params: query })).data;
const saveCategory = async (id: string | undefined, data: FormData) =>
  (
    await apiClient.request<ApiResponse<Category>>({
      url: '/staff/categories' + (id ? '/' + id : ''),
      method: id ? 'PUT' : 'POST',
      data,
    })
  ).data.data;
export default { getCategories, saveCategory };
