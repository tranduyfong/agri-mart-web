import { Skeleton } from 'antd';
import HorizontalSection from '../../components/HorizontalSection';
import CategoryCard from '../../components/CategoryCard';
import useCategories from '../../hooks/useCategories';
import { ROUTES } from '../../utils/constants';

// Số ô giữ chỗ khi API đang tải danh mục.
const SKELETON_COUNT = 12;

// Khối "Danh mục" trên trang chủ
const CategorySection = () => {
  const { categories, isLoading } = useCategories();

  // Không có danh mục nào thì ẩn luôn khối này
  if (!isLoading && categories.length === 0) return null;

  return (
    <HorizontalSection title="Danh mục" linkTo={ROUTES.SHOP} itemClassName="w-28 sm:w-32">
      {isLoading
        ? Array.from({ length: SKELETON_COUNT }).map((_, index) => (
            <Skeleton.Node key={index} active className="h-24! w-full!" />
          ))
        : categories.map((category) => <CategoryCard key={category.id} category={category} />)}
    </HorizontalSection>
  );
};

export default CategorySection;
