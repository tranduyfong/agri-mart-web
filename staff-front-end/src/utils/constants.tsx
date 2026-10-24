import {
  AppstoreOutlined,
  ProductOutlined,
  InboxOutlined,
  ShoppingCartOutlined,
  TagsOutlined,
  PictureOutlined,
  MailOutlined,
  CommentOutlined,
} from '@ant-design/icons';
export const NAV_ITEMS = [
  { path: '/', label: 'Công việc hôm nay', icon: <AppstoreOutlined />, permission: '' },
  { path: '/products', label: 'Sản phẩm', icon: <ProductOutlined />, permission: 'PRODUCT_MANAGE' },
  { path: '/categories', label: 'Danh mục', icon: <AppstoreOutlined />, permission: 'PRODUCT_MANAGE' },
  { path: '/imports', label: 'Nhập hàng', icon: <InboxOutlined />, permission: 'INVENTORY_MANAGE' },
  { path: '/inventory', label: 'Tồn kho & hạn dùng', icon: <InboxOutlined />, permission: 'INVENTORY_MANAGE' },
  { path: '/orders', label: 'Đơn hàng', icon: <ShoppingCartOutlined />, permission: 'ORDER_MANAGE' },
  { path: '/promotions', label: 'Khuyến mãi', icon: <TagsOutlined />, permission: 'PROMOTION_MANAGE' },
  { path: '/shipping-coupons', label: 'Mã giảm phí giao', icon: <TagsOutlined />, permission: 'PROMOTION_MANAGE' },
  { path: '/banners', label: 'Banner quảng cáo', icon: <PictureOutlined />, permission: 'BANNER_MANAGE' },
  { path: '/newsletters', label: 'Bản tin email', icon: <MailOutlined />, permission: 'NEWSLETTER_MANAGE' },
  { path: '/support', label: 'Chăm sóc khách hàng', icon: <CommentOutlined />, permission: 'SUPPORT_MANAGE' },
];
export const PAGE_SIZE = 10;
export const ORDER_STATUS_OPTIONS = [
  { value: 'PENDING', label: 'Chờ xác nhận' },
  { value: 'CONFIRMED', label: 'Đang chuẩn bị' },
  { value: 'SHIPPING', label: 'Đang giao' },
  { value: 'COMPLETED', label: 'Hoàn tất' },
  { value: 'CANCELLED', label: 'Đã hủy' },
];
