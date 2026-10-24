import apiClient from './apiClient';
import type { ApiResponse, PaginatedResponse } from '../types/api';
import type { StaffOrder, OrderDetail } from '../types/staff';
const getOrders = async (query: object) =>
  (await apiClient.get<PaginatedResponse<StaffOrder>>('/staff/orders', { params: query })).data;
const getOrder = async (id: string) => (await apiClient.get<ApiResponse<OrderDetail>>('/staff/orders/' + id)).data.data;
const updateStatus = async (id: string, data: { status: string; expected_status: string; note: string }) =>
  (await apiClient.patch<ApiResponse<OrderDetail>>('/staff/orders/' + id + '/status', data)).data.data;
const getSummary = async () =>
  (await apiClient.get<ApiResponse<{ pending_count: number }>>('/staff/orders/summary')).data.data;
export default { getOrders, getOrder, updateStatus, getSummary };
