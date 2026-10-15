import type { ReactNode } from 'react';

interface InfoItemProps {
  icon: ReactNode;
  text: string;
}

// Một dòng thông tin gồm icon + chữ (VD: địa chỉ, giờ mở cửa, số điện thoại trên thanh trên cùng)
const InfoItem = ({ icon, text }: InfoItemProps) => {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <span>{text}</span>
    </div>
  );
};

export default InfoItem;
