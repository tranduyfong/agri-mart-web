import { Input } from 'antd';
import { OTP_LENGTH } from '../utils/constants';

interface OtpCodeInputProps {
  onInput: (code: string) => void; // Gọi mỗi khi người dùng gõ / xóa 1 ô, trả về mã đang nhập
}

// Các ô nhập mã OTP (mỗi ô 1 chữ số), viền xanh như thiết kế
const OtpCodeInput = ({ onInput }: OtpCodeInputProps) => {
  return (
    <div className="flex justify-center">
      <Input.OTP
        length={OTP_LENGTH}
        size="large"
        // Chỉ cho nhập số
        formatter={(text) => text.replace(/\D/g, '')}
        // antd trả về mảng từng ô, VD: ['1', '2', '3'] -> ghép lại thành '123'
        onInput={(cells) => onInput(cells.join(''))}
        classNames={{ input: 'h-12! w-12! border-primary! text-lg! font-semibold' }}
      />
    </div>
  );
};

export default OtpCodeInput;
