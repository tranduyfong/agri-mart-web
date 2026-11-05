import type { BuyNowPurchase, BuyNowSelection } from '../types/order';
import { ROUTES } from './constants';

export const getBuyNowSelection = (params: URLSearchParams): BuyNowPurchase | undefined => {
  if (params.has('buy')) {
    try {
      const items: unknown = JSON.parse(params.get('buy') || '[]');
      return Array.isArray(items) ? items as BuyNowSelection[] : [];
    } catch { return []; }
  }
  return params.has('variant') ? { variant_id: params.get('variant') || '', quantity: Number(params.get('quantity')) } : undefined;
};

export const getDirectCheckoutPath = (items: BuyNowSelection[]) => ROUTES.CHECKOUT + '?' + new URLSearchParams({
  buy: JSON.stringify(items.map(({ variant_id, quantity }) => ({ variant_id, quantity }))),
}).toString();
