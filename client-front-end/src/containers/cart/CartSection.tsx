import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Checkbox, Empty } from 'antd';
import { SafetyCertificateOutlined, ShoppingCartOutlined } from '@ant-design/icons';
import { useAppSelector } from '../../hooks/useRedux';
import ShoppingSection from '../shopping/ShoppingSection';
import CartItemRow from './CartItemRow';
import { ROUTES } from '../../utils/constants';
import { formatPrice } from '../../utils/format';
import { canSelectCartItem, getCartItemPrice } from '../../utils/shopping';

const CartSection = () => {
  const cart = useAppSelector((state) => state.shopping.cart);
  const [excludedIds, setExcludedIds] = useState<number[]>([]);
  const availableItems = cart.filter(canSelectCartItem);
  const selectedItems = availableItems.filter((item) => !excludedIds.includes(item.id));
  const total = selectedItems.reduce((sum, item) => sum + getCartItemPrice(item) * item.quantity, 0);
  const allSelected = availableItems.length > 0 && selectedItems.length === availableItems.length;

  const selectItem = (id: number, checked: boolean) => {
    setExcludedIds((ids) => checked ? ids.filter((item) => item !== id) : [...ids, id]);
  };

  return (
    <ShoppingSection title="Giỏ hàng của bạn" kind="cart">
      {cart.length === 0 ? (
        <div className="rounded-2xl bg-white px-4 py-16"><Empty image={<ShoppingCartOutlined className="text-6xl text-primary/40" />} description="Giỏ hàng của bạn đang trống"><Link to={ROUTES.SHOP}><Button type="primary" size="large">Khám phá sản phẩm</Button></Link></Empty></div>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-white px-4 sm:px-6">
          <div className="hidden grid-cols-[2fr_1fr_1.3fr_1fr_2rem] gap-6 border-b border-gray-100 py-5 text-sm font-bold text-gray-800 lg:grid"><span>Sản phẩm</span><span>Đơn giá</span><span>Số lượng</span><span>Thành tiền</span><span /></div>
          <ul>{cart.map((item) => <CartItemRow key={item.id} item={item} checked={canSelectCartItem(item) && !excludedIds.includes(item.id)} onSelect={(checked) => selectItem(item.id, checked)} />)}</ul>
          <div className="flex flex-wrap items-center justify-between gap-5 border-t border-gray-100 py-6">
            <Checkbox checked={allSelected} indeterminate={selectedItems.length > 0 && !allSelected} disabled={availableItems.length === 0} onChange={(event) => setExcludedIds(event.target.checked ? [] : availableItems.map((item) => item.id))}>Chọn tất cả ({availableItems.length})</Checkbox>
            <div className="flex flex-wrap items-center gap-5 sm:gap-8">
              <div className="text-right"><p className="text-sm text-gray-500">Tổng tạm tính ({selectedItems.length} sản phẩm)</p><p data-cart-total className="mt-1 text-2xl font-bold text-primary">{formatPrice(total)}</p></div>
              <Link to={ROUTES.SHOP}><Button type="primary" size="large" className="font-semibold">Tiếp tục mua sắm</Button></Link>
            </div>
          </div>
          <p className="flex items-center gap-2 border-t border-gray-100 py-4 text-xs leading-5 text-gray-400"><SafetyCertificateOutlined className="text-primary" />Giá và tồn kho được cập nhật khi mở giỏ. Tạm tính chưa bao gồm phí giao hàng.</p>
        </div>
      )}
    </ShoppingSection>
  );
};

export default CartSection;
