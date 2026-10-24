import { useState } from 'react';
import { App, Button, Input } from 'antd';
import { CheckOutlined } from '@ant-design/icons';
import useAuth from '../hooks/useAuth';
import orderService from '../services/orderService';
import { getErrorMessage } from '../utils/errorMessage';
import type { StaffOrder } from '../types/staff';

const OrderApprovalButton = ({ order, onApproved }: { order: StaffOrder; onApproved?: () => void }) => {
  const { hasPermission } = useAuth();
  const { modal, message } = App.useApp();
  const [busy, setBusy] = useState(false);

  if (order.status !== 'PENDING' || !hasPermission('ORDER_MANAGE')) return null;

  const approve = () => {
    let note = '';
    modal.confirm({
      title: 'Duyệt đơn ' + order.code + '?',
      okText: 'Xác nhận duyệt đơn',
      cancelText: 'Quay lại',
      content: (
        <div className="space-y-3">
          <p>
            Đã gọi {order.customer_name} · {order.phone} và khách đồng ý tiếp tục đơn hàng?
          </p>
          {order.payment_method !== 'COD' && <p>Sau khi duyệt, khách mới được tiếp tục thanh toán online.</p>}
          <Input.TextArea
            placeholder="Ghi chú xác nhận (không bắt buộc)"
            maxLength={1000}
            onChange={(event) => {
              note = event.target.value;
            }}
          />
        </div>
      ),
      onOk: async () => {
        setBusy(true);
        try {
          await orderService.updateStatus(order.id, {
            status: 'CONFIRMED',
            expected_status: 'PENDING',
            note,
          });
          message.success(
            order.payment_method === 'COD'
              ? 'Đã duyệt đơn, có thể chuẩn bị hàng.'
              : 'Đã duyệt đơn, khách có thể tiếp tục thanh toán.',
          );
          onApproved?.();
        } catch (error) {
          message.error(getErrorMessage(error));
          throw error;
        } finally {
          setBusy(false);
        }
      },
    });
  };

  return (
    <Button type="primary" icon={<CheckOutlined />} loading={busy} onClick={approve}>
      Duyệt đơn
    </Button>
  );
};

export default OrderApprovalButton;
