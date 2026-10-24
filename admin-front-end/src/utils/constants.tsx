import {
  AppstoreOutlined,
  TeamOutlined,
  SafetyCertificateOutlined,
  BarChartOutlined,
  InboxOutlined,
} from '@ant-design/icons';
export const NAV_ITEMS = [
  { path: '/', label: 'Tổng quan', icon: <AppstoreOutlined /> },
  { path: '/accounts', label: 'Tài khoản', icon: <TeamOutlined /> },
  { path: '/permissions', label: 'Phân quyền', icon: <SafetyCertificateOutlined /> },
  { path: '/reports/revenue', label: 'Báo cáo doanh thu', icon: <BarChartOutlined /> },
  { path: '/reports/inventory', label: 'Báo cáo nhập – tồn', icon: <InboxOutlined /> },
];
export const ROLE_LABELS = { ADMIN: 'Quản trị viên', STAFF: 'Nhân viên', CUSTOMER: 'Khách hàng' };
