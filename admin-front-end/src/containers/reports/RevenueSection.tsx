import { useCallback, useState } from 'react';
import { Button, Dropdown, Table } from 'antd';
import { Link, useSearchParams } from 'react-router-dom';
import dayjs from 'dayjs';
import useData from '../../hooks/useData';
import reportService from '../../services/reportService';
import PageHeader from '../../components/PageHeader';
import MetricCard from '../../components/MetricCard';
import LoadingCard from '../../components/LoadingCard';
import Panel from '../../components/Panel';
import ReportFilters from '../../components/ReportFilters';
import ReportQuality from '../../components/ReportQuality';
import RevenueChart from '../../components/RevenueChart';
import { formatPrice } from '../../utils/format';
import { downloadCsv } from '../../utils/exportCsv';
const money = (value: number | null) => (value === null ? 'Chưa đủ dữ liệu' : formatPrice(value));
const RevenueSection = ({ overview = false }: { overview?: boolean }) => {
  const [params] = useSearchParams();
  const [range, setRange] = useState({
    from:
      params.get('from') ||
      dayjs()
        .startOf(overview ? 'day' : 'month')
        .subtract(overview ? 6 : 0, 'day')
        .format('YYYY-MM-DD'),
    to: params.get('to') || dayjs().format('YYYY-MM-DD'),
  });
  const load = useCallback(() => reportService.getRevenue(range), [range]);
  const { data, error, reload } = useData(load);
  const exportReport = (type: string) => {
    if (!data) return;
    if (type === 'daily')
      downloadCsv(
        'doanh-thu-theo-ngay-' + data.from,
        data.daily.map((row) => ({ Ngày: row.date, 'Doanh thu hoàn tất (đ)': row.revenue })),
      );
    else
      downloadCsv(
        'doanh-thu-tong-hop-' + data.from,
        [data.stats].map((row) => ({
          'Từ ngày': data.from,
          'Đến ngày': data.to,
          'Đơn hoàn tất': row.order_count,
          'Doanh thu (đ)': row.revenue,
          'Hoàn tiền (đ)': row.refund_amount,
          'Giá vốn (đ)': row.cost,
          'Lợi nhuận gộp (đ)': row.gross_profit,
          'Dòng thiếu giá vốn': data.quality.missing_cost_lines,
        })),
      );
  };
  return (
    <>
      <PageHeader
        title={overview ? 'Tổng quan hoạt động' : 'Báo cáo doanh thu'}
        description={
          overview
            ? 'Theo dõi doanh thu và tình hình kinh doanh của cửa hàng.'
            : 'Đối chiếu doanh thu, giá vốn và kết quả kinh doanh theo thời gian.'
        }
        actions={
          !overview && (
            <Dropdown
              trigger={['click']}
              menu={{
                items: [
                  { key: 'summary', label: 'CSV tổng hợp' },
                  { key: 'daily', label: 'CSV theo ngày' },
                ],
                onClick: ({ key }) => exportReport(key),
              }}
            >
              <Button disabled={!data}>Xuất báo cáo ↓</Button>
            </Dropdown>
          )
        }
      />
      <ReportFilters {...range} onChange={(from, to) => setRange({ from, to })} />
      {!data ? (
        <LoadingCard error={error} onRetry={reload} />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Doanh thu hoàn tất"
              value={formatPrice(data.stats.revenue)}
              hint="Gồm phí giao, trước khoản hoàn tiền"
            />
            {overview ? (
              <MetricCard
                label="Đơn hoàn tất"
                value={data.stats.order_count.toLocaleString('vi-VN')}
                hint="Chỉ tính đơn đã ghi nhận thanh toán"
              />
            ) : (
              <MetricCard
                label="Giá trị đơn hoàn tiền"
                value={formatPrice(data.stats.refund_amount)}
                hint="Trong nhóm đơn hoàn tất của kỳ"
              />
            )}
            <MetricCard
              label="Giá vốn hàng bán"
              value={money(data.stats.cost)}
              hint="Theo các lô đã xuất cho đơn hoàn tất"
            />
            <MetricCard
              label="Lợi nhuận gộp"
              value={money(data.stats.gross_profit)}
              hint="Doanh thu − hoàn tiền − giá vốn; chưa trừ vận hành"
            />
          </div>
          <ReportQuality quality={data.quality} />
          <RevenueChart data={data.daily} />
          <Panel title="Kết quả kinh doanh">
            <Table
              rowKey={() => 'store'}
              dataSource={[data.stats]}
              scroll={{ x: 850 }}
              pagination={{ pageSize: 10, showSizeChanger: false }}
              columns={[
                { title: 'Đơn hoàn tất', dataIndex: 'order_count' },
                { title: 'Doanh thu', dataIndex: 'revenue', render: formatPrice },
                { title: 'Giá vốn', dataIndex: 'cost', render: money },
                { title: 'Lợi nhuận gộp', dataIndex: 'gross_profit', render: money },
                ...(overview
                  ? [
                      {
                        title: 'Xem',
                        render: () => (
                          <Link to={'/reports/revenue?from=' + range.from + '&to=' + range.to}>Chi tiết →</Link>
                        ),
                      },
                    ]
                  : []),
              ]}
            />
          </Panel>
          {!overview && (
            <Panel title="Đối chiếu thanh toán">
              <Table
                rowKey="method"
                dataSource={data.payments}
                pagination={false}
                scroll={{ x: 650 }}
                columns={[
                  { title: 'Phương thức', dataIndex: 'method' },
                  { title: 'Lần mua đã thanh toán và hoàn tất', dataIndex: 'paid_count' },
                  { title: 'Số tiền', dataIndex: 'paid_amount', render: formatPrice },
                  { title: 'Lần mua chưa thanh toán tạo trong kỳ', dataIndex: 'pending_count' },
                ]}
              />
              <p className="mt-4 text-xs text-muted">
                Mỗi lần mua được đếm một lần. Đơn đã hủy nhưng đã thu tiền cần đối soát riêng, chưa được coi là đã hoàn
                tiền.
              </p>
            </Panel>
          )}
        </div>
      )}
    </>
  );
};
export default RevenueSection;
