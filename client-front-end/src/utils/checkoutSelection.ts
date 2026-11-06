// Đổi lựa chọn mua ngay một/nhóm sản phẩm thành tham số URL checkout và đọc ngược tham số đó.
import type { BuyNowPurchase, BuyNowSelection } from '../types/order';
import { ROUTES } from './constants';

// Ưu tiên mảng buy cho gợi ý nhiều món; vẫn đọc được variant/quantity của luồng mua ngay một món.
export const getBuyNowSelection = (params: URLSearchParams): BuyNowPurchase | undefined => {
  if (params.has('buy')) {
    try {
      const items: unknown = JSON.parse(params.get('buy') || '[]');
      return Array.isArray(items) ? items as BuyNowSelection[] : [];
    } catch { return []; }
  }
  return params.has('variant') ? { variant_id: params.get('variant') || '', quantity: Number(params.get('quantity')) } : undefined;
};

// Chỉ đưa ID quy cách và số lượng vào URL; giá và tồn sẽ do backend kiểm tra lại.
export const getDirectCheckoutPath = (items: BuyNowSelection[]) => ROUTES.CHECKOUT + '?' + new URLSearchParams({
  buy: JSON.stringify(items.map(({ variant_id, quantity }) => ({ variant_id, quantity }))),
}).toString();
