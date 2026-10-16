import type { ReactNode } from 'react';

interface FilterChipProps {
  label: string;
  icon?: ReactNode;
  isActive: boolean; // Đang được chọn thì tô màu xanh
  onClick: () => void;
}

// Nút bộ lọc dạng viên thuốc (VD: Phổ biến, Xu hướng, Đang giảm giá...)
const FilterChip = ({ label, icon, isActive, onClick }: FilterChipProps) => {
  const colorClass = isActive
    ? 'border-primary bg-primary text-white'
    : 'border-gray-200 bg-white text-gray-700 hover:border-primary hover:text-primary';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-medium transition ${colorClass}`}
    >
      {icon}
      {label}
    </button>
  );
};

export default FilterChip;
