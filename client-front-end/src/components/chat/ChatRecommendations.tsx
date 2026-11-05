import { Button, Image } from 'antd';
import { ShoppingCartOutlined } from '@ant-design/icons';
import type { ChatRecommendation } from '../../types/chat';
import { getFileUrl } from '../../utils/fileUrl';
import { formatPrice } from '../../utils/format';
import { getDirectCheckoutPath } from '../../utils/checkoutSelection';

const ChatRecommendations = ({ items }: { items: ChatRecommendation[] }) => (
  <div className="mt-3 space-y-2">
    {items.map((item) => <div key={item.variant_id} className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
      <div className="flex items-center gap-3">
        <Image width={52} height={52} src={getFileUrl(item.thumbnail_url) || undefined} alt={item.name}
          style={{ objectFit: 'contain', borderRadius: 8 }} />
        <div className="min-w-0 flex-1"><p className="text-xs font-semibold text-gray-800">{item.name}</p>
          <p className="mt-1 text-[11px] text-gray-500">{item.variant_name} · {item.quantity} {item.unit}</p>
          <p className="mt-1 text-xs font-semibold text-primary">{item.price == null ? 'Ngừng bán' : formatPrice(item.price) + '/' + item.unit}</p></div>
      </div>
      {item.available ? <Button className="mt-3 w-full" size="small" icon={<ShoppingCartOutlined />}
        href={getDirectCheckoutPath([item])}>Đặt sản phẩm này</Button>
        : <p className="mt-2 text-[11px] text-red-500">Hiện không còn đủ hàng để đặt.</p>}
    </div>)}
    {items.length > 1 && <Button type="primary" block disabled={items.some((item) => !item.available)}
      href={items.every((item) => item.available) ? getDirectCheckoutPath(items) : undefined}>Đặt cả {items.length} sản phẩm</Button>}
    <p className="text-[10px] leading-relaxed text-gray-400">Chuyển đến bước chọn địa chỉ và xác nhận đơn. Giá, ưu đãi và tồn kho được kiểm tra lại trước khi đặt.</p>
  </div>
);
export default ChatRecommendations;
