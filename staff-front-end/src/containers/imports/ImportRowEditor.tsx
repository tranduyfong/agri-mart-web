import { Form, Input, InputNumber, Modal, Select } from 'antd';
import type { CheckedRow, ImportRow, Lookups } from '../../types/staff';

interface Props {
  row: ImportRow;
  checked: CheckedRow;
  categories: Lookups['categories'];
  busy: boolean;
  onSave: (row: ImportRow) => void;
  onCancel: () => void;
}

// Chỉ sửa bản nháp. Khi lưu, wizard gọi lại API kiểm tra toàn bộ file trước khi cho gửi duyệt.
const ImportRowEditor = ({ row, checked, categories, busy, onSave, onCancel }: Props) => {
  const [form] = Form.useForm<ImportRow>();
  const textFields = [
    ['sku', 'SKU'],
    ['code', 'Mã sản phẩm'],
    ['name', 'Tên sản phẩm'],
    ['variant_name', 'Quy cách'],
    ['unit', 'Đơn vị'],
    ['batch_code', 'Mã lô'],
  ];
  const numberFields = [
    ['step_quantity', 'Bước bán'],
    ['quantity', 'Số lượng'],
    ['unit_cost', 'Giá vốn / đơn vị (đ)'],
    ['list_price', 'Giá niêm yết lô / đơn vị (đ)'],
  ];
  return (
    <Modal
      open
      title={'Chỉnh sửa dòng ' + checked.row_number}
      width={760}
      okText="Lưu và kiểm tra lại"
      cancelText="Hủy"
      confirmLoading={busy}
      closable={!busy}
      maskClosable={false}
      keyboard={!busy}
      cancelButtonProps={{ disabled: busy }}
      onCancel={onCancel}
      onOk={() => form.submit()}
    >
      <p className="mb-4 text-sm text-muted">
        Thay đổi áp dụng cho phiếu này, chờ quản trị viên duyệt. Với SKU đã có, tên, quy cách và đơn vị được giữ theo danh mục sản phẩm.
      </p>
      <Form
        form={form}
        layout="vertical"
        disabled={busy}
        initialValues={{ ...row, name: row.name || checked.name, unit: row.unit || checked.unit }}
        onFinish={(values) => onSave({ ...row, ...values })}
      >
        <div className="grid gap-x-5 sm:grid-cols-2">
          {textFields.map(([name, label]) => (
            <Form.Item key={name} name={name} label={label}>
              <Input />
            </Form.Item>
          ))}
          <Form.Item name="category_slug" label="Danh mục (dành cho sản phẩm mới)">
            <Select allowClear options={categories.map((item) => ({ value: item.slug, label: item.name }))} />
          </Form.Item>
          <Form.Item name="image_url" label="Link ảnh (không bắt buộc)">
            <Input placeholder="https://..." />
          </Form.Item>
          {numberFields.map(([name, label]) => (
            <Form.Item key={name} name={name} label={label}>
              <InputNumber
                className="w-full!"
                min={0}
                placeholder={name === 'list_price' ? 'Trống: dùng giá mặc định của SKU đã có' : ''}
              />
            </Form.Item>
          ))}
          <Form.Item name="manufactured_date" label="Ngày sản xuất">
            <Input type="date" />
          </Form.Item>
          <Form.Item name="expiry_date" label="Hạn sử dụng">
            <Input type="date" />
          </Form.Item>
        </div>
      </Form>
    </Modal>
  );
};
export default ImportRowEditor;
