import { useState } from 'react';
import { App, Button, Empty, Popconfirm, Tag } from 'antd';
import { CheckCircleFilled, DeleteOutlined, EditOutlined, EnvironmentOutlined, PlusOutlined } from '@ant-design/icons';
import AddressFormModal from './AddressFormModal';
import accountService from '../../services/accountService';
import useAccountContext from '../../hooks/useAccountContext';
import type { UserAddress } from '../../types/account';

const AddressBookSection = () => {
  const { user, addresses, onAddressesUpdated, handleError } = useAccountContext();
  const { message } = App.useApp();
  const [editor, setEditor] = useState<{ address: UserAddress | null } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const changeAddress = async (addressId: string, isRemoving: boolean) => {
    setIsSubmitting(true);
    try {
      const response = isRemoving
        ? await accountService.removeAddress(addressId)
        : await accountService.setDefaultAddress(addressId);
      onAddressesUpdated(response.data);
      message.success(response.message);
    } catch (error) { handleError(error); }
    finally { setIsSubmitting(false); }
  };

  return (
    <section>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sổ địa chỉ</h1>
          <p className="mt-2 max-w-md text-sm leading-6 text-gray-500">Lưu địa chỉ nhận hàng và chọn địa chỉ mặc định cho những lần đặt hàng sau.</p>
        </div>
        <Button type="primary" size="large" icon={<PlusOutlined />} disabled={isSubmitting} onClick={() => setEditor({ address: null })}>Thêm địa chỉ</Button>
      </div>

      {addresses.length === 0 ? (
        <Empty className="py-12" image={<EnvironmentOutlined className="text-6xl text-primary/30" />} description="Bạn chưa có địa chỉ nhận hàng">
          <Button type="primary" onClick={() => setEditor({ address: null })}>Thêm địa chỉ đầu tiên</Button>
        </Empty>
      ) : (
        <div className="mt-7 space-y-4">
          {addresses.map((address) => (
            <article key={address.id} className={`rounded-xl border p-4 sm:p-5 ${address.is_default ? 'border-primary/30 bg-primary/3' : 'border-gray-200'}`}>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-bold text-gray-900">{address.recipient_name}</h2>
                <span className="text-sm text-gray-500">· {address.phone}</span>
                {!!address.is_default && <Tag color="green" icon={<CheckCircleFilled />}>Mặc định</Tag>}
              </div>
              <p className="mt-3 break-words text-sm leading-6 text-gray-600">{address.address_line}</p>
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3">
                {!address.is_default && <Button disabled={isSubmitting} onClick={() => changeAddress(address.id, false)}>Đặt làm mặc định</Button>}
                <Button icon={<EditOutlined />} disabled={isSubmitting} onClick={() => setEditor({ address })}>Chỉnh sửa</Button>
                <Popconfirm title="Xóa địa chỉ này?" description={address.is_default && addresses.length > 1 ? 'Một địa chỉ còn lại sẽ được chọn làm mặc định.' : undefined} okText="Xóa" cancelText="Giữ lại" onConfirm={() => changeAddress(address.id, true)}>
                  <Button type="text" danger icon={<DeleteOutlined />} disabled={isSubmitting}>Xóa</Button>
                </Popconfirm>
              </div>
            </article>
          ))}
        </div>
      )}
      {editor && <AddressFormModal key={editor.address?.id ?? 'new'} address={editor.address} onClose={() => setEditor(null)} user={user} addresses={addresses} onAddressesUpdated={onAddressesUpdated} handleError={handleError} />}
    </section>
  );
};

export default AddressBookSection;
