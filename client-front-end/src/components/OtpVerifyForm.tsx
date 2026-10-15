import { useState } from 'react';
import { App } from 'antd';
import AuthFormHeader from './AuthFormHeader';
import OtpCodeInput from './OtpCodeInput';
import ResendCodeText from './ResendCodeText';
import PrimaryButton from './PrimaryButton';
import useCountdown from '../hooks/useCountdown';
import { OTP_LENGTH, RESEND_OTP_SECONDS } from '../utils/constants';
import { getErrorMessage } from '../utils/errorMessage';
import { maskEmail } from '../utils/format';

interface OtpVerifyFormProps {
  title: string;
  email: string; // Email đã nhận mã
  submitText: string; // Chữ trên nút xác nhận
  onSubmit: (otp: string) => Promise<void>; // Gọi API kiểm tra mã. Nếu lỗi thì ném lỗi ra, form sẽ hiện thông báo
  onResend: () => Promise<unknown>; // Gọi API gửi lại mã
}

// Form nhập mã OTP gồm: tiêu đề, các ô nhập mã, dòng "Gửi lại mã", nút xác nhận
// Dùng chung cho: xác minh email sau khi đăng ký, và bước nhập mã khi quên mật khẩu
const OtpVerifyForm = ({ title, email, submitText, onSubmit, onResend }: OtpVerifyFormProps) => {
  const { message } = App.useApp();
  const [otp, setOtp] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [otpInputKey, setOtpInputKey] = useState(0); // Đổi key để xóa trắng các ô nhập mã

  // Mã vừa được gửi nên phải chờ hết thời gian đếm ngược mới được gửi lại
  const { secondsLeft, restart } = useCountdown(RESEND_OTP_SECONDS);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSubmit(otp);
    } catch (error) {
      message.error(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    try {
      await onResend();
      message.success('Mã mới đã được gửi tới email của bạn');
      setOtp('');
      setOtpInputKey(otpInputKey + 1);
      restart();
    } catch (error) {
      message.error(getErrorMessage(error));
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div>
      <AuthFormHeader
        title={title}
        description={
          <>
            Nhập mã gồm {OTP_LENGTH} chữ số đã được gửi tới email{' '}
            <span className="font-semibold text-gray-900">{maskEmail(email)}</span>
          </>
        }
      />

      <OtpCodeInput key={otpInputKey} onInput={setOtp} />

      <ResendCodeText secondsLeft={secondsLeft} isSending={isResending} onResend={handleResend} />

      <div className="mt-6">
        {/* Chỉ bấm được khi đã nhập đủ các ô */}
        <PrimaryButton loading={isSubmitting} disabled={otp.length < OTP_LENGTH} onClick={handleSubmit}>
          {submitText}
        </PrimaryButton>
      </div>
    </div>
  );
};

export default OtpVerifyForm;
