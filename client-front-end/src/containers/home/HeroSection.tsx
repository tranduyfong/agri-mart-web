import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Carousel, Input, Modal, Select } from 'antd';
import contentService, { type PublicBanner } from '../../services/contentService';
import { getFileUrl } from '../../utils/fileUrl';
import { AppstoreOutlined, SearchOutlined, CloseOutlined } from '@ant-design/icons';
import heroImage from '../../assets/images/home-hero.jpg';
import productsImage from '../../assets/images/why-products.jpg';
import storeImage from '../../assets/images/why-store.jpg';
import useCategories from '../../hooks/useCategories';
import { ROUTES } from '../../utils/constants';

const BANNERS = [
  {
    image: heroImage,
    title: 'Tươi ngon mỗi ngày, an tâm mỗi bữa ăn',
    description: 'Nông sản tươi sạch, lựa chọn dễ dàng và giao tận nhà.',
  },
  {
    image: productsImage,
    title: 'Mang sắc xanh về căn bếp của bạn',
    description: 'Khám phá rau củ và trái cây cho bữa cơm đủ đầy.',
  },
  {
    image: storeImage,
    title: 'Đi chợ thật tiện, chọn gì cũng có',
    description: 'Mua sắm thực phẩm yêu thích ngay tại AgriFood Smart.',
  },
];

// Ảnh lớn đầu trang chủ + khung tìm kiếm sản phẩm (từ khóa + danh mục)
const HeroSection = () => {
  const navigate = useNavigate();
  const { categories } = useCategories();
  const [keyword, setKeyword] = useState('');
  const [banners, setBanners] = useState<PublicBanner[]>([]);
  const [popup, setPopup] = useState<PublicBanner | null>(null);
  useEffect(() => {
    let active = true;
    contentService
      .getBanners()
      .then((items) => {
        if (!active) return;
        setBanners(items.filter((item) => item.type === 'HOME_CAROUSEL'));
        setPopup(
          items.find((item) => item.type === 'POPUP' && !sessionStorage.getItem('banner.closed.' + item.id)) || null,
        );
      })
      .catch(() => {
        /* Giữ banner mặc định khi chưa tải được quảng cáo. */
      });
    return () => {
      active = false;
    };
  }, []);
  const closePopup = () => {
    if (popup) sessionStorage.setItem('banner.closed.' + popup.id, '1');
    setPopup(null);
  };
  const [categoryId, setCategoryId] = useState<string>();
  const [autoplay] = useState(() => !window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  // Bấm "Tìm sản phẩm" -> sang trang cửa hàng kèm điều kiện tìm kiếm trên đường dẫn
  const handleSearch = () => {
    const params = new URLSearchParams();
    if (keyword.trim()) params.set('keyword', keyword.trim());
    if (categoryId) params.set('category_id', String(categoryId));
    navigate(`${ROUTES.SHOP}?${params.toString()}`);
  };

  return (
    <section className="relative">
      {!!banners.length && <h1 className="sr-only">{banners[0].title}</h1>}
      <div className="relative overflow-hidden rounded-b-3xl">
        <Carousel
          className="hero-carousel"
          autoplay={autoplay}
          autoplaySpeed={5000}
          speed={700}
          arrows
          infinite
          draggable
          pauseOnHover
          pauseOnFocus
        >
          {banners.length
            ? banners.map((banner) => (
              <div key={banner.id}>
                {banner.link_url ? (
                  <a href={banner.link_url}>
                    <img
                      src={getFileUrl(banner.image_url) || undefined}
                      alt={banner.title}
                      className="h-80 w-full object-cover sm:h-96"
                    />
                  </a>
                ) : (
                  <img
                    src={getFileUrl(banner.image_url) || undefined}
                    alt={banner.title}
                    className="h-80 w-full object-cover sm:h-96"
                  />
                )}
              </div>
            ))
            : BANNERS.map((banner, index) => (
              <div key={banner.image}>
                <div className="relative h-80 sm:h-96">
                  <img src={banner.image} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-linear-to-r from-black/70 via-black/40 to-black/20" />
                  <div className="absolute inset-x-0 bottom-24 mx-auto max-w-7xl px-10 text-white sm:px-12">
                    <p className="mb-3 text-sm font-semibold tracking-widest text-green-200">AGRIFOOD SMART</p>
                    {index === 0 ? (
                      <h1 className="max-w-3xl text-2xl font-bold leading-snug sm:text-4xl">{banner.title}</h1>
                    ) : (
                      <h2 className="max-w-3xl text-2xl font-bold leading-snug sm:text-4xl">{banner.title}</h2>
                    )}
                    <p className="mt-3 max-w-2xl text-base text-white/90">{banner.description}</p>
                  </div>
                </div>
              </div>
            ))}
        </Carousel>
      </div>

      {/* Khung tìm kiếm nằm đè lên mép dưới của ảnh */}
      <div className="relative mx-auto -mt-10 max-w-7xl px-4">
        <div className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-lg md:flex-row md:items-end">
          <div className="flex-1">
            <p className="mb-1.5 text-xs font-semibold text-gray-900">Tìm sản phẩm</p>
            <Input
              size="large"
              placeholder="Bạn đang tìm sản phẩm gì?"
              prefix={<SearchOutlined className="text-gray-400" />}
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              onPressEnter={handleSearch}
            />
          </div>

          <div className="md:w-72">
            <p className="mb-1.5 text-xs font-semibold text-gray-900">Danh mục</p>
            <Select
              size="large"
              allowClear
              className="w-full"
              placeholder="Tất cả danh mục"
              prefix={<AppstoreOutlined className="text-gray-400" />}
              value={categoryId}
              onChange={(value) => setCategoryId(value)}
              options={categories.map((category) => ({
                value: category.id,
                label: category.name,
              }))}
            />
          </div>

          <Button type="primary" size="large" className="font-semibold md:w-40" onClick={handleSearch}>
            Tìm sản phẩm
          </Button>
        </div>
      </div>
      <Modal
        aria-label={popup?.title || 'Quảng cáo'}
        open={!!popup}
        onCancel={closePopup}
        footer={null}
        closable={false}
        centered
        destroyOnHidden
        styles={{
          container: { padding: 0, background: 'transparent', boxShadow: 'none', border: 0 },
          body: { padding: 0 },
        }}
      >
        {popup && (
          <div className="relative" aria-label={popup.title}>
            {popup.link_url ? (
              <a href={popup.link_url}>
                <img
                  src={getFileUrl(popup.image_url) || undefined}
                  alt={popup.title}
                  className="block max-h-[85vh] w-full object-contain"
                />
              </a>
            ) : (
              <img
                src={getFileUrl(popup.image_url) || undefined}
                alt={popup.title}
                className="block max-h-[85vh] w-full object-contain"
              />
            )}
            <button
              type="button"
              aria-label="Đóng quảng cáo"
              onClick={closePopup}
              className="absolute right-2 top-2 z-10 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 focus-visible:outline-2 focus-visible:outline-white"
            >
              <CloseOutlined />
            </button>
          </div>
        )}
      </Modal>
    </section>
  );
};

export default HeroSection;
