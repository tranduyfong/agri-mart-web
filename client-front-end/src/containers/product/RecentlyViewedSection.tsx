import ProductRow from '../../components/ProductRow';
import useRecentlyViewedProducts from '../../hooks/useRecentlyViewedProducts';
import { getProductCardItem } from '../../utils/productCard';

interface RecentlyViewedSectionProps {
  currentSlug: string;
}

const RecentlyViewedSection = ({ currentSlug }: RecentlyViewedSectionProps) => {
  const { products, isLoading } = useRecentlyViewedProducts(currentSlug);

  return <ProductRow title="Sản phẩm đã xem gần đây" products={products.map(getProductCardItem)} isLoading={isLoading} />;
};

export default RecentlyViewedSection;
