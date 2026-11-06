// Các lời gọi API cho giỏ hàng/yêu thích; tách giao tiếp HTTP khỏi component. response.data là thân response Axios,
// trường data bên trong là dữ liệu nghiệp vụ.
import apiClient from './apiClient';
import type { ApiResponse } from '../types/api';
import type { CartItem, ShoppingMutation } from '../types/shopping';
import type { ProductListItem } from '../types/product';

// Gọi API lấy giỏ của tài khoản hiện tại; component chỉ nhận dữ liệu đã tách khỏi lớp Axios.
const getCart = async () => (await apiClient.get<ApiResponse<CartItem[]>>('/cart')).data.data;
// Gọi API lấy sản phẩm đã thích; component chỉ nhận dữ liệu đã tách khỏi lớp Axios.
const getWishlist = async () => (await apiClient.get<ApiResponse<ProductListItem[]>>('/wishlist')).data.data;

// Gọi API để thêm/sửa/xóa dòng giỏ theo loại thao tác; backend vẫn là nơi kiểm tra quyền và dữ liệu.
const changeCart = async (action: ShoppingMutation) => {
  if (action.kind === 'addCart') {
    return (await apiClient.post<ApiResponse<CartItem[]>>('/cart/items', { variant_id: action.variantId, quantity: action.quantity })).data.data;
  }
  if (action.kind === 'updateCart') {
    return (await apiClient.patch<ApiResponse<CartItem[]>>(`/cart/items/${action.itemId}`, { quantity: action.quantity })).data.data;
  }
  if (action.kind === 'removeCart') {
    return (await apiClient.delete<ApiResponse<CartItem[]>>(`/cart/items/${action.itemId}`)).data.data;
  }
  throw new Error('Thao tác giỏ hàng không hợp lệ');
};

// Gọi API để thêm/bỏ sản phẩm yêu thích; backend vẫn là nơi kiểm tra quyền và dữ liệu.
const changeWishlist = async (action: ShoppingMutation) => {
  if (action.kind === 'addWishlist') {
    return (await apiClient.put<ApiResponse<ProductListItem[]>>(`/wishlist/${action.productId}`)).data.data;
  }
  if (action.kind === 'removeWishlist') {
    return (await apiClient.delete<ApiResponse<ProductListItem[]>>(`/wishlist/${action.productId}`)).data.data;
  }
  throw new Error('Thao tác yêu thích không hợp lệ');
};

export default { getCart, getWishlist, changeCart, changeWishlist };
