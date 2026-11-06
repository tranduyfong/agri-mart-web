// Page được router mở cho màn hình này; phần dữ liệu và giao diện chính được giao cho MainLayout.
import MainLayout from '../containers/layout/MainLayout';
import OrderTrackingSection from '../containers/orders/OrderTrackingSection';

const OrdersPage = () => (
  <MainLayout>
    <div className="flex-1 bg-page-gray">
      <OrderTrackingSection />
    </div>
  </MainLayout>
);

export default OrdersPage;
