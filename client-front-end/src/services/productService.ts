import apiClient from './apiClient';
import type { PaginatedResponse } from '../types/api';
import type { ProductListItem, ProductQuery } from '../types/product';

// Lấy danh sách sản phẩm đang bán (có tìm kiếm, lọc, sắp xếp, phân trang)
// VD: getProducts({ sort: 'best_selling', pageSize: 10 })
const getProducts = async (query: ProductQuery) => {
  const response = await apiClient.get<PaginatedResponse<ProductListItem>>('/product', { params: query });
  return response.data;
};

const productService = {
  getProducts,
};

export default productService;
