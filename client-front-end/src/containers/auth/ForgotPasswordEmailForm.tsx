import { useState } from 'react';
import { App, Form } from 'antd';
import AuthFormHeader from '../../components/AuthFormHeader';
import TextField from '../../components/TextField';
import PrimaryButton from '../../components/PrimaryButton';
import AuthSwitchText from '../../components/AuthSwitchText';
import authService from '../../services/authService';
import type { ForgotPasswordFormValues } from '../../types/auth';
import { ROUTES } from '../../utils/constants';
import { getErrorMessage } from '../../utils/errorMessage';
import { emailRules } from '../../utils/validationRules';

interface ForgotPasswordEmailFormProps {
  onEmailSent: (email: string) => void; // Gọi khi đã gửi mã thành công, để chuyển sang bước nhập mã
}

// Quên mật khẩu - Bước 1: nhập email để nhận mã xác nhận
const ForgotPasswordEmailForm = ({ onEmailSent }: ForgotPasswordEmailFormProps) => {
  const { message } = App.useApp();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (values: ForgotPasswordFormValues) => {
    const email = values.email.trim();

    setIsSubmitting(true);
    try {
      const response = await authService.forgotPassword(email);
      message.success(response.message);
      onEmailSent(email);
    } catch (error) {
      message.error(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <AuthFormHeader
        title="Quên mật khẩu"
        description="Nhập email bạn đã dùng để đăng ký, chúng tôi sẽ gửi mã xác nhận để đặt lại mật khẩu."
      />

      <Form layout="vertical" requiredMark={false} onFinish={handleSubmit}>
        <TextField name="email" label="Email" placeholder="Nhập email của bạn" rules={emailRules} />

        <div className="mt-6">
          <PrimaryButton htmlType="submit" loading={isSubmitting}>
            Gửi mã xác nhận
          </PrimaryButton>
        </div>
      </Form>

      <AuthSwitchText question="Bạn đã nhớ mật khẩu?" linkText="Đăng nhập" to={ROUTES.LOGIN} />
    </div>
  );
};

export default ForgotPasswordEmailForm;
