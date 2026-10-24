import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Badge, Button, Drawer, Tooltip } from 'antd';
import { MenuOutlined, ShoppingCartOutlined } from '@ant-design/icons';
import Sidebar from './Sidebar';
import AOS from 'aos';
import useAuth from '../../hooks/useAuth';
import { NAV_ITEMS } from '../../utils/constants';
const StaffLayout = () => {
  const { pathname } = useLocation();
  const { user, hasPermission, pendingCount } = useAuth();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    window.scrollTo({ top: 0 });
    const frame = requestAnimationFrame(() => AOS.refreshHard());
    return () => cancelAnimationFrame(frame);
  }, [pathname]);
  const section = NAV_ITEMS.find((item) => item.path !== '/' && pathname.startsWith(item.path)) || NAV_ITEMS[0];
  useEffect(() => {
    document.title = section.label + ' · Agri-Mart';
  }, [section.label]);
  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 overflow-y-auto border-r border-line/60 bg-white lg:block">
        <Sidebar />
      </aside>
      <div className="min-w-0 lg:ml-64">
        <header className="flex min-h-20 items-center justify-between gap-4 px-4 py-4 sm:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              className="lg:hidden"
              type="text"
              icon={<MenuOutlined />}
              aria-label="Mở menu"
              onClick={() => setOpen(true)}
            />
            <p className="hidden text-xs font-medium uppercase text-muted sm:block">
              Quản lý cửa hàng / {section.label}
            </p>
          </div>
          <div className="flex min-w-0 items-center gap-3 text-sm text-muted">
            {hasPermission('ORDER_MANAGE') && (
              <Tooltip title={`${pendingCount} đơn chờ xác nhận`}>
                <Link
                  to="/orders?status=PENDING"
                  aria-label={`${pendingCount} đơn chờ xác nhận`}
                  className="mr-2 rounded-lg p-2 hover:bg-white"
                >
                  <Badge count={pendingCount} size="small">
                    <ShoppingCartOutlined className="text-2xl text-primary" />
                  </Badge>
                </Link>
              </Tooltip>
            )}
            <span className="max-w-48 truncate">{user?.full_name}</span>
          </div>
        </header>
        <main className="mx-auto max-w-[1700px] px-4 pb-12 pt-2 sm:px-8 sm:pt-3">
          <Outlet />
        </main>
      </div>
      <Drawer open={open} onClose={() => setOpen(false)} placement="left" styles={{ body: { padding: 0 } }}>
        <Sidebar onNavigate={() => setOpen(false)} />
      </Drawer>
    </div>
  );
};
export default StaffLayout;
