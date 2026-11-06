// Khuyến mãi tự động mỗi chương trình một hàng; mã giảm giá dùng thẻ cuộn ngang riêng.
import { Skeleton } from 'antd';
import SectionHeader from '../../components/SectionHeader';
import PromotionCard from '../../components/PromotionCard';
import CouponCard from '../../components/CouponCard';
import HorizontalSection from '../../components/HorizontalSection';
import { isCouponPromotion } from '../../utils/promotion';
import useActivePromotions from '../../hooks/useActivePromotions';

// Số thẻ giữ chỗ khi API đang tải khuyến mãi.
const SKELETON_COUNT = 4;

// Mỗi thẻ có ảnh và đồng hồ đếm ngược theo thời gian của chương trình đó.
const PromotionSection = () => {
  // Chỉ lấy khuyến mãi thường, flash sale được hiển thị riêng ở khối FlashSaleBanner
  const { promotions, isLoading } = useActivePromotions(false);

  if (!isLoading && promotions.length === 0) return null;
  const coupons = promotions.filter(isCouponPromotion);
  const automaticPromotions = promotions.filter((promotion) => !isCouponPromotion(promotion));

  return (
    <div className="space-y-8">
      {(isLoading || automaticPromotions.length > 0) && (
        <section aria-label="Khuyến mãi đang diễn ra">
          <SectionHeader title="Khuyến mãi đang diễn ra" />
          <div className="space-y-6">
            {isLoading
              ? Array.from({ length: SKELETON_COUNT }).map((_, index) => (
                  <Skeleton.Node key={index} active className="h-88! w-full!" />
                ))
              : automaticPromotions.map((promotion) => <PromotionCard key={promotion.id} promotion={promotion} />)}
          </div>
        </section>
      )}
      {coupons.length > 0 && (
        <HorizontalSection title="Mã giảm giá & mã giao hàng" itemClassName="w-[calc(100vw-8rem)] sm:w-80">
          {coupons.map((promotion) => <CouponCard key={promotion.id} promotion={promotion} />)}
        </HorizontalSection>
      )}
    </div>
  );
};

export default PromotionSection;
