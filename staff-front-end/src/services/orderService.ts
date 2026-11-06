// Các lời gọi API cho đơn hàng và thanh toán; tách giao tiếp HTTP khỏi component. response.data là thân response
// Axios, trường data bên trong là dữ liệu nghiệp vụ.
import apiClient from './apiClient';
import type { ApiResponse, PaginatedResponse } from '../types/api';
import type { StaffOrder, OrderDetail } from '../types/staff';
// Gọi API lấy danh sách đơn theo bộ lọc; component chỉ nhận dữ liệu đã tách khỏi lớp Axios.
const getOrders = async (query: object) =>
  (await apiClient.get<PaginatedResponse<StaffOrder>>('/staff/orders', { params: query })).data;
// Gọi API lấy chi tiết một đơn/lần đặt; component chỉ nhận dữ liệu đã tách khỏi lớp Axios.
const getOrder = async (id: string) => (await apiClient.get<ApiResponse<OrderDetail>>('/staff/orders/' + id)).data.data;
// Gọi API để đổi bước xử lý đơn với trạng thái dự kiến; backend vẫn là nơi kiểm tra quyền và dữ liệu.
const updateStatus = async (id: string, data: { status: string; expected_status: string; note: string }) =>
  (await apiClient.patch<ApiResponse<OrderDetail>>('/staff/orders/' + id + '/status', data)).data.data;
// Gọi API lấy số đơn cần xác nhận; component chỉ nhận dữ liệu đã tách khỏi lớp Axios.
const getSummary = async () =>
  (await apiClient.get<ApiResponse<{ pending_count: number }>>('/staff/orders/summary')).data.data;
export default { getOrders, getOrder, updateStatus, getSummary };
