import apiClient from './apiClient';
import type { PaginatedResponse } from '../types/api';
import type { Promotion } from '../types/promotion';

interface PromotionQuery {
  is_flash_sale?: boolean; // true: chỉ lấy flash sale, false: chỉ lấy khuyến mãi thường
  pageNumber?: number;
  pageSize?: number;
}

// Lấy danh sách khuyến mãi đang diễn ra (sắp hết hạn đứng trước)
const getActivePromotions = async (query: PromotionQuery) => {
  const response = await apiClient.get<PaginatedResponse<Promotion>>('/promotion/active', { params: query });
  return response.data;
};

const promotionService = {
  getActivePromotions,
};

export default promotionService;
