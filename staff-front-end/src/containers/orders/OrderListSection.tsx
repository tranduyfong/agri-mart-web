import { useCallback, useState } from 'react';
import { Alert, Badge, Button, Input, Select } from 'antd';
import { useLocation, useSearchParams } from 'react-router-dom';
import PageHeader from '../../components/PageHeader';
import Panel from '../../components/Panel';
import OrderTable from '../../components/OrderTable';
import useAuth from '../../hooks/useAuth';
import useData from '../../hooks/useData';
import orderService from '../../services/orderService';
import { ORDER_STATUS_OPTIONS } from '../../utils/constants';
import { tablePagination } from '../../utils/tablePagination';
const OrderListSection = () => {
  const { ordersRevision, pendingCount, ordersConnected } = useAuth();
  const [, setParams] = useSearchParams();
  const { search } = useLocation();
  const status = new URLSearchParams(search).get('status') || '';
  const [filters, setQuery] = useState({ keyword: '', pageNumber: 0, pageSize: 10 });
  const query = { ...filters, status };
  const load = useCallback(
    () =>
      orderService.getOrders({
        ...filters,
        status: new URLSearchParams(search).get('status') || '',
      }),
    [filters, search],
  );
  const { data, loading, error, reload } = useData(load, 30000, ordersRevision);
  const changeFilter = (value: string) => {
    setParams(value ? { status: value } : {});
    setQuery((previous) => ({ ...previous, pageNumber: 0 }));
  };
  return (
    <>
      <PageHeader
        title="Quản lý đơn hàng"
        description="Tiếp nhận, gọi điện xác nhận và cập nhật tiến độ giao hàng."
        actions={<Button onClick={reload}>Cập nhật</Button>}
      />
      <div className="mb-6 flex flex-wrap gap-3">
        <Button type={status === 'PENDING' ? 'primary' : 'default'} onClick={() => changeFilter('PENDING')}>
          Chờ duyệt <Badge count={pendingCount} />
        </Button>
        <Input.Search
          className="w-full! sm:w-80!"
          placeholder="Tìm mã đơn, khách hoặc số điện thoại"
          allowClear
          onSearch={(keyword) => setQuery({ ...filters, keyword, pageNumber: 0 })}
        />
        <Select
          className="w-52"
          allowClear
          placeholder="Tất cả trạng thái"
          value={query.status || undefined}
          options={ORDER_STATUS_OPTIONS}
          onChange={(status) => changeFilter(status || '')}
        />
      </div>
      <p className="mb-4 text-xs text-muted">
        <Badge status={ordersConnected ? 'success' : 'warning'} />{' '}
        {ordersConnected ? 'Đơn hàng đang cập nhật trực tiếp' : 'Đang kết nối lại, đơn hàng vẫn tự động cập nhật'}
      </p>
      {error && <Alert className="mb-5" type="error" title={error} />}
      <Panel title="Danh sách đơn hàng">
        <OrderTable
          orders={data?.data || []}
          loading={loading}
          onOrderApproved={reload}
          pagination={tablePagination(query.pageNumber, data?.totalElements || 0, (pageNumber) =>
            setQuery({ ...filters, pageNumber }),
          )}
        />
      </Panel>
    </>
  );
};
export default OrderListSection;
