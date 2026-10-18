import { useState } from 'react';
import { Modal } from 'antd';
import QuantitySelector from './QuantitySelector';
import type { ProductDetail, ProductVariant } from '../types/product';
import { formatPrice } from '../utils/format';
import { getFileUrl } from '../utils/fileUrl';
import { getMaxQuantity, getQuantityStep, normalizeQuantity } from '../utils/productQuantity';
import useShoppingActions from '../hooks/useShoppingActions';

interface AddToCartModalProps {
  product: ProductDetail;
  onClose: () => void;
}

// Sản phẩm có nhiều quy cách: cho người dùng chọn rõ giá / đơn vị trước khi thêm nhanh
const AddToCartModal = ({ product, onClose }: AddToCartModalProps) => {
  const initial = product.variants.find((variant) => getMaxQuantity(variant) > 0) || product.variants[0];
  const [variantId, setVariantId] = useState(initial?.id);
  const [quantity, setQuantity] = useState(initial ? normalizeQuantity(1, initial) : 0);
  const { runMutation, isBusy } = useShoppingActions();
  const selected = product.variants.find((variant) => variant.id === variantId);
  const imageUrl = getFileUrl(product.images[0]?.url ?? null);
  const price = Math.round((selected?.list_price || 0) * (1 - (product.discount_percent || 0) / 100));

  const selectVariant = (variant: ProductVariant) => {
    setVariantId(variant.id);
    setQuantity(normalizeQuantity(1, variant));
  };

  const addToCart = async () => {
    if (!selected || quantity <= 0) return;
    const source = document.querySelector<HTMLElement>('.ant-modal .ant-btn-primary');
    if (await runMutation({ kind: 'addCart', variantId: selected.id, quantity }, source, imageUrl)) onClose();
  };

  return (
    <Modal open title="Thêm vào giỏ hàng" onCancel={onClose} onOk={addToCart} okText="Thêm vào giỏ" cancelText="Để sau" confirmLoading={isBusy} okButtonProps={{ disabled: !selected || quantity <= 0 }}>
      <div className="mb-5 flex items-center gap-4 rounded-xl bg-page-gray p-4">
        {imageUrl && <img src={imageUrl} alt={product.name} className="h-20 w-20 object-contain" />}
        <div><h3 className="font-bold text-gray-900">{product.name}</h3><p className="mt-1 text-lg font-bold text-primary">{formatPrice(price)} <span className="text-sm font-normal text-gray-500">/ {selected?.unit}</span></p></div>
      </div>
      <fieldset><legend className="mb-2 text-sm font-semibold">Chọn quy cách</legend>
        <div className="flex flex-wrap gap-2">
          {product.variants.map((variant) => (
            <button key={variant.id} type="button" aria-pressed={variant.id === variantId} disabled={isBusy || getMaxQuantity(variant) === 0} onClick={() => selectVariant(variant)} className={`cursor-pointer rounded-lg border px-3 py-2 text-sm disabled:opacity-40 ${variant.id === variantId ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200'}`}>{variant.name}</button>
          ))}
        </div>
      </fieldset>
      {selected && <div className="mt-5"><p className="mb-2 text-sm font-semibold">Số lượng</p><QuantitySelector value={quantity} step={getQuantityStep(selected)} max={getMaxQuantity(selected)} unit={selected.unit} disabled={isBusy} onChange={(value) => setQuantity(normalizeQuantity(value, selected))} /></div>}
      <div className="mt-5 flex justify-between border-t border-gray-100 pt-4"><span>Tạm tính</span><strong className="text-lg text-primary">{formatPrice(price * quantity)}</strong></div>
    </Modal>
  );
};

export default AddToCartModal;
