// Tải đầy đủ chương trình đang chạy theo loại flash sale.
import { useEffect, useState } from 'react';
import promotionService from '../services/promotionService';
import type { Promotion } from '../types/promotion';

// Lấy danh sách khuyến mãi đang diễn ra
// isFlashSale = true: chỉ lấy flash sale, false: chỉ lấy khuyến mãi thường
const useActivePromotions = (isFlashSale: boolean) => {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Hủy yêu cầu khi rời màn hình, tránh cập nhật từ lần tải cũ.
  useEffect(() => {
    const controller = new AbortController();
    promotionService
      .getAllActivePromotions(isFlashSale, controller.signal)
      .then((items) => {
        if (!controller.signal.aborted) setPromotions(items);
      })
      .catch(() => {
        if (!controller.signal.aborted) setPromotions([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });
    return () => controller.abort();
  }, [isFlashSale]);

  return { promotions, isLoading };
};

export default useActivePromotions;
