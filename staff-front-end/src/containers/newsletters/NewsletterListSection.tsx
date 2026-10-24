import { useCallback, useState } from 'react';
import { Button, Table } from 'antd';
import { Link } from 'react-router-dom';
import useData from '../../hooks/useData';
import newsletterService from '../../services/newsletterService';
import PageHeader from '../../components/PageHeader';
import Panel from '../../components/Panel';
import StatCard from '../../components/StatCard';
import LoadingCard from '../../components/LoadingCard';
import StatusTag from '../../components/StatusTag';
import { tablePagination } from '../../utils/tablePagination';
import type { Newsletter } from '../../types/staff';

const NewsletterListSection = () => {
  const [page, setPage] = useState(0);
  const load = useCallback(() => newsletterService.getNewsletters({ pageNumber: page, pageSize: 10 }), [page]);
  const { data, error, reload } = useData(load, 10000);
  return (
    <>
      <PageHeader
        title="Bản tin email"
        description="Gửi thông tin mới đến khách hàng đã đăng ký nhận bản tin."
        actions={
          <Link to="/newsletters/new">
            <Button type="primary">+ Soạn bản tin</Button>
          </Link>
        }
      />
      {data && (
        <div className="mb-6 grid gap-5 sm:grid-cols-2">
          <StatCard label="Đang đăng ký" value={data.meta.subscribers.active} hint="Email nhận bản tin toàn hệ thống" />
          <StatCard
            label="Đã hủy đăng ký"
            value={data.meta.subscribers.inactive}
            hint="Không nằm trong danh sách gửi"
          />
        </div>
      )}
      {!data ? (
        <LoadingCard error={error} onRetry={reload} />
      ) : (
        <Panel title="Lịch sử bản tin">
          <Table<Newsletter>
            rowKey="id"
            dataSource={data.data}
            scroll={{ x: 800 }}
            pagination={tablePagination(page, data.totalElements, setPage)}
            columns={[
              {
                title: 'Tiêu đề',
                render: (_, row) => <Link to={'/newsletters/' + row.id + '/edit'}>{row.subject}</Link>,
              },
              {
                title: 'Ngày gửi',
                render: (_, row) => (row.sent_at ? new Date(row.sent_at).toLocaleString('vi-VN') : '—'),
              },
              { title: 'Người nhận', dataIndex: 'recipient_count' },
              { title: 'Thành công', dataIndex: 'sent_count' },
              { title: 'Thất bại', dataIndex: 'failed_count' },
              { title: 'Trạng thái', render: (_, row) => <StatusTag status={row.status} /> },
            ]}
          />
        </Panel>
      )}
    </>
  );
};
export default NewsletterListSection;
