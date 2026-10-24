import apiClient from './apiClient';
import type { ApiResponse, PaginatedResponse } from '../types/api';
import type { ImportPreview, ImportRow, InventoryLot, Receipt } from '../types/staff';
const getInventory = async (query: object) =>
  (
    await apiClient.get<PaginatedResponse<InventoryLot>>('/staff/inventory', {
      params: query,
    })
  ).data;
const previewImport = async (rows: ImportRow[]) =>
  (await apiClient.post<ApiResponse<ImportPreview>>('/staff/imports/preview', { rows })).data.data;
const confirmImport = async (data: {
  rows: ImportRow[];
  supplier_id?: string;
  source_file: string;
  import_key: string;
  note: string;
}) => (await apiClient.post<ApiResponse<Receipt>>('/staff/imports', data)).data.data;
export default { getInventory, previewImport, confirmImport };
