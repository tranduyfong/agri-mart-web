import { useState } from 'react';
import { App, Form } from 'antd';
import { useNavigate } from 'react-router-dom';
import AuthFormHeader from '../../components/AuthFormHeader';
import PasswordField from '../../components/PasswordField';
import PrimaryButton from '../../components/PrimaryButton';
import authService from '../../services/authService';
import type { ResetPasswordFormValues } from '../../types/auth';
import { ROUTES } from '../../utils/constants';
import { getErrorMessage } from '../../utils/errorMessage';
import { getConfirmPasswordRules, newPasswordRules } from '../../utils/validationRules';

interface ResetPasswordFormProps {
  email: string;
  otp: string; // Mã OTP đã xác nhận ở bước trước, back-end cần kiểm tra lại khi đổi mật khẩu
}

// Quên mật khẩu - Bước 3: nhập mật khẩu mới
const ResetPasswordForm = ({ email, otp }: ResetPasswordFormProps) => {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (values: ResetPasswordFormValues) => {
    setIsSubmitting(true);
    try {
      const response = await authService.resetPassword(email, otp, values.newPassword);
      message.success(response.message);
      // Đổi mật khẩu xong -> sang trang đăng nhập, điền sẵn email
      navigate(ROUTES.LOGIN, { state: { email } });
    } catch (error) {
      message.error(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <AuthFormHeader title="Đặt lại mật khẩu" description="Tạo mật khẩu mới cho tài khoản của bạn." />

      <Form layout="vertical" requiredMark={false} onFinish={handleSubmit}>
        <PasswordField
          name="newPassword"
          label="Mật khẩu mới"
          placeholder="Nhập mật khẩu mới"
          rules={newPasswordRules}
        />

        <PasswordField
          name="confirmPassword"
          label="Nhập lại mật khẩu mới"
          placeholder="Nhập lại mật khẩu mới"
          rules={getConfirmPasswordRules('newPassword')}
          dependencies={['newPassword']}
        />

        <div className="mt-6">
          <PrimaryButton htmlType="submit" loading={isSubmitting}>
            Đổi mật khẩu
          </PrimaryButton>
        </div>
      </Form>
    </div>
  );
};

export default ResetPasswordForm;
