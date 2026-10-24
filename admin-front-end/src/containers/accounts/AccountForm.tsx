import { useState } from 'react';
import { App, Button, Form, Input } from 'antd';
import { Link } from 'react-router-dom';
import accountService from '../../services/accountService';
import useAuth from '../../hooks/useAuth';
import { getErrorMessage } from '../../utils/errorMessage';
import type { Account } from '../../types/admin';
interface Values {
  full_name: string;
  email: string;
  phone: string;
  password: string;
}
const AccountForm = ({ account, onSaved }: { account: Account | null; onSaved: () => void }) => {
  const { message } = App.useApp();
  const [busy, setBusy] = useState(false);
  const { user, logout } = useAuth();
  const submit = async (values: Values) => {
    setBusy(true);
    try {
      if (account)
        await accountService.updateAccount(account.id, {
          full_name: values.full_name,
          email: values.email,
          phone: values.phone,
          expected_updated_at: account.updated_at,
        });
      else
        await accountService.createStaff({
          ...values,
          permissions: [],
        });
      void message.success(
        account ? 'Đã cập nhật tài khoản.' : 'Đã tạo nhân viên. Bạn có thể cấp quyền ở mục Phân quyền.',
      );
      onSaved();
      if (account && account.id === user?.id && values.email.trim().toLowerCase() !== account.email) logout();
    } catch (error) {
      void message.error(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Form layout="vertical" initialValues={account || {}} onFinish={submit} disabled={busy}>
      <Form.Item
        name="full_name"
        label="Họ tên"
        rules={[{ required: true, whitespace: true, message: 'Vui lòng nhập họ tên' }]}
      >
        <Input maxLength={150} />
      </Form.Item>
      <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email', message: 'Email không hợp lệ' }]}>
        <Input maxLength={254} autoComplete="off" />
      </Form.Item>
      <Form.Item
        name="phone"
        label="Số điện thoại"
        rules={[{ pattern: /^(0|\+84)[35789]\d{8}$/, message: 'Số điện thoại không hợp lệ' }]}
      >
        <Input maxLength={12} />
      </Form.Item>
      {!account && (
        <>
          <Form.Item
            name="password"
            label="Mật khẩu ban đầu"
            rules={[{ required: true, min: 8, whitespace: true, message: 'Mật khẩu ít nhất 8 ký tự' }]}
          >
            <Input.Password autoComplete="new-password" maxLength={72} />
          </Form.Item>
          <p className="mb-5 text-xs leading-6 text-muted">
            Nhân viên mới hoạt động ngay, chưa có quyền chức năng. Hãy cấp quyền trước khi bắt đầu công việc.
          </p>
        </>
      )}
      {account && (
        <p className="mb-5 text-sm text-muted">Đổi email sẽ thu hồi các phiên đăng nhập cũ của tài khoản này.</p>
      )}
      {account?.role === 'STAFF' && (
        <Link className="mb-5 inline-block" to={'/permissions?id=' + account.id}>
          Chỉnh sửa quyền chức năng →
        </Link>
      )}
      <Button type="primary" htmlType="submit" block loading={busy}>
        {account ? 'Lưu thông tin' : 'Tạo nhân viên'}
      </Button>
    </Form>
  );
};
export default AccountForm;
