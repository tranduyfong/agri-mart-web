import apiClient from './apiClient';
import type { ApiResponse, PaginatedResponse } from '../types/api';
import type { ProductDetail } from '../types/product';
import type { StaffProduct } from '../types/staff';
const getProducts = async (query: object) =>
  (
    await apiClient.get<PaginatedResponse<StaffProduct>>('/staff/products', {
      params: query,
    })
  ).data;
const getProduct = async (id: string) =>
  (await apiClient.get<ApiResponse<ProductDetail>>('/staff/products/' + id)).data.data;
const saveProduct = async (id: string | undefined, data: FormData) =>
  (
    await apiClient.request<ApiResponse<{ productId?: string; id?: string }>>({
      url: '/staff/products' + (id ? '/' + id : ''),
      method: id ? 'PUT' : 'POST',
      data,
    })
  ).data.data;
export default { getProducts, getProduct, saveProduct };
