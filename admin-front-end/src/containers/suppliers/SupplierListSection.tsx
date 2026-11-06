import { useCallback, useState } from 'react';
import { Button, Drawer, Input, Modal, Space, Table } from 'antd';
import PageHeader from '../../components/PageHeader';
import Panel from '../../components/Panel';
import LoadingCard from '../../components/LoadingCard';
import useData from '../../hooks/useData';
import supplierService from '../../services/supplierService';
import { formatPrice } from '../../utils/format';
import { tablePagination } from '../../utils/tablePagination';
import type { Supplier } from '../../types/supplier';
import SupplierForm from './SupplierForm';
import SupplierDetailSection from './SupplierDetailSection';

const SupplierListSection = () => {
  const [query, setQuery] = useState({ keyword: '', pageNumber: 0, pageSize: 10 });
  const [editing, setEditing] = useState<Supplier | null>(null), [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Supplier | null>(null);
  const load = useCallback(() => supplierService.getSuppliers(query), [query]);
  const { data, error, reload } = useData(load);
  return <>
    <PageHeader title="Quản lý nhà cung cấp" description="Thông tin liên hệ và giá trị hàng đã nhập từ từng nhà cung cấp."
      actions={<Button type="primary" onClick={() => { setEditing(null); setOpen(true); }}>+ Thêm nhà cung cấp</Button>} />
    <Input.Search className="mb-6 w-full! sm:w-96!" placeholder="Tìm mã, tên hoặc số điện thoại" allowClear
      onSearch={keyword => setQuery({ ...query, keyword, pageNumber: 0 })} />
    {!data ? <LoadingCard error={error} onRetry={reload} /> : <Panel title="Danh sách nhà cung cấp">
      <Table rowKey="id" dataSource={data.data} scroll={{ x: 900 }}
        pagination={tablePagination(query.pageNumber, data.totalElements, pageNumber => setQuery({ ...query, pageNumber }))} columns={[
          { title: 'Mã', dataIndex: 'code' }, { title: 'Tên nhà cung cấp', dataIndex: 'name' },
          { title: 'Điện thoại', dataIndex: 'phone', render: value => value || '—' },
          { title: 'Phiếu nhập', dataIndex: 'receipt_count' }, { title: 'Giá trị nhập', dataIndex: 'total_amount', render: formatPrice },
          { title: 'Thao tác', render: (_, supplier) => <Space>
            <Button type="link" onClick={() => setSelected(supplier)}>Chi tiết</Button>
            <Button type="link" onClick={() => { setEditing(supplier); setOpen(true); }}>Chỉnh sửa</Button>
          </Space> },
        ]} />
    </Panel>}
    <Modal open={open} title={editing ? 'Chỉnh sửa nhà cung cấp' : 'Thêm nhà cung cấp'} footer={null} destroyOnHidden onCancel={() => setOpen(false)}>
      {open && <SupplierForm key={editing?.id || 'new'} supplier={editing} onSaved={() => { setOpen(false); reload(); }} />}
    </Modal>
    <Drawer open={!!selected} title={selected?.name} onClose={() => setSelected(null)} size="large" destroyOnHidden>
      {selected && <SupplierDetailSection key={selected.id} id={selected.id} />}
    </Drawer>
  </>;
};
export default SupplierListSection;
