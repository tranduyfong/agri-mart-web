import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Button, Drawer } from 'antd';
import { MenuOutlined } from '@ant-design/icons';
import AOS from 'aos';
import Sidebar from './Sidebar';
import useAuth from '../../hooks/useAuth';
import { NAV_ITEMS } from '../../utils/constants';
const AdminLayout = () => {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const section = NAV_ITEMS.find((item) => item.path !== '/' && pathname.startsWith(item.path)) || NAV_ITEMS[0];
  useEffect(() => {
    document.title = section.label + ' · Agri-Mart';
    window.scrollTo({ top: 0 });
    const frame = requestAnimationFrame(() => AOS.refreshHard());
    return () => cancelAnimationFrame(frame);
  }, [pathname, section.label]);
  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 overflow-y-auto border-r border-line/60 bg-white lg:block">
        <Sidebar />
      </aside>
      <div className="min-w-0 lg:ml-64">
        <header className="flex min-h-20 items-center justify-between gap-4 px-4 py-4 sm:px-8">
          <div className="flex items-center gap-3">
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
            <span className="max-w-48 truncate">{user?.full_name}</span>
          </div>
        </header>
        <main className="mx-auto max-w-[1700px] px-4 pb-12 pt-2 sm:px-8 sm:pt-3">
          <Outlet />
        </main>
      </div>
      <Drawer open={open} placement="left" onClose={() => setOpen(false)} styles={{ body: { padding: 0 } }}>
        <Sidebar onNavigate={() => setOpen(false)} />
      </Drawer>
    </div>
  );
};
export default AdminLayout;
