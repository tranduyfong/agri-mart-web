import { createBrowserRouter, Link } from 'react-router-dom';
import { Button, Result } from 'antd';
import ProtectedRoute from '../components/ProtectedRoute';
import StaffLayout from '../containers/layout/StaffLayout';
import LoginPage from '../pages/LoginPage';
import DashboardPage from '../pages/DashboardPage';
import ProductListPage from '../pages/ProductListPage';
import ProductFormPage from '../pages/ProductFormPage';
import CategoryPage from '../pages/CategoryPage';
import ImportPage from '../pages/ImportPage';
import InventoryPage from '../pages/InventoryPage';
import OrderListPage from '../pages/OrderListPage';
import OrderDetailPage from '../pages/OrderDetailPage';
import PromotionListPage from '../pages/PromotionListPage';
import PromotionFormPage from '../pages/PromotionFormPage';
import ShippingCouponsPage from '../pages/ShippingCouponsPage';
import BannerListPage from '../pages/BannerListPage';
import BannerFormPage from '../pages/BannerFormPage';
import NewsletterListPage from '../pages/NewsletterListPage';
import NewsletterEditorPage from '../pages/NewsletterEditorPage';
import SupportPage from '../pages/SupportPage';

const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <StaffLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      {
        path: 'products',
        element: (
          <ProtectedRoute permission="PRODUCT_MANAGE">
            <ProductListPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'products/new',
        element: (
          <ProtectedRoute permission="PRODUCT_MANAGE">
            <ProductFormPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'products/:id/edit',
        element: (
          <ProtectedRoute permission="PRODUCT_MANAGE">
            <ProductFormPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'categories',
        element: (
          <ProtectedRoute permission="PRODUCT_MANAGE">
            <CategoryPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'imports',
        element: (
          <ProtectedRoute permission="INVENTORY_MANAGE">
            <ImportPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'inventory',
        element: (
          <ProtectedRoute permission="INVENTORY_MANAGE">
            <InventoryPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'orders',
        element: (
          <ProtectedRoute permission="ORDER_MANAGE">
            <OrderListPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'orders/:id',
        element: (
          <ProtectedRoute permission="ORDER_MANAGE">
            <OrderDetailPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'promotions',
        element: (
          <ProtectedRoute permission="PROMOTION_MANAGE">
            <PromotionListPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'promotions/new',
        element: (
          <ProtectedRoute permission="PROMOTION_MANAGE">
            <PromotionFormPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'promotions/:id/edit',
        element: (
          <ProtectedRoute permission="PROMOTION_MANAGE">
            <PromotionFormPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'shipping-coupons',
        element: (
          <ProtectedRoute permission="PROMOTION_MANAGE">
            <ShippingCouponsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'banners',
        element: (
          <ProtectedRoute permission="BANNER_MANAGE">
            <BannerListPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'banners/new',
        element: (
          <ProtectedRoute permission="BANNER_MANAGE">
            <BannerFormPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'banners/:id/edit',
        element: (
          <ProtectedRoute permission="BANNER_MANAGE">
            <BannerFormPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'newsletters',
        element: (
          <ProtectedRoute permission="NEWSLETTER_MANAGE">
            <NewsletterListPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'newsletters/new',
        element: (
          <ProtectedRoute permission="NEWSLETTER_MANAGE">
            <NewsletterEditorPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'newsletters/:id/edit',
        element: (
          <ProtectedRoute permission="NEWSLETTER_MANAGE">
            <NewsletterEditorPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'support',
        element: (
          <ProtectedRoute permission="SUPPORT_MANAGE">
            <SupportPage />
          </ProtectedRoute>
        ),
      },
      {
        path: '*',
        element: (
          <Result
            status="404"
            title="Không tìm thấy trang"
            extra={
              <Link to="/">
                <Button type="primary">Về công việc hôm nay</Button>
              </Link>
            }
          />
        ),
      },
    ],
  },
]);
export default router;
