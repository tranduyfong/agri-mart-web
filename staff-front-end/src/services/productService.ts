// Các lời gọi API cho sản phẩm; tách giao tiếp HTTP khỏi component. response.data là thân response Axios, trường data
// bên trong là dữ liệu nghiệp vụ.
import apiClient from './apiClient';
import type { ApiResponse, PaginatedResponse } from '../types/api';
import type { ProductDetail } from '../types/product';
import type { StaffProduct } from '../types/staff';
// Gọi API lấy danh sách sản phẩm theo bộ lọc; component chỉ nhận dữ liệu đã tách khỏi lớp Axios.
const getProducts = async (query: object) =>
  (
    await apiClient.get<PaginatedResponse<StaffProduct>>('/staff/products', {
      params: query,
    })
  ).data;
// Gọi API lấy dữ liệu sản phẩm cần chỉnh sửa; component chỉ nhận dữ liệu đã tách khỏi lớp Axios.
const getProduct = async (id: string) =>
  (await apiClient.get<ApiResponse<ProductDetail>>('/staff/products/' + id)).data.data;
// Gọi API để thêm/sửa sản phẩm theo luồng quyền hiện tại; backend vẫn là nơi kiểm tra quyền và dữ liệu.
const saveProduct = async (id: string | undefined, data: FormData) =>
  (
    await apiClient.request<ApiResponse<{ productId?: string; id?: string }>>({
      url: '/staff/products' + (id ? '/' + id : ''),
      method: id ? 'PUT' : 'POST',
      data,
    })
  ).data.data;
export default { getProducts, getProduct, saveProduct };
