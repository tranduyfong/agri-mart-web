import { useRef, useState } from 'react';
import { Image } from 'antd';
import { LeftOutlined, RightOutlined, ShoppingOutlined, ZoomInOutlined } from '@ant-design/icons';
import type { ProductImage } from '../../types/product';
import { getFileUrl } from '../../utils/fileUrl';

interface ProductGalleryProps {
  images: ProductImage[];
  productName: string;
  discountPercent: number | null;
}

// Ảnh lớn có thể phóng to, danh sách ảnh nhỏ cuộn ngang theo ảnh đang chọn
const ProductGallery = ({ images, productName, discountPercent }: ProductGalleryProps) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const thumbnailRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const activeImage = images[activeIndex];

  const selectImage = (index: number) => {
    setActiveIndex(index);
    thumbnailRefs.current[index]?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
  };

  return (
    <div className="min-w-0">
      <div className="relative flex aspect-[1.5] items-center justify-center overflow-hidden rounded-2xl bg-white p-8 sm:p-12">
        {activeImage ? (
          <Image
            src={getFileUrl(activeImage.url) || undefined}
            alt={`${productName} - ảnh ${activeIndex + 1}`}
            className="max-h-80 object-contain"
            preview={{ cover: <span className="flex items-center gap-2"><ZoomInOutlined /> Phóng to</span> }}
          />
        ) : (
          <div className="flex flex-col items-center gap-3 text-gray-400">
            <ShoppingOutlined className="text-6xl" />
            <span className="text-sm">Chưa có ảnh sản phẩm</span>
          </div>
        )}
        {!!discountPercent && (
          <span className="absolute top-4 left-4 rounded-full bg-red-50 px-3 py-1 text-sm font-bold text-red-500">
            Giảm {discountPercent}%
          </span>
        )}
        {images.length > 1 && (
          <span className="absolute right-4 bottom-4 rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-500" aria-live="polite">
            {activeIndex + 1} / {images.length}
          </span>
        )}
      </div>

      {images.length > 0 && (
        <div className="relative mt-4">
          <div className="flex gap-3 overflow-x-auto pb-3 sm:gap-4" aria-label="Ảnh sản phẩm">
            {images.map((image, index) => (
              <button
                key={image.id}
                ref={(element) => { thumbnailRefs.current[index] = element; }}
                type="button"
                aria-label={`Xem ảnh ${index + 1} của ${productName}`}
                aria-pressed={index === activeIndex}
                onClick={() => selectImage(index)}
                className={`flex aspect-[1.4] w-[calc((100%-1.5rem)/3)] shrink-0 cursor-pointer items-center justify-center rounded-xl border-2 bg-white p-4 transition sm:w-[calc((100%-2rem)/3)] ${index === activeIndex ? 'border-primary' : 'border-transparent hover:border-primary/40'}`}
              >
                <img src={getFileUrl(image.url) || undefined} alt={`${productName} - ảnh nhỏ ${index + 1}`} loading="lazy" className="h-full w-full object-contain" />
              </button>
            ))}
          </div>
          {images.length > 3 && (
            <div className="mt-1 flex items-center justify-between">
              <button type="button" aria-label="Ảnh trước" onClick={() => selectImage((activeIndex - 1 + images.length) % images.length)} className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-white shadow-sm hover:text-primary">
                <LeftOutlined />
              </button>
              <div className="mx-4 h-1 flex-1 overflow-hidden rounded-full bg-gray-200">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(activeIndex + 1) / images.length * 100}%` }} />
              </div>
              <button type="button" aria-label="Ảnh tiếp theo" onClick={() => selectImage((activeIndex + 1) % images.length)} className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-white shadow-sm hover:text-primary">
                <RightOutlined />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProductGallery;
