import type { PaginatedResponse } from './api';

// Kiểu sắp xếp danh sách sản phẩm mà back-end hỗ trợ
export type ProductSort = 'newest' | 'price_asc' | 'price_desc' | 'name_asc' | 'best_selling' | 'trending';

// Các tham số tìm kiếm / lọc / phân trang khi lấy danh sách sản phẩm
export interface ProductQuery {
  keyword?: string;
  category_id?: string;
  min_price?: number;
  max_price?: number;
  on_sale?: boolean; // Chỉ lấy sản phẩm đang khuyến mãi
  sort?: ProductSort;
  pageNumber?: number; // Bắt đầu từ 0
  pageSize?: number;
}

// 1 sản phẩm trong danh sách (GET /api/product)
export interface ProductListItem {
  id: string;
  code: string;
  name: string;
  slug: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  created_at: string;
  category_id: string;
  category_name: string;
  min_price: number | null; // Giá của quy cách rẻ nhất
  max_price: number | null;
  unit: string | null; // Đơn vị của quy cách rẻ nhất (kg, hộp, bó...)
  total_stock: number; // Tồn kho còn hạn sử dụng, cộng tất cả chi nhánh
  thumbnail_url: string | null;
  sold_quantity: number;
  sold_last_30_days: number;
  discount_percent: number | null; // % giảm giá đang áp dụng (null = không giảm)
}

export interface ProductListResponse extends PaginatedResponse<ProductListItem> {
  meta?: { search_suggestion: string | null };
}

// Các trường thực sự hiển thị trên thẻ, dùng được cả cho danh sách và sản phẩm vừa xem
export type ProductCardItem = Pick<
  ProductListItem,
  'id' | 'name' | 'slug' | 'min_price' | 'unit' | 'total_stock' | 'thumbnail_url' | 'discount_percent'
>;

// Quy cách trong chi tiết sản phẩm (VD: hộp 500g, bán theo kg với bước nhảy 0.5)
export interface ProductVariant {
  id: string;
  sku: string;
  name: string;
  unit: string;
  step_quantity: number;
  list_price: number;
  stock_quantity: number;
}

export interface ProductImage {
  id: string;
  url: string;
  is_thumbnail: number;
}

// Chi tiết sản phẩm đang bán (GET /api/product/:slug)
export interface ProductDetail {
  id: string;
  code: string;
  name: string;
  slug: string;
  description: string | null;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  created_at: string;
  category_id: string;
  category_name: string;
  discount_percent: number | null;
  variants: ProductVariant[];
  images: ProductImage[];
}
