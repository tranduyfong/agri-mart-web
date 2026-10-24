import apiClient from './apiClient';
import type { ApiResponse, PaginatedResponse } from '../types/api';
import type { Newsletter, NewsletterDetail } from '../types/staff';
interface NewsletterList extends PaginatedResponse<Newsletter> {
  meta: { subscribers: { active: number; inactive: number } };
}
const getNewsletters = async (query: object) =>
  (await apiClient.get<NewsletterList>('/staff/newsletters', { params: query })).data;
const getNewsletter = async (id: string) =>
  (await apiClient.get<ApiResponse<NewsletterDetail>>('/staff/newsletters/' + id)).data.data;
const saveNewsletter = async (id: string | undefined, data: object) =>
  (
    await apiClient.request<ApiResponse<{ id: string }>>({
      url: '/staff/newsletters' + (id ? '/' + id : ''),
      method: id ? 'PUT' : 'POST',
      data,
    })
  ).data.data;
const sendNewsletter = async (id: string) => (await apiClient.post('/staff/newsletters/' + id + '/send', {})).data;
export default { getNewsletters, getNewsletter, saveNewsletter, sendNewsletter };
