// Kiểu sắp xếp danh sách sản phẩm mà back-end hỗ trợ
export type ProductSort = 'newest' | 'price_asc' | 'price_desc' | 'name_asc' | 'best_selling' | 'trending';

// Các tham số tìm kiếm / lọc / phân trang khi lấy danh sách sản phẩm
export interface ProductQuery {
  keyword?: string;
  category_id?: number;
  min_price?: number;
  max_price?: number;
  on_sale?: boolean; // Chỉ lấy sản phẩm đang khuyến mãi
  sort?: ProductSort;
  pageNumber?: number; // Bắt đầu từ 0
  pageSize?: number;
}

// 1 sản phẩm trong danh sách (GET /api/product)
export interface ProductListItem {
  id: number;
  code: string;
  name: string;
  slug: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  created_at: string;
  category_id: number;
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
