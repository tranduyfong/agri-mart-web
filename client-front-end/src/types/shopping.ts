import type { ProductListItem } from './product';

// Một dòng giỏ hàng ứng với một quy cách tại một chi nhánh
export interface CartItem {
  id: number;
  product_id: number;
  name: string;
  slug: string;
  status: ProductListItem['status'];
  category_name: string;
  variant_id: number;
  variant_name: string;
  sku: string;
  unit: string;
  step_quantity: number;
  quantity: number;
  list_price: number;
  stock_quantity: number;
  discount_percent: number | null;
  thumbnail_url: string | null;
  branch_id: number;
  branch_name: string;
}

export type ShoppingMutation =
  | { kind: 'addCart'; variantId: number; quantity: number }
  | { kind: 'updateCart'; itemId: number; quantity: number }
  | { kind: 'removeCart'; itemId: number }
  | { kind: 'addWishlist'; productId: number }
  | { kind: 'removeWishlist'; productId: number };

export interface ShoppingError {
  message: string;
  unauthorized: boolean;
  sessionChanged?: boolean;
}
