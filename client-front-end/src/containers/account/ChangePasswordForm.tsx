import { useState } from 'react';
import { App, Form } from 'antd';
import type { Rule } from 'antd/es/form';
import { useNavigate } from 'react-router-dom';
import { SafetyCertificateOutlined } from '@ant-design/icons';
import PasswordField from '../../components/PasswordField';
import PrimaryButton from '../../components/PrimaryButton';
import useAccountContext from '../../hooks/useAccountContext';
import { useAppDispatch } from '../../hooks/useRedux';
import accountService from '../../services/accountService';
import { logout } from '../../store/slices/authSlice';
import { clearAuth, getSavedAccessToken } from '../../utils/authStorage';
import { getErrorCode, getErrorMessage } from '../../utils/errorMessage';
import { getConfirmPasswordRules, newPasswordRules, requiredRule } from '../../utils/validationRules';
import { ROUTES } from '../../utils/constants';
import type { ChangePasswordFormValues } from '../../types/account';

const passwordByteRule: Rule = {
  validator: (_, value: string | undefined) => {
    return !value || new TextEncoder().encode(value).length <= 72
      ? Promise.resolve()
      : Promise.reject(new Error('Mật khẩu không được vượt quá 72 byte'));
  },
};

const ChangePasswordForm = () => {
  const { user, handleError } = useAccountContext();
  const { message } = App.useApp();
  const [form] = Form.useForm<ChangePasswordFormValues>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const handleSubmit = async (values: ChangePasswordFormValues) => {
    const sessionToken = getSavedAccessToken();
    setIsSubmitting(true);
    try {
      const response = await accountService.changePassword(values);
      if (getSavedAccessToken() !== sessionToken) return;
      form.resetFields();
      clearAuth();
      dispatch(logout());
      message.success(response.message);
      navigate(ROUTES.LOGIN, { replace: true, state: { email: user.email, returnTo: ROUTES.ACCOUNT } });
    } catch (error) {
      const code = getErrorCode(error);
      if (code === 'WRONG_CURRENT_PASSWORD' || code === 'PASSWORD_UNCHANGED') {
        form.setFields([{ name: code === 'WRONG_CURRENT_PASSWORD' ? 'current_password' : 'new_password', errors: [getErrorMessage(error)] }]);
      } else { handleError(error); }
    } finally { setIsSubmitting(false); }
  };

  return (
    <section>
      <h1 className="text-2xl font-bold text-gray-900">Đổi mật khẩu</h1>
      <p className="mt-2 text-sm leading-6 text-gray-500">Nhập mật khẩu hiện tại và chọn mật khẩu mới cho tài khoản của bạn.</p>
      <Form form={form} layout="vertical" requiredMark={false} disabled={isSubmitting} className="mt-7" onFinish={handleSubmit}>
        <PasswordField name="current_password" label="Mật khẩu hiện tại" placeholder="Nhập mật khẩu hiện tại" autoComplete="current-password" rules={[requiredRule('Vui lòng nhập mật khẩu hiện tại')]} />
        <PasswordField name="new_password" label="Mật khẩu mới" placeholder="Nhập mật khẩu mới" autoComplete="new-password" rules={[...newPasswordRules, passwordByteRule]} />
        <PasswordField name="confirm_password" label="Nhập lại mật khẩu mới" placeholder="Nhập lại mật khẩu mới" autoComplete="new-password" dependencies={['new_password']} rules={getConfirmPasswordRules('new_password')} />
        <p className="mt-1 text-xs text-gray-400">Mật khẩu mới cần ít nhất 6 ký tự và khác mật khẩu hiện tại.</p>
        <div className="mt-6 flex gap-3 rounded-xl bg-primary/5 p-4 text-sm leading-6 text-gray-500">
          <SafetyCertificateOutlined className="mt-1 shrink-0 text-lg text-primary" />
          <p>Sau khi đổi mật khẩu, bạn sẽ đăng nhập lại bằng mật khẩu mới. Các phiên đăng nhập cũ sẽ kết thúc.</p>
        </div>
        <div className="mt-6 flex justify-end border-t border-gray-100 pt-5">
          <div className="w-full sm:w-44"><PrimaryButton htmlType="submit" loading={isSubmitting}>Lưu mật khẩu mới</PrimaryButton></div>
        </div>
      </Form>
    </section>
  );
};

export default ChangePasswordForm;
