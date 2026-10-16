import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Breadcrumb, Button, Result } from 'antd';
import { RightOutlined } from '@ant-design/icons';
import ProductDetailSkeleton from '../../components/ProductDetailSkeleton';
import useProductDetail from '../../hooks/useProductDetail';
import WhyChooseUsSection from '../home/WhyChooseUsSection';
import ProductGallery from './ProductGallery';
import ProductInfo from './ProductInfo';
import RelatedProductsSection from './RelatedProductsSection';
import RecentlyViewedSection from './RecentlyViewedSection';
import { ROUTES } from '../../utils/constants';

interface ProductDetailSectionProps {
  slug: string;
}

// Ghép các khối của trang chi tiết, dùng lại layout và khối giới thiệu từ trang chủ
const ProductDetailSection = ({ slug }: ProductDetailSectionProps) => {
  const { product, errorMessage, isNotFound, isLoading, reload } = useProductDetail(slug);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [slug]);

  const breadcrumbItems = [
    { title: <Link to={ROUTES.HOME}>Trang chủ</Link> },
    { title: <Link to={ROUTES.SHOP}>Sản phẩm</Link> },
    ...(product ? [{ title: <Link to={`${ROUTES.SHOP}?category_id=${product.category_id}`}>{product.category_name}</Link> }] : []),
    { title: <span className="font-semibold text-gray-700">{product?.name || 'Chi tiết sản phẩm'}</span> },
  ];

  return (
    <div className="flex-1 bg-page-gray pb-16">
      <div className="mx-auto w-full max-w-7xl px-4">
        <div className="py-6 sm:py-8">
          <Breadcrumb separator={<RightOutlined className="text-[10px]" />} items={breadcrumbItems} />
        </div>

        {isLoading ? <ProductDetailSkeleton /> : product ? (
          <div className="flex flex-col gap-12 sm:gap-16">
            <section aria-label="Chi tiết sản phẩm" className="grid items-start gap-8 lg:grid-cols-12 lg:gap-10">
              <div className="min-w-0 lg:col-span-7">
                <ProductGallery images={product.images} productName={product.name} discountPercent={product.discount_percent} />
              </div>
              <div className="min-w-0 lg:col-span-5"><ProductInfo product={product} /></div>
            </section>
            <RelatedProductsSection productId={product.id} categoryId={product.category_id} />
            <RecentlyViewedSection currentSlug={product.slug} />
            <WhyChooseUsSection />
          </div>
        ) : (
          <Result
            status={isNotFound ? '404' : 'error'}
            title={isNotFound ? 'Không tìm thấy sản phẩm' : 'Không thể tải sản phẩm'}
            subTitle={errorMessage}
            extra={[
              <Link key="shop" to={ROUTES.SHOP}><Button type="primary">Về cửa hàng</Button></Link>,
              ...(!isNotFound ? [<Button key="retry" onClick={reload}>Thử lại</Button>] : []),
            ]}
          />
        )}
      </div>
    </div>
  );
};

export default ProductDetailSection;
