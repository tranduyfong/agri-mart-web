import apiClient from './apiClient';
import type { ApiResponse, PaginatedResponse } from '../types/api';
import type { Supplier, SupplierDetail, SupplierItem } from '../types/supplier';

const getSuppliers = async (query: { keyword: string; pageNumber: number; pageSize: number }) =>
  (await apiClient.get<PaginatedResponse<Supplier>>('/admin/suppliers', { params: query })).data;
const getSupplier = async (id: string) =>
  (await apiClient.get<ApiResponse<SupplierDetail>>('/admin/suppliers/' + id)).data.data;
const getItems = async (id: string, pageNumber: number) =>
  (await apiClient.get<PaginatedResponse<SupplierItem>>('/admin/suppliers/' + id + '/items', { params: { pageNumber, pageSize: 10 } })).data;
const saveSupplier = async (id: string | undefined, values: { code: string; name: string; phone?: string }) =>
  (await apiClient.request<ApiResponse<SupplierDetail>>({ method: id ? 'PUT' : 'POST', url: '/admin/suppliers' + (id ? '/' + id : ''), data: values })).data.data;
export default { getSuppliers, getSupplier, getItems, saveSupplier };
