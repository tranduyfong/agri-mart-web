import apiClient from './apiClient';
import type { ApiResponse } from '../types/api';
import type { ChatRoom, ChatDetail } from '../types/staff';
const getRooms = async (status = '', keyword = '') =>
  (await apiClient.get<ApiResponse<ChatRoom[]>>('/staff/support', { params: { status, keyword } })).data.data;
const getRoom = async (id: string, before = '') => (await apiClient.get<ApiResponse<ChatDetail>>('/staff/support/' + id, { params: { before } })).data.data;
const claimRoom = async (id: string) => (await apiClient.post('/staff/support/' + id + '/claim', {})).data;
const reply = async (id: string, data: FormData) =>
  (await apiClient.post<ApiResponse<ChatDetail>>('/staff/support/' + id + '/messages', data)).data.data;
const closeRoom = async (id: string) => apiClient.post('/staff/support/' + id + '/close', {});
const getSummary = async () => (await apiClient.get<ApiResponse<{ unread_count: number }>>('/staff/support/summary')).data.data;
const markRead = async (id: string, throughId: string) => apiClient.post('/staff/support/' + id + '/read', { through_id: throughId });
export default { getRooms, getRoom, claimRoom, reply, closeRoom, getSummary, markRead };
