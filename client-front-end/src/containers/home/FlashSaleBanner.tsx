import { Link } from 'react-router-dom';
import { RightOutlined } from '@ant-design/icons';
import CountdownTimer from '../../components/CountdownTimer';
import PromotionBackground from '../../components/PromotionBackground';
import useActivePromotions from '../../hooks/useActivePromotions';
import { ROUTES } from '../../utils/constants';
import { formatPrice } from '../../utils/format';

const FlashSaleBanner = () => {
  const { promotions } = useActivePromotions(true, 1);
  const flashSale = promotions[0];
  if (!flashSale) return null;

  const discount =
    flashSale.discount_type === 'PERCENT' ? `${flashSale.discount_value}%` : formatPrice(flashSale.discount_value);

  return (
    <section className="relative isolate flex min-h-96 items-center justify-center overflow-hidden rounded-2xl px-4 py-12 text-center text-white sm:px-8">
      <PromotionBackground imageUrl={flashSale.image_url} />
      <div className="max-w-3xl">
        <p className="text-sm font-semibold tracking-wide uppercase">Flash sale</p>
        <h2 className="mt-2 text-2xl font-bold sm:text-3xl">
          {flashSale.name} — Giảm đến {discount}
        </h2>
        <p className="mt-3 text-sm text-white/90">Số lượng có hạn, kết thúc sau:</p>
        <div className="mt-5 flex justify-center">
          <CountdownTimer endTime={flashSale.valid_to} showLabels onImage />
        </div>
        <Link
          to={`${ROUTES.SHOP}?on_sale=true`}
          className="mt-7 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-primary-dark hover:bg-green-50"
        >
          Mua ngay <RightOutlined className="text-xs" />
        </Link>
      </div>
    </section>
  );
};

export default FlashSaleBanner;
