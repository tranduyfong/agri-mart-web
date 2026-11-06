// Tập trung đường dẫn, nhãn và các giá trị dùng nhiều nơi để các màn hình không tự khai báo lệch nhau.
import {
  AppstoreOutlined,
  TeamOutlined,
  SafetyCertificateOutlined,
  BarChartOutlined,
  InboxOutlined,
} from '@ant-design/icons';
export const NAV_ITEMS = [
  { path: '/', label: 'Tổng quan', icon: <AppstoreOutlined /> },
  { path: '/product-changes', label: 'Duyệt sản phẩm', icon: <SafetyCertificateOutlined /> },
  { path: '/accounts', label: 'Tài khoản', icon: <TeamOutlined /> },
  { path: '/suppliers', label: 'Nhà cung cấp', icon: <InboxOutlined /> },
  { path: '/permissions', label: 'Phân quyền', icon: <SafetyCertificateOutlined /> },
  { path: '/reports/revenue', label: 'Báo cáo doanh thu', icon: <BarChartOutlined /> },
  { path: '/reports/inventory', label: 'Báo cáo nhập – tồn', icon: <InboxOutlined /> },
];
export const ROLE_LABELS = { ADMIN: 'Quản trị viên', STAFF: 'Nhân viên', CUSTOMER: 'Khách hàng' };
