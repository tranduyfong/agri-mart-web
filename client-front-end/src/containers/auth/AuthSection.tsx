import type { ReactNode } from 'react';
import AuthBanner from './AuthBanner';

interface AuthSectionProps {
  children: ReactNode; // Form đăng nhập, đăng ký, xác minh email...
}

// Khung chung của các trang xác thực: bên trái là ảnh banner, bên phải là form
// - flex-1: nền xám giãn ra hết phần nội dung, không để lại khoảng trắng phía trên chân trang
// - lg:min-h-195: trên màn hình lớn, khung luôn cao tối thiểu 780px (195 x 4px), banner cao như thiết kế
const AuthSection = ({ children }: AuthSectionProps) => {
  return (
    <section className="grid flex-1 bg-page-gray lg:min-h-195 lg:grid-cols-2">
      {/* Ảnh banner, ẩn trên màn hình nhỏ */}
      <div className="hidden lg:block">
        <AuthBanner />
      </div>

      <div className="flex items-center justify-center px-4 py-16 sm:px-8">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </section>
  );
};

export default AuthSection;
