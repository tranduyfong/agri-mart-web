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
      { path: 'accounts', element: <AccountPage /> },
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
