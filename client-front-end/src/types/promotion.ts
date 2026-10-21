// 1 chương trình khuyến mãi đang diễn ra (GET /api/promotion/active)
export interface Promotion {
  id: string;
  code: string;
  name: string;
  discount_value: number;
  discount_type: 'PERCENT' | 'AMOUNT'; // Giảm theo % hoặc giảm số tiền cố định
  promotion_scope: 'PRODUCT' | 'SHIPPING'; // Giảm giá sản phẩm hoặc giảm phí giao hàng
  is_flash_sale: number; // 1 = flash sale, 0 = khuyến mãi thường
  min_order_value: number;
  valid_from: string;
  valid_to: string;
  product_count: number;
}
