// Page được router mở cho màn hình này; phần dữ liệu và giao diện chính được giao cho MainLayout.
import MainLayout from '../containers/layout/MainLayout';
import OrderResultSection from '../containers/checkout/OrderResultSection';

const OrderResultPage = () => <MainLayout><OrderResultSection /></MainLayout>;

export default OrderResultPage;
