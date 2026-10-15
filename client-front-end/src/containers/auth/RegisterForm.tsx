import { useState } from 'react';
import { App, Form } from 'antd';
import { useNavigate } from 'react-router-dom';
import AuthFormHeader from '../../components/AuthFormHeader';
import TextField from '../../components/TextField';
import PasswordField from '../../components/PasswordField';
import PrimaryButton from '../../components/PrimaryButton';
import AuthSwitchText from '../../components/AuthSwitchText';
import TermsNotice from '../../components/TermsNotice';
import authService from '../../services/authService';
import type { RegisterFormValues } from '../../types/auth';
import { ROUTES } from '../../utils/constants';
import { getErrorMessage } from '../../utils/errorMessage';
import {
  emailRules,
  getConfirmPasswordRules,
  newPasswordRules,
  phoneRules,
  requiredRule,
} from '../../utils/validationRules';

// Form đăng ký tài khoản
const RegisterForm = () => {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Chạy khi dữ liệu nhập đã hợp lệ và người dùng bấm "Đăng ký"
  const handleSubmit = async (values: RegisterFormValues) => {
    const email = values.email.trim();

    setIsSubmitting(true);
    try {
      // Back-end chỉ có 1 trường full_name nên ghép Họ + Tên lại
      await authService.register({
        full_name: `${values.lastName.trim()} ${values.firstName.trim()}`,
        email,
        password: values.password,
        phone: values.phone.trim(),
      });

      // Đăng ký xong, back-end đã gửi mã xác minh về email -> chuyển sang trang nhập mã
      message.success('Đăng ký thành công! Vui lòng kiểm tra email để lấy mã xác minh');
      navigate(`${ROUTES.VERIFY_EMAIL}?email=${encodeURIComponent(email)}`);
    } catch (error) {
      message.error(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <AuthFormHeader title="Đăng ký tài khoản" />

      <Form layout="vertical" requiredMark={false} onFinish={handleSubmit}>
        {/* Họ và Tên nằm trên cùng 1 hàng */}
        <div className="grid gap-x-4 sm:grid-cols-2">
          <TextField name="lastName" label="Họ" placeholder="Nhập họ của bạn" rules={[requiredRule('Vui lòng nhập họ')]} />
          <TextField name="firstName" label="Tên" placeholder="Nhập tên của bạn" rules={[requiredRule('Vui lòng nhập tên')]} />
        </div>

        <TextField name="email" label="Email" placeholder="Nhập email của bạn" rules={emailRules} />

        <TextField name="phone" label="Số điện thoại" placeholder="Nhập số điện thoại của bạn" rules={phoneRules} />

        <PasswordField name="password" label="Mật khẩu" placeholder="Nhập mật khẩu của bạn" rules={newPasswordRules} />

        <PasswordField
          name="confirmPassword"
          label="Nhập lại mật khẩu"
          placeholder="Nhập lại mật khẩu của bạn"
          rules={getConfirmPasswordRules('password')}
          dependencies={['password']}
        />

        <div className="mt-6">
          <PrimaryButton htmlType="submit" loading={isSubmitting}>
            Đăng ký
          </PrimaryButton>
        </div>
      </Form>

      <AuthSwitchText question="Bạn đã có tài khoản?" linkText="Đăng nhập" to={ROUTES.LOGIN} />

      <TermsNotice action="đăng ký" />
    </div>
  );
};

export default RegisterForm;
