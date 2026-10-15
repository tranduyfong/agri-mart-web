import { Button } from 'antd';
import type { ReactNode } from 'react';

interface PrimaryButtonProps {
  children: ReactNode;
  htmlType?: 'button' | 'submit';
  loading?: boolean; // Hiện vòng xoay khi đang gửi dữ liệu
  disabled?: boolean; // Nút màu xám, không bấm được
  onClick?: () => void;
}

// Nút chính màu xanh lá (Đăng nhập, Đăng ký, Xác nhận...), rộng hết khung chứa
const PrimaryButton = ({
  children,
  htmlType = 'button',
  loading = false,
  disabled = false,
  onClick,
}: PrimaryButtonProps) => {
  // Chỉ tô màu xanh chuyển sắc khi nút đang bấm được, nút bị khóa thì giữ màu xám mặc định
  const colorClass = disabled ? '' : 'bg-linear-to-b from-primary to-primary-dark';

  return (
    <Button
      type="primary"
      htmlType={htmlType}
      loading={loading}
      disabled={disabled}
      onClick={onClick}
      block
      size="large"
      className={`font-semibold ${colorClass}`}
    >
      {children}
    </Button>
  );
};

export default PrimaryButton;
