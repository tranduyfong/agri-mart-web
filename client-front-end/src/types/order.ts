import type { UserAddress } from './account';

export interface CheckoutItem {
  product_id: string;
  variant_id: string;
  name: string;
  variant_name: string;
  category_name: string;
  unit: string;
  thumbnail_url: string | null;
  quantity: number;
  list_price: number;
  price: number;
  line_total: number;
}

export interface CheckoutSummary {
  items: CheckoutItem[];
  subtotal: number;
  discount_amount: number;
  shipping_fee: number;
  total: number;
}

export interface CheckoutPreview extends CheckoutSummary {
  vnpay_available: boolean;
}

export interface CheckoutOrder extends CheckoutSummary {
  checkout_code: string;
  order_codes: string[];
  payment_method: 'COD' | 'VNPAY';
  payment_status: 'UNPAID' | 'PAID' | 'REFUNDED';
  status: 'PENDING' | 'CONFIRMED' | 'SHIPPING' | 'COMPLETED' | 'CANCELLED';
  created_at: string;
  paid_at: string | null;
  transaction_code: string | null;
  payment_expires_at: string | null;
  shipping_address: Omit<UserAddress, 'id' | 'is_default'> & { email: string };
  note: string;
}

export interface CheckoutFormValues {
  recipient_name: string;
  phone: string;
  email: string;
  payment_method: 'COD' | 'VNPAY';
  note: string;
}

export interface CheckoutRequest extends CheckoutFormValues {
  address_id: string;
  cart_item_ids: string[];
  checkout_key: string;
  expected_total: number;
}
