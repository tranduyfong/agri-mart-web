import apiClient from './apiClient';
import type { ApiResponse } from '../types/api';
import type { ChatRoom, ChatDetail } from '../types/staff';
const getRooms = async (status: string) =>
  (await apiClient.get<ApiResponse<ChatRoom[]>>('/staff/support', { params: { status } })).data.data;
const getRoom = async (id: string) => (await apiClient.get<ApiResponse<ChatDetail>>('/staff/support/' + id)).data.data;
const claimRoom = async (id: string) => (await apiClient.post('/staff/support/' + id + '/claim', {})).data;
const reply = async (id: string, data: FormData) =>
  (await apiClient.post('/staff/support/' + id + '/messages', data)).data;
const closeRoom = async (id: string) => apiClient.post('/staff/support/' + id + '/close', {});
export default { getRooms, getRoom, claimRoom, reply, closeRoom };
