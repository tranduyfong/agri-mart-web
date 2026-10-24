import { NavLink } from 'react-router-dom';
import { LogoutOutlined } from '@ant-design/icons';
import { Badge } from 'antd';
import Logo from '../../components/Logo';
import { NAV_ITEMS } from '../../utils/constants';
import useAuth from '../../hooks/useAuth';
const Sidebar = ({ onNavigate }: { onNavigate?: () => void }) => {
  const { user, hasPermission, logout, pendingCount } = useAuth();
  return (
    <div className="flex min-h-full flex-col p-4">
      <div className="px-2 pb-5 pt-3">
        <Logo />
      </div>
      <p className="mb-4 px-2 text-xs font-medium uppercase tracking-wide text-muted">Không gian nhân viên</p>
      <nav className="flex flex-col gap-1" aria-label="Điều hướng nhân viên">
        {NAV_ITEMS.filter((item) => !item.permission || hasPermission(item.permission)).map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${isActive ? 'bg-[#ebf6e8] text-primary' : 'text-muted hover:bg-page-gray hover:text-primary'}`
            }
          >
            <span className="text-xl">{item.icon}</span>
            {item.label}
            {item.path === '/orders' && (
              <Badge className="ml-auto" count={pendingCount} title={`${pendingCount} đơn chờ duyệt`} />
            )}
          </NavLink>
        ))}
      </nav>
      <div className="mt-5 rounded-xl bg-page-gray p-4 text-sm">
        <p className="font-semibold">{user?.role === 'ADMIN' ? 'Quản trị viên' : 'Nhân viên cửa hàng'}</p>
        <button
          onClick={logout}
          type="button"
          className="mt-4 flex cursor-pointer items-center gap-2 text-xs font-medium text-primary"
        >
          <LogoutOutlined />
          Đăng xuất
        </button>
      </div>
    </div>
  );
};
export default Sidebar;
