import { InputNumber } from 'antd';
import { MinusOutlined, PlusOutlined } from '@ant-design/icons';

interface QuantitySelectorProps {
  value: number;
  step: number;
  max: number;
  unit: string;
  onChange: (value: number) => void;
  disabled?: boolean;
}

// Chọn số lượng theo đơn vị và bước bán của quy cách đang chọn
const QuantitySelector = ({ value, step, max, unit, onChange, disabled = false }: QuantitySelectorProps) => {
  const isDisabled = disabled || max < step;

  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white p-1.5">
      <button
        type="button"
        aria-label="Giảm số lượng"
        disabled={isDisabled || value <= step}
        onClick={() => onChange(value - step)}
        className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <MinusOutlined />
      </button>
      <InputNumber
        aria-label="Số lượng mua"
        controls={false}
        variant="borderless"
        min={isDisabled ? 0 : step}
        max={max}
        step={step}
        decimalSeparator=","
        value={value}
        disabled={isDisabled}
        onChange={(nextValue) => onChange(nextValue ?? step)}
        className="w-20 [&_input]:text-center [&_input]:font-semibold"
      />
      <span className="pr-2 text-sm text-gray-500">{unit}</span>
      <button
        type="button"
        aria-label="Tăng số lượng"
        disabled={isDisabled || value >= max}
        onClick={() => onChange(value + step)}
        className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full bg-primary text-white hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-40"
      >
        <PlusOutlined />
      </button>
    </div>
  );
};

export default QuantitySelector;
