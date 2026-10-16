import { App } from 'antd';
import { Link } from 'react-router-dom';
import { CheckCircleFilled, HeartOutlined, ShoppingCartOutlined, ShoppingOutlined } from '@ant-design/icons';
import type { ProductCardItem } from '../types/product';
import { getFileUrl } from '../utils/fileUrl';
import { formatPrice, formatStock } from '../utils/format';
import { getProductDetailPath } from '../utils/constants';

interface ProductCardProps {
  product: ProductCardItem;
}

// Thẻ sản phẩm: ảnh, nút yêu thích, % giảm giá, tồn kho, tên, giá / đơn vị, nút thêm vào giỏ
const ProductCard = ({ product }: ProductCardProps) => {
  const { message } = App.useApp();
  const imageUrl = getFileUrl(product.thumbnail_url);
  const isOutOfStock = product.total_stock <= 0;
  const detailPath = getProductDetailPath(product.slug);

  // Giá sau khi giảm (nếu sản phẩm đang có khuyến mãi theo %)
  const originalPrice = product.min_price || 0;
  const salePrice = product.discount_percent ? originalPrice * (1 - product.discount_percent / 100) : originalPrice;

  // Giỏ hàng và yêu thích chưa có API nên tạm thời chỉ thông báo
  const showComingSoon = () => {
    message.info('Tính năng đang được phát triển');
  };

  return (
    <div className="flex h-full flex-col rounded-xl border border-gray-100 bg-white p-3 transition hover:shadow-md">
      {/* Ảnh sản phẩm */}
      <div className="relative flex h-32 items-center justify-center rounded-lg bg-gray-50">
        <Link
          to={detailPath}
          aria-label={`Xem ${product.name}`}
          className="flex h-full w-full items-center justify-center rounded-lg focus-visible:outline-2 focus-visible:outline-primary"
        >
          {imageUrl ? (
            <img src={imageUrl} alt={product.name} loading="lazy" className="h-24 w-24 object-contain" />
          ) : (
            <ShoppingOutlined className="text-4xl text-gray-300" />
          )}
        </Link>

        {product.discount_percent && (
          <span className="absolute top-2 left-2 rounded-md bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
            -{product.discount_percent}%
          </span>
        )}

        <button
          type="button"
          aria-label="Thêm vào yêu thích"
          onClick={showComingSoon}
          className="absolute top-2 right-2 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-white text-gray-600 shadow-sm hover:text-red-500"
        >
          <HeartOutlined />
        </button>
      </div>

      {/* Tồn kho */}
      <div className={`mt-3 flex items-center gap-1 text-xs ${isOutOfStock ? 'text-gray-400' : 'text-primary'}`}>
        <CheckCircleFilled />
        <span>{formatStock(product.total_stock)}</span>
      </div>

      {/* Tên + giá */}
      <h3 className="mt-1 line-clamp-2 min-h-10 text-sm font-semibold text-gray-900">
        <Link to={detailPath} className="text-gray-900 hover:text-primary">{product.name}</Link>
      </h3>

      <div className="mt-auto flex items-end justify-between gap-2 pt-2">
        <div>
          <p className="text-base font-bold text-primary">
            {formatPrice(salePrice)}
            {product.unit && <span className="text-xs font-medium text-gray-500"> / {product.unit}</span>}
          </p>
          {product.discount_percent && (
            <p className="text-xs text-gray-400 line-through">{formatPrice(originalPrice)}</p>
          )}
        </div>

        <button
          type="button"
          aria-label="Thêm vào giỏ hàng"
          disabled={isOutOfStock}
          onClick={showComingSoon}
          className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-primary text-white hover:bg-primary-dark disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          <ShoppingCartOutlined />
        </button>
      </div>
    </div>
  );
};

export default ProductCard;
