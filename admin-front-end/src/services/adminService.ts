import apiClient from './apiClient';
import type { ApiResponse } from '../types/api';
import type { AdminSession, Lookups } from '../types/admin';
const login = async (email: string, password: string) =>
  (await apiClient.post<ApiResponse<{ accessToken: string }>>('/auth/login', { email, password })).data.data;
const getSession = async () => (await apiClient.get<ApiResponse<AdminSession>>('/admin/session')).data.data;
const getLookups = async () => (await apiClient.get<ApiResponse<Lookups>>('/admin/lookups')).data.data;
export default { login, getSession, getLookups };
