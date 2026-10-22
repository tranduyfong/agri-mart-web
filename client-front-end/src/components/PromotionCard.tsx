import { Link } from 'react-router-dom';
import type { Promotion } from '../types/promotion';
import { ROUTES } from '../utils/constants';
import { formatDate, formatPrice } from '../utils/format';

interface PromotionCardProps {
  promotion: Promotion;
}

// Nội dung mức giảm, VD: "35%" hoặc "30.000đ"
const getDiscountText = (promotion: Promotion) => {
  if (promotion.discount_type === 'PERCENT') {
    return `${promotion.discount_value}%`;
  }
  return formatPrice(promotion.discount_value);
};

// Thẻ khuyến mãi màu xanh: mức giảm, nội dung, điều kiện, thời gian áp dụng, mã, nút mua ngay
const PromotionCard = ({ promotion }: PromotionCardProps) => {
  const isShippingPromotion = promotion.promotion_scope === 'SHIPPING';
  const isCoupon = !!promotion.requires_code || isShippingPromotion || promotion.discount_type === 'AMOUNT';

  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-xl bg-linear-to-br from-primary to-primary-dark p-4 text-white">
      {/* Hình tròn trang trí */}
      <div className="absolute -top-8 -right-8 h-28 w-28 rounded-full bg-white/10" />
      <div className="absolute -right-4 -bottom-10 h-24 w-24 rounded-full bg-white/10" />

      <p className="text-xs text-white/90">{isShippingPromotion ? 'Giảm phí giao hàng' : 'Giảm đến'}</p>
      <p className="text-3xl font-bold">{getDiscountText(promotion)}</p>
      <p className="mt-1 text-sm font-medium">{promotion.name}</p>
      {isCoupon && <p className="mt-1 text-xs text-white/90">Nhập mã khi thanh toán</p>}

      {promotion.min_order_value > 0 && (
        <p className="mt-1 text-xs text-white/80">Đơn tối thiểu {formatPrice(promotion.min_order_value)}</p>
      )}

      <div className="mt-auto flex items-end justify-between gap-2 pt-3">
        <div className="text-xs text-white/80">
          <p>
            {formatDate(promotion.valid_from)} - {formatDate(promotion.valid_to)}
          </p>
          <p className="mt-0.5">
            Mã: <span className="font-bold text-white">{promotion.code}</span>
          </p>
        </div>

        <Link
          to={isCoupon ? ROUTES.SHOP : `${ROUTES.SHOP}?on_sale=true`}
          className="relative shrink-0 rounded-full bg-white px-3 py-1 text-xs font-semibold text-primary-dark hover:bg-green-50"
        >
          Mua ngay
        </Link>
      </div>
    </div>
  );
};

export default PromotionCard;
