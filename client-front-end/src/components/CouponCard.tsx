import { Link } from 'react-router-dom';
import { TagOutlined, TruckOutlined } from '@ant-design/icons';
import type { Promotion } from '../types/promotion';
import { formatDate, formatPrice } from '../utils/format';
import { ROUTES } from '../utils/constants';
import CopyCodeButton from './CopyCodeButton';
import PromotionBackground from './PromotionBackground';

// Mã vẫn nằm trong hàng thẻ cuộn ngang, dùng ảnh riêng của ưu đãi làm nền.
const CouponCard = ({ promotion }: { promotion: Promotion }) => {
  const shipping = promotion.promotion_scope === 'SHIPPING';
  return (
    <article className="relative isolate flex h-full min-h-80 flex-col overflow-hidden rounded-xl p-5 text-white">
      <PromotionBackground imageUrl={promotion.image_url} />
      <p className="flex items-center gap-2 text-sm font-medium text-white/90">
        {shipping ? <TruckOutlined /> : <TagOutlined />}
        {shipping ? 'Mã giảm phí giao hàng' : 'Mã giảm giá'}
      </p>
      <p className="mt-3 break-words text-2xl font-bold sm:text-3xl">
        Giảm {promotion.discount_type === 'PERCENT' ? promotion.discount_value + '%' : formatPrice(promotion.discount_value)}
      </p>
      <h3 className="mt-2 font-semibold">{promotion.name}</h3>
      <p className="mt-2 text-sm text-white/90">
        {promotion.min_order_value > 0 ? 'Đơn từ ' + formatPrice(promotion.min_order_value) : 'Không yêu cầu đơn tối thiểu'}
      </p>
      <p className="mt-2 text-xs text-white/80">Hết hạn: {formatDate(promotion.valid_to)}</p>
      <div className="mt-auto pt-5">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-dashed border-green-300 bg-white p-3">
          <span className="min-w-0 select-all break-all font-bold text-primary-dark">{promotion.code}</span>
          <CopyCodeButton code={promotion.code} />
        </div>
        <Link to={ROUTES.SHOP} className="mt-3 inline-block text-sm font-semibold text-white hover:text-white/80">Mua sắm ngay →</Link>
      </div>
    </article>
  );
};
export default CouponCard;
