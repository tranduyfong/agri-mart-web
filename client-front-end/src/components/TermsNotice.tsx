interface TermsNoticeProps {
  action: string; // Hành động người dùng đang làm, VD: "đăng nhập", "đăng ký"
}

// Dòng thông báo về Điều khoản sử dụng và Chính sách bảo mật ở cuối form
const TermsNotice = ({ action }: TermsNoticeProps) => {
  return (
    <p className="mt-4 text-center text-xs leading-5 text-gray-600">
      Bằng việc {action}, bạn đồng ý với{' '}
      <a href="#" className="font-semibold text-gray-900 hover:text-primary">
        Điều khoản sử dụng
      </a>
      . Tìm hiểu cách chúng tôi sử dụng dữ liệu của bạn trong{' '}
      <a href="#" className="font-semibold text-gray-900 hover:text-primary">
        Chính sách bảo mật
      </a>
      .
    </p>
  );
};

export default TermsNotice;
