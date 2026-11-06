// Các lời gọi API cho hội thoại hỗ trợ; tách giao tiếp HTTP khỏi component. response.data là thân response Axios,
// trường data bên trong là dữ liệu nghiệp vụ.
import apiClient from './apiClient';
import type { ApiResponse } from '../types/api';
import type { ChatRoom, ChatDetail } from '../types/staff';
// Gọi API lấy danh sách hội thoại theo bộ lọc; component chỉ nhận dữ liệu đã tách khỏi lớp Axios.
const getRooms = async (status = '', keyword = '') =>
  (await apiClient.get<ApiResponse<ChatRoom[]>>('/staff/support', { params: { status, keyword } })).data.data;
// Gọi API lấy một trang lịch sử chat; component chỉ nhận dữ liệu đã tách khỏi lớp Axios.
const getRoom = async (id: string, before = '') => (await apiClient.get<ApiResponse<ChatDetail>>('/staff/support/' + id, { params: { before } })).data.data;
// Gọi API để tiếp nhận phòng chat và dừng AI; backend vẫn là nơi kiểm tra quyền và dữ liệu.
const claimRoom = async (id: string) => (await apiClient.post('/staff/support/' + id + '/claim', {})).data;
// Gọi API để gửi tin/ảnh vào phòng nhân viên đang phụ trách; backend vẫn là nơi kiểm tra quyền và dữ liệu.
const reply = async (id: string, data: FormData) =>
  (await apiClient.post<ApiResponse<ChatDetail>>('/staff/support/' + id + '/messages', data)).data.data;
// Gọi API để kết thúc hội thoại nhưng giữ lịch sử; backend vẫn là nơi kiểm tra quyền và dữ liệu.
const closeRoom = async (id: string) => apiClient.post('/staff/support/' + id + '/close', {});
// Gọi API lấy số tin chưa đọc; component chỉ nhận dữ liệu đã tách khỏi lớp Axios.
const getSummary = async () => (await apiClient.get<ApiResponse<{ unread_count: number }>>('/staff/support/summary')).data.data;
// Gọi API để đánh dấu đọc tới ID tin đã thấy; backend vẫn là nơi kiểm tra quyền và dữ liệu.
const markRead = async (id: string, throughId: string) => apiClient.post('/staff/support/' + id + '/read', { through_id: throughId });
export default { getRooms, getRoom, claimRoom, reply, closeRoom, getSummary, markRead };
