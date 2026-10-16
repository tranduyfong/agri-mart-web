import { useEffect, useState } from 'react';
import productService from '../services/productService';
import type { ProductDetail } from '../types/product';
import { getErrorCode, getErrorMessage } from '../utils/errorMessage';

interface ProductDetailResult {
  requestKey: string;
  product: ProductDetail | null;
  errorMessage: string;
  isNotFound: boolean;
}

// Tải chi tiết theo slug, bỏ qua kết quả cũ nếu người dùng đã chuyển sang sản phẩm khác
const useProductDetail = (slug: string) => {
  const [retryCount, setRetryCount] = useState(0);
  const [result, setResult] = useState<ProductDetailResult | null>(null);
  const requestKey = JSON.stringify([slug, retryCount]);

  useEffect(() => {
    let isOutdated = false;

    productService.getProductDetail(slug)
      .then((response) => {
        if (isOutdated) return;
        setResult({ requestKey, product: response.data, errorMessage: '', isNotFound: false });
      })
      .catch((error: unknown) => {
        if (isOutdated) return;
        setResult({
          requestKey,
          product: null,
          errorMessage: getErrorMessage(error),
          isNotFound: getErrorCode(error) === 'RESOURCE_NOT_FOUND',
        });
      });

    return () => { isOutdated = true; };
  }, [slug, requestKey]);

  const isLoading = result?.requestKey !== requestKey;

  return {
    product: isLoading ? null : result.product,
    errorMessage: isLoading ? '' : result.errorMessage,
    isNotFound: isLoading ? false : result.isNotFound,
    isLoading,
    reload: () => setRetryCount((count) => count + 1),
  };
};

export default useProductDetail;
