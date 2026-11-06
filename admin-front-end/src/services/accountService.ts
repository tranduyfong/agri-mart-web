// Các lời gọi API cho quản trị tài khoản và phân quyền; tách giao tiếp HTTP khỏi component. response.data là thân
// response Axios, trường data bên trong là dữ liệu nghiệp vụ.
import apiClient from './apiClient';
import type { ApiResponse, PaginatedResponse } from '../types/api';
import type { Account } from '../types/admin';
// Gọi API lấy danh sách tài khoản theo bộ lọc; component chỉ nhận dữ liệu đã tách khỏi lớp Axios.
const getAccounts = async (query: object) =>
  (await apiClient.get<PaginatedResponse<Account>>('/admin/accounts', { params: query })).data;
// Gọi API lấy thông tin tài khoản; component chỉ nhận dữ liệu đã tách khỏi lớp Axios.
const getAccount = async (id: string) => (await apiClient.get<ApiResponse<Account>>('/admin/accounts/' + id)).data.data;
// Gọi API để tạo tài khoản nhân viên; backend vẫn là nơi kiểm tra quyền và dữ liệu.
const createStaff = async (data: object) =>
  (await apiClient.post<ApiResponse<Account>>('/admin/accounts', data)).data.data;
// Gọi API để sửa thông tin/email tài khoản; backend vẫn là nơi kiểm tra quyền và dữ liệu.
const updateAccount = async (id: string, data: object) =>
  (await apiClient.put<ApiResponse<Account>>('/admin/accounts/' + id, data)).data.data;
// Gọi API để khóa/mở tài khoản với trạng thái dự kiến; backend vẫn là nơi kiểm tra quyền và dữ liệu.
const setLock = async (account: Account, action: 'LOCK' | 'UNLOCK') =>
  apiClient.patch('/admin/accounts/' + account.id + '/lock', { action, expected_status: account.status });
// Gọi API để lưu nhóm quyền với mốc cập nhật đang xem; backend vẫn là nơi kiểm tra quyền và dữ liệu.
const savePermissions = async (id: string, data: object) =>
  (await apiClient.put<ApiResponse<Account>>('/admin/accounts/' + id + '/permissions', data)).data.data;
export default { getAccounts, getAccount, createStaff, updateAccount, setLock, savePermissions };
