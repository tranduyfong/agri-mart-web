import ProductCard from './ProductCard';
import ProductCardSkeleton from './ProductCardSkeleton';
import SectionHeader from './SectionHeader';
import type { ProductCardItem } from '../types/product';

interface ProductRowProps {
  title: string;
  products: ProductCardItem[];
  isLoading: boolean;
  linkTo?: string;
}

// Hàng 6 sản phẩm, tự xuống dòng trên tablet / điện thoại; ẩn khi không có dữ liệu
const ProductRow = ({ title, products, isLoading, linkTo }: ProductRowProps) => {
  if (!isLoading && products.length === 0) return null;

  return (
    <section>
      <SectionHeader title={title} linkTo={linkTo} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-6">
        {isLoading
          ? Array.from({ length: 6 }).map((_, index) => <ProductCardSkeleton key={index} />)
          : products.map((product) => <ProductCard key={product.id} product={product} />)}
      </div>
    </section>
  );
};

export default ProductRow;
