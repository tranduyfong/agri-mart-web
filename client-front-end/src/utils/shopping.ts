import type { CartItem } from '../types/shopping';
import { getMaxQuantity } from './productQuantity';

export const getCartItemPrice = (item: CartItem) => Math.round(item.list_price * (1 - (item.discount_percent || 0) / 100));

export const canSelectCartItem = (item: CartItem) => item.status === 'PUBLISHED' && item.quantity > 0 && item.quantity <= getMaxQuantity(item);
