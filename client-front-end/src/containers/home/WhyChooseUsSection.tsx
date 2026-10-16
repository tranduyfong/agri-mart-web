import { Link } from 'react-router-dom';
import { RightOutlined } from '@ant-design/icons';
import deliveryImage from '../../assets/images/why-delivery.jpg';
import productsImage from '../../assets/images/why-products.jpg';
import storeImage from '../../assets/images/why-store.jpg';
import useProducts from '../../hooks/useProducts';
import { ROUTES, STORE_INFO } from '../../utils/constants';

// Nút "Mua ngay" nhỏ màu xanh dùng trong các thẻ ảnh bên dưới
const ShopNowLink = () => (
  <Link
    to={ROUTES.SHOP}
    className="mt-4 inline-flex items-center gap-1 rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-white hover:bg-primary-dark"
  >
    Mua ngay <RightOutlined className="text-[10px]" />
  </Link>
);

// Khối "Vì sao chọn chúng tôi": 3 thẻ ảnh giới thiệu cửa hàng
const WhyChooseUsSection = () => {
  // Chỉ cần tổng số sản phẩm đang bán nên lấy 1 sản phẩm là đủ (totalElements)
  const { totalElements } = useProducts({ pageSize: 1 });

  return (
    <section>
      <h2 className="mb-4 text-xl font-bold text-gray-900">Vì sao chọn {STORE_INFO.name}</h2>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Cột trái: 2 thẻ chồng lên nhau */}
        <div className="grid gap-4">
          <div className="relative h-56 overflow-hidden rounded-2xl">
            <img src={deliveryImage} alt="Giao hàng tận nơi" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-linear-to-r from-black/75 to-black/10" />
            <div className="relative flex h-full max-w-sm flex-col justify-end p-6 text-white">
              <h3 className="text-xl font-bold">Giao hàng nhanh & miễn phí</h3>
              <p className="mt-1 text-sm text-white/90">Thoải mái mua sắm, giao tận nhà nhanh chóng, miễn phí giao hàng cho đơn đủ điều kiện!</p>
              <div>
                <ShopNowLink />
              </div>
            </div>
          </div>

          <div className="relative h-40 overflow-hidden rounded-2xl">
            <img src={productsImage} alt="Quầy rau củ quả" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-linear-to-t from-black/80 to-black/10" />
            <div className="relative flex h-full flex-col justify-end p-6 text-white">
              <p className="text-sm text-white/90">Sản phẩm tươi sạch đang được bán</p>
              <p className="text-2xl font-bold">{totalElements > 0 ? `${totalElements}+ sản phẩm` : 'Đang cập nhật'}</p>
            </div>
          </div>
        </div>

        {/* Cột phải: 1 thẻ lớn */}
        <div className="relative min-h-80 overflow-hidden rounded-2xl">
          <img src={storeImage} alt="Siêu thị" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative flex h-full flex-col items-center justify-center p-8 text-center text-white">
            <h3 className="max-w-md text-2xl leading-snug font-semibold">
              Mọi nhu cầu hằng ngày, mua sắm thật dễ dàng ngay tại nhà!
            </h3>
            <ShopNowLink />
          </div>
        </div>
      </div>
    </section>
  );
};

export default WhyChooseUsSection;
