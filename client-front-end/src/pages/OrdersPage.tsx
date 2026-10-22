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
