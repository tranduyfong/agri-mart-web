import apiClient from './apiClient';
import type { ApiResponse, PaginatedResponse } from '../types/api';
import type { ProductDetail, ProductListItem, ProductQuery } from '../types/product';

// Lấy danh sách sản phẩm đang bán (có tìm kiếm, lọc, sắp xếp, phân trang)
// VD: getProducts({ sort: 'best_selling', pageSize: 10 })
const getProducts = async (query: ProductQuery) => {
  const response = await apiClient.get<PaginatedResponse<ProductListItem>>('/product', { params: query });
  return response.data;
};

// Khách hàng xem chi tiết sản phẩm theo slug, không cần đăng nhập
const getProductDetail = async (slug: string) => {
  const response = await apiClient.get<ApiResponse<ProductDetail>>(`/product/${encodeURIComponent(slug)}`);
  return response.data;
};

const productService = {
  getProducts,
  getProductDetail,
};

export default productService;
