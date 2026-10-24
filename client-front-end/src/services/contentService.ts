import apiClient from './apiClient';
import type { ApiResponse } from '../types/api';
export interface PublicBanner {
  id: string;
  title: string;
  type: 'HOME_CAROUSEL' | 'POPUP';
  image_url: string;
  link_url: string | null;
}
const getBanners = async () => (await apiClient.get<ApiResponse<PublicBanner[]>>('/banners')).data.data;
const subscribe = async (email: string) => apiClient.post('/newsletter/subscribe', { email });
export default { getBanners, subscribe };
