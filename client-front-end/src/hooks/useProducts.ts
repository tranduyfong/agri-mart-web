import { useEffect, useState } from 'react';
import productService from '../services/productService';
import type { ProductListItem, ProductQuery } from '../types/product';

// Lấy danh sách sản phẩm theo điều kiện (query), tự gọi lại API khi query thay đổi
// VD: const { products, isLoading } = useProducts({ sort: 'best_selling', pageSize: 10 });
const useProducts = (query: ProductQuery) => {
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [suggestedKeyword, setSuggestedKeyword] = useState<string | null>(null);

  // Đổi query thành chuỗi để so sánh (object mới tạo mỗi lần render nên không so sánh trực tiếp được)
  const queryKey = JSON.stringify(query);
  // Lưu query của lần tải gần nhất, khác queryKey hiện tại nghĩa là đang tải
  const [loadedQueryKey, setLoadedQueryKey] = useState('');

  useEffect(() => {
    let isOutdated = false; // Query đã đổi trước khi API trả về -> bỏ qua kết quả cũ

    productService
      .getProducts(JSON.parse(queryKey))
      .then((response) => {
        if (isOutdated) return;
        setProducts(response.data);
        setTotalElements(response.totalElements);
        setSuggestedKeyword(response.meta?.search_suggestion || null);
      })
      .catch(() => {
        if (isOutdated) return;
        setProducts([]);
        setTotalElements(0);
        setSuggestedKeyword(null);
      })
      .finally(() => {
        if (!isOutdated) setLoadedQueryKey(queryKey);
      });

    return () => {
      isOutdated = true;
    };
  }, [queryKey]);

  return {
    products,
    totalElements,
    isLoading: loadedQueryKey !== queryKey,
    suggestedKeyword: loadedQueryKey === queryKey ? suggestedKeyword : null,
  };
};

export default useProducts;
