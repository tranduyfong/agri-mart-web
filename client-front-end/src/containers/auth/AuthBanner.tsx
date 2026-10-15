import bannerImage from '../../assets/images/auth-banner.jpg';
import { STORE_INFO } from '../../utils/constants';

// Ảnh quầy rau củ bên trái trang Đăng nhập / Đăng ký, kèm lời chào
const AuthBanner = () => {
  return (
    <div className="relative h-full overflow-hidden rounded-r-3xl">
      <img src={bannerImage} alt="Quầy rau củ quả tươi" className="absolute inset-0 h-full w-full object-cover" />

      {/* Lớp phủ tối dần xuống dưới để chữ trắng dễ đọc */}
      <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent" />

      <div className="absolute inset-x-0 bottom-0 px-10 pb-12 text-white">
        <h2 className="text-center text-4xl font-semibold">Chào mừng đến với {STORE_INFO.name}</h2>
        <p className="mt-5 text-lg leading-8 text-white/90">
          Mọi thứ bạn cần cho bữa ăn hằng ngày với giá tốt, đầy đủ hơn, giao hàng nhanh và tiện lợi hơn.
        </p>
      </div>
    </div>
  );
};

export default AuthBanner;
