import axios from 'axios';
import { getSavedAccessToken } from '../utils/authStorage';

// Axios dùng chung cho mọi lời gọi API, địa chỉ back-end lấy từ file .env (VITE_API_URL)
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Trước khi gửi request: nếu đã đăng nhập thì gắn token vào header Authorization
apiClient.interceptors.request.use((config) => {
  const accessToken = getSavedAccessToken();
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

export default apiClient;
