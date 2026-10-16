import { useState } from 'react';
import { Link } from 'react-router-dom';
import { App, Button, Input } from 'antd';
import { CheckCircleFilled, HeartOutlined, InfoCircleOutlined, ShareAltOutlined, ShoppingCartOutlined } from '@ant-design/icons';
import IconButton from '../../components/IconButton';
import PrimaryButton from '../../components/PrimaryButton';
import QuantitySelector from '../../components/QuantitySelector';
import type { ProductDetail, ProductVariant } from '../../types/product';
import { ROUTES } from '../../utils/constants';
import { formatPrice } from '../../utils/format';
import { getMaxQuantity, getQuantityStep, normalizeQuantity } from '../../utils/productQuantity';

interface ProductInfoProps {
  product: ProductDetail;
}

// Giá, số lượng và tồn kho đều lấy theo quy cách đang chọn, không dùng tổng tồn của sản phẩm
const ProductInfo = ({ product }: ProductInfoProps) => {
  const { message, modal } = App.useApp();
  const initialVariant = product.variants.find((variant) => getMaxQuantity(variant) > 0) || product.variants[0];
  const [selectedVariantId, setSelectedVariantId] = useState(initialVariant?.id);
  const [quantity, setQuantity] = useState(initialVariant ? normalizeQuantity(1, initialVariant) : 0);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  const selectedVariant = product.variants.find((variant) => variant.id === selectedVariantId);
  const maxQuantity = selectedVariant ? getMaxQuantity(selectedVariant) : 0;
  const isOutOfStock = maxQuantity === 0;
  const originalPrice = selectedVariant?.list_price ?? 0;
  const salePrice = Math.round(originalPrice * (1 - (product.discount_percent || 0) / 100));
  const totalPrice = salePrice * quantity;
  const description = product.description?.trim();

  const selectVariant = (variant: ProductVariant) => {
    setSelectedVariantId(variant.id);
    setQuantity(normalizeQuantity(1, variant));
  };

  // Giữ cùng cách xử lý với ProductCard trong lúc dự án chưa có API giỏ hàng / thanh toán
  const showComingSoon = () => message.info('Tính năng đang được phát triển');

  const shareProduct = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: product.name, url });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        message.success('Đã sao chép liên kết sản phẩm');
      } else {
        modal.info({ title: 'Chia sẻ sản phẩm', content: <Input aria-label="Liên kết sản phẩm" readOnly value={url} onFocus={(event) => event.target.select()} /> });
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      modal.info({ title: 'Chia sẻ sản phẩm', content: <Input aria-label="Liên kết sản phẩm" readOnly value={url} onFocus={(event) => event.target.select()} /> });
    }
  };

  return (
    <div className="min-w-0">
      <div className="flex items-center justify-between gap-3">
        <Link to={`${ROUTES.SHOP}?category_id=${product.category_id}`} className="text-sm font-medium text-gray-500 hover:text-primary">
          {product.category_name}
        </Link>
        <div className="flex items-center gap-1">
          <IconButton icon={<ShareAltOutlined />} label="Chia sẻ sản phẩm" onClick={shareProduct} />
          <IconButton icon={<HeartOutlined />} label="Thêm vào yêu thích" onClick={showComingSoon} />
        </div>
      </div>

      <h1 className="mt-1 text-3xl leading-tight font-bold text-gray-900 sm:text-4xl">{product.name}</h1>
      <div className="mt-3 flex flex-wrap items-baseline gap-2" aria-live="polite">
        {selectedVariant ? (
          <>
            <span className="text-3xl font-bold text-primary">{formatPrice(salePrice)}</span>
            <span className="text-sm text-gray-500">/ {selectedVariant.unit}</span>
            {!!product.discount_percent && <span className="text-sm text-gray-400 line-through">{formatPrice(originalPrice)}</span>}
          </>
        ) : <span className="text-sm text-gray-500">Chưa có giá bán</span>}
      </div>

      <div className="mt-5 text-sm leading-6 text-gray-500">
        <p className={`whitespace-pre-line ${isDescriptionExpanded ? '' : 'line-clamp-5'}`}>
          {description || 'Thông tin mô tả sản phẩm đang được cập nhật.'}
        </p>
        {description && description.length > 220 && (
          <button type="button" aria-expanded={isDescriptionExpanded} onClick={() => setIsDescriptionExpanded((value) => !value)} className="mt-1 cursor-pointer font-semibold text-primary hover:underline">
            {isDescriptionExpanded ? 'Thu gọn' : 'Đọc thêm'}
          </button>
        )}
      </div>

      <div className="mt-6 border-t border-gray-200 pt-6">
        <fieldset>
          <legend className="mb-3 text-sm font-semibold text-gray-900">Quy cách</legend>
          {product.variants.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {product.variants.map((variant) => (
                <button
                  key={variant.id}
                  type="button"
                  aria-pressed={variant.id === selectedVariantId}
                  onClick={() => selectVariant(variant)}
                  className={`cursor-pointer rounded-lg border px-4 py-2 text-sm font-medium transition ${variant.id === selectedVariantId ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 bg-white text-gray-600 hover:border-primary'} ${getMaxQuantity(variant) === 0 ? 'opacity-60' : ''}`}
                >
                  {variant.name}
                  {getMaxQuantity(variant) === 0 && <span className="ml-1 text-xs">(Hết hàng)</span>}
                </button>
              ))}
            </div>
          ) : <p className="text-sm text-gray-500">Sản phẩm chưa có quy cách bán.</p>}
        </fieldset>

        {selectedVariant && (
          <div className="mt-5 flex flex-wrap items-end gap-x-6 gap-y-3">
            <div>
              <p className="mb-2 text-sm font-semibold text-gray-900">Số lượng</p>
              <QuantitySelector value={quantity} step={getQuantityStep(selectedVariant)} max={maxQuantity} unit={selectedVariant.unit} onChange={(value) => setQuantity(normalizeQuantity(value, selectedVariant))} />
            </div>
            <span role="status" className={`mb-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${isOutOfStock ? 'bg-gray-200 text-gray-500' : 'bg-primary/10 text-primary'}`}>
              <CheckCircleFilled />
              {isOutOfStock ? 'Hết hàng' : `Còn ${selectedVariant.stock_quantity.toLocaleString('vi-VN')} ${selectedVariant.unit}`}
            </span>
          </div>
        )}

        <div className="mt-6 flex items-center justify-between gap-3 text-sm">
          <span className="text-gray-500">Tạm tính</span>
          <span aria-live="polite" className="text-xl font-bold text-gray-900">{formatPrice(totalPrice)}</span>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Button size="large" block disabled={isOutOfStock} icon={<ShoppingCartOutlined />} onClick={showComingSoon} className="h-12 border-primary/10 bg-primary/15 font-semibold text-primary-dark hover:bg-primary/25">
            Thêm vào giỏ
          </Button>
          <div className="[&_button]:h-12">
            <PrimaryButton disabled={isOutOfStock} onClick={showComingSoon}>{isOutOfStock ? 'Tạm hết hàng' : 'Mua ngay'}</PrimaryButton>
          </div>
        </div>
        <dl className="mt-5 flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-500">
          <div className="flex gap-1"><dt>Mã sản phẩm:</dt><dd className="font-medium text-gray-700">{product.code}</dd></div>
          {selectedVariant && <div className="flex gap-1"><dt>SKU:</dt><dd className="break-all font-medium text-gray-700">{selectedVariant.sku}</dd></div>}
        </dl>
      </div>

      <div className="mt-6 flex gap-3 rounded-xl border border-white bg-white/70 p-4">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><InfoCircleOutlined /></span>
        <div>
          <h2 className="text-sm font-semibold text-gray-700">Lưu ý khi đặt hàng</h2>
          <p className="mt-1 text-xs leading-5 text-gray-500">Giá và số lượng còn hàng được cập nhật theo từng quy cách. Vui lòng chọn quy cách phù hợp trước khi đặt mua.</p>
        </div>
      </div>
    </div>
  );
};

export default ProductInfo;
