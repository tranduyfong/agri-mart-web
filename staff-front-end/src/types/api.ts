// Cấu trúc chung của mọi response từ back-end (xem back-end/src/utils/response.util.js)
export interface ApiResponse<T> {
  code: string; // 'SUCCESS' hoặc mã lỗi, VD: 'INVALID_CREDENTIALS'
  message: string; // Câu thông báo để hiển thị cho người dùng
  requestId: string;
  serverTime: string;
  data: T;
}

// Response của các API danh sách có phân trang
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pageNumber: number; // Trang hiện tại, bắt đầu từ 0
  pageSize: number; // Số bản ghi mỗi trang
  totalElements: number; // Tổng số bản ghi
  totalPages: number; // Tổng số trang
}
