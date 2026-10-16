import { Link } from 'react-router-dom';
import { RightOutlined } from '@ant-design/icons';
import CountdownTimer from '../../components/CountdownTimer';
import useActivePromotions from '../../hooks/useActivePromotions';
import { ROUTES } from '../../utils/constants';
// Hình rau củ trang trí (Fluent Emoji 3D của Microsoft - giấy phép MIT)
import broccoliImage from '../../assets/images/decor/broccoli.png';
import carrotImage from '../../assets/images/decor/carrot.png';
import leafyGreenImage from '../../assets/images/decor/leafy_green.png';
import tomatoImage from '../../assets/images/decor/tomato.png';

// Banner Flash Sale: tên chương trình, mức giảm, đồng hồ đếm ngược tới lúc kết thúc
const FlashSaleBanner = () => {
  const { promotions } = useActivePromotions(true, 1);
  const flashSale = promotions[0];

  // Không có flash sale nào đang diễn ra thì ẩn banner
  if (!flashSale) return null;

  return (
    <section className="relative overflow-hidden rounded-2xl bg-green-100 px-6 py-10 text-center">
      {/* Hình trang trí 2 bên */}
      <img src={broccoliImage} alt="" className="absolute top-4 left-6 hidden h-20 w-20 -rotate-12 opacity-80 md:block" />
      <img src={carrotImage} alt="" className="absolute bottom-4 left-24 hidden h-16 w-16 rotate-12 opacity-80 md:block" />
      <img src={leafyGreenImage} alt="" className="absolute top-6 right-8 hidden h-20 w-20 rotate-12 opacity-80 md:block" />
      <img src={tomatoImage} alt="" className="absolute right-28 bottom-4 hidden h-16 w-16 -rotate-6 opacity-80 md:block" />

      <div className="relative">
        <p className="text-sm font-semibold tracking-wide text-primary-dark uppercase">Flash sale</p>
        <h2 className="mt-1 text-2xl font-bold text-gray-900 sm:text-3xl">
          {flashSale.name} - <span className="text-primary">Giảm đến {flashSale.discount_value}%</span>
        </h2>
        <p className="mt-2 text-sm text-gray-700">Số lượng có hạn, kết thúc sau:</p>

        <div className="mt-4 flex justify-center">
          <CountdownTimer endTime={flashSale.valid_to} showLabels />
        </div>

        <Link
          to={`${ROUTES.SHOP}?on_sale=true`}
          className="mt-6 inline-flex items-center gap-1 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary-dark"
        >
          Mua ngay <RightOutlined className="text-xs" />
        </Link>
      </div>
    </section>
  );
};

export default FlashSaleBanner;
