import type { CheckoutOrder } from '../types/order';

export const ORDER_STATUSES: Record<CheckoutOrder['status'], { label: string; color: string }> = {
  PENDING: { label: 'Chờ xác nhận', color: 'gold' },
  CONFIRMED: { label: 'Đang chuẩn bị', color: 'cyan' },
  SHIPPING: { label: 'Đang giao hàng', color: 'blue' },
  COMPLETED: { label: 'Đã giao hàng', color: 'green' },
  CANCELLED: { label: 'Đã hủy', color: 'red' },
};

export const PAYMENT_STATUSES = {
  UNPAID: 'Chưa thanh toán',
  PAID: 'Đã thanh toán',
  REFUNDED: 'Đã hoàn tiền',
};
export const PAYMENT_METHODS = {
  COD: 'Thanh toán khi nhận hàng',
  VNPAY: 'VNPay',
  MOMO: 'MoMo',
};
