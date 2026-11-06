// Các lời gọi API cho bản tin email; tách giao tiếp HTTP khỏi component. response.data là thân response Axios, trường
// data bên trong là dữ liệu nghiệp vụ.
import apiClient from './apiClient';
import type { ApiResponse, PaginatedResponse } from '../types/api';
import type { Newsletter, NewsletterDetail } from '../types/staff';
interface NewsletterList extends PaginatedResponse<Newsletter> {
  meta: { subscribers: { active: number; inactive: number } };
}
// Gọi API lấy danh sách/thống kê bản tin; component chỉ nhận dữ liệu đã tách khỏi lớp Axios.
const getNewsletters = async (query: object) =>
  (await apiClient.get<NewsletterList>('/staff/newsletters', { params: query })).data;
// Gọi API lấy nội dung và tiến độ bản tin; component chỉ nhận dữ liệu đã tách khỏi lớp Axios.
const getNewsletter = async (id: string) =>
  (await apiClient.get<ApiResponse<NewsletterDetail>>('/staff/newsletters/' + id)).data.data;
// Gọi API để lưu bản nháp bản tin; backend vẫn là nơi kiểm tra quyền và dữ liệu.
const saveNewsletter = async (id: string | undefined, data: object) =>
  (
    await apiClient.request<ApiResponse<{ id: string }>>({
      url: '/staff/newsletters' + (id ? '/' + id : ''),
      method: id ? 'PUT' : 'POST',
      data,
    })
  ).data.data;
// Gọi API để bắt đầu gửi bản tin đã lưu; backend vẫn là nơi kiểm tra quyền và dữ liệu.
const sendNewsletter = async (id: string) => (await apiClient.post('/staff/newsletters/' + id + '/send', {})).data;
export default { getNewsletters, getNewsletter, saveNewsletter, sendNewsletter };
