import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { App, Button, Drawer, Dropdown, Menu } from 'antd';
import type { MenuProps } from 'antd';
import {
  BellOutlined,
  DownOutlined,
  GlobalOutlined,
  HeartOutlined,
  LogoutOutlined,
  MenuOutlined,
  ShoppingCartOutlined,
  UserOutlined,
} from '@ant-design/icons';
import Logo from '../../components/Logo';
import IconButton from '../../components/IconButton';
import useCategories from '../../hooks/useCategories';
import { useAppDispatch, useAppSelector } from '../../hooks/useRedux';
import { logout } from '../../store/slices/authSlice';
import { clearAuth } from '../../utils/authStorage';
import { NAV_LINKS, ROUTES } from '../../utils/constants';

// Danh sách ngôn ngữ (hiện tại chỉ là giao diện, chưa đổi ngôn ngữ thật)
const LANGUAGE_ITEMS: MenuProps['items'] = [
  { key: 'vi', label: 'Tiếng Việt' },
  { key: 'en', label: 'Tiếng Anh' },
];

// Menu khi bấm vào tên người dùng (đã đăng nhập)
const USER_MENU_ITEMS: MenuProps['items'] = [{ key: 'logout', label: 'Đăng xuất', icon: <LogoutOutlined /> }];

// Đổi màu chữ của link đang được chọn
const getNavLinkClass = ({ isActive }: { isActive: boolean }) => {
  return isActive ? 'text-primary' : 'text-gray-800 hover:text-primary';
};

// Thanh điều hướng: logo, menu, các nút giỏ hàng / yêu thích / thông báo, ngôn ngữ, nút đăng nhập
const NavBar = () => {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user); // null nếu chưa đăng nhập
  const { categories } = useCategories();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Menu danh mục lấy từ API, key là đường dẫn tới trang cửa hàng đã lọc theo danh mục đó
  const categoryMenuItems: MenuProps['items'] = categories.map((category) => ({
    key: `${ROUTES.SHOP}?category_id=${category.id}`,
    label: category.name,
  }));

  // Menu hiển thị trong ngăn kéo (Drawer) khi xem trên điện thoại
  const mobileMenuItems: MenuProps['items'] = [
    { key: NAV_LINKS[0].path, label: NAV_LINKS[0].label },
    { key: 'category', label: 'Danh mục', children: categoryMenuItems },
    { key: NAV_LINKS[1].path, label: NAV_LINKS[1].label },
    { key: NAV_LINKS[2].path, label: NAV_LINKS[2].label },
  ];

  // Bấm vào 1 mục trong menu người dùng
  const handleUserMenuClick: MenuProps['onClick'] = (item) => {
    if (item.key === 'logout') {
      clearAuth(); // Xóa thông tin đăng nhập trong localStorage
      dispatch(logout()); // Xóa thông tin đăng nhập trong Redux
      message.success('Đăng xuất thành công');
      navigate(ROUTES.LOGIN);
    }
  };

  // Bấm vào 1 mục trong menu điện thoại: nếu là đường dẫn thì chuyển trang
  const handleMobileMenuClick: MenuProps['onClick'] = (item) => {
    if (item.key.startsWith('/')) {
      navigate(item.key);
    }
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="border-b border-gray-100 bg-white">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Logo />

        {/* Menu chính, chỉ hiện trên màn hình lớn */}
        <nav className="hidden items-center gap-10 text-sm font-medium lg:flex">
          <NavLink to={ROUTES.HOME} end className={getNavLinkClass}>
            Trang chủ
          </NavLink>

          <Dropdown menu={{ items: categoryMenuItems, onClick: (item) => navigate(item.key) }}>
            <button type="button" className="flex cursor-pointer items-center gap-1 text-gray-800 hover:text-primary">
              Danh mục <DownOutlined className="text-xs" />
            </button>
          </Dropdown>

          <NavLink to={ROUTES.SHOP} className={getNavLinkClass}>
            Cửa hàng
          </NavLink>
          <NavLink to={ROUTES.CONTACT} className={getNavLinkClass}>
            Liên hệ
          </NavLink>
        </nav>

        {/* Các nút bên phải */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Các icon chỉ hiện từ màn hình tablet trở lên (điện thoại không đủ chỗ) */}
          <div className="hidden items-center gap-2 sm:flex">
            <IconButton icon={<ShoppingCartOutlined />} label="Giỏ hàng" />
            <IconButton icon={<HeartOutlined />} label="Yêu thích" />
            <IconButton icon={<BellOutlined />} label="Thông báo" />

            <Dropdown menu={{ items: LANGUAGE_ITEMS }}>
              <button type="button" className="flex cursor-pointer items-center gap-1 px-2 text-sm font-medium text-gray-800">
                <GlobalOutlined /> VI <DownOutlined className="text-xs" />
              </button>
            </Dropdown>
          </div>

          {/* Đã đăng nhập: hiện tên người dùng. Chưa đăng nhập: hiện nút Đăng nhập */}
          {user ? (
            <Dropdown menu={{ items: USER_MENU_ITEMS, onClick: handleUserMenuClick }}>
              <button
                type="button"
                className="ml-2 flex cursor-pointer items-center gap-2 rounded-full bg-gray-100 px-3 py-1.5 text-sm font-semibold text-gray-800"
              >
                <UserOutlined />
                <span className="hidden max-w-36 truncate sm:inline">{user.full_name}</span>
                <DownOutlined className="text-xs" />
              </button>
            </Dropdown>
          ) : (
            <Button type="primary" shape="round" className="ml-2 font-semibold" onClick={() => navigate(ROUTES.LOGIN)}>
              Đăng nhập
            </Button>
          )}

          {/* Nút mở menu, chỉ hiện trên màn hình nhỏ */}
          <div className="lg:hidden">
            <IconButton icon={<MenuOutlined />} label="Mở menu" onClick={() => setIsMobileMenuOpen(true)} />
          </div>
        </div>
      </div>

      <Drawer
        title={<Logo />}
        placement="right"
        open={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      >
        <Menu mode="inline" items={mobileMenuItems} onClick={handleMobileMenuClick} className="border-none" />
      </Drawer>
    </header>
  );
};

export default NavBar;
