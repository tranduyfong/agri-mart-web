import { useEffect, useState } from 'react';
import axios from 'axios';
import { Alert, Button, Empty, Input, Pagination, Result, Skeleton } from 'antd';
import { ReloadOutlined, SearchOutlined, TruckOutlined } from '@ant-design/icons';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import OrderCard from './OrderCard';
import orderService from '../../services/orderService';
import { useAppDispatch, useAppSelector } from '../../hooks/useRedux';
import { logout } from '../../store/slices/authSlice';
import { clearAuth } from '../../utils/authStorage';
import { getErrorMessage } from '../../utils/errorMessage';
import { ORDER_STATUSES } from '../../utils/orderStatus';
import { ROUTES } from '../../utils/constants';
import type { CheckoutOrder } from '../../types/order';
import type { PaginatedResponse } from '../../types/api';

const OrderTrackingSection = () => {
  const sessionToken = useAppSelector((state) => state.auth.accessToken);
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const [status, setStatus] = useState('');
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState<{
    key: string;
    response: PaginatedResponse<CheckoutOrder>;
  } | null>(null);
  const [error, setError] = useState<{ key: string; message: string } | null>(null);
  const requestKey = JSON.stringify([sessionToken, status, keyword, page, retry]);
  const response = result?.key === requestKey ? result.response : null;
  const errorMessage = error?.key === requestKey ? error.message : '';

  useEffect(() => {
    if (!sessionToken) return;
    const controller = new AbortController();
    let loading = false;
    let hasActiveOrders = true;
    const load = async () => {
      if (loading) return;
      loading = true;
      try {
        const data = await orderService.getMyOrders(
          { status, keyword, pageNumber: page - 1, pageSize: 5 },
          controller.signal,
        );
        if (controller.signal.aborted) return;
        hasActiveOrders = data.data.some((order) => !['COMPLETED', 'CANCELLED'].includes(order.status));
        setResult({ key: requestKey, response: data });
        setError(null);
      } catch (reason) {
        if (controller.signal.aborted) return;
        if (axios.isAxiosError(reason) && reason.response?.status === 401) {
          clearAuth();
          dispatch(logout());
          navigate(ROUTES.LOGIN, { state: { returnTo: location.pathname } });
        } else setError({ key: requestKey, message: getErrorMessage(reason) });
      } finally {
        loading = false;
      }
    };
    void load();
    const timer = window.setInterval(() => {
      if (!document.hidden && hasActiveOrders) void load();
    }, 30000);
    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, [sessionToken, status, keyword, page, requestKey, navigate, dispatch, location.pathname]);

  if (!sessionToken)
    return (
      <Result
        icon={<TruckOutlined className="text-primary" />}
        title="Đăng nhập để theo dõi đơn hàng"
        subTitle="Xem những đơn bạn đã đặt và cập nhật tiến độ giao hàng."
        extra={
          <Button type="primary" onClick={() => navigate(ROUTES.LOGIN, { state: { returnTo: ROUTES.ORDERS } })}>
            Đăng nhập
          </Button>
        }
      />
    );

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:py-12">
      <p className="mb-6 text-sm text-gray-500">
        <Link to={ROUTES.HOME} className="hover:text-primary">
          Trang chủ
        </Link>{' '}
        / Đơn hàng của tôi
      </p>
      <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-bold sm:text-3xl">
            <TruckOutlined className="text-primary" />
            Theo dõi đơn hàng
          </h1>
          <p className="mt-3 text-sm text-gray-500">Tất cả đơn mua và tiến độ giao hàng của bạn tại đây.</p>
        </div>
        <Button icon={<ReloadOutlined />} onClick={() => setRetry((value) => value + 1)}>
          Cập nhật
        </Button>
      </div>
      <div className="mb-6 rounded-2xl bg-white p-4 sm:p-5">
        <Input.Search
          aria-label="Tìm đơn hàng"
          placeholder="Tìm theo mã đơn hoặc tên sản phẩm"
          maxLength={120}
          prefix={<SearchOutlined />}
          allowClear
          onSearch={(value) => {
            setKeyword(value.trim());
            setPage(1);
          }}
        />
        <div className="mt-4 flex gap-2 overflow-x-auto pb-2" aria-label="Lọc trạng thái đơn hàng">
          {[
            { value: '', label: 'Tất cả' },
            ...Object.entries(ORDER_STATUSES).map(([value, item]) => ({
              value,
              label: item.label,
            })),
          ].map((item) => (
            <Button
              key={item.value}
              shape="round"
              type={status === item.value ? 'primary' : 'default'}
              aria-pressed={status === item.value}
              onClick={() => {
                setStatus(item.value);
                setPage(1);
              }}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </div>
      {errorMessage && (
        <Alert
          className="mb-5"
          type="error"
          showIcon
          title="Chưa tải được đơn hàng"
          description={errorMessage}
          action={<Button onClick={() => setRetry((value) => value + 1)}>Thử lại</Button>}
        />
      )}
      {!response && !errorMessage ? (
        <div className="rounded-2xl bg-white p-7">
          <Skeleton active paragraph={{ rows: 10 }} />
        </div>
      ) : response?.data.length ? (
        <div className="space-y-6">
          {response.data.map((order) => (
            <OrderCard key={order.checkout_code} order={order} />
          ))}
        </div>
      ) : (
        !errorMessage && (
          <div className="rounded-2xl bg-white px-4 py-16">
            <Empty description={keyword || status ? 'Không có đơn hàng phù hợp' : 'Bạn chưa có đơn hàng nào'}>
              <Link to={ROUTES.SHOP}>
                <Button type="primary">Khám phá cửa hàng</Button>
              </Link>
            </Empty>
          </div>
        )
      )}
      {!!response?.totalElements && (
        <div className="mt-7 flex justify-center">
          <Pagination
            current={page}
            pageSize={5}
            total={response.totalElements}
            showSizeChanger={false}
            onChange={setPage}
          />
        </div>
      )}
      <p className="mt-6 text-center text-xs text-gray-500">
        Tiến độ đơn đang xử lý tự cập nhật mỗi 30 giây khi bạn mở trang.
      </p>
    </div>
  );
};

export default OrderTrackingSection;
