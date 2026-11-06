// Các lời gọi API cho đơn hàng và thanh toán; tách giao tiếp HTTP khỏi component. response.data là thân response
// Axios, trường data bên trong là dữ liệu nghiệp vụ.
import apiClient from './apiClient';
import type { ApiResponse, PaginatedResponse } from '../types/api';
import type { BuyNowPurchase, CheckoutOrder, CheckoutPreview, CheckoutRequest } from '../types/order';

// Gọi API lấy bản tính tiền và kho hiện tại trước khi đặt; component chỉ nhận dữ liệu đã tách khỏi lớp Axios.
const getPreview = async (cartItemIds: string[], checkoutKey: string, couponCode = '', buyNow?: BuyNowPurchase) => {
  return (
    await apiClient.post<ApiResponse<CheckoutPreview | { checkout: CheckoutOrder }>>('/order/preview', {
      cart_item_ids: cartItemIds,
      checkout_key: checkoutKey,
      coupon_code: couponCode,
      buy_now: buyNow,
    })
  ).data.data;
};

// Gọi API để tạo đơn theo lựa chọn và tổng tiền đã xem; backend vẫn là nơi kiểm tra quyền và dữ liệu.
const checkout = async (data: CheckoutRequest) => {
  return (
    await apiClient.post<ApiResponse<{ checkout_code: string; redirectUrl: string | null }>>('/order/checkout', data)
  ).data.data;
};

// Gọi API lấy chi tiết một đơn/lần đặt; component chỉ nhận dữ liệu đã tách khỏi lớp Axios.
const getOrder = async (code: string) => {
  return (await apiClient.get<ApiResponse<CheckoutOrder>>(`/order/${encodeURIComponent(code)}`)).data.data;
};

// Gọi API lấy các đơn thuộc tài khoản đang đăng nhập; component chỉ nhận dữ liệu đã tách khỏi lớp Axios.
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

// Gọi API lấy URL thanh toán khi đơn đủ điều kiện; component chỉ nhận dữ liệu đã tách khỏi lớp Axios.
const getPaymentUrl = async (code: string) => {
  return (await apiClient.post<ApiResponse<{ redirectUrl: string }>>(`/order/${encodeURIComponent(code)}/payment-url`))
    .data.data;
};

// Gọi API lấy kết quả đối soát giao dịch; component chỉ nhận dữ liệu đã tách khỏi lớp Axios.
const checkPayment = async (code: string) => {
  return (await apiClient.post<ApiResponse<CheckoutOrder>>(`/order/${encodeURIComponent(code)}/check-payment`)).data
    .data;
};

// Gọi API lấy mã đơn sau khi xác minh tham số VNPay trả về; component chỉ nhận dữ liệu đã tách khỏi lớp Axios.
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
