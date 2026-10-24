import axios from 'axios';
import { getSavedAccessToken } from '../utils/authStorage';

const apiClient = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api' });
apiClient.interceptors.request.use((config) => {
  const token = getSavedAccessToken();
  if (token) config.headers.Authorization = 'Bearer ' + token;
  return config;
});
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !error.config?.url?.includes('/auth/login'))
      window.dispatchEvent(new Event('staff-session-expired'));
    return Promise.reject(error);
  },
);
export default apiClient;
