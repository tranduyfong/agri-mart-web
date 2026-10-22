import { Button, Tag } from 'antd';
import { EnvironmentOutlined, RightOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import DeliveryProgress from '../../components/DeliveryProgress';
import { ORDER_STATUSES, PAYMENT_METHODS, PAYMENT_STATUSES } from '../../utils/orderStatus';
import { getOrderResultPath } from '../../utils/constants';
import { formatPrice } from '../../utils/format';
import { getFileUrl } from '../../utils/fileUrl';
import type { CheckoutOrder } from '../../types/order';

const OrderCard = ({ order }: { order: CheckoutOrder }) => {
  const status = ORDER_STATUSES[order.status];
  return (
    <article className="min-w-0 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 pb-4">
        <div className="min-w-0 flex-1">
          <Link
            to={getOrderResultPath(order.checkout_code)}
            className="break-all font-semibold text-gray-900 hover:text-primary"
          >
            {order.checkout_code}
          </Link>
          <p className="mt-1 text-xs text-gray-500">Đặt lúc {new Date(order.created_at).toLocaleString('vi-VN')}</p>
        </div>
        <Tag color={status.color}>{status.label}</Tag>
      </div>
      <div className="py-6">
        <DeliveryProgress status={order.status} />
      </div>
      {order.branch_orders.length > 1 && (
        <div className="mb-5 rounded-xl bg-gray-50 p-4 text-sm">
          <p className="mb-2 font-semibold">Tiến độ từng kiện hàng</p>
          {order.branch_orders.map((branch) => (
            <div key={branch.code} className="mt-2 flex flex-wrap justify-between gap-2">
              <span>{branch.branch_name}</span>
              <Tag color={ORDER_STATUSES[branch.status].color}>{ORDER_STATUSES[branch.status].label}</Tag>
            </div>
          ))}
        </div>
      )}
      <ul className="space-y-4">
        {order.items.slice(0, 3).map((item, index) => (
          <li key={item.variant_id + index} className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-page-gray">
              {item.thumbnail_url ? (
                <img
                  className="h-full w-full object-contain p-2"
                  src={getFileUrl(item.thumbnail_url)!}
                  alt={item.name}
                />
              ) : (
                <span className="text-xs text-gray-400">AgriFood</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium">{item.name}</p>
              <p className="mt-1 text-sm text-gray-500">
                {item.variant_name} · {item.quantity.toLocaleString('vi-VN')} {item.unit}
              </p>
            </div>
            <span className="shrink-0 text-sm font-semibold">{formatPrice(item.line_total)}</span>
          </li>
        ))}
      </ul>
      {order.items.length > 3 && (
        <p className="mt-4 text-sm text-gray-500">Và {order.items.length - 3} sản phẩm khác</p>
      )}
      <div className="mt-5 flex gap-2 rounded-xl bg-page-gray p-3 text-sm text-gray-600">
        <EnvironmentOutlined className="mt-1 shrink-0 text-primary" />
        <p>
          <span className="font-medium text-gray-800">
            {order.shipping_address.recipient_name} · {order.shipping_address.phone}
          </span>
          <br />
          {order.shipping_address.address_line}
        </p>
      </div>
      <div className="mt-5 flex flex-wrap items-end justify-between gap-4 border-t border-gray-100 pt-5">
        <div>
          <p className="text-xs text-gray-500">
            {PAYMENT_METHODS[order.payment_method]} · {PAYMENT_STATUSES[order.payment_status]}
          </p>
          <p className="mt-2 text-sm text-gray-500">
            Tổng cộng <span className="ml-2 text-xl font-bold text-primary">{formatPrice(order.total)}</span>
          </p>
        </div>
        <Link to={getOrderResultPath(order.checkout_code)}>
          <Button type="primary" icon={<RightOutlined />} iconPlacement="end">
            Xem chi tiết
          </Button>
        </Link>
      </div>
    </article>
  );
};

export default OrderCard;
