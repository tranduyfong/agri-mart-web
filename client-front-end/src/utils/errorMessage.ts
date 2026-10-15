import axios from 'axios';

// Lấy câu thông báo lỗi để hiển thị cho người dùng
// - Back-end có trả về message -> dùng message đó (VD: "Email hoặc mật khẩu không đúng!")
// - Không kết nối được tới back-end -> báo lỗi kết nối
export const getErrorMessage = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    if (error.response?.data?.message) {
      return error.response.data.message as string;
    }
    if (!error.response) {
      return 'Không thể kết nối tới máy chủ, vui lòng thử lại sau';
    }
  }
  return 'Đã có lỗi xảy ra, vui lòng thử lại';
};

// Lấy mã lỗi back-end trả về (VD: 'ACCOUNT_UNVERIFIED') để xử lý riêng từng trường hợp
export const getErrorCode = (error: unknown): string | undefined => {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.code;
  }
  return undefined;
};
