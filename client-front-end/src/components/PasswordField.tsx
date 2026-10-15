import { Form, Input } from 'antd';
import type { Rule } from 'antd/es/form';

interface PasswordFieldProps {
  name: string;
  label: string;
  placeholder: string;
  rules?: Rule[];
  dependencies?: string[]; // Dùng cho ô "Nhập lại mật khẩu" để kiểm tra lại khi ô mật khẩu thay đổi
}

// Ô nhập mật khẩu, có icon con mắt để ẩn/hiện mật khẩu
const PasswordField = ({ name, label, placeholder, rules, dependencies }: PasswordFieldProps) => {
  return (
    <Form.Item
      name={name}
      label={<span className="font-semibold">{label}</span>}
      rules={rules}
      dependencies={dependencies}
    >
      <Input.Password size="large" placeholder={placeholder} className="text-sm" />
    </Form.Item>
  );
};

export default PasswordField;
