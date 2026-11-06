// Ánh xạ URL tới page và layout; các route con dùng lại bố cục, còn ứng dụng quản lý kiểm tra phiên/quyền trước khi
// mở trang.
import { createBrowserRouter, Link } from 'react-router-dom';
import { Button, Result } from 'antd';
import ProtectedRoute from '../components/ProtectedRoute';
import AdminLayout from '../containers/layout/AdminLayout';
import LoginPage from '../pages/LoginPage';
import OverviewPage from '../pages/OverviewPage';
import AccountPage from '../pages/AccountPage';
import PermissionsPage from '../pages/PermissionsPage';
import RevenueReportPage from '../pages/RevenueReportPage';
import InventoryReportPage from '../pages/InventoryReportPage';
import ProductChangesPage from '../pages/ProductChangesPage';
import SupplierPage from '../pages/SupplierPage';
const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AdminLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <OverviewPage /> },
      { path: 'product-changes', element: <ProductChangesPage /> },
      { path: 'accounts', element: <AccountPage /> },
      { path: 'suppliers', element: <SupplierPage /> },
      { path: 'permissions', element: <PermissionsPage /> },
      { path: 'reports/revenue', element: <RevenueReportPage /> },
      { path: 'reports/inventory', element: <InventoryReportPage /> },
      {
        path: '*',
        element: (
          <Result
            status="404"
            title="Không tìm thấy trang"
            extra={
              <Link to="/">
                <Button type="primary">Về tổng quan</Button>
              </Link>
            }
          />
        ),
      },
    ],
  },
]);
export default router;
