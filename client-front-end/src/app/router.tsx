import { createBrowserRouter, Navigate } from 'react-router-dom';
import HomePage from '../pages/HomePage';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import VerifyEmailPage from '../pages/VerifyEmailPage';
import ForgotPasswordPage from '../pages/ForgotPasswordPage';
import ShopPage from '../pages/ShopPage';
import ProductDetailPage from '../pages/ProductDetailPage';
import CartPage from '../pages/CartPage';
import WishlistPage from '../pages/WishlistPage';
import AccountPage from '../pages/AccountPage';
import PersonalInformationForm from '../containers/account/PersonalInformationForm';
import AddressBookSection from '../containers/account/AddressBookSection';
import ChangePasswordForm from '../containers/account/ChangePasswordForm';
import { ROUTES } from '../utils/constants';

// Khai báo các trang của ứng dụng: mỗi đường dẫn (path) tương ứng với 1 trang (element)
export const router = createBrowserRouter([
  {
    path: ROUTES.HOME,
    element: <HomePage />,
  },
  {
    path: ROUTES.LOGIN,
    element: <LoginPage />,
  },
  {
    path: ROUTES.REGISTER,
    element: <RegisterPage />,
  },
  {
    path: ROUTES.VERIFY_EMAIL,
    element: <VerifyEmailPage />,
  },
  {
    path: ROUTES.FORGOT_PASSWORD,
    element: <ForgotPasswordPage />,
  },
  {
    path: ROUTES.SHOP,
    element: <ShopPage />,
  },
  {
    path: ROUTES.PRODUCT_DETAIL,
    element: <ProductDetailPage />,
  },
  {
    path: ROUTES.CART,
    element: <CartPage />,
  },
  {
    path: ROUTES.WISHLIST,
    element: <WishlistPage />,
  },
  {
    path: ROUTES.ACCOUNT,
    element: <AccountPage />,
    children: [
      { index: true, element: <PersonalInformationForm /> },
      { path: 'addresses', element: <AddressBookSection /> },
      { path: 'change-password', element: <ChangePasswordForm /> },
    ],
  },
  {
    // Đường dẫn không tồn tại -> về trang chủ
    path: '*',
    element: <Navigate to={ROUTES.HOME} replace />,
  },
]);
