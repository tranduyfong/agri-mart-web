import ProductCard from '../../components/ProductCard';
import ProductCardSkeleton from '../../components/ProductCardSkeleton';
import useProducts from '../../hooks/useProducts';
import type { ProductQuery } from '../../types/product';

interface ProductHighlightColumnProps {
  title: string;
  query: ProductQuery; // Điều kiện lấy sản phẩm cho cột này
}

// Số sản phẩm trong mỗi cột
const PRODUCTS_PER_COLUMN = 2;

// 1 cột sản phẩm nổi bật (VD: "Xu hướng" gồm 2 sản phẩm bán chạy nhất 30 ngày qua)
const ProductHighlightColumn = ({ title, query }: ProductHighlightColumnProps) => {
  const { products, isLoading } = useProducts({ ...query, pageSize: PRODUCTS_PER_COLUMN });

  // Cột không có sản phẩm nào thì ẩn đi
  if (!isLoading && products.length === 0) return null;

  return (
    <div>
      <h3 className="mb-3 text-lg font-bold text-gray-900">{title}</h3>
      <div className="grid gap-4">
        {isLoading
          ? Array.from({ length: PRODUCTS_PER_COLUMN }).map((_, index) => <ProductCardSkeleton key={index} />)
          : products.map((product) => <ProductCard key={product.id} product={product} />)}
      </div>
    </div>
  );
};

export default ProductHighlightColumn;
