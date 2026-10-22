import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Alert, App, Button, Result, Skeleton } from 'antd';
import { CheckCircleFilled, ClockCircleOutlined, CloseCircleFilled, CreditCardOutlined, EnvironmentOutlined, ExclamationCircleFilled, HomeOutlined, ReloadOutlined } from '@ant-design/icons';
import orderService from '../../services/orderService';
import { useAppDispatch, useAppSelector } from '../../hooks/useRedux';
import { logout } from '../../store/slices/authSlice';
import { clearAuth, getSavedAccessToken } from '../../utils/authStorage';
import { getErrorMessage } from '../../utils/errorMessage';
import { formatPrice } from '../../utils/format';
import { ROUTES } from '../../utils/constants';
import type { CheckoutOrder } from '../../types/order';

const formatDate = (value: string) => new Date(value).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

const OrderResultSection = () => {
  const { code = '' } = useParams();
  const sessionToken = useAppSelector((state) => state.auth.accessToken);
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const location = useLocation();
  const { message } = App.useApp();
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState<{ key: string; order: CheckoutOrder } | null>(null);
  const [error, setError] = useState<{ key: string; message: string } | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const requestKey = JSON.stringify([sessionToken, code, retry]);
  const order = result?.key === requestKey ? result.order : null;
  const errorMessage = error?.key === requestKey ? error.message : '';

  useEffect(() => {
    if (!sessionToken) return;
    let outdated = false;
    window.scrollTo({ top: 0, behavior: 'instant' });
    orderService.getOrder(code)
      .then((data) => { if (!outdated) setResult({ key: requestKey, order: data }); })
      .catch((reason: unknown) => {
        if (outdated) return;
        if (axios.isAxiosError(reason) && reason.response?.status === 401) {
          clearAuth(); dispatch(logout());
          navigate(ROUTES.LOGIN, { state: { returnTo: location.pathname } });
        } else setError({ key: requestKey, message: getErrorMessage(reason) });
      });
    return () => { outdated = true; };
  }, [code, requestKey, sessionToken, navigate, dispatch, location.pathname]);

  const isPending = order?.payment_method === 'VNPAY' && order.payment_status === 'UNPAID' && order.status === 'PENDING';
  useEffect(() => {
    if (!isPending) return;
    let outdated = false;
    const timer = window.setInterval(() => {
      orderService.getOrder(code).then((data) => {
        if (!outdated && getSavedAccessToken() === sessionToken) setResult({ key: requestKey, order: data });
      }).catch(() => undefined);
    }, 5000);
    return () => { outdated = true; window.clearInterval(timer); };
  }, [code, isPending, requestKey, sessionToken]);

  const checkPayment = async () => {
    setIsBusy(true);
    try {
      const data = await orderService.checkPayment(code);
      if (getSavedAccessToken() !== sessionToken) return;
      setResult({ key: requestKey, order: data });
      if (data.payment_status !== 'PAID' && data.status !== 'CANCELLED') message.info('Giao dịch đang chờ xác nhận. Vui lòng kiểm tra lại sau.');
    } catch (reason) { message.error(getErrorMessage(reason)); }
    finally { setIsBusy(false); }
  };

  const resumePayment = async () => {
    setIsBusy(true);
    try {
      const data = await orderService.getPaymentUrl(code);
      if (getSavedAccessToken() === sessionToken) window.location.assign(data.redirectUrl);
    } catch (reason) { message.error(getErrorMessage(reason)); }
    finally { setIsBusy(false); }
  };

  const reviewRequired = order?.status === 'CANCELLED' && order.payment_status === 'PAID';
  const cancelled = order?.status === 'CANCELLED';
  const isCod = order?.payment_method === 'COD';
  const expired = !!order?.payment_expires_at && new Date(order.payment_expires_at) <= new Date();
  const heading = reviewRequired ? 'Đơn hàng cần được kiểm tra' : cancelled ? 'Thanh toán chưa hoàn tất' : isPending ? 'Đang chờ thanh toán' : isCod ? 'Đặt hàng thành công!' : 'Thanh toán thành công!';

  return (
    <div className="flex flex-1 items-start justify-center bg-page-gray px-4 py-12 sm:py-20 lg:py-24">
      {!sessionToken ? <Result title="Đăng nhập để xem đơn hàng" subTitle="Thông tin đơn hàng chỉ hiển thị trong tài khoản đã đặt mua." extra={<Button type="primary" onClick={() => navigate(ROUTES.LOGIN, { state: { returnTo: location.pathname } })}>Đăng nhập</Button>} /> : errorMessage ? (
        <Result status="warning" title="Chưa tải được đơn hàng" subTitle={errorMessage} extra={<Button type="primary" onClick={() => setRetry((value) => value + 1)}>Thử lại</Button>} />
      ) : !order ? (
        <div className="w-full max-w-2xl rounded-2xl bg-white p-8"><Skeleton active paragraph={{ rows: 12 }} /></div>
      ) : (
        <section className="w-full max-w-2xl rounded-2xl border border-white bg-[#f8fcfa] p-5 shadow-sm sm:p-8">
          <div className="text-center">
            <span className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full text-3xl ${reviewRequired || isPending ? 'bg-amber-50 text-amber-500' : cancelled ? 'bg-red-50 text-red-500' : 'bg-primary/10 text-primary'}`}>
              {reviewRequired ? <ExclamationCircleFilled /> : cancelled ? <CloseCircleFilled /> : isPending ? <ClockCircleOutlined /> : <CheckCircleFilled />}
            </span>
            <h1 className="mt-5 text-xl font-bold text-gray-900 sm:text-2xl">{heading}</h1>
            <p data-order-total className="mt-3 text-3xl font-bold text-gray-900">{formatPrice(order.total)}</p>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-gray-500">
              {reviewRequired ? 'Hệ thống đã ghi nhận thanh toán sau khi đơn kết thúc. Vui lòng liên hệ cửa hàng để kiểm tra và hỗ trợ hoàn tiền.' : cancelled ? 'Đơn hàng đã được hủy. Sản phẩm đã được đưa lại vào giỏ để bạn thuận tiện đặt lại.' : isPending ? 'Hoàn tất thanh toán trên VNPay hoặc kiểm tra lại nếu bạn đã thanh toán.' : isCod ? 'Cảm ơn bạn đã đặt hàng. Vui lòng thanh toán khi nhận hàng.' : 'Cảm ơn bạn! Giao dịch đã được xác nhận và đơn hàng đang được chuẩn bị.'}
            </p>
          </div>

          <dl className="mt-7 space-y-4 border-y border-gray-200 py-6 text-sm">
            <div className="flex flex-wrap justify-between gap-2"><dt className="text-gray-500">Mã giao dịch / đơn hàng</dt><dd className="max-w-full break-all font-semibold text-gray-800">{order.checkout_code}</dd></div>
            {order.transaction_code && <div className="flex justify-between gap-3"><dt className="text-gray-500">Mã giao dịch VNPay</dt><dd className="break-all font-semibold">{order.transaction_code}</dd></div>}
            <div className="flex flex-wrap justify-between gap-2"><dt className="text-gray-500">{order.paid_at ? 'Thời gian thanh toán' : 'Thời gian đặt hàng'}</dt><dd className="font-semibold">{formatDate(order.paid_at || order.created_at)}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-gray-500">Phương thức</dt><dd className="font-semibold">{isCod ? 'Thanh toán khi nhận hàng' : 'VNPay'}</dd></div>
            <div className="flex flex-wrap justify-between gap-2"><dt className="text-gray-500">Người nhận</dt><dd className="font-semibold">{order.shipping_address.recipient_name} · {order.shipping_address.phone}</dd></div>
            <div className="flex flex-wrap justify-between gap-2"><dt className="text-gray-500">Email liên hệ</dt><dd className="break-all font-semibold">{order.shipping_address.email}</dd></div>
          </dl>

          <div className="flex gap-2 border-b border-gray-200 py-5 text-sm leading-6 text-gray-600"><EnvironmentOutlined className="mt-1 shrink-0 text-primary" /><p>{order.shipping_address.address_line}</p></div>
          <ul className="space-y-3 border-b border-gray-200 py-5 text-sm">
            {order.items.map((item, index) => <li key={item.variant_id + index} className="flex justify-between gap-4"><div className="min-w-0"><p className="font-medium text-gray-800">{item.name}</p><p className="mt-1 text-xs text-gray-400">{item.variant_name} · {item.quantity.toLocaleString('vi-VN')} {item.unit}</p></div><span className="shrink-0 font-medium text-gray-700">{formatPrice(item.line_total)}</span></li>)}
          </ul>
          <dl className="space-y-3 py-5 text-sm">
            <div className="flex justify-between gap-3"><dt className="text-gray-500">Tạm tính ({order.items.length} sản phẩm)</dt><dd>{formatPrice(order.subtotal)}</dd></div>
            {order.discount_amount > 0 && <div className="flex justify-between gap-3"><dt className="text-gray-500">Giảm giá</dt><dd className="text-primary">−{formatPrice(order.discount_amount)}</dd></div>}
            <div className="flex justify-between gap-3"><dt className="text-gray-500">Phí giao hàng</dt><dd>{formatPrice(order.shipping_fee)}</dd></div>
            <div className="flex justify-between gap-3 border-t border-dashed border-gray-200 pt-5 font-bold text-gray-900"><dt>Tổng cộng</dt><dd>{formatPrice(order.total)}</dd></div>
          </dl>
          {order.note && <p className="mb-5 rounded-lg bg-white p-3 text-sm leading-6 text-gray-500"><span className="font-semibold">Ghi chú: </span>{order.note}</p>}
          {isPending && <>
            {expired && <Alert className="mb-4" type="warning" showIcon title="Phiên thanh toán đã hết hạn" description="Kiểm tra trạng thái giao dịch để cập nhật kết quả từ VNPay." />}
            <div className="mb-3 grid gap-3 sm:grid-cols-2">
              <Button size="large" icon={<ReloadOutlined />} disabled={isBusy} loading={isBusy} onClick={checkPayment}>Kiểm tra thanh toán</Button>
              <Button type="primary" size="large" icon={<CreditCardOutlined />} disabled={isBusy || expired} onClick={resumePayment}>Tiếp tục với VNPay</Button>
            </div>
          </>}
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Link to={cancelled && !reviewRequired ? ROUTES.CART : ROUTES.SHOP}><Button size="large" block>{cancelled && !reviewRequired ? 'Về giỏ hàng' : 'Tiếp tục mua sắm'}</Button></Link>
            <Link to={ROUTES.HOME}><Button type="primary" size="large" block icon={<HomeOutlined />} className="bg-linear-to-b from-primary to-primary-dark font-semibold">Về trang chủ</Button></Link>
          </div>
        </section>
      )}
    </div>
  );
};

export default OrderResultSection;
