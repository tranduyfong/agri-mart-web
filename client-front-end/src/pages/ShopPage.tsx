// Page được router mở cho màn hình này; phần dữ liệu và giao diện chính được giao cho MainLayout.
import MainLayout from '../containers/layout/MainLayout';
import ProductSearchResults from '../containers/shop/ProductSearchResults';

// Trang Cửa hàng: danh sách sản phẩm có tìm kiếm, lọc, sắp xếp, phân trang
const ShopPage = () => {
  return (
    <MainLayout>
      <ProductSearchResults />
    </MainLayout>
  );
};

export default ShopPage;
