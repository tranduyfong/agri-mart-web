import { Avatar } from 'antd';
import { NavLink } from 'react-router-dom';
import { EnvironmentOutlined, LockOutlined, RightOutlined, UserOutlined } from '@ant-design/icons';
import type { AuthUser } from '../../types/auth';
import { ROUTES } from '../../utils/constants';

interface AccountSidebarProps {
  user: AuthUser;
}

const ACCOUNT_LINKS = [
  { path: ROUTES.ACCOUNT, label: 'Thông tin cá nhân', icon: <UserOutlined /> },
  { path: ROUTES.ACCOUNT_ADDRESSES, label: 'Sổ địa chỉ', icon: <EnvironmentOutlined /> },
  { path: ROUTES.ACCOUNT_PASSWORD, label: 'Đổi mật khẩu', icon: <LockOutlined /> },
];

// Chỉ hiển thị các mục đã được hỗ trợ trong hệ thống
const AccountSidebar = ({ user }: AccountSidebarProps) => {
  return (
    <aside className="min-w-0">
      <div className="mb-6 flex items-center gap-3 lg:mb-9">
        <Avatar size={48} icon={<UserOutlined />} className="shrink-0 bg-primary/10 text-primary" />
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-gray-900">{user.full_name}</p>
          <p className="mt-1 truncate text-xs text-gray-500">{user.email}</p>
        </div>
      </div>
      <p className="mb-3 hidden text-xs font-medium text-gray-400 lg:block">Cài đặt tài khoản</p>
      <nav aria-label="Cài đặt tài khoản" className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:gap-1">
        {ACCOUNT_LINKS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end
            className={({ isActive }) => `flex shrink-0 items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-semibold transition lg:gap-3 ${isActive ? 'bg-primary/10 text-primary' : 'text-gray-600 hover:bg-white hover:text-primary'}`}
          >
            {item.icon}
            <span>{item.label}</span>
            <RightOutlined className="ml-auto hidden text-[10px] lg:block" />
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};

export default AccountSidebar;
