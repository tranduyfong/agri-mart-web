import { useCallback, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Alert, App, Button, Checkbox, DatePicker, Form, Input, InputNumber, Select, Switch, Tag } from 'antd';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import PageHeader from '../../components/PageHeader';
import Panel from '../../components/Panel';
import LoadingCard from '../../components/LoadingCard';
import useData from '../../hooks/useData';
import promotionService from '../../services/promotionService';
import staffService from '../../services/staffService';
import { getErrorMessage } from '../../utils/errorMessage';
import { formatPrice } from '../../utils/format';
import type { Lookups, Promotion } from '../../types/staff';
import ImageInput from '../../components/ImageInput';
import { appendImage, type ImageValue } from '../../utils/imageInput';

interface Values {
  code: string;
  name: string;
  valid_from: Dayjs;
  valid_to: Dayjs;
  discount_type: string;
  discount_value: number;
  min_order_value: number;
  requires_code: boolean;
  is_flash_sale: boolean;
  product_ids: string[];
  image?: ImageValue;
}
const required = [{ required: true, message: 'Vui lòng nhập thông tin' }];
const PromotionForm = ({
  promotion,
  lookups,
  scope,
  onSaved,
}: {
  promotion: Promotion | null;
  lookups: Lookups;
  scope: 'PRODUCT' | 'SHIPPING';
  onSaved?: () => void;
}) => {
  const [form] = Form.useForm<Values>();
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [skuText, setSkuText] = useState(''),
    [invalid, setInvalid] = useState<string[]>([]);
  const selectedIds: string[] = Form.useWatch('product_ids', form) || [];
  const type = Form.useWatch('discount_type', form) || 'PERCENT';
  const value = Form.useWatch('discount_value', form) || 0;
  const requiresCode = Form.useWatch('requires_code', form);
  const resolveCodes = () => {
    const tokens = [
      ...new Set(
        skuText
          .split(/[,;\n]+/)
          .map((code) => code.trim().toUpperCase())
          .filter(Boolean),
      ),
    ];
    const missing: string[] = [],
      ids: string[] = [];
    for (const code of tokens) {
      const product = lookups.products.find(
        (item) =>
          item.code.toUpperCase() === code || item.variants.some((variant) => variant.sku.toUpperCase() === code),
      );
      if (product) ids.push(product.id);
      else missing.push(code);
    }
    return { missing, ids };
  };
  const checkCodes = () => {
    const result = resolveCodes();
    setInvalid(result.missing);
    form.setFieldValue('product_ids', [...new Set([...selectedIds, ...result.ids])]);
  };
  const submit = async (values: Values) => {
    const resolved = resolveCodes();
    setInvalid(resolved.missing);
    if (resolved.missing.length) {
      setError('Hãy sửa hoặc xóa mã không tồn tại trước khi lưu');
      return;
    }
    const ids = scope === 'SHIPPING' ? [] : [...new Set([...(values.product_ids || []), ...resolved.ids])];
    if (!values.requires_code && type === 'PERCENT' && scope === 'PRODUCT' && !ids.length) {
      setError('Ưu đãi tự động cần chọn ít nhất một sản phẩm');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const payload = {
        ...values,
        promotion_scope: scope,
        product_ids: ids,
        valid_from: values.valid_from.toISOString(),
        valid_to: values.valid_to.toISOString(),
        requires_code: scope === 'SHIPPING' || type === 'AMOUNT' || values.requires_code,
      };
      const body = new FormData();
      for (const [key, value] of Object.entries(payload)) {
        if (key === 'image') continue;
        body.append(key, Array.isArray(value) ? JSON.stringify(value) : String(value ?? ''));
      }
      appendImage(body, values.image);
      await promotionService.savePromotion(promotion?.id, body);
      message.success('Đã lưu chương trình');
      if (onSaved) onSaved();
      else navigate('/promotions');
    } catch (reason) {
      setError(getErrorMessage(reason));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={submit}
      disabled={busy}
      requiredMark={false}
      initialValues={
        promotion
          ? {
              ...promotion,
              image: { url: promotion.image_url || '' },
              requires_code: scope === 'SHIPPING' || promotion.discount_type === 'AMOUNT' || promotion.requires_code,
              valid_from: dayjs(promotion.valid_from),
              valid_to: dayjs(promotion.valid_to),
            }
          : {
              discount_type: scope === 'SHIPPING' ? 'AMOUNT' : 'PERCENT',
              discount_value: scope === 'SHIPPING' ? 15000 : 10,
              min_order_value: 0,
              requires_code: scope === 'SHIPPING',
              product_ids: [],
              is_flash_sale: false,
            }
      }
      onValuesChange={(changed) => {
        if (changed.discount_type === 'AMOUNT') form.setFieldValue('requires_code', true);
      }}
    >
      <div className="space-y-6">
        <Panel title={scope === 'SHIPPING' ? 'Tạo hoặc chỉnh sửa mã' : 'Thông tin chương trình'}>
          <div className="grid gap-x-6 md:grid-cols-2">
            <Form.Item name="name" label="Tên chương trình *" rules={required}>
              <Input maxLength={200} />
            </Form.Item>
            <Form.Item
              name="code"
              label="Mã chương trình *"
              rules={[
                ...required,
                { pattern: /^[a-zA-Z0-9_-]{1,80}$/, message: 'Chỉ dùng chữ, số, gạch ngang hoặc gạch dưới' },
              ]}
            >
              <Input />
            </Form.Item>
            <Form.Item name="valid_from" label="Bắt đầu *" rules={required}>
              <DatePicker showTime className="w-full!" format="DD/MM/YYYY HH:mm" />
            </Form.Item>
            <Form.Item
              name="valid_to"
              label="Kết thúc *"
              dependencies={['valid_from']}
              rules={[
                ...required,
                {
                  validator: (_, end) =>
                    !end || !form.getFieldValue('valid_from') || end.isAfter(form.getFieldValue('valid_from'))
                      ? Promise.resolve()
                      : Promise.reject(new Error('Thời gian kết thúc phải sau bắt đầu')),
                },
              ]}
            >
              <DatePicker showTime className="w-full!" format="DD/MM/YYYY HH:mm" />
            </Form.Item>
            <Form.Item name="discount_type" label="Loại giảm giá *" rules={required}>
              <Select
                options={[
                  { value: 'PERCENT', label: 'Theo phần trăm' },
                  { value: 'AMOUNT', label: 'Giảm số tiền khi nhập mã' },
                ]}
              />
            </Form.Item>
            <Form.Item
              name="discount_value"
              label={type === 'PERCENT' ? 'Giá trị giảm (%) *' : 'Số tiền giảm (đ) *'}
              rules={required}
            >
              <InputNumber className="w-full!" min={1} max={type === 'PERCENT' ? 100 : undefined} precision={0} />
            </Form.Item>
            <Form.Item name="min_order_value" label="Tiền hàng tối thiểu (đ) *" rules={required}>
              <InputNumber className="w-full!" min={0} precision={0} />
            </Form.Item>
            <div className="pt-8">
              <Form.Item name="requires_code" label="Khách cần nhập mã" valuePropName="checked">
                <Switch disabled={scope === 'SHIPPING' || type === 'AMOUNT'} />
              </Form.Item>
            </div>
          </div>
          {scope === 'PRODUCT' && (
            <Form.Item name="is_flash_sale" valuePropName="checked" className="mb-0!">
              <Checkbox disabled={!!requiresCode || type === 'AMOUNT'}>Hiển thị trong Flash sale</Checkbox>
            </Form.Item>
          )}
          <p className="mt-3 text-xs leading-6 text-muted">
            {scope === 'SHIPPING'
              ? 'Mức giảm không vượt quá phí giao hàng. Đơn tối thiểu tính trên tiền hàng sau ưu đãi sản phẩm.'
              : 'Ưu đãi dùng chung toàn hệ thống. Giảm tự động chỉ hỗ trợ phần trăm; giảm số tiền được áp dụng qua mã.'}
          </p>
        </Panel>
        <Panel title="Ảnh chương trình khuyến mãi">
          <Form.Item name="image" className="mb-0!">
            <ImageInput />
          </Form.Item>
        </Panel>
        {scope === 'PRODUCT' && (
          <Panel title="Chọn sản phẩm">
            <Form.Item name="product_ids" label="Sản phẩm áp dụng">
              <Select
                mode="multiple"
                showSearch
                optionFilterProp="label"
                maxTagCount="responsive"
                placeholder={requiresCode ? 'Để trống để áp dụng mọi sản phẩm' : 'Chọn sản phẩm cần giảm giá'}
                options={lookups.products.map((item) => ({ value: item.id, label: item.code + ' · ' + item.name }))}
              />
            </Form.Item>
            <label className="mb-2 block text-sm font-medium" htmlFor="promotion-codes">
              Hoặc dán danh sách mã sản phẩm / SKU
            </label>
            <Input.TextArea
              id="promotion-codes"
              rows={3}
              value={skuText}
              onChange={(event) => setSkuText(event.target.value)}
              placeholder="Mã cách nhau bằng dấu phẩy, chấm phẩy hoặc xuống dòng"
            />
            <p className="my-3 text-xs leading-6 text-muted">
              SKU sẽ chọn cả sản phẩm, bao gồm tất cả quy cách bán của sản phẩm đó. Mã trùng được bỏ qua.
            </p>
            <Button onClick={checkCodes}>Kiểm tra danh sách</Button>
            <div className="mt-4 flex flex-wrap gap-2">
              <Tag color="green">{selectedIds.length} sản phẩm đã chọn</Tag>
              {invalid.map((code) => (
                <Tag key={code} color="red">
                  {code} không tồn tại
                </Tag>
              ))}
            </div>
            <div className="mt-4 space-y-2 text-sm">
              {lookups.products
                .filter((item) => selectedIds.includes(item.id))
                .slice(0, 5)
                .map((item) => (
                  <p key={item.id}>
                    {item.name}:{' '}
                    {item.variants
                      .map(
                        (variant) =>
                          `${formatPrice(variant.list_price)} → ${formatPrice(type === 'PERCENT' ? Math.round(variant.list_price * (1 - value / 100)) : Math.max(0, variant.list_price - value))} / ${variant.unit}`,
                      )
                      .join(' · ')}
                  </p>
                ))}
              {type === 'AMOUNT' && (
                <p className="text-xs text-muted">
                  Số tiền giảm được áp dụng một lần trên tổng tiền sản phẩm hợp lệ; ví dụ trên chỉ minh họa khi mua một
                  đơn vị.
                </p>
              )}
            </div>
          </Panel>
        )}
        {error && <Alert type="error" showIcon title={error} />}
        <div className="flex justify-end gap-3">
          {onSaved ? (
            <Button onClick={onSaved}>Hủy</Button>
          ) : (
            <Link to="/promotions">
              <Button>Hủy</Button>
            </Link>
          )}
          <Button type="primary" htmlType="submit" loading={busy}>
            {scope === 'SHIPPING' ? 'Lưu mã' : 'Lưu chương trình'}
          </Button>
        </div>
      </div>
    </Form>
  );
};

const PromotionFormSection = ({
  editingId,
  scope = 'PRODUCT',
  onSaved,
}: {
  editingId?: string;
  scope?: 'PRODUCT' | 'SHIPPING';
  onSaved?: () => void;
}) => {
  const params = useParams();
  const id = editingId || (scope === 'PRODUCT' ? params.id : undefined);
  const load = useCallback(
    async () => ({
      promotion: id ? await promotionService.getPromotion(id) : null,
      lookups: await staffService.getLookups(),
    }),
    [id],
  );
  const { data, loading, error, reload } = useData(load);
  return (
    <>
      {scope === 'PRODUCT' && (
        <PageHeader
          title={id ? 'Chỉnh sửa khuyến mãi' : 'Tạo chương trình khuyến mãi'}
          description="Thiết lập thời gian và chọn sản phẩm áp dụng."
        />
      )}
      {loading || error || !data ? (
        <LoadingCard error={error} onRetry={reload} />
      ) : (
        <PromotionForm
          key={id || 'new'}
          promotion={data.promotion}
          lookups={data.lookups}
          scope={scope}
          onSaved={onSaved}
        />
      )}
    </>
  );
};
export default PromotionFormSection;
