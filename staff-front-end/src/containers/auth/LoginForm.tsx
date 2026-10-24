import { useState } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { Alert, Button, Form, Input } from 'antd';
import { LockOutlined, MailOutlined } from '@ant-design/icons';
import useAuth from '../../hooks/useAuth';
import { getErrorMessage } from '../../utils/errorMessage';
const LoginForm = () => {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  if (user) return <Navigate to="/" replace />;
  const submit = async (values: { email: string; password: string }) => {
    setBusy(true);
    setError('');
    try {
      await login(values.email, values.password);
      const target = location.state?.returnTo;
      navigate(typeof target === 'string' && target.startsWith('/') && !target.startsWith('//') ? target : '/', {
        replace: true,
      });
    } catch (reason) {
      setError(getErrorMessage(reason));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Form layout="vertical" onFinish={submit} requiredMark={false} disabled={busy}>
      {error && <Alert className="mb-5" type="error" showIcon title={error} />}
      <Form.Item
        name="email"
        label="Email nhân viên"
        rules={[{ required: true, type: 'email', message: 'Vui lòng nhập email hợp lệ' }]}
      >
        <Input prefix={<MailOutlined className="text-muted" />} autoComplete="username" placeholder="Email của bạn" />
      </Form.Item>
      <Form.Item name="password" label="Mật khẩu" rules={[{ required: true, message: 'Vui lòng nhập mật khẩu' }]}>
        <Input.Password
          prefix={<LockOutlined className="text-muted" />}
          autoComplete="current-password"
          placeholder="Nhập mật khẩu"
        />
      </Form.Item>
      <Button type="primary" htmlType="submit" block size="large" loading={busy}>
        Đăng nhập
      </Button>
    </Form>
  );
};
export default LoginForm;
