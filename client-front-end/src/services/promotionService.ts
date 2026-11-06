// Các lời gọi API cho khuyến mãi; tách giao tiếp HTTP khỏi component. response.data là thân response Axios, trường
// data bên trong là dữ liệu nghiệp vụ.
import apiClient from './apiClient';
import type { PaginatedResponse } from '../types/api';
import type { Promotion } from '../types/promotion';

interface PromotionQuery {
  is_flash_sale?: boolean; // true: chỉ lấy flash sale, false: chỉ lấy khuyến mãi thường
  pageNumber?: number;
  pageSize?: number;
}

// Lấy danh sách khuyến mãi đang diễn ra (sắp hết hạn đứng trước)
const getActivePromotions = async (query: PromotionQuery, signal?: AbortSignal) => {
  const response = await apiClient.get<PaginatedResponse<Promotion>>('/promotion/active', { params: query, signal });
  return response.data;
};

// Đọc hết các trang để không bỏ sót chương trình đang chạy khi danh sách dài.
const getAllActivePromotions = async (isFlashSale: boolean, signal: AbortSignal) => {
  const query = { is_flash_sale: isFlashSale, pageSize: 100 };
  const firstPage = await getActivePromotions({ ...query, pageNumber: 0 }, signal);
  const promotions = [...firstPage.data];
  for (let pageNumber = 1; pageNumber < firstPage.totalPages; pageNumber++) {
    const page = await getActivePromotions({ ...query, pageNumber }, signal);
    promotions.push(...page.data);
  }
  return promotions;
};

const promotionService = {
  getActivePromotions,
  getAllActivePromotions,
};

export default promotionService;
