// Kiểu giỏ hàng/yêu thích, thao tác cập nhật và lỗi có thể gặp khi phiên đăng nhập thay đổi.
import type { ProductListItem } from './product';
import type { LotPricePart } from '../utils/lotPricing';

// Một dòng giỏ hàng ứng với một quy cách bán
export interface CartItem {
  line_total?: number;
  price_breakdown?: LotPricePart[];
  id: string;
  product_id: string;
  name: string;
  slug: string;
  status: ProductListItem['status'];
  category_name: string;
  variant_id: string;
  variant_name: string;
  sku: string;
  unit: string;
  step_quantity: number;
  quantity: number;
  list_price: number;
  stock_quantity: number;
  discount_percent: number | null;
  thumbnail_url: string | null;
}

export type ShoppingMutation =
  | { kind: 'addCart'; variantId: string; quantity: number }
  | { kind: 'updateCart'; itemId: string; quantity: number }
  | { kind: 'removeCart'; itemId: string }
  | { kind: 'addWishlist'; productId: string }
  | { kind: 'removeWishlist'; productId: string };

export interface ShoppingError {
  message: string;
  unauthorized: boolean;
  sessionChanged?: boolean;
}
