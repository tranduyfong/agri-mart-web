import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Result, Spin } from 'antd';
import useAuth from '../hooks/useAuth';
const ProtectedRoute = ({ children, permission }: { children: ReactNode; permission?: string }) => {
  const { user, loading, hasPermission } = useAuth();
  const location = useLocation();
  if (loading)
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spin size="large" />
      </div>
    );
  if (!user) return <Navigate to="/login" replace state={{ returnTo: location.pathname + location.search }} />;
  if (permission && !hasPermission(permission))
    return (
      <Result
        status="403"
        title="Bạn chưa có quyền truy cập"
        subTitle="Liên hệ quản trị viên để được phân công chức năng này."
      />
    );
  return children;
};
export default ProtectedRoute;
