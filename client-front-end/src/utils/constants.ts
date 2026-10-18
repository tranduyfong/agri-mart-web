// Đường dẫn các trang, dùng chung cho router và các link trong giao diện
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  VERIFY_EMAIL: '/verify-email',
  FORGOT_PASSWORD: '/forgot-password',
  SHOP: '/shop',
  PRODUCT_DETAIL: '/product/:slug',
  CART: '/cart',
  WISHLIST: '/wishlist',
  CONTACT: '/contact',
};

// Dùng chung cho các link từ thẻ sản phẩm và danh sách đã xem
export const getProductDetailPath = (slug: string) => ROUTES.PRODUCT_DETAIL.replace(':slug', encodeURIComponent(slug));

// Thông tin cửa hàng hiển thị trên thanh trên cùng
export const STORE_INFO = {
  name: 'AgriFood Smart',
  address: 'Hà Nội, Việt Nam',
  openingHours: 'Mở cửa 07:00 - 21:00 mỗi ngày',
  phone: '0123 456 789',
};

// Menu chính trên thanh điều hướng
export const NAV_LINKS = [
  { label: 'Trang chủ', path: ROUTES.HOME },
  { label: 'Cửa hàng', path: ROUTES.SHOP },
  { label: 'Liên hệ', path: ROUTES.CONTACT },
];

// Các cột link ở chân trang
export const FOOTER_LINK_GROUPS = [
  {
    title: 'Tài khoản',
    links: [
      { label: 'Yêu thích', path: ROUTES.WISHLIST },
      { label: 'Giỏ hàng', path: ROUTES.CART },
      { label: 'Theo dõi đơn hàng', path: '#' },
      { label: 'Thông tin giao hàng', path: '#' },
    ],
  },
  {
    title: 'Liên kết',
    links: [
      { label: 'Về chúng tôi', path: '#' },
      { label: 'Liên hệ', path: ROUTES.CONTACT },
      { label: 'Ưu đãi', path: '#' },
      { label: 'Khuyến mãi', path: '#' },
      { label: 'Sản phẩm mới', path: '#' },
    ],
  },
  {
    title: 'Hỗ trợ',
    links: [
      { label: 'Thanh toán', path: '#' },
      { label: 'Hoàn tiền', path: '#' },
      { label: 'Đặt hàng', path: '#' },
      { label: 'Vận chuyển', path: '#' },
      { label: 'Chính sách bảo mật', path: '#' },
    ],
  },
];

// Độ dài mã OTP (khớp với back-end: mã 6 số)
export const OTP_LENGTH = 6;

// Số giây phải chờ trước khi được bấm "Gửi lại mã"
export const RESEND_OTP_SECONDS = 60;
