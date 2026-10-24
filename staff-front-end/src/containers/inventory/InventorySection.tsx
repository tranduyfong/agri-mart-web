import { useCallback, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Alert, Button, Input, Select, Table } from 'antd';
import PageHeader from '../../components/PageHeader';
import Panel from '../../components/Panel';
import StatusTag from '../../components/StatusTag';
import useData from '../../hooks/useData';
import inventoryService from '../../services/inventoryService';
import { tablePagination } from '../../utils/tablePagination';
import { formatDate } from '../../utils/format';
const InventorySection = () => {
  const [params] = useSearchParams();
  const [query, setQuery] = useState({ keyword: '', status: params.get('status') || '', pageNumber: 0, pageSize: 10 });
  const load = useCallback(() => inventoryService.getInventory(query), [query]);
  const { data, loading, error, reload } = useData(load);
  return (
    <>
      <PageHeader
        title="Tồn kho & hạn sử dụng"
        description="Theo dõi số lượng theo từng lô và ưu tiên xử lý hàng sắp hết hạn."
      />
      <div className="mb-6 flex flex-wrap gap-3">
        <Input.Search
          className="w-full! sm:w-80!"
          allowClear
          placeholder="Tìm sản phẩm, SKU hoặc mã lô"
          onSearch={(keyword) => setQuery({ ...query, keyword, pageNumber: 0 })}
        />
        <Select
          className="w-52"
          allowClear
          placeholder="Tất cả hạn dùng"
          value={query.status || undefined}
          options={[
            { value: 'VALID', label: 'Còn hạn' },
            { value: 'EXPIRING', label: 'Sắp hết hạn (3 ngày)' },
            { value: 'EXPIRED', label: 'Đã hết hạn' },
          ]}
          onChange={(status) => setQuery({ ...query, status: status || '', pageNumber: 0 })}
        />
        <Button onClick={reload}>Cập nhật</Button>
      </div>
      {error && <Alert className="mb-5" type="error" title={error} />}
      <Panel title="Chi tiết theo lô">
        <Table
          rowKey="id"
          loading={loading}
          dataSource={data?.data || []}
          scroll={{ x: 900 }}
          pagination={tablePagination(query.pageNumber, data?.totalElements || 0, (pageNumber) =>
            setQuery({ ...query, pageNumber }),
          )}
          columns={[
            {
              title: 'Sản phẩm / Mã lô',
              render: (_, item) => (
                <div className="font-medium">
                  {item.name}
                  <p className="mt-1 text-xs font-normal text-muted">
                    {item.sku} · {item.batch_code}
                  </p>
                </div>
              ),
            },
            {
              title: 'Tồn thực',
              render: (_, item) => `${item.physical_quantity.toLocaleString('vi-VN')} ${item.unit}`,
            },
            {
              title: 'Đã phân bổ',
              dataIndex: 'reserved_quantity',
              render: (value: number) => value.toLocaleString('vi-VN'),
            },
            {
              title: 'Có thể bán',
              dataIndex: 'available_quantity',
              render: (value: number) => <span className="font-medium">{value.toLocaleString('vi-VN')}</span>,
            },
            { title: 'Hạn sử dụng', dataIndex: 'expiry_date', render: formatDate },
            { title: 'Tình trạng', dataIndex: 'status', render: (status: string) => <StatusTag status={status} /> },
          ]}
        />
      </Panel>
      <Alert
        className="mt-6"
        type="success"
        showIcon
        title="Hàng hết hạn không được tính vào số lượng có thể bán. Lô gần hết hạn được ưu tiên xuất trước."
      />
    </>
  );
};
export default InventorySection;
