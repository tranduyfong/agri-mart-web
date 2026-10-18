import { Link } from 'react-router-dom';
import { Button, Empty } from 'antd';
import { HeartOutlined } from '@ant-design/icons';
import ProductCard from '../../components/ProductCard';
import { useAppSelector } from '../../hooks/useRedux';
import ShoppingSection from '../shopping/ShoppingSection';
import { ROUTES } from '../../utils/constants';

const WishlistSection = () => {
  const products = useAppSelector((state) => state.shopping.wishlist);

  return (
    <ShoppingSection title="Sản phẩm yêu thích" kind="wishlist">
      {products.length === 0 ? (
        <div className="rounded-2xl bg-white px-4 py-16"><Empty image={<HeartOutlined className="text-6xl text-red-200" />} description="Bạn chưa lưu sản phẩm yêu thích nào"><Link to={ROUTES.SHOP}><Button type="primary" size="large">Tìm món yêu thích</Button></Link></Empty></div>
      ) : (
        <><p className="mb-4 text-sm text-gray-500">Đã lưu {products.length} sản phẩm</p><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div></>
      )}
    </ShoppingSection>
  );
};

export default WishlistSection;
