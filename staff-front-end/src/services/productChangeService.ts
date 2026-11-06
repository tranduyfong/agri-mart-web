// Các lời gọi API cho yêu cầu sản phẩm chờ duyệt; tách giao tiếp HTTP khỏi component. response.data là thân response
// Axios, trường data bên trong là dữ liệu nghiệp vụ.
import apiClient from './apiClient';
import type { ApiResponse, PaginatedResponse } from '../types/api';
import type { ChangeStatus, ProductChange, ProductChangeDetail } from '../types/productChange';
const baseUrl = '/staff/product-changes';
// Gọi API lấy danh sách đề nghị sản phẩm; component chỉ nhận dữ liệu đã tách khỏi lớp Axios.
const getChanges = async (query: object) =>
  (await apiClient.get<PaginatedResponse<ProductChange>>(baseUrl, { params: query })).data;
// Gọi API lấy chi tiết đề nghị sản phẩm; component chỉ nhận dữ liệu đã tách khỏi lớp Axios.
const getChange = async (id: string) =>
  (await apiClient.get<ApiResponse<ProductChangeDetail>>(baseUrl + '/' + id)).data.data;
// Gọi API để gửi quyết định duyệt/từ chối đề nghị; backend vẫn là nơi kiểm tra quyền và dữ liệu.
const review = async (id: string, status: Exclude<ChangeStatus, 'PENDING'>, note: string) =>
  (
    await apiClient.patch<ApiResponse<ProductChangeDetail>>('/admin/product-changes/' + id + '/review', {
      status,
      note,
    })
  ).data.data;
export default { getChanges, getChange, review };
