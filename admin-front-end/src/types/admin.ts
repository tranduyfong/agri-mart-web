export interface AdminUser {
  id: string;
  full_name: string;
  email: string;
  role: 'ADMIN';
}
export interface AdminSession {
  user: AdminUser;
}
export interface Permission {
  code: string;
  name: string;
  description: string;
}
export interface Lookups extends AdminSession {
  permissions: Permission[];
  categories: { id: string; name: string }[];
}
export interface Account {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: 'ADMIN' | 'STAFF' | 'CUSTOMER';
  status: 'ACTIVE' | 'PENDING' | 'LOCKED';
  permissions: string[];
  updated_at: string;
}
export interface RevenueReport {
  from: string;
  to: string;
  stats: {
    revenue: number;
    refund_amount: number;
    order_count: number;
    cost: number | null;
    known_cost: number;
    gross_profit: number | null;
  };
  quality: { missing_cost_lines: number; legacy_completion_dates: number };
  daily: { date: string; revenue: number }[];
  payments: { method: string; paid_count: number; paid_amount: number; pending_count: number }[];
}
export interface InventoryRow {
  id: string;
  name: string;
  sku: string;
  unit: string;
  imported_quantity: number;
  sold_quantity: number;
  reserved_quantity: number;
  stock_quantity: number;
  available_quantity: number;
}
export interface InventoryMeta {
  from: string;
  to: string;
  as_of: string;
  import_amount: number;
  receipt_count: number;
  legacy_receipt_lines: number;
}
