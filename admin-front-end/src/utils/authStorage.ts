// Đọc/lưu/xóa phiên trong localStorage; chỉ là dữ liệu phía trình duyệt, quyền thật vẫn do backend xác minh.
export const getSavedAccessToken = () => localStorage.getItem('admin.accessToken');
// Lưu token đăng nhập của ứng dụng quản lý vào khóa localStorage riêng.
export const saveAccessToken = (token: string) => localStorage.setItem('admin.accessToken', token);
// Xóa dữ liệu phiên khi đăng xuất hoặc token không còn hợp lệ.
export const clearAuth = () => {
  localStorage.removeItem('admin.accessToken');
};
