import apiClient from './apiClient';
import type { ApiResponse, PaginatedResponse } from '../types/api';
import type { ChangeStatus, ProductChange, ProductChangeDetail } from '../types/productChange';
const baseUrl = '/staff/product-changes';
const getChanges = async (query: object) =>
  (await apiClient.get<PaginatedResponse<ProductChange>>(baseUrl, { params: query })).data;
const getChange = async (id: string) =>
  (await apiClient.get<ApiResponse<ProductChangeDetail>>(baseUrl + '/' + id)).data.data;
const review = async (id: string, status: Exclude<ChangeStatus, 'PENDING'>, note: string) =>
  (
    await apiClient.patch<ApiResponse<ProductChangeDetail>>('/admin/product-changes/' + id + '/review', {
      status,
      note,
    })
  ).data.data;
export default { getChanges, getChange, review };
