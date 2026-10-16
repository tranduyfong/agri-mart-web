import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Select } from 'antd';
import { AppstoreOutlined, SearchOutlined } from '@ant-design/icons';
import heroImage from '../../assets/images/home-hero.jpg';
import useCategories from '../../hooks/useCategories';
import { ROUTES } from '../../utils/constants';

// Ảnh lớn đầu trang chủ + khung tìm kiếm sản phẩm (từ khóa + danh mục)
const HeroSection = () => {
  const navigate = useNavigate();
  const { categories } = useCategories();
  const [keyword, setKeyword] = useState('');
  const [categoryId, setCategoryId] = useState<number>();

  // Bấm "Tìm sản phẩm" -> sang trang cửa hàng kèm điều kiện tìm kiếm trên đường dẫn
  const handleSearch = () => {
    const params = new URLSearchParams();
    if (keyword.trim()) params.set('keyword', keyword.trim());
    if (categoryId) params.set('category_id', String(categoryId));
    navigate(`${ROUTES.SHOP}?${params.toString()}`);
  };

  return (
    <section className="relative">
      {/* Ảnh nền + lớp phủ tối để chữ dễ đọc */}
      <div className="relative h-72 overflow-hidden rounded-b-3xl sm:h-80">
        <img src={heroImage} alt="Siêu thị nông sản" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-linear-to-t from-black/75 via-black/30 to-black/10" />

        <div className="absolute inset-x-0 bottom-16 mx-auto max-w-7xl px-4 text-white">
          <h1 className="text-2xl font-bold sm:text-4xl">Mọi thứ bạn cần mỗi ngày, có ngay tại một nơi!</h1>
          <p className="mt-3 text-base text-white/90">Mua sắm nông sản tươi sạch tiện lợi mà không cần ra khỏi nhà.</p>
        </div>
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
              options={categories.map((category) => ({ value: category.id, label: category.name }))}
            />
          </div>

          <Button type="primary" size="large" className="font-semibold md:w-40" onClick={handleSearch}>
            Tìm sản phẩm
          </Button>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
