import { Skeleton } from 'antd';
import SectionHeader from '../../components/SectionHeader';
import CategoryCard from '../../components/CategoryCard';
import useCategories from '../../hooks/useCategories';
import { ROUTES } from '../../utils/constants';

// Số ô danh mục hiển thị trên trang chủ (vừa 1 hàng trên màn hình lớn)
const MAX_CATEGORIES = 12;

// Khối "Danh mục" trên trang chủ
const CategorySection = () => {
  const { categories, isLoading } = useCategories();

  // Không có danh mục nào thì ẩn luôn khối này
  if (!isLoading && categories.length === 0) return null;

  return (
    <section>
      <SectionHeader title="Danh mục" linkTo={ROUTES.SHOP} />

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6 lg:grid-cols-12">
        {isLoading
          ? Array.from({ length: MAX_CATEGORIES }).map((_, index) => (
              <Skeleton.Node key={index} active className="h-24! w-full!" />
            ))
          : categories.slice(0, MAX_CATEGORIES).map((category) => (
              <CategoryCard key={category.id} category={category} />
            ))}
      </div>
    </section>
  );
};

export default CategorySection;
