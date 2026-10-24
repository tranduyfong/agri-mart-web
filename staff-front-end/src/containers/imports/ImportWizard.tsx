import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, App, Button, Form, Input, Select, Steps, Table, Tag, Upload } from 'antd';
import { InboxOutlined, DownloadOutlined } from '@ant-design/icons';
import useAuth from '../../hooks/useAuth';
import useData from '../../hooks/useData';
import staffService from '../../services/staffService';
import inventoryService from '../../services/inventoryService';
import Panel from '../../components/Panel';
import PageHeader from '../../components/PageHeader';
import StatCard from '../../components/StatCard';
import LoadingCard from '../../components/LoadingCard';
import { readImportFile, downloadImportTemplate } from '../../utils/importFile';
import { getErrorMessage } from '../../utils/errorMessage';
import { formatDate, formatPrice } from '../../utils/format';
import type { ImportPreview, ImportRow, Receipt } from '../../types/staff';

interface Draft {
  rows: ImportRow[];
  fileName: string;
  importKey: string;
  supplierId?: string;
  note: string;
}
const ImportWizard = () => {
  const { user } = useAuth();
  const { data: lookups, error: lookupError, loading: loadingLookups, reload } = useData(staffService.getLookups);
  const storageKey = 'staff.import.' + user?.id;
  const [draft, setDraft] = useState<Draft>(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(storageKey) || 'null');
      if (Array.isArray(saved?.rows)) return saved;
    } catch {
      /* Bỏ bản nháp không hợp lệ. */
    }
    return { rows: [], fileName: '', importKey: crypto.randomUUID(), note: '' };
  });
  const [step, setStep] = useState(0),
    [preview, setPreview] = useState<ImportPreview | null>(null),
    [receipt, setReceipt] = useState<Receipt | null>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const busyRef = useRef(false);
  const { message } = App.useApp();
  const updateDraft = (value: Draft) => {
    setDraft(value);
    sessionStorage.setItem(storageKey, JSON.stringify(value));
  };
  const loadFile = async (file: File) => {
    if (busyRef.current) return false;
    busyRef.current = true;
    setBusy(true);
    setError('');
    try {
      const rows = await readImportFile(file);
      updateDraft({ ...draft, rows, fileName: file.name, importKey: crypto.randomUUID() });
      setPreview(null);
    } catch (reason) {
      setError(getErrorMessage(reason));
    } finally {
      setBusy(false);
      busyRef.current = false;
    }
    return false;
  };
  const check = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError('');
    try {
      setPreview(await inventoryService.previewImport(draft.rows));
      setStep(1);
    } catch (reason) {
      setError(getErrorMessage(reason));
    } finally {
      setBusy(false);
      busyRef.current = false;
    }
  };
  const confirm = async () => {
    if (busyRef.current || !preview || preview.error_rows) return;
    busyRef.current = true;
    setBusy(true);
    setError('');
    try {
      const result = await inventoryService.confirmImport({
        rows: draft.rows,
        supplier_id: draft.supplierId,
        note: draft.note,
        source_file: draft.fileName,
        import_key: draft.importKey,
      });
      setReceipt(result);
      setStep(2);
      sessionStorage.removeItem(storageKey);
      message.success('Đã nhập kho');
    } catch (reason) {
      setError(getErrorMessage(reason));
    } finally {
      setBusy(false);
      busyRef.current = false;
    }
  };
  if (loadingLookups || lookupError || !lookups) return <LoadingCard error={lookupError} onRetry={reload} />;
  return (
    <>
      <PageHeader
        title={
          step === 2 ? 'Đã ghi nhận phiếu nhập' : step === 1 ? 'Kiểm tra dữ liệu nhập hàng' : 'Nhập hàng từ Excel / CSV'
        }
        description={draft.fileName || 'Nhập hàng vào kho chung của cửa hàng'}
      />
      <Steps
        className="mb-7"
        current={step}
        items={[{ title: 'Chọn file' }, { title: 'Kiểm tra dữ liệu' }, { title: 'Ghi nhận nhập kho' }]}
      />
      <div className="space-y-6">
        {step === 0 && (
          <>
            <Panel title="Thông tin phiếu nhập">
              <Form layout="vertical">
                <div className="grid gap-x-6 sm:grid-cols-2">
                  <Form.Item label="Nhà cung cấp">
                    <Select
                      allowClear
                      value={draft.supplierId}
                      disabled={busy}
                      placeholder="Không chọn nhà cung cấp"
                      options={lookups.suppliers.map((item) => ({
                        value: item.id,
                        label: item.code + ' · ' + item.name,
                      }))}
                      onChange={(supplierId) => updateDraft({ ...draft, supplierId })}
                    />
                  </Form.Item>
                </div>
                <Form.Item className="mb-0!" label="Ghi chú phiếu nhập">
                  <Input.TextArea
                    rows={2}
                    maxLength={1000}
                    value={draft.note}
                    disabled={busy}
                    onChange={(event) => updateDraft({ ...draft, note: event.target.value })}
                  />
                </Form.Item>
              </Form>
            </Panel>
            <Panel title="File hàng nhập">
              <Upload.Dragger accept=".xlsx,.csv" showUploadList={false} disabled={busy} beforeUpload={loadFile}>
                <p className="mb-3 text-4xl text-primary">
                  <InboxOutlined />
                </p>
                <h3 className="text-lg font-semibold text-primary">Kéo thả file Excel hoặc CSV vào đây</h3>
                <p className="my-3 text-sm text-muted">File .xlsx hoặc .csv · Tối đa 5MB, 1.000 dòng</p>
                <Button disabled={busy}>Chọn file</Button>
                {draft.fileName && (
                  <p className="mt-3 text-sm text-primary">
                    Đã chọn: {draft.fileName} · {draft.rows.length} dòng
                  </p>
                )}
              </Upload.Dragger>
              <p className="mt-4 text-sm text-muted">
                Giá dùng số nguyên không có dấu phân cách hàng nghìn. Ngày dùng YYYY-MM-DD hoặc DD/MM/YYYY. SKU mới cần
                thông tin danh mục, tên, quy cách và giá bán.
              </p>
            </Panel>
            <Alert
              type="warning"
              showIcon
              title="Kiểm tra giá nhập, số lượng và hạn sử dụng. Hàng đã hết hạn không được nhập."
            />
            <div className="flex flex-wrap justify-end gap-3">
              <Button
                icon={<DownloadOutlined />}
                onClick={() => downloadImportTemplate(lookups.categories[0]?.slug || '')}
              >
                Tải file mẫu
              </Button>
              <Button type="primary" loading={busy} disabled={!draft.rows.length} onClick={check}>
                Kiểm tra dữ liệu
              </Button>
            </div>
          </>
        )}
        {step === 1 && preview && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Tổng số dòng" value={preview.total_rows} hint="Đã đọc từ file" />
              <StatCard label="Hợp lệ" value={preview.valid_rows} hint="Sẵn sàng nhập" />
              <StatCard label="Cần sửa" value={preview.error_rows} hint="Sửa file rồi tải lại" />
              <StatCard label="SKU mới" value={preview.new_skus} hint="Sản phẩm mới được tạo nháp" />
            </div>
            <Panel title="Kết quả kiểm tra">
              <Table
                rowKey="row_number"
                dataSource={preview.rows}
                scroll={{ x: 850 }}
                pagination={{ pageSize: 10, showSizeChanger: false }}
                columns={[
                  { title: 'Dòng', dataIndex: 'row_number' },
                  {
                    title: 'SKU / Sản phẩm',
                    render: (_, row) => (
                      <div>
                        {row.sku}
                        <p className="mt-1 text-sm text-muted">{row.name}</p>
                      </div>
                    ),
                  },
                  {
                    title: 'Số lượng / ĐVT',
                    render: (_, row) =>
                      `${Number.isFinite(row.quantity) ? row.quantity.toLocaleString('vi-VN') : '—'} ${row.unit}`,
                  },
                  {
                    title: 'Giá nhập',
                    dataIndex: 'unit_cost',
                    render: (value: number) => (Number.isFinite(value) ? formatPrice(value) : '—'),
                  },
                  {
                    title: 'Kết quả',
                    render: (_, row) =>
                      row.errors.length ? (
                        <ul className="space-y-1 text-xs text-red-500">
                          {row.errors.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      ) : (
                        <Tag color={row.is_new ? 'gold' : 'green'}>{row.is_new ? 'Mới · tạo nháp' : 'Hợp lệ'}</Tag>
                      ),
                  },
                ]}
              />
            </Panel>
            <Alert
              showIcon
              type={preview.error_rows ? 'error' : 'success'}
              title={
                preview.error_rows
                  ? `Còn ${preview.error_rows} dòng lỗi. Chưa có dữ liệu nào được nhập kho.`
                  : 'Tất cả dòng đã hợp lệ. Bạn có thể xác nhận nhập kho.'
              }
            />
            <div className="flex flex-wrap gap-3">
              <Button disabled={busy} onClick={() => setStep(0)}>
                Chọn lại file / sửa thông tin
              </Button>
              <Button type="primary" disabled={!!preview.error_rows} loading={busy} onClick={confirm}>
                Xác nhận nhập kho
              </Button>
            </div>
          </>
        )}
        {step === 2 && receipt && (
          <>
            <Alert type="success" showIcon title={`Đã nhập ${receipt.items_count} dòng. Tồn kho đã được cập nhật.`} />
            <Panel title="Thông tin ghi nhận">
              <dl className="grid gap-6 text-sm sm:grid-cols-2">
                {[
                  ['Mã phiếu nhập', receipt.id],
                  ['Người nhập', receipt.created_by_name],
                  ['Ngày nhập', formatDate(receipt.created_at)],
                  ['Nhà cung cấp', receipt.supplier_name],
                  ['File nguồn', receipt.source_file],
                  ['Tổng giá trị nhập', formatPrice(receipt.total_amount)],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="mb-2 text-muted">{label}</dt>
                    <dd className="break-all font-medium">{value}</dd>
                  </div>
                ))}
              </dl>
            </Panel>
            {!!receipt.draft_products.length && (
              <Panel title="Sản phẩm cần hoàn thiện">
                <Table
                  rowKey="id"
                  pagination={false}
                  dataSource={receipt.draft_products}
                  columns={[
                    { title: 'Mã sản phẩm', dataIndex: 'code' },
                    { title: 'Tên sản phẩm', dataIndex: 'name' },
                    {
                      title: 'Thao tác',
                      render: (_, item) => <Link to={'/products/' + item.id + '/edit'}>Bổ sung thông tin / ảnh</Link>,
                    },
                  ]}
                />
              </Panel>
            )}
            <div className="flex flex-wrap gap-3">
              <Link to="/inventory">
                <Button type="primary">Xem tồn kho</Button>
              </Link>
              <Button
                onClick={() => {
                  updateDraft({ rows: [], fileName: '', importKey: crypto.randomUUID(), note: '' });
                  setStep(0);
                  setReceipt(null);
                }}
              >
                Nhập file khác
              </Button>
            </div>
          </>
        )}
        {error && <Alert type="error" showIcon title={error} />}
      </div>
    </>
  );
};
export default ImportWizard;
