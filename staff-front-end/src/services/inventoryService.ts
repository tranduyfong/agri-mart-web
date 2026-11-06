// Các lời gọi API cho tồn kho và nhập hàng; tách giao tiếp HTTP khỏi component. response.data là thân response Axios,
// trường data bên trong là dữ liệu nghiệp vụ.
import apiClient from './apiClient';
import type { ApiResponse, PaginatedResponse } from '../types/api';
import type { ImportPreview, ImportRow, InventoryLot, Receipt } from '../types/staff';
// Gọi API lấy dữ liệu tồn/báo cáo kho; component chỉ nhận dữ liệu đã tách khỏi lớp Axios.
const getInventory = async (query: object) =>
  (
    await apiClient.get<PaginatedResponse<InventoryLot>>('/staff/inventory', {
      params: query,
    })
  ).data;
// Gọi API để kiểm tra các dòng nhập, chưa ghi kho; backend vẫn là nơi kiểm tra quyền và dữ liệu.
const previewImport = async (rows: ImportRow[]) =>
  (await apiClient.post<ApiResponse<ImportPreview>>('/staff/imports/preview', { rows })).data.data;
// Gọi API để xác nhận/gửi duyệt nhập với khóa chống lặp; backend vẫn là nơi kiểm tra quyền và dữ liệu.
const confirmImport = async (data: {
  rows: ImportRow[];
  supplier_id?: string;
  source_file: string;
  import_key: string;
  note: string;
}) => (await apiClient.post<ApiResponse<Receipt | { request_id: string; status: string }>>('/staff/imports', data)).data.data;
export default { getInventory, previewImport, confirmImport };
