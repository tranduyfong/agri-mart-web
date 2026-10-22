import { Skeleton } from 'antd';
import HorizontalSection from '../../components/HorizontalSection';
import PromotionCard from '../../components/PromotionCard';
import CountdownTimer from '../../components/CountdownTimer';
import useActivePromotions from '../../hooks/useActivePromotions';

// Số thẻ giữ chỗ khi API đang tải khuyến mãi.
const SKELETON_COUNT = 4;

// Khối "Khuyến mãi đang diễn ra": đồng hồ đếm ngược tới khuyến mãi sắp hết hạn nhất + các thẻ khuyến mãi
const PromotionSection = () => {
  // Chỉ lấy khuyến mãi thường, flash sale được hiển thị riêng ở khối FlashSaleBanner
  const { promotions, isLoading } = useActivePromotions(false, 100);

  if (!isLoading && promotions.length === 0) return null;

  // API trả về khuyến mãi sắp hết hạn đứng đầu
  const nearestEndTime = promotions[0]?.valid_to;

  return (
    <HorizontalSection
      title="Khuyến mãi đang diễn ra"
      extra={nearestEndTime && <CountdownTimer endTime={nearestEndTime} />}
      itemClassName="w-72 sm:w-80"
    >
      {isLoading
        ? Array.from({ length: SKELETON_COUNT }).map((_, index) => (
            <Skeleton.Node key={index} active className="h-40! w-full!" />
          ))
        : promotions.map((promotion) => <PromotionCard key={promotion.id} promotion={promotion} />)}
    </HorizontalSection>
  );
};

export default PromotionSection;
