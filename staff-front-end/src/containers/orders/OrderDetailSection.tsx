import { useCallback, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Alert, App, Button, Input, Steps, Table, Timeline } from 'antd';
import PageHeader from '../../components/PageHeader';
import Panel from '../../components/Panel';
import StatusTag from '../../components/StatusTag';
import LoadingCard from '../../components/LoadingCard';
import OrderApprovalButton from '../../components/OrderApprovalButton';
import useAuth from '../../hooks/useAuth';
import useData from '../../hooks/useData';
import orderService from '../../services/orderService';
import { formatPrice } from '../../utils/format';
import { getErrorMessage } from '../../utils/errorMessage';
const STAGES = ['PENDING', 'CONFIRMED', 'SHIPPING', 'COMPLETED'];
const OrderDetailSection = () => {
  const { id = '' } = useParams();
  const { ordersRevision } = useAuth();
  const { modal, message } = App.useApp();
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => orderService.getOrder(id), [id]);
  const { data: order, loading, error, reload } = useData(load, 30000, ordersRevision);
  const changeStatus = (status: string, title: string) => {
    if (!order) return;
    let note = '';
    modal.confirm({
      title,
      okText: 'Xác nhận',
      cancelText: 'Quay lại',
      okButtonProps: { danger: status === 'CANCELLED' },
      content: (
        <div className="space-y-3">
          {status === 'CANCELLED' && (
            <p>
              Số lượng sẽ được hoàn lại đúng lô đã xuất.{' '}
              {order.payment_status === 'PAID' && 'Đơn đã thanh toán cần được cửa hàng đối soát và hoàn tiền riêng.'}
            </p>
          )}
          <Input.TextArea
            placeholder="Ghi chú xử lý (không bắt buộc)"
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
          await orderService.updateStatus(id, { status, expected_status: order.status, note });
          message.success('Đã cập nhật đơn hàng');
          reload();
        } catch (reason) {
          message.error(getErrorMessage(reason));
          throw reason;
        } finally {
          setBusy(false);
        }
      },
    });
  };
  return (
    <>
      <PageHeader
        title={order ? 'Đơn hàng ' + order.code : 'Chi tiết đơn hàng'}
        description={order ? 'Tạo lúc ' + new Date(order.created_at).toLocaleString('vi-VN') : undefined}
        actions={
          <div className="flex flex-wrap gap-3">
            {order && <OrderApprovalButton order={order} onApproved={reload} />}
            <Link to="/orders">
              <Button>Quay lại danh sách</Button>
            </Link>
          </div>
        }
      />
      {loading || error || !order ? (
        <LoadingCard error={error} onRetry={reload} />
      ) : (
        <div className="space-y-6">
          {order.status === 'CANCELLED' ? (
            <Alert
              showIcon
              type="warning"
              title="Đơn hàng đã hủy"
              description={
                order.payment_status === 'PAID'
                  ? 'Đơn đã ghi nhận thanh toán. Cửa hàng cần kiểm tra và xử lý hoàn tiền.'
                  : undefined
              }
            />
          ) : (
            <Steps
              current={STAGES.indexOf(order.status)}
              status={order.status === 'COMPLETED' ? 'finish' : 'process'}
              items={['Chờ xác nhận', 'Chuẩn bị hàng', 'Đang giao', 'Hoàn tất'].map((title) => ({ title }))}
            />
          )}
          <Panel title="Thông tin giao hàng">
            <dl className="grid gap-6 md:grid-cols-2">
              <div>
                <dt className="mb-2 text-sm text-muted">Người nhận</dt>
                <dd className="font-medium">
                  {order.shipping_address.recipient_name} · {order.shipping_address.phone}
                </dd>
              </div>
              <div>
                <dt className="mb-2 text-sm text-muted">Phương thức thanh toán</dt>
                <dd>
                  {order.payment_method} · <StatusTag status={order.payment_status} />
                </dd>
              </div>
              <div>
                <dt className="mb-2 text-sm text-muted">Địa chỉ</dt>
                <dd>{order.shipping_address.address_line}</dd>
              </div>
              <div>
                <dt className="mb-2 text-sm text-muted">Ghi chú</dt>
                <dd>{order.note || 'Không có ghi chú'}</dd>
              </div>
            </dl>
          </Panel>
          <Panel title="Sản phẩm đặt mua">
            <Table
              rowKey="_id"
              dataSource={order.items}
              pagination={false}
              scroll={{ x: 650 }}
              columns={[
                {
                  title: 'Sản phẩm',
                  render: (_, item) => (
                    <div className="font-medium">
                      {item.name}
                      <p className="mt-1 text-xs font-normal text-muted">{item.variant_name}</p>
                    </div>
                  ),
                },
                { title: 'Đơn giá', render: (_, item) => `${formatPrice(item.price)} / ${item.unit}` },
                { title: 'Số lượng', render: (_, item) => `${item.quantity.toLocaleString('vi-VN')} ${item.unit}` },
                {
                  title: 'Thành tiền',
                  dataIndex: 'line_total',
                  render: (value: number) => <span className="font-medium text-primary">{formatPrice(value)}</span>,
                },
              ]}
            />
          </Panel>
          <Panel title="Thanh toán & xử lý">
            <dl className="max-w-lg space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt>Tiền hàng</dt>
                <dd>{formatPrice(order.total_amount)}</dd>
              </div>
              {order.discount_amount - order.coupon_discount_amount > 0 && (
                <div className="flex justify-between gap-4">
                  <dt>Ưu đãi sản phẩm</dt>
                  <dd>−{formatPrice(order.discount_amount - order.coupon_discount_amount)}</dd>
                </div>
              )}
              <div className="flex justify-between gap-4">
                <dt>Phí giao hàng</dt>
                <dd>{formatPrice(order.shipping_fee)}</dd>
              </div>
              {order.coupon_code && (
                <div className="flex justify-between gap-4">
                  <dt className="break-all">Mã {order.coupon_code}</dt>
                  <dd>−{formatPrice(order.coupon_discount_amount)}</dd>
                </div>
              )}
              <div className="flex justify-between gap-4 border-t border-line pt-4 text-lg font-semibold text-primary">
                <dt>Tổng cộng</dt>
                <dd>{formatPrice(order.final_amount)}</dd>
              </div>
            </dl>
            <div className="mt-6 flex flex-wrap gap-3">
              {order.status === 'CONFIRMED' && (
                <Button
                  type="primary"
                  disabled={busy || (order.payment_method !== 'COD' && order.payment_status !== 'PAID')}
                  onClick={() => changeStatus('SHIPPING', 'Xác nhận đã bàn giao hàng cho vận chuyển?')}
                >
                  Bàn giao vận chuyển
                </Button>
              )}
              {order.status === 'SHIPPING' && (
                <Button
                  type="primary"
                  disabled={busy}
                  onClick={() =>
                    changeStatus(
                      'COMPLETED',
                      order.payment_method === 'COD'
                        ? 'Xác nhận đã giao hàng và thu đủ tiền COD?'
                        : 'Xác nhận đã giao hàng thành công?',
                    )
                  }
                >
                  Hoàn tất đơn hàng
                </Button>
              )}
              {['PENDING', 'CONFIRMED'].includes(order.status) && (
                <Button danger disabled={busy} onClick={() => changeStatus('CANCELLED', 'Hủy đơn hàng này?')}>
                  Hủy đơn
                </Button>
              )}
            </div>
            {order.payment_method !== 'COD' && order.payment_status !== 'PAID' && order.status !== 'CANCELLED' && (
              <Alert
                className="mt-5"
                type="info"
                showIcon
                title={
                  order.status === 'PENDING'
                    ? 'Gọi điện xác nhận với khách trước. Sau khi duyệt, khách mới được thanh toán VNPay.'
                    : 'Đã duyệt đơn, đang chờ khách thanh toán. Chỉ bàn giao vận chuyển sau khi hệ thống ghi nhận đã thanh toán.'
                }
              />
            )}
          </Panel>
          {!!order.status_history.length && (
            <Panel title="Lịch sử xử lý">
              <Timeline
                items={order.status_history.map((entry) => ({
                  content: (
                    <div>
                      <StatusTag status={entry.status} />
                      <p className="mt-2 text-sm text-muted">
                        {new Date(entry.changed_at).toLocaleString('vi-VN')} · {entry.staff_name}
                      </p>
                      {entry.note && <p className="mt-1 text-sm">{entry.note}</p>}
                    </div>
                  ),
                }))}
              />
            </Panel>
          )}
        </div>
      )}
    </>
  );
};
export default OrderDetailSection;
