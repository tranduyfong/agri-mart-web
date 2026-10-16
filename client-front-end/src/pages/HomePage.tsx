import MainLayout from '../containers/layout/MainLayout';
import HeroSection from '../containers/home/HeroSection';
import CategorySection from '../containers/home/CategorySection';
import PromotionSection from '../containers/home/PromotionSection';
import PopularProductSection from '../containers/home/PopularProductSection';
import FlashSaleBanner from '../containers/home/FlashSaleBanner';
import ProductHighlightSection from '../containers/home/ProductHighlightSection';
import WhyChooseUsSection from '../containers/home/WhyChooseUsSection';

// Trang chủ = Ảnh đầu trang + Danh mục + Khuyến mãi + Sản phẩm nổi bật + Flash sale + 4 cột sản phẩm + Vì sao chọn chúng tôi
const HomePage = () => {
  return (
    <MainLayout>
      {/* flex-1: nền xám giãn ra hết chiều cao, không để khoảng trắng phía trên chân trang */}
      <div className="flex-1 bg-page-gray pb-16">
        <HeroSection />

        <div className="mx-auto mt-10 flex max-w-7xl flex-col gap-12 px-4">
          <CategorySection />
          <PromotionSection />
          <PopularProductSection />
          <FlashSaleBanner />
          <ProductHighlightSection />
          <WhyChooseUsSection />
        </div>
      </div>
    </MainLayout>
  );
};

export default HomePage;
