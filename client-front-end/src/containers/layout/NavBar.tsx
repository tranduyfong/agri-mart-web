import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { App, Button, Drawer, Dropdown, Menu } from 'antd';
import type { MenuProps } from 'antd';
import {
  TruckOutlined,
  DownOutlined,
  HeartOutlined,
  LogoutOutlined,
  MenuOutlined,
  ShoppingCartOutlined,
  UserOutlined,
} from '@ant-design/icons';
import Logo from '../../components/Logo';
import IconButton from '../../components/IconButton';
import { useAppDispatch, useAppSelector } from '../../hooks/useRedux';
import { logout } from '../../store/slices/authSlice';
import { clearAuth } from '../../utils/authStorage';
import { NAV_LINKS, ROUTES } from '../../utils/constants';

// Menu khi bấm vào tên người dùng (đã đăng nhập)
const USER_MENU_ITEMS: MenuProps['items'] = [
  { key: ROUTES.ACCOUNT, label: 'Thông tin cá nhân', icon: <UserOutlined /> },
  { key: ROUTES.ORDERS, label: 'Theo dõi đơn hàng', icon: <TruckOutlined /> },
  { key: ROUTES.ACCOUNT_ADDRESSES, label: 'Sổ địa chỉ' },
  { key: ROUTES.ACCOUNT_PASSWORD, label: 'Đổi mật khẩu' },
  { type: 'divider' },
  { key: 'logout', label: 'Đăng xuất', icon: <LogoutOutlined /> },
];

// Đổi màu chữ của link đang được chọn
const getNavLinkClass = ({ isActive }: { isActive: boolean }) => {
  return isActive ? 'text-primary' : 'text-gray-800 hover:text-primary';
};

// Thanh điều hướng và các lối tắt mua sắm.
const NavBar = () => {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user); // null nếu chưa đăng nhập
  const { cart, wishlist, cartVersion, wishlistVersion } = useAppSelector((state) => state.shopping);
  const cartCount = Math.round(cart.reduce((total, item) => total + item.quantity, 0) * 1000) / 1000;
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Menu hiển thị trong ngăn kéo (Drawer) khi xem trên điện thoại
  const mobileMenuItems: MenuProps['items'] = [
    { key: NAV_LINKS[0].path, label: NAV_LINKS[0].label },
    { key: NAV_LINKS[1].path, label: NAV_LINKS[1].label },
    { key: NAV_LINKS[2].path, label: NAV_LINKS[2].label },
    {
      key: ROUTES.CART,
      label: `Giỏ hàng (${cartCount})`,
      icon: <ShoppingCartOutlined />,
    },
    {
      key: ROUTES.WISHLIST,
      label: `Yêu thích (${wishlist.length})`,
      icon: <HeartOutlined />,
    },
    { key: ROUTES.ORDERS, label: 'Theo dõi đơn hàng', icon: <TruckOutlined /> },
    ...(user
      ? [
          {
            key: ROUTES.ACCOUNT,
            label: 'Tài khoản của tôi',
            icon: <UserOutlined />,
          },
        ]
      : []),
  ];

  // Bấm vào 1 mục trong menu người dùng
  const handleUserMenuClick: MenuProps['onClick'] = (item) => {
    if (item.key.startsWith('/')) {
      navigate(item.key);
      return;
    }
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
    <header className="sticky top-0 z-40 border-b border-gray-100 bg-white">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-3 sm:px-4">
        <div className="[&_span]:text-base [&_svg]:h-6 [&_svg]:w-6 sm:[&_span]:text-xl sm:[&_svg]:h-7 sm:[&_svg]:w-7">
          <Logo />
        </div>

        {/* Menu chính, chỉ hiện trên màn hình lớn */}
        <nav className="hidden items-center gap-10 text-sm lg:flex font-bold">
          <NavLink to={ROUTES.HOME} end className={getNavLinkClass}>
            Trang chủ
          </NavLink>

          <NavLink to={ROUTES.SHOP} className={getNavLinkClass}>
            Cửa hàng
          </NavLink>
          <NavLink to={ROUTES.CONTACT} className={getNavLinkClass}>
            Liên hệ
          </NavLink>
        </nav>

        {/* Các nút bên phải */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Giỏ và yêu thích luôn hiện, kể cả trên điện thoại để nhìn thấy số vừa thêm */}
          <div className="flex items-center gap-0 sm:gap-2" aria-live="polite">
            <IconButton
              icon={<ShoppingCartOutlined />}
              label={`Giỏ hàng (${cartCount})`}
              count={cartCount}
              pulseKey={cartVersion}
              shoppingTarget="cart"
              onClick={() => navigate(ROUTES.CART)}
            />
            <IconButton
              icon={<HeartOutlined />}
              label={`Yêu thích (${wishlist.length})`}
              count={wishlist.length}
              pulseKey={wishlistVersion}
              shoppingTarget="wishlist"
              onClick={() => navigate(ROUTES.WISHLIST)}
            />
          </div>
          <IconButton icon={<TruckOutlined />} label="Theo dõi đơn hàng" onClick={() => navigate(ROUTES.ORDERS)} />

          {/* Đã đăng nhập: hiện tên người dùng. Chưa đăng nhập: hiện nút Đăng nhập */}
          {user ? (
            <Dropdown menu={{ items: USER_MENU_ITEMS, onClick: handleUserMenuClick }}>
              <button
                type="button"
                className="ml-2 hidden cursor-pointer items-center gap-2 rounded-full bg-gray-100 px-3 py-1.5 text-sm font-semibold text-gray-800 sm:flex"
              >
                <UserOutlined />
                <span className="hidden max-w-36 truncate sm:inline">{user.full_name}</span>
                <DownOutlined className="text-xs" />
              </button>
            </Dropdown>
          ) : (
            <Button
              type="primary"
              shape="round"
              className="ml-2 hidden font-semibold sm:inline-flex"
              onClick={() => navigate(ROUTES.LOGIN)}
            >
              Đăng nhập
            </Button>
          )}

          {/* Nút mở menu, chỉ hiện trên màn hình nhỏ */}
          <div className="lg:hidden">
            <IconButton icon={<MenuOutlined />} label="Mở menu" onClick={() => setIsMobileMenuOpen(true)} />
          </div>
        </div>
      </div>

      <Drawer title={<Logo />} placement="right" open={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)}>
        <Menu mode="inline" items={mobileMenuItems} onClick={handleMobileMenuClick} className="border-none" />
        {!user && (
          <Button
            type="primary"
            block
            className="mt-4"
            onClick={() => {
              setIsMobileMenuOpen(false);
              navigate(ROUTES.LOGIN);
            }}
          >
            Đăng nhập
          </Button>
        )}
        {user && (
          <div className="mt-5 border-t border-gray-100 pt-4">
            <p className="mb-3 text-sm font-semibold">{user.full_name}</p>
            <Button
              block
              icon={<LogoutOutlined />}
              onClick={() => {
                clearAuth();
                dispatch(logout());
                setIsMobileMenuOpen(false);
                navigate(ROUTES.LOGIN);
              }}
            >
              Đăng xuất
            </Button>
          </div>
        )}
      </Drawer>
    </header>
  );
};

export default NavBar;
