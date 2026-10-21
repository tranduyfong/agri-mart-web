import ProductRow from '../../components/ProductRow';
import useProducts from '../../hooks/useProducts';
import { ROUTES } from '../../utils/constants';

interface RelatedProductsSectionProps {
  productId: string;
  categoryId: string;
}

// Lấy thêm 1 sản phẩm để loại sản phẩm hiện tại mà vẫn có tối đa 6 gợi ý
const RelatedProductsSection = ({ productId, categoryId }: RelatedProductsSectionProps) => {
  const { products, isLoading } = useProducts({ category_id: categoryId, sort: 'best_selling', pageSize: 7 });

  return (
    <ProductRow
      title="Sản phẩm cùng danh mục"
      products={products.filter((product) => product.id !== productId).slice(0, 6)}
      isLoading={isLoading}
      linkTo={`${ROUTES.SHOP}?category_id=${categoryId}`}
    />
  );
};

export default RelatedProductsSection;
