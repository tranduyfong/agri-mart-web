import { App, Button } from 'antd';
import { CopyOutlined } from '@ant-design/icons';

// Dùng chung ở thẻ ưu đãi và mã đã áp dụng khi thanh toán.
const CopyCodeButton = ({ code }: { code: string }) => {
  const { message } = App.useApp();
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      message.success('Đã sao chép mã ' + code);
    } catch {
      message.error('Chưa sao chép được. Bạn có thể chọn và sao chép mã bên cạnh.');
    }
  };
  return (
    <Button size="small" icon={<CopyOutlined />} aria-label={'Sao chép mã ' + code} onClick={copy}>
      Sao chép
    </Button>
  );
};
export default CopyCodeButton;
