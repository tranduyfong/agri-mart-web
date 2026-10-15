import { useState } from 'react';
import { App, Form } from 'antd';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import AuthFormHeader from '../../components/AuthFormHeader';
import TextField from '../../components/TextField';
import PasswordField from '../../components/PasswordField';
import PrimaryButton from '../../components/PrimaryButton';
import AuthSwitchText from '../../components/AuthSwitchText';
import TermsNotice from '../../components/TermsNotice';
import authService from '../../services/authService';
import { useAppDispatch } from '../../hooks/useRedux';
import { setCredentials } from '../../store/slices/authSlice';
import type { LoginFormValues } from '../../types/auth';
import { saveAuth } from '../../utils/authStorage';
import { ROUTES } from '../../utils/constants';
import { getErrorCode, getErrorMessage } from '../../utils/errorMessage';
import { emailRules, requiredRule } from '../../utils/validationRules';

// Form đăng nhập
const LoginForm = () => {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Email được truyền sang từ trang khác (VD: vừa xác minh email xong) để điền sẵn vào form
  const emailFromPreviousPage = (location.state as { email?: string } | null)?.email;

  // Tài khoản chưa xác minh email: gửi lại mã mới rồi chuyển sang trang xác minh
  const handleUnverifiedAccount = async (email: string) => {
    try {
      await authService.resendVerifyEmail(email);
      message.warning('Tài khoản chưa được xác minh. Mã xác minh mới đã được gửi tới email của bạn');
      navigate(`${ROUTES.VERIFY_EMAIL}?email=${encodeURIComponent(email)}`);
    } catch (error) {
      message.error(getErrorMessage(error));
    }
  };

  // Chạy khi dữ liệu nhập đã hợp lệ và người dùng bấm "Đăng nhập"
  const handleSubmit = async (values: LoginFormValues) => {
    const email = values.email.trim();

    setIsSubmitting(true);
    try {
      const response = await authService.login(email, values.password);
      const { user, accessToken } = response.data;

      // Lưu thông tin đăng nhập: vào localStorage (giữ khi F5) và vào Redux (để các trang dùng)
      saveAuth(user, accessToken);
      dispatch(setCredentials({ user, accessToken }));

      message.success(response.message);
      navigate(ROUTES.HOME);
    } catch (error) {
      if (getErrorCode(error) === 'ACCOUNT_UNVERIFIED') {
        await handleUnverifiedAccount(email);
      } else {
        message.error(getErrorMessage(error));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <AuthFormHeader title="Đăng nhập tài khoản" />

      <Form
        layout="vertical"
        requiredMark={false}
        initialValues={{ email: emailFromPreviousPage }}
        onFinish={handleSubmit}
      >
        <TextField name="email" label="Email" placeholder="Nhập email của bạn" rules={emailRules} />

        <PasswordField
          name="password"
          label="Mật khẩu"
          placeholder="Nhập mật khẩu của bạn"
          rules={[requiredRule('Vui lòng nhập mật khẩu')]}
        />

        <div className="-mt-2 mb-6 text-right">
          <Link to={ROUTES.FORGOT_PASSWORD} className="text-sm font-semibold text-gray-700 hover:text-primary">
            Quên mật khẩu?
          </Link>
        </div>

        <PrimaryButton htmlType="submit" loading={isSubmitting}>
          Đăng nhập
        </PrimaryButton>
      </Form>

      <AuthSwitchText question="Bạn chưa có tài khoản?" linkText="Đăng ký" to={ROUTES.REGISTER} />

      <TermsNotice action="đăng nhập" />
    </div>
  );
};

export default LoginForm;
