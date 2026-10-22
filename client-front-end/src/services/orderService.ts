import apiClient from './apiClient';
import type { ApiResponse, PaginatedResponse } from '../types/api';
import type { CheckoutOrder, CheckoutPreview, CheckoutRequest } from '../types/order';

const getPreview = async (cartItemIds: string[], checkoutKey: string, couponCode = '') => {
  return (
    await apiClient.post<ApiResponse<CheckoutPreview | { checkout: CheckoutOrder }>>('/order/preview', {
      cart_item_ids: cartItemIds,
      checkout_key: checkoutKey,
      coupon_code: couponCode,
    })
  ).data.data;
};

const checkout = async (data: CheckoutRequest) => {
  return (
    await apiClient.post<ApiResponse<{ checkout_code: string; redirectUrl: string | null }>>('/order/checkout', data)
  ).data.data;
};

const getOrder = async (code: string) => {
  return (await apiClient.get<ApiResponse<CheckoutOrder>>(`/order/${encodeURIComponent(code)}`)).data.data;
};

const getMyOrders = async (
  query: {
    status?: string;
    keyword?: string;
    pageNumber: number;
    pageSize: number;
  },
  signal?: AbortSignal,
) => {
  return (
    await apiClient.get<PaginatedResponse<CheckoutOrder>>('/order', {
      params: query,
      signal,
    })
  ).data;
};

const getPaymentUrl = async (code: string) => {
  return (await apiClient.post<ApiResponse<{ redirectUrl: string }>>(`/order/${encodeURIComponent(code)}/payment-url`))
    .data.data;
};

const checkPayment = async (code: string) => {
  return (await apiClient.post<ApiResponse<CheckoutOrder>>(`/order/${encodeURIComponent(code)}/check-payment`)).data
    .data;
};

const verifyReturn = async (search: string) => {
  return (await apiClient.get<ApiResponse<{ checkout_code: string }>>('/order/vnpay-return' + search)).data.data;
};

export default {
  getPreview,
  checkout,
  getOrder,
  getMyOrders,
  getPaymentUrl,
  checkPayment,
  verifyReturn,
};
