import { useEffect, useState } from 'react';
import productService from '../services/productService';
import type { ProductDetail } from '../types/product';
import { getRecentlyViewedSlugs, saveViewedProduct } from '../utils/recentlyViewedStorage';

// Chỉ dùng sau khi tải thành công sản phẩm hiện tại. Bỏ qua sản phẩm đã ngừng bán / không tải được.
const useRecentlyViewedProducts = (currentSlug: string) => {
  const [slugs] = useState(() => getRecentlyViewedSlugs().filter((slug) => slug !== currentSlug).slice(0, 6));
  const [products, setProducts] = useState<ProductDetail[]>([]);
  const [isLoading, setIsLoading] = useState(slugs.length > 0);

  useEffect(() => {
    let isOutdated = false;
    if (currentSlug) saveViewedProduct(currentSlug);

    Promise.allSettled(slugs.map((slug) => productService.getProductDetail(slug)))
      .then((results) => {
        if (isOutdated) return;
        setProducts(results.flatMap((result) => result.status === 'fulfilled' ? [result.value.data] : []));
        setIsLoading(false);
      });

    return () => { isOutdated = true; };
  }, [currentSlug, slugs]);

  return { products, isLoading };
};

export default useRecentlyViewedProducts;
