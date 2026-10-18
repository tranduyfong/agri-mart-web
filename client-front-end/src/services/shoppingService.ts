import apiClient from './apiClient';
import type { ApiResponse } from '../types/api';
import type { CartItem, ShoppingMutation } from '../types/shopping';
import type { ProductListItem } from '../types/product';

const getCart = async () => (await apiClient.get<ApiResponse<CartItem[]>>('/cart')).data.data;
const getWishlist = async () => (await apiClient.get<ApiResponse<ProductListItem[]>>('/wishlist')).data.data;

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
