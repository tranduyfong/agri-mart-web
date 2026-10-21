import { useSearchParams } from 'react-router-dom';
import { Checkbox, Empty, Pagination, Select } from 'antd';
import ProductCard from '../../components/ProductCard';
import ProductCardSkeleton from '../../components/ProductCardSkeleton';
import useCategories from '../../hooks/useCategories';
import useProducts from '../../hooks/useProducts';
import type { ProductSort } from '../../types/product';

const SORT_OPTIONS: { value: ProductSort; label: string }[] = [
  { value: 'best_selling', label: 'Bán chạy nhất' },
  { value: 'trending', label: 'Xu hướng' },
  { value: 'newest', label: 'Mới nhất' },
  { value: 'price_asc', label: 'Giá thấp đến cao' },
  { value: 'price_desc', label: 'Giá cao đến thấp' },
  { value: 'name_asc', label: 'Tên A - Z' },
];

const PAGE_SIZE = 20;

// Danh sách sản phẩm của trang cửa hàng: tìm kiếm, lọc danh mục, sắp xếp, phân trang
// Điều kiện lọc lưu trên đường dẫn, VD: /shop?keyword=cà chua&category_id=2&sort=price_asc&pageNumber=0
// -> F5 hoặc gửi link cho người khác vẫn giữ nguyên kết quả
const ProductSearchResults = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { categories } = useCategories();

  // 1. Đọc điều kiện từ đường dẫn
  const keyword = searchParams.get('keyword') || '';
  const categoryId = searchParams.get('category_id') || undefined;
  const isOnSale = searchParams.get('on_sale') === 'true';
  const sort = (searchParams.get('sort') as ProductSort) || 'best_selling';
  const pageNumber = Number(searchParams.get('pageNumber')) || 0;

  // 2. Gọi API theo điều kiện
  const { products, totalElements, isLoading } = useProducts({
    keyword: keyword || undefined,
    category_id: categoryId,
    on_sale: isOnSale || undefined,
    sort,
    pageNumber,
    pageSize: PAGE_SIZE,
  });

  // Đổi 1 điều kiện trên đường dẫn. Đổi bộ lọc thì quay về trang đầu tiên
  const updateParam = (name: string, value?: string) => {
    const nextParams = new URLSearchParams(searchParams);
    if (value) {
      nextParams.set(name, value);
    } else {
      nextParams.delete(name);
    }
    if (name !== 'pageNumber') {
      nextParams.delete('pageNumber');
    }
    setSearchParams(nextParams);
  };

  // Tiêu đề theo điều kiện đang lọc
  const categoryName = categories.find((category) => category.id === categoryId)?.name;
  let title = 'Tất cả sản phẩm';
  if (keyword) title = `Kết quả tìm kiếm cho "${keyword}"`;
  else if (categoryName) title = categoryName;
  else if (isOnSale) title = 'Sản phẩm đang giảm giá';

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-8">
      {/* Tiêu đề + bộ lọc */}
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          <p className="mt-1 text-sm text-gray-500">{isLoading ? 'Đang tải...' : `${totalElements} sản phẩm`}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Checkbox
            checked={isOnSale}
            onChange={(event) => updateParam('on_sale', event.target.checked ? 'true' : undefined)}
          >
            Đang giảm giá
          </Checkbox>
          <Select
            allowClear
            className="w-48"
            placeholder="Tất cả danh mục"
            value={categoryId}
            onChange={(value) => updateParam('category_id', value ? String(value) : undefined)}
            options={categories.map((category) => ({ value: category.id, label: category.name }))}
          />
          <Select
            className="w-48"
            value={sort}
            onChange={(value) => updateParam('sort', value)}
            options={SORT_OPTIONS}
          />
        </div>
      </div>

      {/* Danh sách sản phẩm */}
      {!isLoading && products.length === 0 ? (
        <Empty className="py-16" description="Không tìm thấy sản phẩm phù hợp" />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {isLoading
            ? Array.from({ length: 10 }).map((_, index) => <ProductCardSkeleton key={index} />)
            : products.map((product) => <ProductCard key={product.id} product={product} />)}
        </div>
      )}

      {/* Phân trang (antd đếm trang từ 1, back-end đếm từ 0) */}
      {totalElements > PAGE_SIZE && (
        <div className="mt-8 flex justify-center">
          <Pagination
            current={pageNumber + 1}
            pageSize={PAGE_SIZE}
            total={totalElements}
            showSizeChanger={false}
            onChange={(page) => updateParam('pageNumber', String(page - 1))}
          />
        </div>
      )}
    </section>
  );
};

export default ProductSearchResults;
