import { Link } from 'react-router-dom';

interface AuthSwitchTextProps {
  question: string; // VD: "Bạn chưa có tài khoản?"
  linkText: string; // VD: "Đăng ký"
  to: string; // Đường dẫn khi bấm vào link
}

// Dòng chữ chuyển qua lại giữa trang Đăng nhập và Đăng ký
const AuthSwitchText = ({ question, linkText, to }: AuthSwitchTextProps) => {
  return (
    <p className="mt-6 text-center text-sm text-gray-700">
      {question}{' '}
      <Link to={to} className="font-semibold text-gray-900 hover:text-primary">
        {linkText}
      </Link>
    </p>
  );
};

export default AuthSwitchText;
