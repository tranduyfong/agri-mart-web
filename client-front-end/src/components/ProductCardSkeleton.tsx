import { Skeleton } from 'antd';

// Khung xám nhấp nháy thay cho thẻ sản phẩm trong lúc đang tải dữ liệu
const ProductCardSkeleton = () => {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-3">
      <Skeleton.Node active className="h-32! w-full!" />
      <Skeleton active title={false} paragraph={{ rows: 3 }} className="mt-3" />
    </div>
  );
};

export default ProductCardSkeleton;
