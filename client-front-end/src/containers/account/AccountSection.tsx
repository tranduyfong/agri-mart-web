import { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Button, Result, Skeleton } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import AccountSidebar from './AccountSidebar';
import useAccount from '../../hooks/useAccount';
import { useAppSelector } from '../../hooks/useRedux';
import { ROUTES } from '../../utils/constants';

// Layout của tài khoản: menu trái và nội dung của mục đang được chọn
const AccountSection = () => {
  const user = useAppSelector((state) => state.auth.user);
  const { account, isLoading, errorMessage, reload, onUserUpdated, onAddressesUpdated, handleError } = useAccount();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, [location.pathname]);

  return (
    <div className="flex-1 bg-page-gray">
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:py-12 lg:min-h-[650px] lg:py-14">
        {!user ? (
          <Result
            icon={<UserOutlined className="text-primary" />}
            title="Đăng nhập để quản lý tài khoản"
            subTitle="Cập nhật thông tin cá nhân và lưu địa chỉ giao hàng của bạn."
            extra={<Button type="primary" size="large" onClick={() => navigate(ROUTES.LOGIN, { state: { returnTo: location.pathname } })}>Đăng nhập</Button>}
          />
        ) : (
          <div className="grid items-start gap-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-12">
            <AccountSidebar user={account?.user || user} />
            <div className="min-w-0 rounded-2xl bg-white p-5 sm:p-8">
              {isLoading ? <Skeleton active title={{ width: '45%' }} paragraph={{ rows: 8 }} /> : errorMessage || !account ? (
                <Result status="error" title="Không thể tải thông tin tài khoản" subTitle={errorMessage} extra={[
                  <Button key="retry" type="primary" onClick={reload}>Thử lại</Button>,
                  <Button key="login" onClick={() => navigate(ROUTES.LOGIN, { state: { returnTo: location.pathname } })}>Đăng nhập lại</Button>,
                ]} />
              ) : (
                <Outlet context={{ ...account, onUserUpdated, onAddressesUpdated, handleError }} />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AccountSection;
