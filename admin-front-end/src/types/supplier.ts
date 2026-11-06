export interface Supplier {
  id: string;
  code: string;
  name: string;
  phone: string | null;
  receipt_count: number;
  total_amount: number;
}
export interface SupplierDetail extends Supplier {
  units: { unit: string; quantity: number }[];
}
export interface SupplierItem {
  id: string;
  sku: string;
  name: string;
  unit: string;
  quantity: number;
  total_amount: number;
}
