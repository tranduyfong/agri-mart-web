import { Badge } from 'antd';
import type { MouseEventHandler, ReactNode } from 'react';

interface IconButtonProps {
  icon: ReactNode;
  label: string; // Mô tả nút cho trình đọc màn hình (VD: "Giỏ hàng")
  count?: number; // Số hiển thị trên icon (VD: số sản phẩm trong giỏ), không truyền thì không hiện
  onClick?: MouseEventHandler<HTMLButtonElement>;
  pulseKey?: number; // Đổi sau mỗi thao tác để chạy lại hiệu ứng trên icon và số đếm
  shoppingTarget?: 'cart' | 'wishlist';
  pressed?: boolean;
  disabled?: boolean;
}

// Nút chỉ có icon trên thanh điều hướng (giỏ hàng, yêu thích, thông báo...)
const IconButton = ({ icon, label, count = 0, onClick, pulseKey = 0, shoppingTarget, pressed, disabled }: IconButtonProps) => {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      data-shopping-target={shoppingTarget}
      aria-pressed={pressed}
      disabled={disabled}
      className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-xl text-gray-800 hover:bg-gray-100 hover:text-primary disabled:cursor-wait disabled:opacity-50"
    >
      <span key={pulseKey} className={pulseKey > 0 ? 'shopping-bump inline-flex' : 'inline-flex'}>
        <Badge count={count} size="small"><span className="text-xl">{icon}</span></Badge>
      </span>
    </button>
  );
};

export default IconButton;
