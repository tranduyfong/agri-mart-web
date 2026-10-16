import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface SectionHeaderProps {
  title: string;
  linkTo?: string; // Có truyền thì hiện link "Xem tất cả" bên phải
  extra?: ReactNode; // Nội dung thêm cạnh tiêu đề (VD: đồng hồ đếm ngược)
}

// Tiêu đề của 1 khối trên trang (VD: "Danh mục ........ Xem tất cả")
const SectionHeader = ({ title, linkTo, extra }: SectionHeaderProps) => {
  return (
    <div className="mb-4 flex items-center justify-between gap-4">
      <div className="flex flex-wrap items-center gap-4">
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
        {extra}
      </div>

      {linkTo && (
        <Link to={linkTo} className="shrink-0 text-sm font-semibold text-primary hover:underline">
          Xem tất cả
        </Link>
      )}
    </div>
  );
};

export default SectionHeader;
