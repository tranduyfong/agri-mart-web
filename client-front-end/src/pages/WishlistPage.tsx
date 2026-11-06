// Page được router mở cho màn hình này; phần dữ liệu và giao diện chính được giao cho MainLayout.
import MainLayout from '../containers/layout/MainLayout';
import WishlistSection from '../containers/wishlist/WishlistSection';

const WishlistPage = () => <MainLayout><WishlistSection /></MainLayout>;

export default WishlistPage;
