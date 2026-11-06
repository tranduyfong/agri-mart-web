// Kiểu yêu cầu thêm/sửa/nhập và bản trước/sau để nhân viên/admin theo dõi hoặc xét duyệt.
export type ChangeStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export interface ProductChange {
  _id: string;
  title: string;
  type: 'CREATE' | 'UPDATE' | 'IMPORT';
  status: ChangeStatus;
  requested_by: { _id: string; full_name: string } | null;
  reviewed_by: { _id: string; full_name: string } | null;
  created_at: string;
  reviewed_at: string | null;
  review_note: string;
}
export interface StockInput {
  quantity: number;
  unit_cost?: number;
  batch_code?: string;
  manufactured_date?: string | null;
  expiry_date?: string;
}
export interface ProductSnapshot {
  name: string;
  code: string;
  description: string;
  category_name: string;
  status: string;
  images: string[];
  variants: { id: string; sku: string; name: string; unit: string; step_quantity: number; list_price: number;
    lot_prices?: { batch_code: string; expiry_date: string; list_price: number }[] }[];
  initial_stock?: (StockInput | null)[];
}
export interface ProductChangeDetail extends ProductChange {
  before: ProductSnapshot | null;
  after: ProductSnapshot | null;
  rows?: (StockInput & {
    row_number: number;
    sku: string;
    name: string;
    variant_name: string;
    unit: string;
    list_price: number | null;
    image_url?: string;
  })[];
  source_file?: string;
  supplier_name?: string;
  note?: string;
  result?: { receipt_id?: string; productId?: string } | null;
}
export const CHANGE_TYPES = { CREATE: 'Thêm sản phẩm', UPDATE: 'Sửa sản phẩm', IMPORT: 'Nhập hàng' };
export const CHANGE_STATUSES = { PENDING: 'Chờ duyệt', APPROVED: 'Đã duyệt', REJECTED: 'Từ chối' };
export const CHANGE_COLORS = { PENDING: 'gold', APPROVED: 'green', REJECTED: 'red' };
