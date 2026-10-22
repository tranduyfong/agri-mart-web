import type { ReactNode } from 'react';
import { EnvironmentOutlined, SafetyCertificateOutlined, ShoppingOutlined, TruckOutlined } from '@ant-design/icons';
import { getFileUrl } from '../../utils/fileUrl';
import { formatPrice } from '../../utils/format';
import type { CheckoutSummary } from '../../types/order';

interface OrderSummaryProps {
  summary: CheckoutSummary;
  address?: string;
  children?: ReactNode;
  couponInput?: ReactNode;
}

const OrderSummary = ({ summary, address, children, couponInput }: OrderSummaryProps) => (
  <aside className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
    <div className="flex items-center justify-between border-b border-gray-100 px-5 py-5 sm:px-6">
      <h2 className="text-lg font-bold text-gray-900">Chi tiết đơn hàng</h2>
      <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{summary.items.length} sản phẩm</span>
    </div>
    <ul className="max-h-[440px] overflow-y-auto px-5 sm:px-6">
      {summary.items.map((item, index) => (
        <li key={item.variant_id + index} className="flex items-center gap-4 border-b border-gray-100 py-5 last:border-b-0">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-gray-50">
            {item.thumbnail_url ? <img src={getFileUrl(item.thumbnail_url) || undefined} alt={item.name} className="h-16 w-16 object-contain" /> : <ShoppingOutlined className="text-3xl text-primary/30" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-gray-400">{item.category_name}</p>
            <h3 className="mt-1 text-sm font-bold text-gray-900">{item.name}</h3>
            <p className="mt-1 text-xs text-gray-500">{item.variant_name} · {item.quantity.toLocaleString('vi-VN')} {item.unit}</p>
            <p className="mt-2 text-sm font-bold text-gray-900">{formatPrice(item.line_total)}</p>
          </div>
          <span className="shrink-0 text-sm font-medium text-gray-500">×{item.quantity.toLocaleString('vi-VN')}</span>
        </li>
      ))}
    </ul>
    <div className="space-y-3 border-t border-gray-100 px-5 py-5 text-sm sm:px-6">
      <p className="flex items-center gap-2 text-gray-500"><TruckOutlined className="text-primary" /> Giao hàng tận nơi</p>
      {address && <p className="flex items-start gap-2 text-gray-600"><EnvironmentOutlined className="mt-1 shrink-0 text-primary" /><span className="leading-6">{address}</span></p>}
    </div>
    {couponInput}
    <dl className="space-y-3 border-t border-gray-100 px-5 py-5 text-sm sm:px-6">
      <div className="flex justify-between gap-3"><dt className="text-gray-500">Tạm tính</dt><dd className="font-medium">{formatPrice(summary.subtotal)}</dd></div>
      {summary.discount_amount - (summary.coupon?.discount_amount || 0) > 0 && <div className="flex justify-between gap-3"><dt className="text-gray-500">Ưu đãi sản phẩm</dt><dd className="font-semibold text-primary">−{formatPrice(summary.discount_amount - (summary.coupon?.discount_amount || 0))}</dd></div>}
      <div className="flex justify-between gap-3"><dt className="text-gray-500">Phí giao hàng</dt><dd className="font-medium">{formatPrice(summary.shipping_fee)}</dd></div>
      {summary.coupon && <div className="flex justify-between gap-3"><dt className="min-w-0 break-all text-gray-500">Mã {summary.coupon.code}</dt><dd className="shrink-0 font-semibold text-primary">−{formatPrice(summary.coupon.discount_amount)}</dd></div>}
      <div className="flex items-center justify-between gap-3 border-t border-dashed border-gray-200 pt-4"><dt className="font-bold text-gray-900">Tổng thanh toán</dt><dd data-checkout-total className="text-2xl font-bold text-primary">{formatPrice(summary.total)}</dd></div>
    </dl>
    {children && <div className="px-5 pb-5 sm:px-6">{children}<p className="mt-4 flex items-center justify-center gap-2 text-center text-xs text-gray-400"><SafetyCertificateOutlined className="text-primary" />Thông tin thanh toán được bảo mật</p></div>}
  </aside>
);

export default OrderSummary;
