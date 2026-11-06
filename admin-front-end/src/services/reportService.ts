// Các lời gọi API cho báo cáo; tách giao tiếp HTTP khỏi component. response.data là thân response Axios, trường data
// bên trong là dữ liệu nghiệp vụ.
import apiClient from './apiClient';
import type { ApiResponse, PaginatedResponse } from '../types/api';
import type { RevenueReport, InventoryRow, InventoryMeta } from '../types/admin';
interface InventoryReport extends PaginatedResponse<InventoryRow> {
  meta: InventoryMeta;
}
// Gọi API lấy báo cáo doanh thu trong kỳ; component chỉ nhận dữ liệu đã tách khỏi lớp Axios.
const getRevenue = async (query: object) =>
  (await apiClient.get<ApiResponse<RevenueReport>>('/admin/reports/revenue', { params: query })).data.data;
// Gọi API lấy dữ liệu tồn/báo cáo kho; component chỉ nhận dữ liệu đã tách khỏi lớp Axios.
const getInventory = async (query: object) =>
  (await apiClient.get<InventoryReport>('/admin/reports/inventory', { params: query })).data;
export default { getRevenue, getInventory };
