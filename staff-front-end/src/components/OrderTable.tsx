import { Table } from 'antd';
import type { TableProps } from 'antd';
import { Link } from 'react-router-dom';
import StatusTag from './StatusTag';
import OrderApprovalButton from './OrderApprovalButton';
import { formatPrice } from '../utils/format';
import type { StaffOrder } from '../types/staff';
const OrderTable = ({
  orders,
  loading,
  pagination = false,
  onOrderApproved,
}: {
  orders: StaffOrder[];
  loading?: boolean;
  pagination?: TableProps<StaffOrder>['pagination'];
  onOrderApproved?: () => void;
}) => (
  <Table
    rowKey="id"
    loading={loading}
    dataSource={orders}
    scroll={{ x: 800 }}
    pagination={pagination}
    columns={[
      {
        title: 'Mã đơn / Thời gian',
        render: (_, order) => (
          <div>
            <Link className="font-medium" to={'/orders/' + order.id}>
              {order.code}
            </Link>
            <p className="mt-1 text-xs text-muted">{new Date(order.created_at).toLocaleString('vi-VN')}</p>
          </div>
        ),
      },
      {
        title: 'Khách hàng',
        render: (_, order) => (
          <div>
            {order.customer_name}
            <p className="mt-1 text-xs text-muted">{order.phone}</p>
          </div>
        ),
      },
      { title: 'Tổng tiền', dataIndex: 'final_amount', render: formatPrice },
      {
        title: 'Thanh toán',
        render: (_, order) => (
          <div className="space-y-1">
            <p className="text-xs text-muted">{order.payment_method}</p>
            <StatusTag status={order.payment_status} />
          </div>
        ),
      },
      { title: 'Trạng thái', dataIndex: 'status', render: (status: string) => <StatusTag status={status} /> },
      {
        title: 'Thao tác',
        render: (_, order) => (
          <div className="flex flex-wrap gap-2">
            <OrderApprovalButton order={order} onApproved={onOrderApproved} />
            <Link to={'/orders/' + order.id}>Chi tiết</Link>
          </div>
        ),
      },
    ]}
  />
);
export default OrderTable;
