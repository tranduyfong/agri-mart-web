// 1 danh mục sản phẩm (GET /api/category)
export interface Category {
  id: number;
  name: string;
  slug: string;
  image_url: string | null;
  product_count: number; // Số sản phẩm đang bán trong danh mục
}
