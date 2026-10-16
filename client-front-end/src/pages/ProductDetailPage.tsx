import { useParams } from 'react-router-dom';
import MainLayout from '../containers/layout/MainLayout';
import ProductDetailSection from '../containers/product/ProductDetailSection';

// Trang chi tiết: đổi slug thì tạo lại trạng thái ảnh, quy cách và số lượng của sản phẩm
const ProductDetailPage = () => {
  const { slug = '' } = useParams();

  return (
    <MainLayout>
      <ProductDetailSection key={slug} slug={slug} />
    </MainLayout>
  );
};

export default ProductDetailPage;
