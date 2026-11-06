// Axios dùng chung cho ứng dụng: lấy địa chỉ backend từ cấu hình, gắn token và thống nhất xử lý phiên ở các request.
import axios from 'axios';
import { getSavedAccessToken } from '../utils/authStorage';
const apiClient = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api' });
apiClient.interceptors.request.use((config) => {
  const token = getSavedAccessToken();
  if (token) config.headers.Authorization = 'Bearer ' + token;
  return config;
});
// Lỗi 401 được đưa về AuthProvider qua sự kiện để không giữ giao diện quản trị với phiên hết hạn.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !error.config?.url?.includes('/auth/login'))
      window.dispatchEvent(new Event('admin-session-expired'));
    return Promise.reject(error);
  },
);
export default apiClient;
