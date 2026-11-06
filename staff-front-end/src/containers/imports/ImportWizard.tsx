// Ba bước nhập hàng: đọc Excel/CSV, xem lỗi từng dòng và gửi phiếu/yêu cầu nhập bằng khóa chống trùng.
import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, App, Button, Form, Image, Input, Select, Steps, Table, Tag, Upload } from 'antd';
import { InboxOutlined, DownloadOutlined } from '@ant-design/icons';
import useAuth from '../../hooks/useAuth';
import useData from '../../hooks/useData';
import staffService from '../../services/staffService';
import inventoryService from '../../services/inventoryService';
import Panel from '../../components/Panel';
import PageHeader from '../../components/PageHeader';
import StatCard from '../../components/StatCard';
import LoadingCard from '../../components/LoadingCard';
import ImportRowEditor from './ImportRowEditor';
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
  const [pendingRequest, setPendingRequest] = useState<string | null>(null);
  const [editingRow, setEditingRow] = useState<number | null>(null);
  const [previewDirty, setPreviewDirty] = useState(false);
  const busyRef = useRef(false);
  const { message } = App.useApp();
  // Lưu lựa chọn và dữ liệu đang nhập để các bước của wizard dùng chung bản nháp.
  const updateDraft = (value: Draft) => {
    setDraft(value);
    sessionStorage.setItem(storageKey, JSON.stringify(value));
  };
  // Đọc Excel/CSV, chuẩn hóa cột và đưa các dòng vào trạng thái chờ kiểm tra.
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
  // Gửi từng dòng cho API xem trước để nhận lỗi và thống kê; chưa nhập hàng ở bước này.
  const check = async () => {
    if (busyRef.current) return;
    if (!draft.supplierId) {
      setError('Vui lòng chọn nhà cung cấp trước khi kiểm tra nhập hàng.');
      return;
    }
    busyRef.current = true;
    setBusy(true);
    setError('');
    try {
      setPreview(await inventoryService.previewImport(draft.rows));
      setPreviewDirty(false);
      setStep(1);
    } catch (reason) {
      setError(getErrorMessage(reason));
    } finally {
      setBusy(false);
      busyRef.current = false;
    }
  };
  const saveRow = async (row: ImportRow) => {
    if (editingRow === null || busyRef.current) return;
    const rows = draft.rows.map((item, index) => index === editingRow - 2 ? row : item);
    updateDraft({ ...draft, rows, importKey: crypto.randomUUID() });
    setPreviewDirty(true);
    setBusy(true);
    busyRef.current = true;
    setError('');
    try {
      setPreview(await inventoryService.previewImport(rows));
      setPreviewDirty(false);
      setEditingRow(null);
      message.success('Đã lưu dòng và kiểm tra lại toàn bộ dữ liệu');
    } catch (reason) {
      const text = getErrorMessage(reason);
      setError(text);
      message.error(text);
    } finally {
      setBusy(false);
      busyRef.current = false;
    }
  };
  // Dùng các dòng đã kiểm tra và khóa yêu cầu để ghi nhận/gửi duyệt một lần, tránh nhập lặp.
  const confirm = async () => {
    if (busyRef.current || !preview || preview.error_rows || previewDirty) return;
    if (!draft.supplierId) {
      setError('Vui lòng chọn nhà cung cấp trước khi gửi phiếu nhập.');
      return;
    }
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
      if ('request_id' in result) setPendingRequest(result.request_id);
      else setReceipt(result);
      setStep(2);
      sessionStorage.removeItem(storageKey);
      message.success('request_id' in result ? 'Đã gửi phiếu nhập chờ quản trị viên duyệt' : 'Đã nhập kho');
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
          step === 2
            ? pendingRequest
              ? 'Đã gửi phiếu nhập chờ duyệt'
              : 'Đã ghi nhận phiếu nhập'
            : step === 1
              ? 'Kiểm tra dữ liệu nhập hàng'
              : 'Nhập hàng từ Excel / CSV'
        }
        description={draft.fileName || 'Nhập hàng vào kho chung của cửa hàng'}
      />
      <Steps
        className="mb-7"
        current={step}
        items={[
          { title: 'Chọn file' },
          { title: 'Kiểm tra dữ liệu' },
          { title: user?.role === 'ADMIN' ? 'Ghi nhận nhập kho' : 'Gửi quản trị viên duyệt' },
        ]}
      />
      <div className="space-y-6">
        {step === 0 && (
          <>
            <Panel title="Thông tin phiếu nhập">
              <Form layout="vertical">
                <div className="grid gap-x-6 sm:grid-cols-2">
                  <Form.Item label="Nhà cung cấp" required>
                    <Select
                      showSearch
                      optionFilterProp="label"
                      value={draft.supplierId}
                      disabled={busy}
                      placeholder="Chọn nhà cung cấp (bắt buộc)"
                      options={lookups.suppliers.map((item) => ({
                        value: item.id,
                        label: item.code + ' · ' + item.name,
                      }))}
                      onChange={(supplierId) => updateDraft({ ...draft, supplierId, importKey: crypto.randomUUID() })}
                    />
                    {!lookups.suppliers.length && (
                      <p className="mt-2 text-sm text-muted">Chưa có nhà cung cấp. Vui lòng nhờ quản trị viên thêm trước khi nhập hàng.</p>
                    )}
                  </Form.Item>
                </div>
                <Form.Item className="mb-0!" label="Ghi chú phiếu nhập">
                  <Input.TextArea
                    rows={2}
                    maxLength={1000}
                    value={draft.note}
                    disabled={busy}
                    onChange={(event) => updateDraft({ ...draft, note: event.target.value, importKey: crypto.randomUUID() })}
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
              <p className="mt-2 text-sm text-muted">
                Cột Ảnh / Link ảnh / image_url không bắt buộc. Mỗi ô điền một link ảnh trực tiếp http(s) hoặc để trống.
                Có link thì bổ sung ảnh sau khi duyệt; bỏ trống giữ nguyên ảnh hiện có.
              </p>
              <p className="mt-2 text-sm text-muted">
                Cùng quy cách dùng một SKU, mỗi đợt hàng dùng mã lô riêng. Cột Giá bán / list_price là giá của lô đó;
                bỏ trống với SKU đã có thì dùng giá mặc định. Lô gần hết hạn được bán trước.
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
              <Button type="primary" loading={busy} disabled={!draft.rows.length || !draft.supplierId} onClick={check}>
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
              <StatCard label="Cần sửa" value={preview.error_rows} hint="Chỉnh sửa trực tiếp từng dòng" />
              <StatCard label="SKU mới" value={preview.new_skus} hint="Sản phẩm mới được tạo nháp" />
            </div>
            <Panel title="Kết quả kiểm tra">
              <Form layout="vertical">
                <Form.Item label="Nhà cung cấp" required>
                  <Select className="max-w-lg" showSearch optionFilterProp="label" disabled={busy}
                    value={draft.supplierId} placeholder="Chọn nhà cung cấp (bắt buộc)"
                    options={lookups.suppliers.map((item) => ({ value: item.id, label: item.code + ' · ' + item.name }))}
                    onChange={(supplierId) => updateDraft({ ...draft, supplierId, importKey: crypto.randomUUID() })} />
                </Form.Item>
              </Form>
              {previewDirty && <Alert className="mb-4" type="warning" showIcon
                title="Bản nháp đã thay đổi. Hãy kiểm tra lại trước khi gửi duyệt."
                action={<Button disabled={busy} onClick={check}>Kiểm tra lại</Button>} />}
              <Table
                rowKey="row_number"
                dataSource={preview.rows}
                scroll={{ x: 1300 }}
                pagination={{ pageSize: 10, showSizeChanger: false }}
                columns={[
                  { title: 'Dòng', dataIndex: 'row_number', width: 60 },
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
                    title: 'Lô / Hạn sử dụng',
                    width: 180,
                    render: (_, row) => (
                      <div>
                        <p className="font-medium">HSD: {formatDate(String(row.data.expiry_date || ''))}</p>
                        <p className="mt-1 text-sm text-muted">{row.data.batch_code || '—'}</p>
                        {!!row.data.manufactured_date && (
                          <p className="mt-1 text-xs text-muted">NSX: {formatDate(String(row.data.manufactured_date))}</p>
                        )}
                      </div>
                    ),
                  },
                  {
                    title: 'Số lượng / ĐVT',
                    render: (_, row) =>
                      `${Number.isFinite(row.quantity) ? row.quantity.toLocaleString('vi-VN') : '—'} ${row.unit}`,
                  },
                  {
                    title: 'Giá vốn / đơn vị',
                    dataIndex: 'unit_cost',
                    render: (value: number) => (Number.isFinite(value) ? formatPrice(value) : '—'),
                  },
                  { title: 'Giá niêm yết lô / đơn vị', dataIndex: 'list_price',
                    render: (value: number | null) => value == null ? 'Giá mặc định' : formatPrice(value) },
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
                  {
                    title: 'Ảnh bổ sung',
                    dataIndex: 'image_url',
                    width: 110,
                    render: (url: string | null) => url ? (
                      <Image src={url} alt="Ảnh nhập từ file" width={52} height={52} style={{ objectFit: 'contain' }} />
                    ) : 'Không bổ sung',
                  },
                  {
                    title: 'Thao tác', fixed: 'right', width: 120,
                    render: (_, row) => (
                      <Button type="link" className="px-0!" disabled={busy} onClick={() => setEditingRow(row.row_number)}>
                        Chỉnh sửa
                      </Button>
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
                  : user?.role === 'ADMIN'
                    ? 'Tất cả dòng đã hợp lệ. Bạn có thể xác nhận nhập kho.'
                    : 'Tất cả dòng hợp lệ. Gửi quản trị viên duyệt để cập nhật sản phẩm và tồn kho.'
              }
            />
            <div className="flex flex-wrap gap-3">
              <Button disabled={busy} onClick={() => setStep(0)}>
                Chọn lại file / sửa thông tin
              </Button>
              <Button type="primary" disabled={!!preview.error_rows || previewDirty || !draft.supplierId} loading={busy} onClick={confirm}>
                {user?.role === 'ADMIN' ? 'Xác nhận nhập kho' : 'Gửi duyệt phiếu nhập'}
              </Button>
            </div>
          </>
        )}
        {step === 2 && pendingRequest && (
          <>
            <Alert
              type="success"
              showIcon
              title="Phiếu nhập đã được gửi chờ quản trị viên duyệt."
              description="Sản phẩm mới và tồn kho chỉ được ghi nhận sau khi yêu cầu được chấp nhận."
            />
            <Link to="/product-changes">
              <Button type="primary">Theo dõi yêu cầu</Button>
            </Link>
            <Button
              onClick={() => {
                updateDraft({ rows: [], fileName: '', importKey: crypto.randomUUID(), note: '' });
                setStep(0);
                setPendingRequest(null);
                setPreview(null);
              }}
            >
              Nhập file khác
            </Button>
          </>
        )}
        {step === 2 && receipt && !pendingRequest && (
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
        {editingRow !== null && preview && (
          <ImportRowEditor key={editingRow} row={draft.rows[editingRow - 2]}
            checked={preview.rows[editingRow - 2]} categories={lookups.categories} busy={busy}
            onSave={saveRow} onCancel={() => setEditingRow(null)} />
        )}
      </div>
    </>
  );
};
export default ImportWizard;
