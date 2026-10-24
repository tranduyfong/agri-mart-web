import apiClient from './apiClient';
import type { ApiResponse, PaginatedResponse } from '../types/api';
import type { RevenueReport, InventoryRow, InventoryMeta } from '../types/admin';
interface InventoryReport extends PaginatedResponse<InventoryRow> {
  meta: InventoryMeta;
}
const getRevenue = async (query: object) =>
  (await apiClient.get<ApiResponse<RevenueReport>>('/admin/reports/revenue', { params: query })).data.data;
const getInventory = async (query: object) =>
  (await apiClient.get<InventoryReport>('/admin/reports/inventory', { params: query })).data;
export default { getRevenue, getInventory };
