import { useCallback, useState } from 'react';
import { Alert, Table } from 'antd';
import LoadingCard from '../../components/LoadingCard';
import MetricCard from '../../components/MetricCard';
import Panel from '../../components/Panel';
import useData from '../../hooks/useData';
import supplierService from '../../services/supplierService';
import { formatPrice } from '../../utils/format';
import { tablePagination } from '../../utils/tablePagination';

const SupplierDetailSection = ({ id }: { id: string }) => {
  const [pageNumber, setPageNumber] = useState(0);
  const load = useCallback(async () => {
    const [supplier, items] = await Promise.all([supplierService.getSupplier(id), supplierService.getItems(id, pageNumber)]);
    return { supplier, items };
  }, [id, pageNumber]);
  const { data, error, reload } = useData(load);
  if (!data) return <LoadingCard error={error} onRetry={reload} />;
  return <div className="space-y-5">
    <p className="text-muted">{data.supplier.code} · {data.supplier.phone || 'Chưa có số điện thoại'}</p>
    <div className="grid gap-4 sm:grid-cols-2">
      <MetricCard label="Phiếu nhập đã ghi nhận" value={data.supplier.receipt_count} hint="Không gồm phiếu chờ duyệt" />
      <MetricCard label="Tổng giá trị nhập" value={formatPrice(data.supplier.total_amount)} hint="Theo giá nhập trên chứng từ" />
    </div>
    <Alert type="info" showIcon title="Số lượng nhập theo đơn vị"
      description={data.supplier.units.length ? data.supplier.units.map(row => `${row.quantity.toLocaleString('vi-VN')} ${row.unit}`).join(' · ') : 'Chưa có hàng nhập từ nhà cung cấp này.'} />
    <Panel title={`Sản phẩm đã nhập · ${data.items.totalElements} SKU`}>
      <Table rowKey="id" dataSource={data.items.data} scroll={{ x: 650 }}
        pagination={tablePagination(pageNumber, data.items.totalElements, setPageNumber)} columns={[
          { title: 'SKU', dataIndex: 'sku' }, { title: 'Sản phẩm', dataIndex: 'name' },
          { title: 'Số lượng', render: (_, row) => `${row.quantity.toLocaleString('vi-VN')} ${row.unit}` },
          { title: 'Giá trị nhập', dataIndex: 'total_amount', render: formatPrice },
        ]} />
    </Panel>
    <p className="text-sm text-muted">Giá trị nhập phản ánh phiếu nhập đã ghi nhận. Hệ thống chưa theo dõi công nợ hoặc thanh toán nhà cung cấp.</p>
  </div>;
};
export default SupplierDetailSection;
