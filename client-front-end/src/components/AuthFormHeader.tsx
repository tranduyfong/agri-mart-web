import type { ReactNode } from 'react';

interface AuthFormHeaderProps {
  title: string;
  description?: ReactNode; // Dòng mô tả nhỏ bên dưới tiêu đề (không bắt buộc)
}

// Tiêu đề ở đầu các form xác thực (Đăng nhập, Đăng ký, Xác minh email, Quên mật khẩu)
const AuthFormHeader = ({ title, description }: AuthFormHeaderProps) => {
  return (
    <div className="mb-6 text-center">
      <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
      {description && <p className="mt-3 text-sm text-gray-600">{description}</p>}
    </div>
  );
};

export default AuthFormHeader;
