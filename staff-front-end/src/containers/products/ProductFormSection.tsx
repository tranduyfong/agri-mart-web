import { useCallback, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Alert, App, Button, DatePicker, Form, Input, InputNumber, Select, Table, Upload } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import type { UploadFile } from 'antd';
import { PlusOutlined, MinusCircleOutlined } from '@ant-design/icons';
import Panel from '../../components/Panel';
import PageHeader from '../../components/PageHeader';
import LoadingCard from '../../components/LoadingCard';
import productService from '../../services/productService';
import staffService from '../../services/staffService';
import useData from '../../hooks/useData';
import useAuth from '../../hooks/useAuth';
import { getFileUrl } from '../../utils/fileUrl';
import { getErrorMessage } from '../../utils/errorMessage';
import type { ProductDetail } from '../../types/product';
import type { Lookups } from '../../types/staff';
import { formatPrice } from '../../utils/format';

interface Values {
  name: string;
  code: string;
  category_id: string;
  status: string;
  description: string;
  image_urls?: string;
  variants: {
    id?: string;
    sku: string;
    variant_name: string;
    unit: string;
    list_price: number;
    step_quantity: number;
    initial_stock?: {
      quantity: number;
      unit_cost?: number;
      batch_code?: string;
      expiry_date?: Dayjs;
      manufactured_date?: Dayjs;
    };
  }[];
}
const required = [{ required: true, message: 'Vui lòng nhập thông tin' }];

