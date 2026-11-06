// Các lời gọi API cho phiên và công việc nhân viên; tách giao tiếp HTTP khỏi component. response.data là thân
// response Axios, trường data bên trong là dữ liệu nghiệp vụ.
import apiClient from './apiClient';
import type { ApiResponse } from '../types/api';
import type { Dashboard, Lookups, StaffSession } from '../types/staff';

// Gọi API để đăng nhập và nhận token; backend vẫn là nơi kiểm tra quyền và dữ liệu.
const login = async (email: string, password: string) =>
  (await apiClient.post<ApiResponse<{ accessToken: string }>>('/auth/login', { email, password })).data.data;
// Gọi API lấy phiên/vai trò/quyền được backend xác minh; component chỉ nhận dữ liệu đã tách khỏi lớp Axios.
const getSession = async () => (await apiClient.get<ApiResponse<StaffSession>>('/staff/session')).data.data;
// Gọi API lấy dữ liệu tham chiếu cho các ô chọn; component chỉ nhận dữ liệu đã tách khỏi lớp Axios.
const getLookups = async () => (await apiClient.get<ApiResponse<Lookups>>('/staff/lookups')).data.data;
// Gọi API lấy các chỉ số công việc hôm nay; component chỉ nhận dữ liệu đã tách khỏi lớp Axios.
const getDashboard = async () => (await apiClient.get<ApiResponse<Dashboard>>('/staff/dashboard')).data.data;
export default { login, getSession, getLookups, getDashboard };
