import type { Rule } from 'antd/es/form';

// Các quy tắc kiểm tra dữ liệu nhập dùng chung cho các form
// (Back-end không kiểm tra lại các quy tắc này, nên phía FE phải kiểm tra đầy đủ)

export const MIN_PASSWORD_LENGTH = 6;

// Bắt buộc nhập, kèm câu thông báo
export const requiredRule = (message: string): Rule => ({
  required: true,
  whitespace: true, // Chỉ nhập dấu cách cũng tính là chưa nhập
  message,
});

export const emailRules: Rule[] = [
  requiredRule('Vui lòng nhập email'),
  { type: 'email', message: 'Email không đúng định dạng' },
];

// Số điện thoại Việt Nam: bắt đầu bằng 0 hoặc +84, theo sau là 9 chữ số (VD: 0912345678)
export const phoneRules: Rule[] = [
  requiredRule('Vui lòng nhập số điện thoại'),
  { pattern: /^(0|\+84)[35789]\d{8}$/, message: 'Số điện thoại không đúng định dạng' },
];

// Mật khẩu khi đăng ký / đặt lại mật khẩu
export const newPasswordRules: Rule[] = [
  requiredRule('Vui lòng nhập mật khẩu'),
  { min: MIN_PASSWORD_LENGTH, message: `Mật khẩu phải có ít nhất ${MIN_PASSWORD_LENGTH} ký tự` },
];

// Ô "Nhập lại mật khẩu" phải giống ô mật khẩu (passwordFieldName là tên ô mật khẩu cần so sánh)
export const getConfirmPasswordRules = (passwordFieldName: string): Rule[] => [
  requiredRule('Vui lòng nhập lại mật khẩu'),
  ({ getFieldValue }) => ({
    validator(_, value) {
      if (!value || getFieldValue(passwordFieldName) === value) {
        return Promise.resolve();
      }
      return Promise.reject(new Error('Mật khẩu nhập lại không khớp'));
    },
  }),
];
