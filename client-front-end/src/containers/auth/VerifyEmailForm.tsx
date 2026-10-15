import { App } from 'antd';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import OtpVerifyForm from '../../components/OtpVerifyForm';
import AuthSwitchText from '../../components/AuthSwitchText';
import authService from '../../services/authService';
import { ROUTES } from '../../utils/constants';

// Xác minh email sau khi đăng ký
// Email lấy từ đường dẫn, VD: /verify-email?email=abc@gmail.com (F5 trang vẫn giữ được email)
const VerifyEmailForm = () => {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || '';

  // Không có email thì không biết xác minh cho tài khoản nào -> quay về trang đăng ký
  if (!email) {
    return <Navigate to={ROUTES.REGISTER} replace />;
  }

  // Mã đúng -> tài khoản được kích hoạt -> sang trang đăng nhập (điền sẵn email)
  const handleVerify = async (otp: string) => {
    const response = await authService.verifyEmail(email, otp);
    message.success(response.message);
    navigate(ROUTES.LOGIN, { state: { email } });
  };

  const handleResend = () => authService.resendVerifyEmail(email);

  return (
    <div>
      <OtpVerifyForm
        title="Xác nhận đó là bạn"
        email={email}
        submitText="Xác nhận"
        onSubmit={handleVerify}
        onResend={handleResend}
      />

      <AuthSwitchText question="Đã xác minh tài khoản?" linkText="Đăng nhập" to={ROUTES.LOGIN} />
    </div>
  );
};

export default VerifyEmailForm;
