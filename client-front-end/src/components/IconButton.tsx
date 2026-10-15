import { Badge } from 'antd';
import type { ReactNode } from 'react';

interface IconButtonProps {
  icon: ReactNode;
  label: string; // Mô tả nút cho trình đọc màn hình (VD: "Giỏ hàng")
  count?: number; // Số hiển thị trên icon (VD: số sản phẩm trong giỏ), không truyền thì không hiện
  onClick?: () => void;
}

// Nút chỉ có icon trên thanh điều hướng (giỏ hàng, yêu thích, thông báo...)
const IconButton = ({ icon, label, count = 0, onClick }: IconButtonProps) => {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-xl text-gray-800 hover:bg-gray-100 hover:text-primary"
    >
      <Badge count={count} size="small">
        <span className="text-xl">{icon}</span>
      </Badge>
    </button>
  );
};

export default IconButton;
