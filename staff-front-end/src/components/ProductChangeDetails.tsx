import { Alert, Image, Table, Tag } from 'antd';
import Panel from './Panel';
import { formatDate, formatPrice } from '../utils/format';
import { getFileUrl } from '../utils/fileUrl';
import { CHANGE_COLORS, CHANGE_STATUSES, type ProductChangeDetail, type ProductSnapshot } from '../types/productChange';

const productStatuses: Record<string, string> = { DRAFT: 'Bản nháp', PUBLISHED: 'Đang bán', ARCHIVED: 'Ngừng bán' };
const Snapshot = ({ title, data }: { title: string; data: ProductSnapshot }) => (
  <Panel title={title}>
    <dl className="space-y-3 text-sm">
      {[
        ['Tên sản phẩm', data.name],
        ['Mã sản phẩm', data.code],
        ['Danh mục', data.category_name],
        ['Trạng thái', productStatuses[data.status] || data.status],
        ['Mô tả', data.description || '—'],
      ].map(([label, value]) => (
        <div key={label}>
          <dt className="mb-1 text-muted">{label}</dt>
          <dd className="whitespace-pre-wrap break-words">{value}</dd>
        </div>
      ))}
    </dl>
    <div className="my-4 flex flex-wrap gap-2">
      <Image.PreviewGroup>
        {data.images.map((url) => (
          <Image key={url} src={getFileUrl(url)} width={84} height={84} styles={{ image: { objectFit: 'cover' } }} />
        ))}
      </Image.PreviewGroup>
    </div>
    <Table
      rowKey="id"
      size="small"
      pagination={false}
      scroll={{ x: 560 }}
      dataSource={data.variants}
      columns={[
        {
          title: 'SKU / Quy cách',
          render: (_, row) => (
            <>
              {row.sku}
              <p className="text-muted">{row.name}</p>
            </>
          ),
        },
        { title: 'Đơn vị', dataIndex: 'unit' },
        { title: 'Bước bán', dataIndex: 'step_quantity' },
        { title: 'Giá niêm yết', dataIndex: 'list_price', render: formatPrice },
      ]}
    />
    {!!data.initial_stock?.some((stock) => stock && stock.quantity > 0) && (
      <div className="mt-4 space-y-3 rounded-xl bg-page-gray p-4 text-sm">
        <h3 className="font-semibold">Tồn ban đầu đề nghị</h3>
        {data.initial_stock.map((stock, index) =>
          stock && stock.quantity > 0 ? (
            <div key={index}>
              <p>
                {data.variants[index]?.sku} · {stock.quantity} {data.variants[index]?.unit} · Lô {stock.batch_code}
              </p>
              <p>
                Giá nhập: {formatPrice(stock.unit_cost || 0)} · Hạn dùng:{' '}
                {stock.expiry_date ? formatDate(stock.expiry_date) : '—'}
              </p>
              {stock.manufactured_date && <p>Ngày sản xuất: {formatDate(stock.manufactured_date)}</p>}
            </div>
          ) : null,
        )}
      </div>
    )}
  </Panel>
);

const ProductChangeDetails = ({ change }: { change: ProductChangeDetail }) => (
  <div className="space-y-5">
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <Tag color={CHANGE_COLORS[change.status]}>{CHANGE_STATUSES[change.status]}</Tag>
      <span>Người gửi: {change.requested_by?.full_name || 'Tài khoản đã xóa'}</span>
      <span>{formatDate(change.created_at)}</span>
    </div>
    {change.status !== 'PENDING' && (
      <Alert
        showIcon
        type={change.status === 'APPROVED' ? 'success' : 'warning'}
        title={`${CHANGE_STATUSES[change.status]} · ${change.reviewed_by?.full_name || 'Quản trị viên'}`}
        description={change.review_note || 'Yêu cầu đã được xử lý.'}
      />
    )}
    {change.type === 'IMPORT' ? (
      <Panel title="Các dòng đề nghị nhập">
        <p className="mb-2 text-sm">
          File: {change.source_file || 'Nhập trực tiếp'} · Nhà cung cấp: {change.supplier_name}
        </p>
        {change.note && <p className="mb-4 text-sm text-muted">Ghi chú: {change.note}</p>}
        <Table
          rowKey="row_number"
          size="small"
          scroll={{ x: 1000 }}
          dataSource={change.rows}
          pagination={{ pageSize: 10, showSizeChanger: false }}
          columns={[
            {
              title: 'SKU / Sản phẩm',
              render: (_, row) => (
                <>
                  {row.sku}
                  <p>
                    {row.name} {row.variant_name}
                  </p>
                </>
              ),
            },
            { title: 'Số lượng', render: (_, row) => `${row.quantity} ${row.unit}` },
            { title: 'Giá nhập', dataIndex: 'unit_cost', render: (value?: number) => formatPrice(value || 0) },
            {
              title: 'Giá niêm yết (SKU mới)',
              dataIndex: 'list_price',
              render: (value: number | null) => (value == null ? 'Giữ giá hiện tại' : formatPrice(value)),
            },
            { title: 'Lô', dataIndex: 'batch_code' },
            {
              title: 'Ngày sản xuất',
              dataIndex: 'manufactured_date',
              render: (value?: string) => (value ? formatDate(value) : '—'),
            },
            { title: 'Hạn dùng', dataIndex: 'expiry_date', render: (value: string) => formatDate(value) },
          ]}
        />
        <p className="mt-4 font-semibold text-primary">
          Tổng giá trị:{' '}
          {formatPrice((change.rows || []).reduce((sum, row) => sum + row.quantity * (row.unit_cost || 0), 0))}
        </p>
      </Panel>
    ) : (
      <div className={change.before ? 'grid gap-5 xl:grid-cols-2' : ''}>
        {change.before && <Snapshot title="Trước thay đổi" data={change.before} />}
        {change.after && <Snapshot title="Nội dung đề nghị" data={change.after} />}
      </div>
    )}
  </div>
);
export default ProductChangeDetails;
