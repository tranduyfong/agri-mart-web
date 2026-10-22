import { Steps, Tag } from 'antd';
import { CheckCircleOutlined, InboxOutlined, ShoppingOutlined, TruckOutlined } from '@ant-design/icons';
import { ORDER_STATUSES } from '../utils/orderStatus';
import type { CheckoutOrder } from '../types/order';

const STAGES = [
  { status: 'PENDING', title: 'Đặt hàng', icon: <ShoppingOutlined /> },
  { status: 'CONFIRMED', title: 'Chuẩn bị', icon: <InboxOutlined /> },
  { status: 'SHIPPING', title: 'Đang giao', icon: <TruckOutlined /> },
  { status: 'COMPLETED', title: 'Đã nhận', icon: <CheckCircleOutlined /> },
];

const DeliveryProgress = ({ status }: { status: CheckoutOrder['status'] }) => {
  if (status === 'CANCELLED') return <Tag color="red">{ORDER_STATUSES.CANCELLED.label}</Tag>;
  return (
    <Steps
      aria-label={`Tiến độ: ${ORDER_STATUSES[status].label}`}
      size="small"
      responsive={false}
      titlePlacement="vertical"
      current={STAGES.findIndex((stage) => stage.status === status)}
      status={status === 'COMPLETED' ? 'finish' : 'process'}
      items={STAGES.map((stage) => ({
        title: <span className="text-xs sm:text-sm">{stage.title}</span>,
        icon: stage.icon,
      }))}
    />
  );
};

export default DeliveryProgress;
