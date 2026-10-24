import { NavLink } from 'react-router-dom';
import { LogoutOutlined } from '@ant-design/icons';
import Logo from '../../components/Logo';
import useAuth from '../../hooks/useAuth';
import { NAV_ITEMS } from '../../utils/constants';
const Sidebar = ({ onNavigate }: { onNavigate?: () => void }) => {
  const { logout } = useAuth();
  return (
    <div className="flex min-h-full flex-col p-4">
      <div className="px-2 pb-5 pt-3">
        <Logo />
      </div>
      <p className="mb-4 px-2 text-xs font-medium uppercase tracking-wide text-muted">Quản trị hệ thống</p>
      <nav className="flex flex-col gap-1" aria-label="Điều hướng quản trị viên">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            onClick={onNavigate}
            className={({ isActive }) =>
              'flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ' +
              (isActive ? 'bg-primary-soft text-primary' : 'text-muted hover:bg-page-gray hover:text-primary')
            }
          >
            <span className="text-xl">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-5 rounded-xl bg-page-gray p-4 text-sm">
        <p className="font-semibold">Quản trị viên</p>
        <button type="button" onClick={logout} className="mt-4 flex cursor-pointer items-center gap-2 text-primary">
          <LogoutOutlined />
          Đăng xuất
        </button>
      </div>
    </div>
  );
};
export default Sidebar;
