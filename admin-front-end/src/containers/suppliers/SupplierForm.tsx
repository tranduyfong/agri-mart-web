import { useState } from 'react';
import { Alert, App, Button, Form, Input } from 'antd';
import supplierService from '../../services/supplierService';
import { getErrorMessage } from '../../utils/errorMessage';
import type { Supplier } from '../../types/supplier';

const SupplierForm = ({ supplier, onSaved }: { supplier: Supplier | null; onSaved: () => void }) => {
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const { message } = App.useApp();
  const submit = async (values: { code: string; name: string; phone?: string }) => {
    setBusy(true); setError('');
    try {
      await supplierService.saveSupplier(supplier?.id, values);
      void message.success('Đã lưu nhà cung cấp'); onSaved();
    } catch (reason) { setError(getErrorMessage(reason)); }
    finally { setBusy(false); }
  };
  return (
    <Form layout="vertical" disabled={busy} initialValues={supplier || {}} onFinish={submit}>
      <Form.Item name="code" label="Mã nhà cung cấp" rules={[{ required: true, message: 'Nhập mã nhà cung cấp' },
        { pattern: /^[a-zA-Z0-9_-]{1,50}$/, message: 'Dùng chữ không dấu, số, dấu gạch; tối đa 50 ký tự' }]}>
        <Input maxLength={50} placeholder="NCC-AN-LANH" />
      </Form.Item>
      <Form.Item name="name" label="Tên nhà cung cấp" rules={[{ required: true, whitespace: true, message: 'Nhập tên nhà cung cấp' }]}>
        <Input maxLength={200} placeholder="Nông trại An Lành" />
      </Form.Item>
      <Form.Item name="phone" label="Số điện thoại" rules={[{ pattern: /^[+\d ()-]{0,25}$/, message: 'Số điện thoại không hợp lệ' }]}>
        <Input maxLength={25} placeholder="Số liên hệ (không bắt buộc)" />
      </Form.Item>
      {error && <Alert className="mb-4" type="error" title={error} showIcon />}
      <Button type="primary" htmlType="submit" loading={busy}>Lưu nhà cung cấp</Button>
    </Form>
  );
};
export default SupplierForm;
