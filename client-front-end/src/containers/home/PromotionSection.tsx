import { Skeleton } from 'antd';
import HorizontalSection from '../../components/HorizontalSection';
import PromotionCard from '../../components/PromotionCard';
import useActivePromotions from '../../hooks/useActivePromotions';

// Số thẻ giữ chỗ khi API đang tải khuyến mãi.
const SKELETON_COUNT = 4;

// Mỗi thẻ có ảnh và đồng hồ đếm ngược theo thời gian của chương trình đó.
const PromotionSection = () => {
  // Chỉ lấy khuyến mãi thường, flash sale được hiển thị riêng ở khối FlashSaleBanner
  const { promotions, isLoading } = useActivePromotions(false, 100);

  if (!isLoading && promotions.length === 0) return null;

  return (
    <HorizontalSection title="Khuyến mãi đang diễn ra" itemClassName="w-[calc(100vw-8rem)] sm:w-80">
      {isLoading
        ? Array.from({ length: SKELETON_COUNT }).map((_, index) => (
            <Skeleton.Node key={index} active className="h-88! w-full!" />
          ))
        : promotions.map((promotion) => <PromotionCard key={promotion.id} promotion={promotion} />)}
    </HorizontalSection>
  );
};

export default PromotionSection;
