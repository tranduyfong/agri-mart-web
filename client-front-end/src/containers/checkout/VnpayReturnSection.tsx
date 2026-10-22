import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button, Result, Spin } from 'antd';
import orderService from '../../services/orderService';
import { useAppDispatch } from '../../hooks/useRedux';
import { fetchShopping } from '../../store/slices/shoppingSlice';
import { getSavedAccessToken } from '../../utils/authStorage';
import { getErrorMessage } from '../../utils/errorMessage';
import { getOrderResultPath, ROUTES } from '../../utils/constants';

const VnpayReturnSection = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [retry, setRetry] = useState(0);
  const [error, setError] = useState<{ key: string; message: string } | null>(null);
  const requestKey = location.search + retry;

  useEffect(() => {
    let outdated = false;
    orderService.verifyReturn(location.search)
      .then((result) => {
        if (outdated) return;
        if (getSavedAccessToken()) dispatch(fetchShopping());
        navigate(getOrderResultPath(result.checkout_code), { replace: true });
      })
      .catch((reason: unknown) => {
        if (!outdated) setError({ key: requestKey, message: getErrorMessage(reason) });
      });
    return () => { outdated = true; };
  }, [location.search, requestKey, navigate, dispatch]);

  return (
    <div className="flex min-h-[550px] flex-1 items-center justify-center bg-page-gray px-4 py-16">
      {error?.key === requestKey ? (
        <Result status="warning" title="Chưa xác minh được kết quả thanh toán" subTitle={error.message} extra={[
          <Button key="retry" type="primary" onClick={() => setRetry((value) => value + 1)}>Kiểm tra lại</Button>,
          <Link key="cart" to={ROUTES.CART}><Button>Về giỏ hàng</Button></Link>,
        ]} />
      ) : (
        <div className="text-center"><Spin size="large" /><h1 className="mt-6 text-xl font-bold text-gray-800">Đang xác minh giao dịch VNPay</h1><p className="mt-3 text-sm text-gray-500">Kết quả sẽ hiển thị ngay khi hệ thống xác nhận xong.</p></div>
      )}
    </div>
  );
};

export default VnpayReturnSection;
