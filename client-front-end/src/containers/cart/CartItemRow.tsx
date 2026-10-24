import { Link } from 'react-router-dom';
import { Checkbox, Popconfirm } from 'antd';
import { DeleteOutlined, HeartFilled, HeartOutlined, ShoppingOutlined } from '@ant-design/icons';
import QuantitySelector from '../../components/QuantitySelector';
import useShoppingActions from '../../hooks/useShoppingActions';
import { useAppSelector } from '../../hooks/useRedux';
import type { CartItem } from '../../types/shopping';
import { getFileUrl } from '../../utils/fileUrl';
import { getProductDetailPath } from '../../utils/constants';
import { formatPrice } from '../../utils/format';
import { getMaxQuantity, getQuantityStep, normalizeQuantity } from '../../utils/productQuantity';
import { canSelectCartItem, getCartItemPrice } from '../../utils/shopping';

interface CartItemRowProps {
  item: CartItem;
  checked: boolean;
  onSelect: (checked: boolean) => void;
}

const CartItemRow = ({ item, checked, onSelect }: CartItemRowProps) => {
  const { runMutation, isBusy } = useShoppingActions();
  const isFavorite = useAppSelector((state) =>
    state.shopping.wishlist.some((product) => product.id === item.product_id),
  );
  const imageUrl = getFileUrl(item.thumbnail_url);
  const price = getCartItemPrice(item);
  const isAvailable = canSelectCartItem(item);

  return (
    <li className="grid grid-cols-2 items-center gap-4 border-b border-gray-100 py-6 last:border-0 lg:grid-cols-[2fr_1fr_1.3fr_1fr_2rem] lg:gap-6 lg:py-8">
      <div className="col-span-2 flex min-w-0 items-center gap-3 lg:col-span-1">
        <Checkbox
          aria-label={`Chọn ${item.name}, ${item.variant_name}`}
          checked={checked}
          disabled={!isAvailable}
          onChange={(event) => onSelect(event.target.checked)}
        />
        <Link
          to={getProductDetailPath(item.slug)}
          className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-gray-50 sm:h-24 sm:w-24"
        >
          {imageUrl ? (
            <img src={imageUrl} alt={item.name} className="h-full w-full object-contain p-2" />
          ) : (
            <ShoppingOutlined className="text-3xl text-gray-300" />
          )}
        </Link>
        <div className="min-w-0">
          <p className="text-xs text-gray-400">{item.category_name}</p>
          <Link to={getProductDetailPath(item.slug)} className="mt-1 block font-bold text-gray-900 hover:text-primary">
            {item.name}
          </Link>
          <p className="mt-1 text-xs text-gray-500">{item.variant_name}</p>
          {!isAvailable && (
            <p className="mt-1 text-xs font-medium text-red-500">
              {item.status !== 'PUBLISHED'
                ? 'Sản phẩm đã ngừng bán'
                : getMaxQuantity(item) === 0
                  ? 'Tạm hết hàng'
                  : `Chỉ còn ${getMaxQuantity(item).toLocaleString('vi-VN')} ${item.unit}, vui lòng giảm số lượng`}
            </p>
          )}
        </div>
      </div>
      <div>
        <p className="mb-1 text-xs text-gray-400 lg:hidden">Đơn giá</p>
        <span className="font-semibold text-gray-900">{formatPrice(price)}</span>
        <span className="text-xs text-gray-500"> / {item.unit}</span>
        {!!item.discount_percent && (
          <p className="mt-1 text-xs text-gray-400 line-through">{formatPrice(item.list_price)}</p>
        )}
      </div>
      <div className="col-span-2 flex items-center justify-between gap-3 sm:col-span-1 sm:block sm:justify-self-end lg:justify-self-start">
        <span className="text-xs text-gray-400 sm:hidden">Số lượng</span>
        <QuantitySelector
          value={item.quantity}
          step={getQuantityStep(item)}
          max={getMaxQuantity(item)}
          unit={item.unit}
          disabled={isBusy || item.status !== 'PUBLISHED'}
          onChange={(quantity) =>
            runMutation({ kind: 'updateCart', itemId: item.id, quantity: normalizeQuantity(quantity, item) })
          }
        />
      </div>
      <div>
        <p className="mb-1 text-xs text-gray-400 lg:hidden">Thành tiền</p>
        <p className="font-bold text-gray-900">{formatPrice(price * item.quantity)}</p>
      </div>
      <div className="flex justify-end gap-2 lg:flex-col">
        <button
          type="button"
          aria-label={isFavorite ? `Bỏ yêu thích ${item.name}` : `Yêu thích ${item.name}`}
          aria-pressed={isFavorite}
          disabled={isBusy}
          onClick={(event) =>
            runMutation(
              { kind: isFavorite ? 'removeWishlist' : 'addWishlist', productId: item.product_id },
              event.currentTarget,
            )
          }
          className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-full hover:bg-red-50 ${isFavorite ? 'text-red-500' : 'text-gray-400'}`}
        >
          {isFavorite ? <HeartFilled /> : <HeartOutlined />}
        </button>
        <Popconfirm
          title="Xóa sản phẩm khỏi giỏ?"
          okText="Xóa"
          cancelText="Giữ lại"
          onConfirm={() => runMutation({ kind: 'removeCart', itemId: item.id })}
        >
          <button
            type="button"
            aria-label={`Xóa ${item.name}`}
            disabled={isBusy}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-gray-400 hover:bg-red-50 hover:text-red-500"
          >
            <DeleteOutlined />
          </button>
        </Popconfirm>
      </div>
    </li>
  );
};

export default CartItemRow;
