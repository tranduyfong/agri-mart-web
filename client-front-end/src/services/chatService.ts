// Các lời gọi API cho chat khách hàng; tách giao tiếp HTTP khỏi component. response.data là thân response Axios,
// trường data bên trong là dữ liệu nghiệp vụ.
import apiClient from './apiClient';
import type { ApiResponse } from '../types/api';
import type { ChatRoom } from '../types/chat';
// Gọi API lấy một trang lịch sử chat; component chỉ nhận dữ liệu đã tách khỏi lớp Axios.
const getRoom = async (before = '') => (await apiClient.get<ApiResponse<ChatRoom | null>>('/chat', { params: { before } })).data.data;
// Gọi API lấy số tin chưa đọc; component chỉ nhận dữ liệu đã tách khỏi lớp Axios.
const getSummary = async () => (await apiClient.get<ApiResponse<{ unread_count: number }>>('/chat/summary')).data.data;
// Gọi API để gửi chữ/ảnh kèm client_id chống trùng; backend vẫn là nơi kiểm tra quyền và dữ liệu.
const send = async (data: FormData) => (await apiClient.post<ApiResponse<ChatRoom>>('/chat/messages', data, {
  headers: { 'Content-Type': 'multipart/form-data' },
})).data.data;
// Gọi API để đánh dấu đọc tới ID tin đã thấy; backend vẫn là nơi kiểm tra quyền và dữ liệu.
const markRead = async (id: string, throughId: string) => apiClient.post('/chat/' + id + '/read', { through_id: throughId });
const resumeAi = async (id: string) => (await apiClient.post<ApiResponse<ChatRoom>>('/chat/' + id + '/resume-ai')).data.data;
export default { getRoom, getSummary, send, markRead, resumeAi };
