// Cấu trúc chung của mọi response từ back-end (xem back-end/src/utils/response.util.js)
export interface ApiResponse<T> {
  code: string; // 'SUCCESS' hoặc mã lỗi, VD: 'INVALID_CREDENTIALS'
  message: string; // Câu thông báo để hiển thị cho người dùng
  requestId: string;
  serverTime: string;
  data: T;
}
