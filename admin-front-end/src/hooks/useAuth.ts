// Đọc phiên đăng nhập và hàm kiểm tra quyền từ AuthContext của ứng dụng quản lý.
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('Thiếu AuthProvider');
  return context;
};
export default useAuth;
