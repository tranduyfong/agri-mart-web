// Page được router mở cho màn hình này; phần dữ liệu và giao diện chính được giao cho MainLayout.
import MainLayout from '../containers/layout/MainLayout';
import CheckoutSection from '../containers/checkout/CheckoutSection';

const CheckoutPage = () => <MainLayout><CheckoutSection /></MainLayout>;

export default CheckoutPage;
