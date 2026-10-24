export interface StaffUser {
  id: string;
  full_name: string;
  email: string;
  role: 'ADMIN' | 'STAFF';
  permissions: string[];
}
export interface StaffSession {
  user: StaffUser;
}
export interface LookupProduct {
  id: string;
  code: string;
  name: string;
  variants: { sku: string; list_price: number; unit: string }[];
}
export interface Lookups {
  categories: { id: string; name: string; slug: string }[];
  suppliers: { id: string; name: string; code: string }[];
  products: LookupProduct[];
}
export interface Category {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
  product_count: number;
}
export interface StaffProduct {
  id: string;
  code: string;
  name: string;
  slug: string;
  skus: string[];
  category_name: string;
  category_id: string;
  min_price: number | null;
  unit: string;
  total_stock: number;
  status: string;
  thumbnail_url: string | null;
}
export interface InventoryLot {
  id: string;
  product_id: string;
  name: string;
  sku: string;
  unit: string;
  batch_code: string;
  physical_quantity: number;
  reserved_quantity: number;
  available_quantity: number;
  expiry_date: string;
  manufactured_date: string | null;
  status: string;
}
export type ImportRow = Record<string, string | number | null>;
export interface CheckedRow {
  row_number: number;
  sku: string;
  name: string;
  unit: string;
  quantity: number;
  unit_cost: number;
  is_new: boolean;
  errors: string[];
}
export interface ImportPreview {
  rows: CheckedRow[];
  total_rows: number;
  valid_rows: number;
  error_rows: number;
  new_skus: number;
}
export interface Receipt {
  id: string;
  total_amount: number;
  items_count: number;
  source_file: string;
  created_at: string;
  supplier_name: string;
  created_by_name: string;
  draft_products: { id: string; name: string; code: string }[];
}
export interface StaffOrder {
  id: string;
  code: string;
  customer_name: string;
  phone: string;
  final_amount: number;
  status: string;
  payment_status: string;
  payment_method: string;
  created_at: string;
}
export interface OrderDetail extends StaffOrder {
  shipping_address: { recipient_name: string; phone: string; email?: string; address_line: string };
  note: string;
  total_amount: number;
  discount_amount: number;
  shipping_fee: number;
  coupon_code: string | null;
  coupon_discount_amount: number;
  items: {
    _id: string;
    name: string;
    variant_name: string;
    unit: string;
    list_price: number;
    price: number;
    quantity: number;
    line_total: number;
  }[];
  status_history: { status: string; staff_name: string; changed_at: string; note: string }[];
}
export interface Promotion {
  image_url?: string | null;
  id: string;
  code: string;
  name: string;
  promotion_scope: 'PRODUCT' | 'SHIPPING';
  discount_type: 'PERCENT' | 'AMOUNT';
  discount_value: number;
  min_order_value: number;
  requires_code: boolean;
  is_flash_sale: boolean;
  valid_from: string;
  valid_to: string;
  product_ids: string[];
  status: string;
}
export interface Banner {
  id: string;
  title: string;
  type: 'POPUP' | 'HOME_CAROUSEL';
  image_url: string;
  link_url: string | null;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  status: string;
}
export interface Newsletter {
  id: string;
  subject: string;
  status: string;
  sent_at: string | null;
  created_at: string;
  recipient_count: number;
  sent_count: number;
  failed_count: number;
}
export interface NewsletterDetail extends Newsletter {
  content: string;
  subscriber_count: number;
  recipients: { email: string; status: string; error: string }[];
}
export interface ChatRoom {
  id: string;
  customer_name: string;
  status: string;
  assigned_staff_id: string | null;
  staff_name?: string;
  updated_at: string;
}
export interface ChatDetail extends ChatRoom {
  messages: { id: string; sender_type: string; content: string; attachments: string[]; created_at: string }[];
}
export interface Dashboard {
  pending: number;
  preparing: number;
  expiring: number;
  support: number;
  missing_images: number;
  orders: StaffOrder[];
}
