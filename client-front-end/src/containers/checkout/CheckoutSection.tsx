import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Breadcrumb, Button, Result, Skeleton } from 'antd';
import { LockOutlined, RightOutlined } from '@ant-design/icons';
import CheckoutForm from './CheckoutForm';
import { useAppDispatch, useAppSelector } from '../../hooks/useRedux';
import { logout } from '../../store/slices/authSlice';
import { clearAuth } from '../../utils/authStorage';
import orderService from '../../services/orderService';
import accountService from '../../services/accountService';
import { getOrderResultPath, ROUTES } from '../../utils/constants';
import { getErrorMessage } from '../../utils/errorMessage';
import type { AccountData } from '../../types/account';
import type { CheckoutPreview } from '../../types/order';

interface CheckoutData {
  requestKey: string;
  account: AccountData;
  preview: CheckoutPreview;
  checkoutKey: string;
  cartItemIds: string[];
}

const CheckoutSection = () => {
  const user = useAppSelector((state) => state.auth.user);
  const sessionToken = useAppSelector((state) => state.auth.accessToken);
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState<CheckoutData | null>(null);
  const [error, setError] = useState<{ key: string; message: string } | null>(null);
  const requestKey = JSON.stringify([sessionToken, location.search, retry]);

  useEffect(() => {
    if (!sessionToken || !user) return;
    let outdated = false;
    window.scrollTo({ top: 0, behavior: 'instant' });
    const cartItemIds = (new URLSearchParams(location.search).get('items') || '').split(',').filter(Boolean);
    if (!cartItemIds.length) return;
    const storageKey = 'agrimart.checkout.' + user.id;
    let saved: { items: string; key: string } | null = null;
    try { saved = JSON.parse(sessionStorage.getItem(storageKey) || 'null'); } catch { /* Khóa cũ không còn dùng được. */ }
    const selection = [...cartItemIds].sort().join(',');
    const checkoutKey = saved?.items === selection && typeof saved.key === 'string' ? saved.key : crypto.randomUUID();
    sessionStorage.setItem(storageKey, JSON.stringify({ items: selection, key: checkoutKey }));

    Promise.all([accountService.getAccount(), orderService.getPreview(cartItemIds, checkoutKey)])
      .then(([account, preview]) => {
        if (outdated) return;
        if ('checkout' in preview) {
          sessionStorage.removeItem(storageKey);
          navigate(getOrderResultPath(preview.checkout.checkout_code), { replace: true });
          return;
        }
        setResult({ requestKey, account: account.data, preview, checkoutKey, cartItemIds });
      })
      .catch((reason: unknown) => {
        if (outdated) return;
        if (axios.isAxiosError(reason) && reason.response?.status === 401) {
          clearAuth();
          dispatch(logout());
          navigate(ROUTES.LOGIN, { state: { returnTo: ROUTES.CHECKOUT + location.search } });
        } else setError({ key: requestKey, message: getErrorMessage(reason) });
      });
    return () => { outdated = true; };
  }, [sessionToken, user, location.search, requestKey, navigate, dispatch]);

  const missingSelection = !(new URLSearchParams(location.search).get('items') || '').split(',').some(Boolean);
  const data = result?.requestKey === requestKey ? result : null;
  const errorMessage = error?.key === requestKey ? error.message : '';

  return (
    <div className="flex-1 bg-page-gray pb-16 sm:pb-20">
      <div className="mx-auto w-full max-w-7xl px-4">
        <div className="py-6 sm:py-8"><Breadcrumb separator={<RightOutlined className="text-[10px]" />} items={[
          { title: <Link to={ROUTES.HOME}>Trang chủ</Link> },
          { title: <Link to={ROUTES.CART}>Giỏ hàng</Link> },
          { title: 'Thanh toán' },
        ]} /></div>
        <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
          <div><h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Hoàn tất đơn hàng</h1><p className="mt-2 text-sm text-gray-500">Thực phẩm tươi ngon, giao đến nơi bạn muốn.</p></div>
          <span className="flex items-center gap-2 text-sm text-primary"><LockOutlined />Thanh toán an toàn</span>
        </div>
        {!sessionToken || !user ? (
          <Result icon={<LockOutlined className="text-primary" />} title="Đăng nhập để thanh toán" subTitle="Địa chỉ và đơn hàng sẽ được lưu trong tài khoản của bạn." extra={<Button type="primary" size="large" onClick={() => navigate(ROUTES.LOGIN, { state: { returnTo: location.pathname + location.search } })}>Đăng nhập</Button>} />
        ) : missingSelection ? (
          <Result status="info" title="Chọn sản phẩm cần thanh toán" subTitle="Vui lòng chọn sản phẩm trong giỏ hàng trước khi tiếp tục." extra={<Link to={ROUTES.CART}><Button type="primary">Về giỏ hàng</Button></Link>} />
        ) : errorMessage ? (
          <Result status="warning" title="Chưa thể tiếp tục thanh toán" subTitle={errorMessage} extra={[
            <Link key="cart" to={ROUTES.CART}><Button type="primary">Kiểm tra giỏ hàng</Button></Link>,
            <Button key="retry" onClick={() => setRetry((value) => value + 1)}>Thử lại</Button>,
          ]} />
        ) : data ? (
          <CheckoutForm key={requestKey} account={data.account} preview={data.preview} cartItemIds={data.cartItemIds} checkoutKey={data.checkoutKey} sessionToken={sessionToken} onReload={() => setRetry((value) => value + 1)} />
        ) : (
          <div className="grid gap-7 lg:grid-cols-[1.25fr_0.9fr]"><div className="rounded-2xl bg-white p-7"><Skeleton active paragraph={{ rows: 12 }} /></div><div className="rounded-2xl bg-white p-7"><Skeleton active paragraph={{ rows: 8 }} /></div></div>
        )}
      </div>
    </div>
  );
};

export default CheckoutSection;
