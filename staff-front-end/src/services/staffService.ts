import apiClient from './apiClient';
import type { ApiResponse } from '../types/api';
import type { Dashboard, Lookups, StaffSession } from '../types/staff';

const login = async (email: string, password: string) =>
  (await apiClient.post<ApiResponse<{ accessToken: string }>>('/auth/login', { email, password })).data.data;
const getSession = async () => (await apiClient.get<ApiResponse<StaffSession>>('/staff/session')).data.data;
const getLookups = async () => (await apiClient.get<ApiResponse<Lookups>>('/staff/lookups')).data.data;
const getDashboard = async () => (await apiClient.get<ApiResponse<Dashboard>>('/staff/dashboard')).data.data;
export default { login, getSession, getLookups, getDashboard };
