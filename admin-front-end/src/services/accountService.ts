import apiClient from './apiClient';
import type { ApiResponse, PaginatedResponse } from '../types/api';
import type { Account } from '../types/admin';
const getAccounts = async (query: object) =>
  (await apiClient.get<PaginatedResponse<Account>>('/admin/accounts', { params: query })).data;
const getAccount = async (id: string) => (await apiClient.get<ApiResponse<Account>>('/admin/accounts/' + id)).data.data;
const createStaff = async (data: object) =>
  (await apiClient.post<ApiResponse<Account>>('/admin/accounts', data)).data.data;
const updateAccount = async (id: string, data: object) =>
  (await apiClient.put<ApiResponse<Account>>('/admin/accounts/' + id, data)).data.data;
const setLock = async (account: Account, action: 'LOCK' | 'UNLOCK') =>
  apiClient.patch('/admin/accounts/' + account.id + '/lock', { action, expected_status: account.status });
const savePermissions = async (id: string, data: object) =>
  (await apiClient.put<ApiResponse<Account>>('/admin/accounts/' + id + '/permissions', data)).data.data;
export default { getAccounts, getAccount, createStaff, updateAccount, setLock, savePermissions };
