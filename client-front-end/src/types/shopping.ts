import type { ProductListItem } from './product';

// Một dòng giỏ hàng ứng với một quy cách tại một chi nhánh
export interface CartItem {
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
  branch_id: string;
  branch_name: string;
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
