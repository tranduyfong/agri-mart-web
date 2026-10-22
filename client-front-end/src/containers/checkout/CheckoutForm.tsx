import { useRef, useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { Alert, App, Button, Empty, Form, Input, Radio, Select, Tag } from 'antd';
import { CheckCircleFilled, CreditCardOutlined, EnvironmentOutlined, LockOutlined, PlusOutlined, WalletOutlined } from '@ant-design/icons';
import TextField from '../../components/TextField';
import PrimaryButton from '../../components/PrimaryButton';
import AddressFormModal from '../account/AddressFormModal';
import OrderSummary from './OrderSummary';
import orderService from '../../services/orderService';
import { useAppDispatch } from '../../hooks/useRedux';
import { fetchShopping } from '../../store/slices/shoppingSlice';
import { logout } from '../../store/slices/authSlice';
import { clearAuth, getSavedAccessToken } from '../../utils/authStorage';
import { getErrorMessage } from '../../utils/errorMessage';
import { getOrderResultPath, ROUTES } from '../../utils/constants';
import { emailRules, phoneRules, requiredRule } from '../../utils/validationRules';
import type { AccountData, UserAddress } from '../../types/account';
import type { CheckoutFormValues, CheckoutPreview } from '../../types/order';

interface CheckoutFormProps {
  account: AccountData;
  preview: CheckoutPreview;
  cartItemIds: string[];
  checkoutKey: string;
  sessionToken: string;
  onReload: () => void;
}

const CheckoutForm = ({ account, preview, cartItemIds, checkoutKey, sessionToken, onReload }: CheckoutFormProps) => {
  const [form] = Form.useForm<CheckoutFormValues>();
  const [addresses, setAddresses] = useState(account.addresses);
  const initialAddress = account.addresses.find((address) => address.is_default) || account.addresses[0];
  const [addressId, setAddressId] = useState(initialAddress?.id);
  const [isAddressOpen, setIsAddressOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const submittingRef = useRef(false);
  const paymentMethod = Form.useWatch('payment_method', form) || (preview.vnpay_available ? 'VNPAY' : 'COD');
  const selectedAddress = addresses.find((address) => address.id === addressId);
  const { message } = App.useApp();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const selectAddress = (id: string, list = addresses) => {
    setAddressId(id);
    const address = list.find((item) => item.id === id);
    if (address) form.setFieldsValue({ recipient_name: address.recipient_name, phone: address.phone });
  };

  const addressesUpdated = (list: UserAddress[]) => {
    const added = list.find((address) => !addresses.some((item) => item.id === address.id));
    setAddresses(list);
    if (added) selectAddress(added.id, list);
  };

  const handleSubmit = async (values: CheckoutFormValues) => {
    if (submittingRef.current || !selectedAddress) return;
    submittingRef.current = true;
    setIsSubmitting(true);
    setSubmitError('');
    try {
      const result = await orderService.checkout({
        ...values, address_id: selectedAddress.id, cart_item_ids: cartItemIds, checkout_key: checkoutKey, expected_total: preview.total,
      });
      if (getSavedAccessToken() !== sessionToken) return;
      sessionStorage.removeItem('agrimart.checkout.' + account.user.id);
      dispatch(fetchShopping());
      if (result.redirectUrl) {
        window.location.assign(result.redirectUrl);
      } else {
        navigate(getOrderResultPath(result.checkout_code), { replace: true });
      }
    } catch (error) {
      if (getSavedAccessToken() !== sessionToken) return;
      setSubmitError(getErrorMessage(error));
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        clearAuth();
        dispatch(logout());
        navigate(ROUTES.LOGIN, { state: { returnTo: window.location.pathname + window.location.search } });
      }
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <Form
      name="checkout"
      form={form}
      layout="vertical"
      requiredMark={false}
      disabled={isSubmitting}
      onFinish={handleSubmit}
      initialValues={{
        recipient_name: initialAddress?.recipient_name || account.user.full_name,
        phone: initialAddress?.phone || account.user.phone || '',
        email: account.user.email,
        payment_method: preview.vnpay_available ? 'VNPAY' : 'COD',
        note: '',
      }}
    >
      <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1.25fr)_minmax(340px,0.9fr)] lg:gap-10">
        <div className="min-w-0 space-y-6">
          <div className="flex gap-3 rounded-2xl border border-primary/15 bg-primary/5 p-4">
            <CheckCircleFilled className="mt-0.5 text-lg text-primary" />
            <div><p className="text-sm font-semibold text-gray-800">Một bước nữa để nhận thực phẩm tươi ngon</p><p className="mt-1 text-xs leading-5 text-gray-500">Kiểm tra thông tin người nhận và chọn phương thức thanh toán phù hợp.</p></div>
          </div>

          <section className="rounded-2xl border border-gray-100 bg-white p-5 sm:p-7">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900"><EnvironmentOutlined className="text-primary" />Địa chỉ giao hàng</h2>
              <Button type="text" className="font-semibold text-primary" icon={<PlusOutlined />} onClick={() => setIsAddressOpen(true)}>Thêm địa chỉ</Button>
            </div>
            {addresses.length ? (
              <>
                <Select
                  size="large"
                  className="w-full"
                  aria-label="Chọn địa chỉ giao hàng"
                  value={addressId}
                  onChange={(id: string) => selectAddress(id)}
                  options={addresses.map((address) => ({
                    value: address.id,
                    label: (address.is_default ? 'Mặc định · ' : '') + address.recipient_name + ' · ' + address.address_line,
                  }))}
                />
                {selectedAddress && <div className="mt-4 rounded-xl border border-primary/20 bg-primary/4 p-4">
                  <div className="flex flex-wrap items-center gap-2"><span className="text-sm font-bold text-gray-800">{selectedAddress.recipient_name}</span><span className="text-sm text-gray-500">{selectedAddress.phone}</span>{!!selectedAddress.is_default && <Tag color="green">Mặc định</Tag>}</div>
                  <p className="mt-2 text-sm leading-6 text-gray-600">{selectedAddress.address_line}</p>
                </div>}
              </>
            ) : (
              <Empty image={<EnvironmentOutlined className="text-5xl text-primary/30" />} description="Thêm địa chỉ nhận hàng để tiếp tục">
                <Button type="primary" onClick={() => setIsAddressOpen(true)}>Thêm địa chỉ đầu tiên</Button>
              </Empty>
            )}

            <div className="mt-6 border-t border-gray-100 pt-6">
              <h3 className="mb-4 text-sm font-bold text-gray-800">Thông tin người nhận</h3>
              <div className="grid gap-x-4 sm:grid-cols-2">
                <TextField name="recipient_name" label="Họ và tên" placeholder="Tên người nhận hàng" rules={[requiredRule('Vui lòng nhập họ tên'), { max: 150, message: 'Họ tên tối đa 150 ký tự' }]} />
                <TextField name="phone" label="Số điện thoại" placeholder="Số điện thoại nhận hàng" rules={phoneRules} />
              </div>
              <TextField name="email" label="Email liên hệ" placeholder="Email của bạn" rules={emailRules} />
              <p className="-mt-2 text-xs leading-5 text-gray-400">Bạn có thể đổi người nhận cho đơn này. Thông tin trong sổ địa chỉ được giữ nguyên.</p>
              <Form.Item name="note" label={<span className="font-semibold">Ghi chú giao hàng <span className="font-normal text-gray-400">(không bắt buộc)</span></span>} className="mb-0! mt-5" rules={[{ max: 1000, message: 'Ghi chú tối đa 1000 ký tự' }]}>
                <Input.TextArea rows={3} maxLength={1000} placeholder="Ví dụ: Gọi trước khi giao, giao tại quầy lễ tân…" />
              </Form.Item>
            </div>
          </section>

          <section className="rounded-2xl border border-gray-100 bg-white p-5 sm:p-7">
            <h2 className="text-lg font-bold text-gray-900">Phương thức thanh toán</h2>
            <p className="mt-2 text-sm leading-6 text-gray-500">Chọn cách thanh toán thuận tiện cho bạn.</p>
            <Form.Item name="payment_method" className="mb-0! mt-5">
              <Radio.Group className="w-full! space-y-3 text-sm">
                <div className={`flex items-center gap-3 rounded-xl border p-4 transition ${paymentMethod === 'VNPAY' ? 'border-primary bg-primary/4' : 'border-gray-200'} ${!preview.vnpay_available ? 'opacity-50' : ''}`}>
                  <Radio value="VNPAY" aria-label="Thanh toán qua VNPay" disabled={!preview.vnpay_available} />
                  <div className="flex-1"><button type="button" disabled={!preview.vnpay_available || isSubmitting} className="cursor-pointer text-left font-semibold text-gray-800" onClick={() => form.setFieldValue('payment_method', 'VNPAY')}>Thanh toán qua VNPay</button><p className="mt-1 text-xs leading-5 text-gray-500">Quét QR, thẻ ATM hoặc tài khoản ngân hàng</p></div>
                  <span className="shrink-0 text-base font-black tracking-tight"><span className="text-[#ed1c24]">VN</span><span className="text-[#005baa]">PAY</span></span>
                </div>
                <div className={`flex items-center gap-3 rounded-xl border p-4 transition ${paymentMethod === 'COD' ? 'border-primary bg-primary/4' : 'border-gray-200'}`}>
                  <Radio value="COD" aria-label="Thanh toán khi nhận hàng" />
                  <div className="flex-1"><button type="button" disabled={isSubmitting} className="cursor-pointer text-left font-semibold text-gray-800" onClick={() => form.setFieldValue('payment_method', 'COD')}>Thanh toán khi nhận hàng</button><p className="mt-1 text-xs leading-5 text-gray-500">Thanh toán cho nhân viên giao hàng</p></div>
                  <WalletOutlined className="text-2xl text-primary" />
                </div>
              </Radio.Group>
            </Form.Item>
            {!preview.vnpay_available && <Alert className="mt-4" type="info" showIcon title="VNPay hiện chưa sẵn sàng. Bạn có thể thanh toán khi nhận hàng." />}
          </section>

          <div className="flex items-start gap-3 rounded-2xl border border-gray-100 bg-white p-5">
            <LockOutlined className="mt-1 text-lg text-primary" />
            <div><h2 className="text-sm font-bold text-gray-800">Thanh toán an toàn</h2><p className="mt-1 text-sm leading-6 text-gray-500">{paymentMethod === 'VNPAY' ? 'Bạn sẽ được chuyển đến cổng VNPay để thanh toán. Sau khi hoàn tất, kết quả sẽ hiển thị tại AgriFood Smart.' : 'Đơn hàng được ghi nhận ngay. Bạn thanh toán khi nhận được hàng.'}</p></div>
          </div>
        </div>

        <div className="min-w-0 lg:sticky lg:top-6">
          <OrderSummary summary={preview} address={selectedAddress?.address_line}>
            {submitError && <Alert className="mb-4" type="error" showIcon title={submitError} action={<Button size="small" onClick={onReload}>Kiểm tra lại</Button>} />}
            <div className="[&_button]:h-12">
              <PrimaryButton htmlType="submit" loading={isSubmitting} disabled={!selectedAddress}>
                {paymentMethod === 'VNPAY' ? <span><CreditCardOutlined className="mr-2" />Tiếp tục với VNPay</span> : 'Xác nhận đặt hàng'}
              </PrimaryButton>
            </div>
            <p className="mt-4 text-center text-xs leading-5 text-gray-400">Bằng việc đặt hàng, bạn xác nhận thông tin giao hàng trên là chính xác.</p>
          </OrderSummary>
          <div className="mt-5 text-center"><Link to={ROUTES.CART} className="text-sm font-semibold text-gray-500 hover:text-primary">Quay lại giỏ hàng</Link></div>
        </div>
      </div>

      {isAddressOpen && <AddressFormModal
        address={null}
        onClose={() => setIsAddressOpen(false)}
        user={account.user}
        addresses={addresses}
        onAddressesUpdated={addressesUpdated}
        handleError={(error) => message.error(getErrorMessage(error))}
      />}
    </Form>
  );
};

export default CheckoutForm;
