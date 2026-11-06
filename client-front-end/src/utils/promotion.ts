import type { Promotion } from '../types/promotion';

// Các mã nhập ở thanh toán được trình bày riêng với chương trình giảm tự động.
export const isCouponPromotion = (promotion: Promotion) =>
  !!promotion.requires_code || promotion.promotion_scope === 'SHIPPING' || promotion.discount_type === 'AMOUNT';
