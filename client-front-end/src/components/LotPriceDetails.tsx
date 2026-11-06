import type { LotPricePart } from '../utils/lotPricing';
import { formatPrice } from '../utils/format';

// Một SKU có thể lấy nhiều lô. Hiện rõ hạn và giá, không dùng giá bình quân gây hiểu nhầm.
const LotPriceDetails = ({ parts, unit }: { parts?: LotPricePart[]; unit: string }) => {
  if (!parts?.length) return null;
  return (
    <ul className="mt-2 space-y-1 text-xs leading-5 text-gray-500">
      {parts.map((part) => (
        <li key={part.batch_code}>
          {part.quantity.toLocaleString('vi-VN')} {unit} × {formatPrice(part.price)} · HSD{' '}
          {new Date(part.expiry_date).toLocaleDateString('vi-VN')}
        </li>
      ))}
    </ul>
  );
};
export default LotPriceDetails;
