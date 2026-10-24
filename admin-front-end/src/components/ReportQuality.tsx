import { Alert } from 'antd';
import type { RevenueReport } from '../types/admin';
const ReportQuality = ({ quality }: { quality: RevenueReport['quality'] }) => (
  <div className="space-y-3">
    {quality.missing_cost_lines > 0 && (
      <Alert
        type="warning"
        showIcon
        title={`Có ${quality.missing_cost_lines} dòng hàng chưa đủ giá vốn lịch sử.`}
        description="Giá vốn và lợi nhuận để trống khi chưa đủ dữ liệu. Các đơn mới lưu giá vốn theo đúng lô khi đặt hàng."
      />
    )}
    {quality.legacy_completion_dates > 0 && (
      <Alert
        type="info"
        showIcon
        title={`${quality.legacy_completion_dates} đơn cũ chưa lưu thời điểm hoàn tất; báo cáo dùng ngày tạo đơn cho các đơn này.`}
      />
    )}
  </div>
);
export default ReportQuality;
