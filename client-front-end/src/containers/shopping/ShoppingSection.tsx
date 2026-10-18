import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Alert, Breadcrumb, Button, Result, Skeleton } from 'antd';
import { HeartOutlined, RightOutlined, ShoppingCartOutlined } from '@ant-design/icons';
import { useAppDispatch, useAppSelector } from '../../hooks/useRedux';
import { fetchShopping } from '../../store/slices/shoppingSlice';
import RecentlyViewedSection from '../product/RecentlyViewedSection';
import { ROUTES } from '../../utils/constants';

interface ShoppingSectionProps {
  title: string;
  kind: 'cart' | 'wishlist';
  children: ReactNode;
}

// Khung chung cho giỏ / yêu thích, có trạng thái đăng nhập và tải lại khi lỗi kết nối
const ShoppingSection = ({ title, kind, children }: ShoppingSectionProps) => {
  const user = useAppSelector((state) => state.auth.user);
  const { status, errorMessage, cart, wishlist } = useAppSelector((state) => state.shopping);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const isEmpty = (kind === 'cart' ? cart : wishlist).length === 0;

  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, [kind]);

  return (
    <div className="flex-1 bg-page-gray pb-16">
      <div className="mx-auto w-full max-w-7xl px-4">
        <div className="py-6 sm:py-8"><Breadcrumb separator={<RightOutlined className="text-[10px]" />} items={[{ title: <Link to={ROUTES.HOME}>Trang chủ</Link> }, { title }]} /></div>
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div><h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">{title}</h1><p className="mt-2 text-sm text-gray-500">{kind === 'cart' ? 'Tươi ngon mỗi ngày, sẵn sàng trong giỏ của bạn.' : 'Những món ngon bạn muốn lưu lại cho lần mua tới.'}</p></div>
          <Link to={ROUTES.SHOP} className="text-sm font-semibold text-primary hover:underline">Tiếp tục mua sắm <RightOutlined className="text-[10px]" /></Link>
        </div>
        {!user ? (
          <Result icon={kind === 'cart' ? <ShoppingCartOutlined className="text-primary" /> : <HeartOutlined className="text-primary" />} title={`Đăng nhập để xem ${kind === 'cart' ? 'giỏ hàng' : 'sản phẩm yêu thích'}`} subTitle="Lưu những sản phẩm bạn chọn và xem lại trên các thiết bị của mình." extra={<Button type="primary" size="large" onClick={() => navigate(ROUTES.LOGIN, { state: { returnTo: location.pathname } })}>Đăng nhập</Button>} />
        ) : (status === 'loading' || status === 'idle') && isEmpty ? (
          <div className="rounded-2xl bg-white p-6 sm:p-10"><Skeleton active paragraph={{ rows: 8 }} /></div>
        ) : (
          <>
            {status === 'failed' && <Alert type="error" showIcon title={errorMessage} className="mb-5" action={<Button size="small" onClick={() => dispatch(fetchShopping())}>Thử lại</Button>} />}
            {children}
          </>
        )}
        <div className="mt-12"><RecentlyViewedSection /></div>
      </div>
    </div>
  );
};

export default ShoppingSection;
