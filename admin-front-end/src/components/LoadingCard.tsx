// Hiển thị đang tải hoặc lỗi kèm nút thử lại cho các màn hình quản lý.
import { Alert, Button, Skeleton } from 'antd';
import Panel from './Panel';
const LoadingCard = ({ error, onRetry }: { error?: string; onRetry?: () => void }) => (
  <Panel>
    {error ? (
      <Alert
        type="error"
        showIcon
        title="Chưa tải được dữ liệu"
        description={error}
        action={onRetry && <Button onClick={onRetry}>Thử lại</Button>}
      />
    ) : (
      <Skeleton active paragraph={{ rows: 6 }} />
    )}
  </Panel>
);
export default LoadingCard;
