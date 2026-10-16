import type { ProductVariant } from '../types/product';

// DB lưu số lượng tối đa 3 chữ số thập phân. Tính theo số nguyên để tránh lỗi 0.1 + 0.2.
const QUANTITY_SCALE = 1000;

export const getQuantityStep = (variant: ProductVariant) => Math.max(1, Math.round(variant.step_quantity * QUANTITY_SCALE)) / QUANTITY_SCALE;

// Không cho chọn phần tồn kho nhỏ hơn một bước bán (VD: tồn 0.7kg, bước 0.5kg -> mua tối đa 0.5kg)
export const getMaxQuantity = (variant: ProductVariant) => {
  const step = Math.round(getQuantityStep(variant) * QUANTITY_SCALE);
  const stock = Math.max(0, Math.round(variant.stock_quantity * QUANTITY_SCALE));
  return Math.floor(stock / step) * step / QUANTITY_SCALE;
};

export const normalizeQuantity = (value: number, variant: ProductVariant) => {
  const max = getMaxQuantity(variant);
  if (max === 0) return 0;
  const step = Math.round(getQuantityStep(variant) * QUANTITY_SCALE);
  const quantity = Math.round(value * QUANTITY_SCALE / step) * step / QUANTITY_SCALE;
  return Math.min(max, Math.max(getQuantityStep(variant), quantity));
};
