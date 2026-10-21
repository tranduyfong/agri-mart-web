import { useState } from 'react';
import { Alert, App, Button, Checkbox, Form, Input, Modal, Select } from 'antd';
import { EnvironmentOutlined, ReloadOutlined } from '@ant-design/icons';
import TextField from '../../components/TextField';
import accountService from '../../services/accountService';
import useAccountContext from '../../hooks/useAccountContext';
import useAddressOptions from '../../hooks/useAddressOptions';
import type { AddressFormValues, UserAddress } from '../../types/account';
import { phoneRules, requiredRule } from '../../utils/validationRules';

interface AddressFormModalProps {
  address: UserAddress | null;
  onClose: () => void;
}

const normalizeSearch = (value: string) => {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[đĐ]/g, 'd').toLowerCase();
};

const AddressFormModal = ({ address, onClose }: AddressFormModalProps) => {
  const { user, addresses, onAddressesUpdated, handleError } = useAccountContext();
  const { message } = App.useApp();
  const [form] = Form.useForm<AddressFormValues>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const provinceCode = Form.useWatch('province_code', form);
  const wardCode = Form.useWatch('ward_code', form);
  const streetAddress = Form.useWatch('street_address', form);
  const hamlet = Form.useWatch('hamlet', form);
  const isFirstAddress = addresses.length === 0;
  const isLegacyAddress = !!address && !address.province_code;
  const {
    provinces,
    wards,
    isLoadingProvinces,
    isLoadingWards,
    provinceError,
    wardError,
    retryProvinces,
    retryWards,
  } = useAddressOptions(provinceCode);

  const selectedProvince = provinces.find((province) => province.code === provinceCode);
  const selectedWard = wards.find((ward) => ward.code === wardCode);
  const preview = [
    streetAddress?.trim(),
    hamlet?.trim(),
    selectedWard?.name,
    selectedProvince?.name,
  ].filter(Boolean).join(', ');

  const handleSubmit = async (values: AddressFormValues) => {
    setIsSubmitting(true);

    try {
      const response = await accountService.saveAddress(address?.id ?? null, {
        recipient_name: values.recipient_name.trim(),
        phone: values.phone.trim(),
        province_code: values.province_code,
        ward_code: values.ward_code,
        street_address: values.street_address.trim(),
        hamlet: values.hamlet.trim(),
        is_default: isFirstAddress || !!address?.is_default || !!values.is_default,
      });

      onAddressesUpdated(response.data);
      message.success(response.message);
      onClose();
    } catch (error) {
      handleError(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filterOption = (input: string, option?: { label: string }) => {
    return normalizeSearch(option?.label ?? '').includes(normalizeSearch(input));
  };

  return (
    <Modal
      open
      width={600}
      title={address ? 'Chỉnh sửa địa chỉ' : 'Thêm địa chỉ mới'}
      onCancel={isSubmitting ? undefined : onClose}
      closable={!isSubmitting}
      mask={{ closable: !isSubmitting }}
      okText="Lưu địa chỉ"
      cancelText="Hủy"
      confirmLoading={isSubmitting}
      cancelButtonProps={{ disabled: isSubmitting }}
      okButtonProps={{
        htmlType: 'submit',
        form: 'account-address-form',
        disabled: isLoadingProvinces || isLoadingWards || !!provinceError || !!wardError,
      }}
    >
      <Form
        id="account-address-form"
        form={form}
        layout="vertical"
        requiredMark={false}
        disabled={isSubmitting}
        className="mt-5"
        initialValues={{
          recipient_name: address?.recipient_name ?? user.full_name,
          phone: address?.phone ?? user.phone ?? '',
          province_code: address?.province_code ?? undefined,
          ward_code: address?.ward_code ?? undefined,
          street_address: address?.street_address ?? '',
          hamlet: address?.hamlet ?? '',
          is_default: isFirstAddress || !!address?.is_default,
        }}
        onValuesChange={(changed: Partial<AddressFormValues>) => {
          if ('province_code' in changed) {
            form.setFieldsValue({ ward_code: undefined });
          }
        }}
        onFinish={handleSubmit}
      >
        {isLegacyAddress && (
          <Alert
            className="mb-5"
            type="info"
            showIcon
            title="Chọn lại khu vực cho địa chỉ đã lưu"
            description={
              <span>
                Địa chỉ cũ: {address.address_line}. Chọn tỉnh/thành, phường/xã và nhập riêng số nhà, tên đường bên dưới.
              </span>
            }
          />
        )}

        <div className="grid gap-x-4 sm:grid-cols-2">
          <TextField
            name="recipient_name"
            label="Tên người nhận"
            placeholder="Nhập họ tên người nhận"
            rules={[
              requiredRule('Vui lòng nhập tên người nhận'),
              { max: 150, message: 'Tên người nhận không được quá 150 ký tự' },
            ]}
          />
          <TextField name="phone" label="Số điện thoại" placeholder="Số điện thoại nhận hàng" rules={phoneRules} />
        </div>

        <div className="grid gap-x-4 sm:grid-cols-2">
          <div className="min-w-0">
            <Form.Item
              name="province_code"
              label={<span className="font-semibold">Tỉnh/Thành phố</span>}
              rules={[{ required: true, message: 'Vui lòng chọn tỉnh/thành phố' }]}
            >
              <Select
                size="large"
                className="w-full"
                placeholder="Chọn tỉnh/thành phố"
                aria-label="Tỉnh/Thành phố"
                allowClear
                showSearch={{ filterOption }}
                loading={isLoadingProvinces}
                disabled={isSubmitting || isLoadingProvinces || !!provinceError}
                options={provinces.map((province) => ({ value: province.code, label: province.name }))}
              />
            </Form.Item>
            {!!provinceError && (
              <Alert
                className="mb-5"
                type="error"
                showIcon
                title={provinceError}
                action={<Button size="small" icon={<ReloadOutlined />} onClick={retryProvinces}>Thử lại</Button>}
              />
            )}
          </div>

          <div className="min-w-0">
            <Form.Item
              name="ward_code"
              label={<span className="font-semibold">Phường/Xã</span>}
              rules={[{ required: true, message: 'Vui lòng chọn phường/xã' }]}
            >
              <Select
                size="large"
                className="w-full"
                placeholder={provinceCode ? 'Chọn phường/xã' : 'Chọn tỉnh/thành phố trước'}
                aria-label="Phường/Xã"
                allowClear
                showSearch={{ filterOption }}
                loading={isLoadingWards}
                disabled={isSubmitting || !provinceCode || isLoadingProvinces || isLoadingWards || !!provinceError || !!wardError}
                options={wards.map((ward) => ({ value: ward.code, label: ward.name }))}
              />
            </Form.Item>
            {!!wardError && (
              <Alert
                className="mb-5"
                type="error"
                showIcon
                title={wardError}
                action={<Button size="small" icon={<ReloadOutlined />} onClick={retryWards}>Thử lại</Button>}
              />
            )}
          </div>
        </div>

        <TextField
          name="hamlet"
          label="Thôn/Ấp/Tổ dân phố"
          placeholder="Ví dụ: Thôn Đồng Tâm, Ấp 2 hoặc Tổ dân phố 5"
          rules={[{ max: 150, message: 'Thôn/ấp/tổ dân phố không được quá 150 ký tự' }]}
        />
        <p className="-mt-3 mb-5 text-xs leading-5 text-gray-400">
          Nhập tên thôn, ấp hoặc tổ dân phố nếu địa chỉ của bạn có thông tin này.
        </p>

        <Form.Item
          name="street_address"
          label={<span className="font-semibold">Số nhà, tên đường</span>}
          dependencies={['hamlet']}
          rules={[
            ({ getFieldValue }) => ({
              validator(_, value: string) {
                if (value?.trim() || getFieldValue('hamlet')?.trim()) return Promise.resolve();
                return Promise.reject(new Error('Vui lòng nhập số nhà, tên đường hoặc thôn/ấp/tổ dân phố'));
              },
            }),
            { max: 300, message: 'Địa chỉ chi tiết không được quá 300 ký tự' },
          ]}
        >
          <Input.TextArea
            autoSize={{ minRows: 2, maxRows: 4 }}
            maxLength={300}
            showCount
            placeholder="Ví dụ: Số 12, ngõ 34, đường Hoàng Hoa Thám"
          />
        </Form.Item>

        {!!preview && (
          <div className="mt-5 flex gap-3 rounded-xl border border-primary/15 bg-primary/5 p-4">
            <EnvironmentOutlined className="mt-1 shrink-0 text-primary" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-primary">Địa chỉ nhận hàng</p>
              <p className="mt-1 break-words text-sm leading-6 text-gray-600">{preview}</p>
            </div>
          </div>
        )}

        <Form.Item name="is_default" valuePropName="checked" className="mt-6 mb-1">
          <Checkbox disabled={isSubmitting || isFirstAddress || !!address?.is_default}>
            Đặt làm địa chỉ mặc định
          </Checkbox>
        </Form.Item>
        {(isFirstAddress || !!address?.is_default) && (
          <p className="mt-2 text-xs leading-5 text-gray-400">
            Bạn có thể đổi địa chỉ mặc định từ danh sách địa chỉ đã lưu.
          </p>
        )}
      </Form>
    </Modal>
  );
};

export default AddressFormModal;
