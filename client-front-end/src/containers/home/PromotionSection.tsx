import { Skeleton } from 'antd';
import SectionHeader from '../../components/SectionHeader';
import PromotionCard from '../../components/PromotionCard';
import CountdownTimer from '../../components/CountdownTimer';
import useActivePromotions from '../../hooks/useActivePromotions';

// Số thẻ khuyến mãi hiển thị trên trang chủ
const MAX_PROMOTIONS = 4;

// Khối "Khuyến mãi đang diễn ra": đồng hồ đếm ngược tới khuyến mãi sắp hết hạn nhất + các thẻ khuyến mãi
const PromotionSection = () => {
  // Chỉ lấy khuyến mãi thường, flash sale được hiển thị riêng ở khối FlashSaleBanner
  const { promotions, isLoading } = useActivePromotions(false, MAX_PROMOTIONS);

  if (!isLoading && promotions.length === 0) return null;

  // API trả về khuyến mãi sắp hết hạn đứng đầu
  const nearestEndTime = promotions[0]?.valid_to;

  return (
    <section>
      <SectionHeader
        title="Khuyến mãi đang diễn ra"
        extra={nearestEndTime && <CountdownTimer endTime={nearestEndTime} />}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading
          ? Array.from({ length: MAX_PROMOTIONS }).map((_, index) => (
              <Skeleton.Node key={index} active className="h-40! w-full!" />
            ))
          : promotions.map((promotion) => <PromotionCard key={promotion.id} promotion={promotion} />)}
      </div>
    </section>
  );
};

export default PromotionSection;
