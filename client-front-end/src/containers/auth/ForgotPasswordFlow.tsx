import { useState } from 'react';
import OtpVerifyForm from '../../components/OtpVerifyForm';
import AuthSwitchText from '../../components/AuthSwitchText';
import ForgotPasswordEmailForm from './ForgotPasswordEmailForm';
import ResetPasswordForm from './ResetPasswordForm';
import authService from '../../services/authService';
import { ROUTES } from '../../utils/constants';

// Các bước của chức năng quên mật khẩu
type ForgotPasswordStep = 'enterEmail' | 'enterOtp' | 'newPassword';

// Quên mật khẩu gồm 3 bước, hiển thị lần lượt trên cùng 1 trang:
// 1. Nhập email -> 2. Nhập mã OTP gửi về email -> 3. Nhập mật khẩu mới
const ForgotPasswordFlow = () => {
  const [step, setStep] = useState<ForgotPasswordStep>('enterEmail');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');

  // Bước 1 xong: đã gửi mã về email
  const handleEmailSent = (sentEmail: string) => {
    setEmail(sentEmail);
    setStep('enterOtp');
  };

  // Bước 2: kiểm tra mã OTP, đúng thì sang bước đặt mật khẩu mới
  const handleVerifyOtp = async (code: string) => {
    await authService.verifyForgotPasswordOtp(email, code);
    setOtp(code);
    setStep('newPassword');
  };

  if (step === 'enterEmail') {
    return <ForgotPasswordEmailForm onEmailSent={handleEmailSent} />;
  }

  if (step === 'enterOtp') {
    return (
      <div>
        <OtpVerifyForm
          title="Nhập mã xác nhận"
          email={email}
          submitText="Tiếp tục"
          onSubmit={handleVerifyOtp}
          onResend={() => authService.forgotPassword(email)}
        />
        <AuthSwitchText question="Bạn đã nhớ mật khẩu?" linkText="Đăng nhập" to={ROUTES.LOGIN} />
      </div>
    );
  }

  return <ResetPasswordForm email={email} otp={otp} />;
};

export default ForgotPasswordFlow;
