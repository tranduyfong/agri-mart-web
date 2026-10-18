import { App } from 'antd';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from './useRedux';
import { mutateShopping } from '../store/slices/shoppingSlice';
import { logout } from '../store/slices/authSlice';
import { clearAuth, getSavedAccessToken } from '../utils/authStorage';
import { ROUTES } from '../utils/constants';
import { animateShoppingAction } from '../utils/shoppingAnimation';
import type { ShoppingError, ShoppingMutation } from '../types/shopping';

// Các màn hình dùng chung cách đăng nhập, báo lỗi và hiệu ứng sau khi API thành công
const useShoppingActions = () => {
  const { message, modal } = App.useApp();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const isBusy = useAppSelector((state) => state.shopping.pendingRequests.length > 0);
  const navigate = useNavigate();
  const location = useLocation();

  const showLogin = () => {
    modal.confirm({
      title: 'Đăng nhập để tiếp tục',
      content: 'Giỏ hàng và sản phẩm yêu thích sẽ được lưu trong tài khoản của bạn.',
      okText: 'Đăng nhập', cancelText: 'Để sau',
      onOk: () => navigate(ROUTES.LOGIN, { state: { returnTo: location.pathname + location.search } }),
    });
  };

  const requireLogin = () => {
    if (user) return true;
    showLogin();
    return false;
  };

  const runMutation = async (action: ShoppingMutation, source: HTMLElement | null = null, imageUrl?: string | null) => {
    if (!requireLogin()) return false;
    try {
      const response = await dispatch(mutateShopping(action)).unwrap();
      if (response.sessionToken !== getSavedAccessToken()) return false;
      if (action.kind === 'addCart') {
        animateShoppingAction(source, 'cart', imageUrl);
        message.success('Đã thêm sản phẩm vào giỏ hàng');
      } else if (action.kind === 'addWishlist') {
        animateShoppingAction(source, 'wishlist');
        message.success('Đã thêm vào danh sách yêu thích');
      } else if (action.kind === 'removeWishlist') {
        message.success('Đã bỏ yêu thích sản phẩm');
      }
      return true;
    } catch (error) {
      const details = error as ShoppingError;
      if (details.sessionChanged) return false;
      if (details.unauthorized) {
        clearAuth();
        dispatch(logout());
        showLogin();
      } else {
        message.error(details.message || 'Không thể thực hiện thao tác, vui lòng thử lại');
      }
      return false;
    }
  };

  return { requireLogin, runMutation, isBusy };
};

export default useShoppingActions;
