import { useState } from 'react';
import { Button, Input } from 'antd';
import { CheckCircleFilled, TagOutlined } from '@ant-design/icons';
import { formatPrice } from '../../utils/format';
import type { CheckoutSummary } from '../../types/order';

interface CouponInputProps {
  coupon: CheckoutSummary['coupon'];
  isLoading: boolean;
  disabled: boolean;
  error: string;
  onApply: (code: string) => void;
}

const CouponInput = ({ coupon, isLoading, disabled, error, onApply }: CouponInputProps) => {
  const [code, setCode] = useState('');
  const apply = () => {
    if (code.trim()) onApply(code.trim());
  };

  return (
    <section className="border-t border-gray-100 px-5 py-5 sm:px-6" aria-label="Mã giảm giá">
      <label htmlFor="checkout-coupon" className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <TagOutlined className="text-primary" />
        Mã giảm giá
      </label>
      <div className="flex gap-2">
        <Input
          id="checkout-coupon"
          placeholder="Nhập mã giảm giá"
          maxLength={80}
          value={code}
          disabled={disabled || isLoading}
          status={error ? 'error' : undefined}
          aria-describedby={error ? 'checkout-coupon-error' : undefined}
          onChange={(event) => setCode(event.target.value.toUpperCase())}
          onPressEnter={(event) => {
            event.preventDefault();
            apply();
          }}
        />
        <Button
          htmlType="button"
          type="primary"
          loading={isLoading}
          disabled={disabled || !code.trim()}
          onClick={apply}
        >
          Áp dụng
        </Button>
      </div>
      {error && (
        <p id="checkout-coupon-error" role="alert" className="mt-2 text-xs text-red-500">
          {error}
        </p>
      )}
      {coupon ? (
        <div role="status" className="mt-3 rounded-xl bg-green-50 p-3 text-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-2 font-semibold text-primary">
              <CheckCircleFilled className="shrink-0" />
              <span className="break-all">{coupon.code}</span>
            </span>
            <Button
              htmlType="button"
              size="small"
              type="text"
              disabled={disabled || isLoading}
              onClick={() => onApply('')}
            >
              Bỏ mã
            </Button>
          </div>
          <p className="mt-1 text-xs text-gray-600">
            {coupon.name} · Giảm {formatPrice(coupon.discount_amount)}
          </p>
        </div>
      ) : (
        <p className="mt-2 text-xs text-gray-400">Áp dụng một mã cho mỗi đơn hàng.</p>
      )}
    </section>
  );
};

export default CouponInput;
