import { Skeleton } from 'antd';

// Giữ bố cục ảnh và thông tin trong lúc chờ API chi tiết
const ProductDetailSkeleton = () => (
  <div role="status" aria-label="Đang tải chi tiết sản phẩm" className="grid gap-8 lg:grid-cols-12 lg:gap-10">
    <div className="lg:col-span-7">
      <div className="aspect-[1.5] animate-pulse rounded-2xl bg-white" />
      <div className="mt-4 grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="aspect-[1.4] animate-pulse rounded-xl bg-white" />
        ))}
      </div>
    </div>
    <div className="lg:col-span-5">
      <Skeleton active title={{ width: '70%' }} paragraph={{ rows: 5 }} />
      <div className="mt-10"><Skeleton active paragraph={{ rows: 4 }} /></div>
    </div>
  </div>
);

export default ProductDetailSkeleton;
