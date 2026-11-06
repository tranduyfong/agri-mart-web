// Backend cấp các lô theo hạn tăng dần; frontend xem trước, backend tính lại khi đặt đơn.
export interface SaleLot {
  batch_code: string;
  expiry_date: string;
  quantity: number;
  list_price: number;
}
export interface LotPricePart extends SaleLot {
  price: number;
  line_total: number;
}

export const quoteSaleLots = (
  variant: { list_price: number; sale_lots?: SaleLot[] } | undefined,
  quantity: number,
  discount = 0,
) => {
  let remaining = quantity;
  const parts: LotPricePart[] = [];
  for (const lot of variant?.sale_lots || []) {
    if (remaining <= 0) break;
    const taken = Math.min(remaining, lot.quantity);
    const price = Math.round(lot.list_price * (1 - discount / 100));
    parts.push({ ...lot, quantity: taken, price, line_total: Math.round(price * taken) });
    remaining = Math.round((remaining - taken) * 1000) / 1000;
  }
  const fallbackPrice = Math.round((variant?.list_price || 0) * (1 - discount / 100));
  return { parts, total: parts.reduce((sum, part) => sum + part.line_total, 0) + Math.round(remaining * fallbackPrice) };
};
