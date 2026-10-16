import ProductHighlightColumn from './ProductHighlightColumn';

// Khối 4 cột sản phẩm: Xu hướng / Mới về / Bán chạy nhất / Đang giảm giá
const ProductHighlightSection = () => {
  return (
    <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      <ProductHighlightColumn title="Xu hướng" query={{ sort: 'trending' }} />
      <ProductHighlightColumn title="Mới về" query={{ sort: 'newest' }} />
      <ProductHighlightColumn title="Bán chạy nhất" query={{ sort: 'best_selling' }} />
      <ProductHighlightColumn title="Đang giảm giá" query={{ on_sale: true, sort: 'best_selling' }} />
    </section>
  );
};

export default ProductHighlightSection;
