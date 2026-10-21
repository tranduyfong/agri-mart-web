import { Form, Input } from 'antd';
import type { Rule } from 'antd/es/form';

interface TextFieldProps {
  name: string; // Tên trường trong form (VD: 'email')
  label: string;
  placeholder: string;
  rules?: Rule[]; // Quy tắc kiểm tra dữ liệu nhập
  readOnly?: boolean;
}

// Ô nhập chữ có nhãn ở trên, dùng trong các form (email, họ tên, số điện thoại...)
const TextField = ({ name, label, placeholder, rules, readOnly = false }: TextFieldProps) => {
  return (
    <Form.Item name={name} label={<span className="font-semibold">{label}</span>} rules={rules}>
      <Input size="large" placeholder={placeholder} readOnly={readOnly} className={`text-sm ${readOnly ? 'bg-gray-50 text-gray-700' : ''}`} />
    </Form.Item>
  );
};

export default TextField;
