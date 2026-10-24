import { Empty, Tooltip } from 'antd';
import dayjs from 'dayjs';
import Panel from './Panel';
import { formatPrice } from '../utils/format';
const RevenueChart = ({ data }: { data: { date: string; revenue: number }[] }) => {
  const max = Math.max(...data.map((item) => item.revenue), 1);
  return (
    <Panel title="Doanh thu hoàn tất theo ngày">
      {data.length ? (
        <div className="overflow-x-auto">
          <div className="flex h-72 items-end gap-5 pb-2" style={{ minWidth: Math.max(540, data.length * 58) }}>
            {data.map((item) => (
              <Tooltip key={item.date} title={`${dayjs(item.date).format('DD/MM/YYYY')}: ${formatPrice(item.revenue)}`}>
                <div
                  tabIndex={0}
                  aria-label={`${item.date}: ${formatPrice(item.revenue)}`}
                  className="flex h-full min-w-9 flex-1 flex-col justify-end gap-3"
                >
                  <div
                    className={
                      'w-full rounded-t-xl transition-colors hover:bg-primary ' +
                      (item.revenue === max ? 'bg-primary' : 'bg-primary-soft')
                    }
                    style={{ height: `${Math.max(item.revenue ? 4 : 0, (item.revenue / max) * 85)}%`, minHeight: 3 }}
                  />
                  <span className="text-center text-xs text-muted">{dayjs(item.date).format('DD/MM')}</span>
                </div>
              </Tooltip>
            ))}
          </div>
        </div>
      ) : (
        <Empty description="Chưa có dữ liệu" />
      )}
      <p className="mt-4 text-xs text-muted">Đơn vị: đồng · Di chuột hoặc chạm vào cột để xem số tiền.</p>
    </Panel>
  );
};
export default RevenueChart;
