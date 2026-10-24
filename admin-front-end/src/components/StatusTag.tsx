import { Tag } from 'antd';
const LABELS: Record<string, [string, string]> = {
  ACTIVE: ['Hoạt động', 'green'],
  INACTIVE: ['Tạm dừng', 'default'],
  LOCKED: ['Đã khóa', 'red'],
  PENDING: ['Chưa xác minh', 'gold'],
};
const StatusTag = ({ status }: { status: string }) => (
  <Tag color={LABELS[status]?.[1]}>{LABELS[status]?.[0] || status}</Tag>
);
export default StatusTag;
