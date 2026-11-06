// Page được router mở cho màn hình này; phần dữ liệu và giao diện chính được giao cho MainLayout.
import MainLayout from '../containers/layout/MainLayout';
import CartSection from '../containers/cart/CartSection';

const CartPage = () => <MainLayout><CartSection /></MainLayout>;

export default CartPage;
