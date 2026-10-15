import { Form, Input } from 'antd';
import type { Rule } from 'antd/es/form';

interface TextFieldProps {
  name: string; // Tên trường trong form (VD: 'email')
  label: string;
  placeholder: string;
  rules?: Rule[]; // Quy tắc kiểm tra dữ liệu nhập
}

// Ô nhập chữ có nhãn ở trên, dùng trong các form (email, họ tên, số điện thoại...)
const TextField = ({ name, label, placeholder, rules }: TextFieldProps) => {
  return (
    <Form.Item name={name} label={<span className="font-semibold">{label}</span>} rules={rules}>
      <Input size="large" placeholder={placeholder} className="text-sm" />
    </Form.Item>
  );
};

export default TextField;
