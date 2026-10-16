import apiClient from './apiClient';
import type { PaginatedResponse } from '../types/api';
import type { Category } from '../types/category';

interface CategoryQuery {
  keyword?: string;
  pageNumber?: number;
  pageSize?: number;
}

// Lấy danh sách danh mục sản phẩm
const getCategories = async (query: CategoryQuery) => {
  const response = await apiClient.get<PaginatedResponse<Category>>('/category', { params: query });
  return response.data;
};

const categoryService = {
  getCategories,
};

export default categoryService;
