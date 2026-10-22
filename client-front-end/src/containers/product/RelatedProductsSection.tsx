import ProductRow from '../../components/ProductRow';
import { useEffect, useState } from 'react';
import productService from '../../services/productService';
import type { ProductListItem } from '../../types/product';
import { ROUTES } from '../../utils/constants';

interface RelatedProductsSectionProps {
  productId: string;
  categoryId: string;
}

// API đã xếp gợi ý theo độ tương đồng nội dung, giữ nguyên thứ tự khi hiển thị.
const RelatedProductsSection = ({ productId, categoryId }: RelatedProductsSectionProps) => {
  const [result, setResult] = useState<{
    id: string;
    products: ProductListItem[];
  } | null>(null);
  useEffect(() => {
    let outdated = false;
    productService
      .getRelatedProducts(productId)
      .then((products) => {
        if (!outdated) setResult({ id: productId, products });
      })
      .catch(() => {
        if (!outdated) setResult({ id: productId, products: [] });
      });
    return () => {
      outdated = true;
    };
  }, [productId]);

  return (
    <ProductRow
      title="Sản phẩm tương tự"
      products={result?.id === productId ? result.products : []}
      isLoading={result?.id !== productId}
      linkTo={`${ROUTES.SHOP}?category_id=${categoryId}`}
    />
  );
};

export default RelatedProductsSection;
