import type { ProductCardItem, ProductDetail } from '../types/product';

// Chuyển dữ liệu chi tiết vừa tải thành dữ liệu hiển thị trên thẻ, không lưu giá / tồn kho cũ
export const getProductCardItem = (product: ProductDetail): ProductCardItem => {
  const cheapestVariant = product.variants.reduce<ProductDetail['variants'][number] | undefined>(
    (cheapest, variant) => !cheapest || variant.list_price < cheapest.list_price ? variant : cheapest,
    undefined,
  );

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    min_price: cheapestVariant?.list_price ?? null,
    unit: cheapestVariant?.unit ?? null,
    total_stock: product.variants.reduce((total, variant) => total + variant.stock_quantity, 0),
    thumbnail_url: product.images[0]?.url ?? null,
    discount_percent: product.discount_percent,
  };
};
