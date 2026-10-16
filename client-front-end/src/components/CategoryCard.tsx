import { Link } from 'react-router-dom';
import { AppstoreOutlined } from '@ant-design/icons';
import type { Category } from '../types/category';
import { ROUTES } from '../utils/constants';
import { getFileUrl } from '../utils/fileUrl';

interface CategoryCardProps {
  category: Category;
}

// Ô danh mục: ảnh + tên, bấm vào sẽ sang trang cửa hàng lọc theo danh mục đó
const CategoryCard = ({ category }: CategoryCardProps) => {
  const imageUrl = getFileUrl(category.image_url);

  return (
    <Link
      to={`${ROUTES.SHOP}?category_id=${category.id}`}
      className="flex flex-col items-center gap-2 rounded-xl border border-gray-100 bg-white px-2 py-3 text-center transition hover:-translate-y-0.5 hover:border-primary hover:shadow-md"
    >
      {imageUrl ? (
        <img src={imageUrl} alt={category.name} className="h-11 w-11 object-contain" />
      ) : (
        <AppstoreOutlined className="text-4xl text-primary" />
      )}
      <span className="line-clamp-2 text-xs font-semibold text-gray-800">{category.name}</span>
    </Link>
  );
};

export default CategoryCard;
