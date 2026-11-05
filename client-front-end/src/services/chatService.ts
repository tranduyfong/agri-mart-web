import apiClient from './apiClient';
import type { ApiResponse } from '../types/api';
import type { ChatRoom } from '../types/chat';
const getRoom = async (before = '') => (await apiClient.get<ApiResponse<ChatRoom | null>>('/chat', { params: { before } })).data.data;
const getSummary = async () => (await apiClient.get<ApiResponse<{ unread_count: number }>>('/chat/summary')).data.data;
const send = async (data: FormData) => (await apiClient.post<ApiResponse<ChatRoom>>('/chat/messages', data, {
  headers: { 'Content-Type': 'multipart/form-data' },
})).data.data;
const markRead = async (id: string, throughId: string) => apiClient.post('/chat/' + id + '/read', { through_id: throughId });
export default { getRoom, getSummary, send, markRead };
