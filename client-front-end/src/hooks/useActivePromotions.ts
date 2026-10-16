import { useEffect, useState } from 'react';
import promotionService from '../services/promotionService';
import type { Promotion } from '../types/promotion';

// Lấy danh sách khuyến mãi đang diễn ra
// isFlashSale = true: chỉ lấy flash sale, false: chỉ lấy khuyến mãi thường
const useActivePromotions = (isFlashSale: boolean, pageSize: number) => {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    promotionService
      .getActivePromotions({ is_flash_sale: isFlashSale, pageSize })
      .then((response) => setPromotions(response.data))
      .catch(() => setPromotions([]))
      .finally(() => setIsLoading(false));
  }, [isFlashSale, pageSize]);

  return { promotions, isLoading };
};

export default useActivePromotions;
