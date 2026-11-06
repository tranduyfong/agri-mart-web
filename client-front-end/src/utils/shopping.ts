// Tính giá dòng giỏ và điều kiện có được chọn dòng để mua với trạng thái/tồn hiện tại.
import type { CartItem } from '../types/shopping';
import { getMaxQuantity } from './productQuantity';

// Tính giá đơn vị sau ưu đãi cho phần trình bày giỏ hàng.
export const getCartItemPrice = (item: CartItem) => Math.round(item.list_price * (1 - (item.discount_percent || 0) / 100));

export const getCartItemTotal = (item: CartItem) => item.line_total ?? Math.round(getCartItemPrice(item) * item.quantity);

// Chỉ cho chọn dòng đủ điều kiện bán/tồn ở thời điểm đang hiển thị.
export const canSelectCartItem = (item: CartItem) => item.status === 'PUBLISHED' && item.quantity > 0 && item.quantity <= getMaxQuantity(item);
