import { useState } from 'react';
import { Link } from 'react-router-dom';
import { App, Button, Form, Input } from 'antd';
import { CheckCircleFilled, EditOutlined, EnvironmentOutlined, LockOutlined } from '@ant-design/icons';
import TextField from '../../components/TextField';
import PrimaryButton from '../../components/PrimaryButton';
import useAccountContext from '../../hooks/useAccountContext';
import accountService from '../../services/accountService';
import type { ProfileFormValues } from '../../types/account';
import { phoneRules, requiredRule } from '../../utils/validationRules';
import { ROUTES } from '../../utils/constants';

const PersonalInformationForm = () => {
  const { user, addresses, onUserUpdated, handleError } = useAccountContext();
  const { message } = App.useApp();
  const [form] = Form.useForm<ProfileFormValues>();
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const defaultAddress = addresses.find((address) => address.is_default);

  const cancelEditing = () => {
    form.setFieldsValue({ full_name: user.full_name, phone: user.phone });
    setHasChanges(false);
    setIsEditing(false);
  };

  const handleSubmit = async (values: ProfileFormValues) => {
    setIsSubmitting(true);
    try {
      const response = await accountService.updateProfile({ full_name: values.full_name.trim(), phone: values.phone?.trim() || null });
      onUserUpdated(response.data);
      form.setFieldsValue({ full_name: response.data.full_name, phone: response.data.phone });
      setIsEditing(false);
      setHasChanges(false);
      message.success(response.message);
    } catch (error) { handleError(error); }
    finally { setIsSubmitting(false); }
  };

  return (
    <section>
      <h1 className="text-2xl font-bold text-gray-900">Thông tin cá nhân</h1>
      <p className="mt-2 text-sm leading-6 text-gray-500">Quản lý thông tin liên hệ của bạn để mua sắm thuận tiện hơn.</p>
      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        className="mt-7"
        disabled={isSubmitting}
        initialValues={{ full_name: user.full_name, phone: user.phone }}
        onValuesChange={() => setHasChanges(true)}
        onFinish={handleSubmit}
      >
        <TextField name="full_name" label="Họ và tên" placeholder="Nhập họ và tên" readOnly={!isEditing} rules={[requiredRule('Vui lòng nhập họ tên'), { max: 150, message: 'Họ tên không được quá 150 ký tự' }]} />
        <Form.Item label={<span className="font-semibold">Email đăng nhập</span>} extra={<span className="text-xs text-gray-400">Email được dùng để đăng nhập và xác minh tài khoản.</span>}>
          <Input size="large" value={user.email} readOnly aria-label="Email đăng nhập" suffix={<LockOutlined className="text-gray-400" />} className="bg-gray-50 text-sm text-gray-700" />
        </Form.Item>
        <TextField name="phone" label="Số điện thoại" placeholder="Nhập số điện thoại" readOnly={!isEditing} rules={phoneRules.slice(1)} />
        <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-gray-100 pt-5">
          {isEditing ? (
            <Button size="large" disabled={isSubmitting} onClick={cancelEditing}>Hủy</Button>
          ) : (
            <Button size="large" icon={<EditOutlined />} disabled={isSubmitting} onClick={() => setIsEditing(true)}>Chỉnh sửa thông tin</Button>
          )}
          <div className="min-w-36"><PrimaryButton htmlType="submit" loading={isSubmitting} disabled={!isEditing || !hasChanges}>Lưu thay đổi</PrimaryButton></div>
        </div>
      </Form>

      <div className="mt-8 rounded-xl border border-primary/15 bg-primary/5 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-bold text-gray-800"><EnvironmentOutlined className="text-primary" />Địa chỉ giao hàng mặc định</h2>
          <Link to={ROUTES.ACCOUNT_ADDRESSES} className="text-sm font-semibold text-primary hover:underline">{defaultAddress ? 'Quản lý địa chỉ' : 'Thêm địa chỉ'}</Link>
        </div>
        {defaultAddress ? (
          <div className="mt-3 text-sm leading-6 text-gray-600">
            <p className="font-semibold text-gray-800">{defaultAddress.recipient_name} <span className="font-normal text-gray-500">· {defaultAddress.phone}</span></p>
            <p className="mt-1 break-words">{defaultAddress.address_line}</p>
            <p className="mt-2 flex items-center gap-1.5 text-xs text-primary"><CheckCircleFilled />Đã lưu để sử dụng cho lần đặt hàng sau</p>
          </div>
        ) : <p className="mt-3 text-sm leading-6 text-gray-500">Bạn chưa có địa chỉ mặc định. Thêm địa chỉ để tiết kiệm thời gian khi đặt hàng.</p>}
      </div>
    </section>
  );
};

export default PersonalInformationForm;
