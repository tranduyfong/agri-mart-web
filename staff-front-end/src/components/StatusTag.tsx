import { Tag } from 'antd';
const STATUSES: Record<string, [string, string]> = {
  PENDING: ['Chờ xác nhận', 'gold'],
  CONFIRMED: ['Đang chuẩn bị', 'blue'],
  SHIPPING: ['Đang giao', 'blue'],
  COMPLETED: ['Hoàn tất', 'green'],
  CANCELLED: ['Đã hủy', 'red'],
  PUBLISHED: ['Đang bán', 'green'],
  DRAFT: ['Bản nháp', 'default'],
  ARCHIVED: ['Ngừng bán', 'default'],
  VALID: ['Còn hạn', 'green'],
  EXPIRING: ['Sắp hết hạn', 'gold'],
  EXPIRED: ['Hết hạn · khóa bán', 'red'],
  ACTIVE: ['Đang áp dụng', 'green'],
  UPCOMING: ['Sắp diễn ra', 'blue'],
  ENDED: ['Đã kết thúc', 'default'],
  PAID: ['Đã thanh toán', 'green'],
  UNPAID: ['Chưa thanh toán', 'gold'],
  REFUNDED: ['Đã hoàn tiền', 'default'],
  SENT: ['Đã gửi', 'green'],
  SENDING: ['Đang gửi', 'blue'],
  PARTIAL: ['Cần kiểm tra', 'gold'],
  FAILED: ['Gửi thất bại', 'red'],
  SKIPPED: ['Đã bỏ qua', 'default'],
  AI_ACTIVE: ['AI đang hỗ trợ', 'blue'],
  STAFF_ACTIVE: ['Nhân viên hỗ trợ', 'green'],
  CLOSED: ['Đã kết thúc', 'default'],
};
const StatusTag = ({ status, label }: { status: string; label?: string }) => (
  <Tag color={STATUSES[status]?.[1]}>{label || STATUSES[status]?.[0] || status}</Tag>
);
export default StatusTag;
