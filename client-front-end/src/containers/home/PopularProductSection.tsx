import { useState } from 'react';
import type { ReactNode } from 'react';
import { Empty } from 'antd';
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  FireOutlined,
  RiseOutlined,
  TagOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import HorizontalSection from '../../components/HorizontalSection';
import FilterChip from '../../components/FilterChip';
import ProductCard from '../../components/ProductCard';
import ProductCardSkeleton from '../../components/ProductCardSkeleton';
import useProducts from '../../hooks/useProducts';
import type { ProductQuery } from '../../types/product';
import { ROUTES } from '../../utils/constants';

// Các bộ lọc nhanh, mỗi bộ lọc tương ứng 1 điều kiện gửi lên API danh sách sản phẩm
const FILTERS: {
  key: string;
  label: string;
  icon: ReactNode;
  query: ProductQuery;
}[] = [
  {
    key: 'popular',
    label: 'Phổ biến',
    icon: <FireOutlined />,
    query: { sort: 'best_selling' },
  },
  {
    key: 'trending',
    label: 'Xu hướng',
    icon: <RiseOutlined />,
    query: { sort: 'trending' },
  },
  {
    key: 'newest',
    label: 'Mới về',
    icon: <ThunderboltOutlined />,
    query: { sort: 'newest' },
  },
  {
    key: 'on-sale',
    label: 'Đang giảm giá',
    icon: <TagOutlined />,
    query: { on_sale: true, sort: 'best_selling' },
  },
  {
    key: 'price-asc',
    label: 'Giá thấp',
    icon: <ArrowDownOutlined />,
    query: { sort: 'price_asc' },
  },
  {
    key: 'price-desc',
    label: 'Giá cao',
    icon: <ArrowUpOutlined />,
    query: { sort: 'price_desc' },
  },
];

const PRODUCT_LIMIT = 10;

// Khối "Sản phẩm nổi bật": hàng bộ lọc nhanh + danh sách sản phẩm cuộn ngang
const PopularProductSection = () => {
  const [activeFilterKey, setActiveFilterKey] = useState(FILTERS[0].key);

  const activeFilter = FILTERS.find((filter) => filter.key === activeFilterKey) || FILTERS[0];
  const { products, isLoading } = useProducts({
    ...activeFilter.query,
    pageSize: PRODUCT_LIMIT,
  });

  // Link "Xem tất cả": sang trang cửa hàng với cùng điều kiện lọc
  const params = new URLSearchParams();
  if (activeFilter.query.sort) params.set('sort', activeFilter.query.sort);
  if (activeFilter.query.on_sale) params.set('on_sale', 'true');

  return (
    <section>
      {/* Hàng bộ lọc, cuộn ngang được trên điện thoại */}
      <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((filter) => (
          <FilterChip
            key={filter.key}
            label={filter.label}
            icon={filter.icon}
            isActive={filter.key === activeFilterKey}
            onClick={() => setActiveFilterKey(filter.key)}
          />
        ))}
      </div>

      <HorizontalSection
        key={activeFilterKey}
        title="Sản phẩm nổi bật"
        linkTo={`${ROUTES.SHOP}?${params.toString()}`}
        itemClassName="w-52 sm:w-56"
      >
        {!isLoading && products.length === 0 ? (
          <Empty description="Chưa có sản phẩm nào" />
        ) : isLoading ? (
          Array.from({ length: 6 }).map((_, index) => <ProductCardSkeleton key={index} />)
        ) : (
          products.map((product) => <ProductCard key={product.id} product={product} />)
        )}
      </HorizontalSection>
    </section>
  );
};

export default PopularProductSection;