const ProductForm = ({ product, lookups }: { product: ProductDetail | null; lookups: Lookups }) => {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [files, setFiles] = useState<UploadFile[]>([]),
    [removed, setRemoved] = useState<string[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const submit = async (values: Values) => {
    const urls = (values.image_urls || '')
      .split(/[\n,]/)
      .map((url) => url.trim())
      .filter(Boolean);
    if (urls.some((url) => !/^https?:\/\//.test(url))) {
      setError('Link ảnh cần bắt đầu bằng http:// hoặc https://');
      return;
    }
    if (
      values.status === 'PUBLISHED' &&
      !(product?.images.filter((image) => !removed.includes(image.url)).length || files.length || urls.length)
    ) {
      setError('Cần thêm ảnh trước khi đăng bán sản phẩm');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const data = new FormData();
      for (const key of ['name', 'code', 'category_id', 'status', 'description'] as const)
        data.append(key, values[key] || '');
      data.append(
        'variants',
        JSON.stringify(
          values.variants.map((variant) => ({
            ...variant,
            initial_stock:
              !product && variant.initial_stock
                ? {
                    ...variant.initial_stock,
                    expiry_date: variant.initial_stock.expiry_date?.format('YYYY-MM-DD'),
                    manufactured_date: variant.initial_stock.manufactured_date?.format('YYYY-MM-DD'),
                  }
                : undefined,
          })),
        ),
      );
      data.append('image_urls', JSON.stringify(urls));
      data.append('delete_image_urls', JSON.stringify(removed));
      files.forEach((file) => {
        if (file.originFileObj) data.append('images', file.originFileObj);
      });
      await productService.saveProduct(product?.id, data);
      message.success('Đã lưu sản phẩm');
      navigate('/products');
    } catch (reason) {
      setError(getErrorMessage(reason));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Form
      layout="vertical"
      requiredMark={false}
      onFinish={submit}
      disabled={busy}
      initialValues={
        product
          ? { ...product, variants: product.variants.map((variant) => ({ ...variant, variant_name: variant.name })) }
          : {
              status: 'DRAFT',
              variants: [{ unit: 'kg', step_quantity: 1, list_price: 0, initial_stock: { quantity: 0 } }],
            }
      }
    >
      <div className="space-y-6">
        <Panel title="Thông tin cơ bản">
          <div className="grid gap-x-6 md:grid-cols-2">
            <Form.Item name="name" label="Tên sản phẩm *" rules={required}>
              <Input maxLength={200} />
            </Form.Item>
            <Form.Item name="code" label="Mã sản phẩm *" rules={required}>
              <Input maxLength={100} />
            </Form.Item>
            <Form.Item name="category_id" label="Danh mục *" rules={required}>
              <Select
                showSearch
                optionFilterProp="label"
                options={lookups.categories.map((category) => ({ value: category.id, label: category.name }))}
              />
            </Form.Item>
            <Form.Item name="status" label="Trạng thái">
              <Select
                options={[
                  { value: 'DRAFT', label: 'Bản nháp' },
                  { value: 'PUBLISHED', label: 'Đang bán' },
                  { value: 'ARCHIVED', label: 'Ngừng bán' },
                ]}
              />
            </Form.Item>
          </div>
        </Panel>
        <Panel title="Quy cách bán">
          <Form.List name="variants">
            {(fields, { add, remove }) => (
              <>
                <div className="space-y-5">
                  {fields.map((field) => (
                    <div key={field.key} className="rounded-xl border border-line bg-page-gray/50 p-4">
                      <Form.Item name={[field.name, 'id']} hidden>
                        <Input />
                      </Form.Item>
                      <div className="grid gap-x-4 sm:grid-cols-2 xl:grid-cols-5">
                        <Form.Item name={[field.name, 'sku']} label="SKU *" rules={required}>
                          <Input />
                        </Form.Item>
                        <Form.Item name={[field.name, 'variant_name']} label="Tên quy cách *" rules={required}>
                          <Input placeholder="Khay 500g" />
                        </Form.Item>
                        <Form.Item name={[field.name, 'unit']} label="Đơn vị *" rules={required}>
                          <Input placeholder="kg, gói, bó…" />
                        </Form.Item>
                        <Form.Item name={[field.name, 'step_quantity']} label="Bước bán *" rules={required}>
                          <InputNumber className="w-full!" min={0.001} precision={3} />
                        </Form.Item>
                        <Form.Item name={[field.name, 'list_price']} label="Giá niêm yết (đ) *" rules={required}>
                          <InputNumber className="w-full!" min={0} precision={0} />
                        </Form.Item>
                      </div>
                      {!product && hasPermission('INVENTORY_MANAGE') && (
                        <div className="border-t border-line pt-4">
                          <p className="mb-4 font-medium">Tồn ban đầu và giá nhập</p>
                          <div className="grid gap-x-4 sm:grid-cols-2 xl:grid-cols-3">
                            <Form.Item name={[field.name, 'initial_stock', 'quantity']} label="Số lượng tồn ban đầu">
                              <InputNumber className="w-full!" min={0} precision={3} />
                            </Form.Item>
                            {[
                              {
                                name: 'unit_cost',
                                label: 'Giá nhập / đơn vị bán (đ)',
                                input: <InputNumber className="w-full!" min={0} precision={0} />,
                              },
                              { name: 'batch_code', label: 'Mã lô', input: <Input maxLength={100} /> },
                              {
                                name: 'expiry_date',
                                label: 'Hạn sử dụng',
                                input: (
                                  <DatePicker
                                    className="w-full!"
                                    format="DD/MM/YYYY"
                                    disabledDate={(date) => date.isBefore(dayjs().startOf('day'))}
                                  />
                                ),
                              },
                            ].map((item) => (
                              <Form.Item
                                key={item.name}
                                name={[field.name, 'initial_stock', item.name]}
                                label={item.label}
                                dependencies={[['variants', field.name, 'initial_stock', 'quantity']]}
                                rules={[
                                  ({ getFieldValue }) => ({
                                    validator: (_, value) =>
                                      !(getFieldValue(['variants', field.name, 'initial_stock', 'quantity']) > 0) ||
                                      (value !== undefined && value !== null && value !== '')
                                        ? Promise.resolve()
                                        : Promise.reject(new Error('Cần nhập khi có tồn ban đầu')),
                                  }),
                                ]}
                              >
                                {item.input}
                              </Form.Item>
                            ))}
                            <Form.Item
                              name={[field.name, 'initial_stock', 'manufactured_date']}
                              label="Ngày sản xuất (nếu có)"
                            >
                              <DatePicker
                                className="w-full!"
                                format="DD/MM/YYYY"
                                disabledDate={(date) => date.isAfter(dayjs().endOf('day'))}
                              />
                            </Form.Item>
                          </div>
                          <p className="text-sm text-muted">
                            Số lượng và giá nhập được ghi thành phiếu nhập. Đơn vị giá nhập phải cùng đơn vị giá niêm
                            yết ở trên.
                          </p>
                        </div>
                      )}
                      {!product?.variants[field.name] && fields.length > 1 && (
                        <Button danger type="text" icon={<MinusCircleOutlined />} onClick={() => remove(field.name)}>
                          Bỏ quy cách này
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                <Button
                  className="mt-4"
                  icon={<PlusOutlined />}
                  onClick={() => add({ unit: 'kg', step_quantity: 1, list_price: 0, initial_stock: { quantity: 0 } })}
                >
                  Thêm quy cách
                </Button>
              </>
            )}
          </Form.List>
        </Panel>
        {product && (
          <Panel title="Tồn kho và giá nhập theo lô">
            <Table
              pagination={false}
              scroll={{ x: 750 }}
              rowKey={(row) => row.sku + row.batch_code + row.expiry_date}
              dataSource={product.variants.flatMap((variant) =>
                (variant.stock_lots || []).map((lot) => ({
                  ...lot,
                  sku: variant.sku,
                  unit: variant.unit,
                  list_price: variant.list_price,
                })),
              )}
              columns={[
                {
                  title: 'SKU / lô',
                  render: (_, row) => (
                    <span className="break-all">
                      {row.sku} / {row.batch_code}
                    </span>
                  ),
                },
                { title: 'Tồn', render: (_, row) => `${row.quantity.toLocaleString('vi-VN')} ${row.unit}` },
                {
                  title: 'Hạn dùng',
                  dataIndex: 'expiry_date',
                  render: (value: string) => dayjs(value).format('DD/MM/YYYY'),
                },
                {
                  title: 'Giá nhập / đơn vị',
                  dataIndex: 'unit_cost',
                  render: (value: number | null) => (value === null ? 'Chưa có giá nhập' : formatPrice(value)),
                },
                { title: 'Giá niêm yết', dataIndex: 'list_price', render: formatPrice },
              ]}
            />
            <Link to="/imports" className="mt-4 inline-block text-primary">
              Nhập thêm hàng →
            </Link>
          </Panel>
        )}
        <Panel title="Hình ảnh và mô tả">
          <p className="mb-4 text-sm text-muted">
            Ảnh đầu tiên là ảnh đại diện. Khi nhập thêm hàng, mỗi lô có hạn sử dụng và giá nhập riêng.
          </p>
          {product && (
            <p className="mb-4 text-sm text-muted">
              Tồn kho và giá nhập được giữ theo phiếu nhập, tránh ghi đè hàng đã bán.{' '}
              <Link className="text-primary" to="/imports">
                Nhập thêm hàng →
              </Link>
            </p>
          )}
          {!!product?.images.length && (
            <div className="mb-5 flex flex-wrap gap-4">
              {product.images.map((image) => (
                <div key={image.url} className="w-28">
                  <img
                    className={`h-24 w-28 rounded-lg border border-line object-contain ${removed.includes(image.url) ? 'opacity-30' : ''}`}
                    src={getFileUrl(image.url)}
                    alt={product.name}
                  />
                  <Button
                    size="small"
                    type="text"
                    danger
                    onClick={() =>
                      setRemoved(
                        removed.includes(image.url)
                          ? removed.filter((url) => url !== image.url)
                          : [...removed, image.url],
                      )
                    }
                  >
                    {removed.includes(image.url) ? 'Giữ ảnh' : 'Xóa ảnh'}
                  </Button>
                </div>
              ))}
            </div>
          )}
          <Upload
            listType="picture-card"
            multiple
            accept="image/png,image/jpeg,image/webp,image/gif"
            beforeUpload={() => false}
            fileList={files}
            onChange={({ fileList }) => setFiles(fileList)}
            maxCount={10}
          >
            <div>
              <PlusOutlined />
              <p className="mt-2 text-xs">Chọn ảnh</p>
            </div>
          </Upload>
          <Form.Item name="image_urls" label="Hoặc thêm link ảnh" className="mt-4">
            <Input.TextArea rows={2} placeholder="Mỗi dòng một link ảnh https://…" />
          </Form.Item>
          <Form.Item name="description" label="Mô tả và hướng dẫn bảo quản" className="mb-0!">
            <Input.TextArea rows={5} />
          </Form.Item>
        </Panel>
        {error && <Alert type="error" showIcon title={error} />}
        <div className="flex justify-end gap-3">
          <Link to="/products">
            <Button disabled={busy}>Hủy</Button>
          </Link>
          <Button type="primary" htmlType="submit" loading={busy}>
            Lưu sản phẩm
          </Button>
        </div>
      </div>
    </Form>
  );
};

const ProductFormSection = () => {
  const { id } = useParams();
  const load = useCallback(
    async () => ({
      product: id ? await productService.getProduct(id) : null,
      lookups: await staffService.getLookups(),
    }),
    [id],
  );
  const { data, loading, error, reload } = useData(load);
  return (
    <>
      <PageHeader
        title={id ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm'}
        description="Hoàn thiện thông tin, quy cách bán và hình ảnh trước khi đăng."
      />
      {loading || error || !data ? (
        <LoadingCard error={error} onRetry={reload} />
      ) : (
        <ProductForm key={id || 'new'} product={data.product} lookups={data.lookups} />
      )}
    </>
  );
};
export default ProductFormSection;
