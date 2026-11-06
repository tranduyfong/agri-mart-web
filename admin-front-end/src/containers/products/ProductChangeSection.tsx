// Danh sách và chi tiết đề nghị thêm/sửa/nhập sản phẩm; vai trò quyết định được xem hay duyệt.
import { useCallback, useState } from 'react';
import { Alert, App, Button, Drawer, Input, Select, Table, Tag } from 'antd';
import PageHeader from '../../components/PageHeader';
import Panel from '../../components/Panel';
import LoadingCard from '../../components/LoadingCard';
import ProductChangeDetails from '../../components/ProductChangeDetails';
import useData from '../../hooks/useData';
import service from '../../services/productChangeService';
import { CHANGE_COLORS, CHANGE_STATUSES, CHANGE_TYPES, type ChangeStatus } from '../../types/productChange';
import { getErrorMessage } from '../../utils/errorMessage';
import { formatDate } from '../../utils/format';

const Detail = ({ id, canReview, onDone }: { id: string; canReview: boolean; onDone: () => void }) => {
  const load = useCallback(() => service.getChange(id), [id]);
  const { data, error, loading, reload } = useData(load, 10000);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const { message } = App.useApp();
  // Gửi quyết định duyệt/từ chối và ghi chú; dữ liệu thật chỉ đổi khi backend áp dụng thành công.
  const review = async (status: Exclude<ChangeStatus, 'PENDING'>) => {
    if (busy) return;
    if (status === 'REJECTED' && !note.trim()) {
      setReviewError('Vui lòng nhập lý do từ chối.');
      return;
    }
    setBusy(true);
    setReviewError('');
    try {
      await service.review(id, status, note);
      message.success(status === 'APPROVED' ? 'Đã duyệt và áp dụng thay đổi' : 'Đã từ chối yêu cầu');
      onDone();
    } catch (reason) {
      setReviewError(getErrorMessage(reason));
    } finally {
      setBusy(false);
    }
  };
  if (loading || error || !data) return <LoadingCard error={error} onRetry={reload} />;
  return (
    <div className="space-y-5">
      <h2 className="text-xl font-semibold">{data.title}</h2>
      <ProductChangeDetails change={data} />
      {canReview && data.status === 'PENDING' && (
        <Panel title="Xét duyệt">
          <Alert
            className="mb-4"
            type="info"
            showIcon
            title="Duyệt sẽ áp dụng thay đổi vào sản phẩm và kho. Từ chối giữ nguyên dữ liệu hiện tại."
          />
          <label className="mb-2 block text-sm font-medium" htmlFor="review-note">
            Ghi chú / lý do từ chối
          </label>
          <Input.TextArea
            id="review-note"
            rows={3}
            maxLength={1000}
            value={note}
            disabled={busy}
            onChange={(event) => setNote(event.target.value)}
          />
          {reviewError && <Alert className="mt-4" type="error" showIcon title={reviewError} />}
          <div className="mt-4 flex flex-wrap gap-3">
            <Button type="primary" loading={busy} onClick={() => review('APPROVED')}>
              Duyệt thay đổi
            </Button>
            <Button danger disabled={busy} onClick={() => review('REJECTED')}>
              Từ chối
            </Button>
          </div>
        </Panel>
      )}
    </div>
  );
};

const ProductChangeSection = ({ canReview = false }: { canReview?: boolean }) => {
  const [query, setQuery] = useState({ status: canReview ? 'PENDING' : '', type: '', pageNumber: 0, pageSize: 10 });
  const [selected, setSelected] = useState<string>();
  const load = useCallback(() => service.getChanges(query), [query]);
  const { data, loading, error, reload } = useData(load, 10000);
  return (
    <>
      <PageHeader
        title={canReview ? 'Duyệt thay đổi sản phẩm' : 'Yêu cầu sản phẩm của tôi'}
        description="Thêm, sửa sản phẩm và nhập kho cần quản trị viên duyệt trước khi áp dụng."
      />
      <div className="mb-5 flex flex-wrap gap-3">
        <Select
          className="w-48"
          value={query.status}
          options={[
            { value: '', label: 'Tất cả trạng thái' },
            ...Object.entries(CHANGE_STATUSES).map(([value, label]) => ({ value, label })),
          ]}
          onChange={(status) => setQuery({ ...query, status, pageNumber: 0 })}
        />
        <Select
          className="w-48"
          value={query.type}
          options={[
            { value: '', label: 'Tất cả thao tác' },
            ...Object.entries(CHANGE_TYPES).map(([value, label]) => ({ value, label })),
          ]}
          onChange={(type) => setQuery({ ...query, type, pageNumber: 0 })}
        />
        <Button onClick={reload}>Tải lại</Button>
      </div>
      {error && <Alert className="mb-4" type="error" showIcon title={error} />}
      <Panel>
        <Table
          rowKey="_id"
          loading={loading}
          dataSource={data?.data || []}
          scroll={{ x: 850 }}
          pagination={{
            current: query.pageNumber + 1,
            pageSize: 10,
            total: data?.totalElements || 0,
            showSizeChanger: false,
            onChange: (page) => setQuery({ ...query, pageNumber: page - 1 }),
          }}
          columns={[
            { title: 'Nội dung', dataIndex: 'title' },
            { title: 'Thao tác', dataIndex: 'type', render: (type: keyof typeof CHANGE_TYPES) => CHANGE_TYPES[type] },
            { title: 'Người gửi', render: (_, row) => row.requested_by?.full_name || 'Tài khoản đã xóa' },
            { title: 'Ngày gửi', dataIndex: 'created_at', render: formatDate },
            {
              title: 'Trạng thái',
              render: (_, row) => <Tag color={CHANGE_COLORS[row.status]}>{CHANGE_STATUSES[row.status]}</Tag>,
            },
            {
              title: 'Chi tiết',
              render: (_, row) => (
                <Button type="link" onClick={() => setSelected(row._id)}>
                  {canReview && row.status === 'PENDING' ? 'Xét duyệt' : 'Xem chi tiết'}
                </Button>
              ),
            },
          ]}
        />
      </Panel>
      <Drawer
        title={canReview ? 'Xét duyệt sản phẩm' : 'Chi tiết yêu cầu'}
        open={!!selected}
        onClose={() => setSelected(undefined)}
        size="large"
        styles={{ wrapper: { width: 'min(1200px, 100vw)' } }}
      >
        {selected && (
          <Detail
            key={selected}
            id={selected}
            canReview={canReview}
            onDone={() => {
              setSelected(undefined);
              reload();
            }}
          />
        )}
      </Drawer>
    </>
  );
};
export default ProductChangeSection;
