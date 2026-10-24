import { DatePicker } from 'antd';
import dayjs from 'dayjs';
const ReportFilters = ({
  from,
  to,
  onChange,
}: {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
}) => (
  <div className="mb-6 flex flex-wrap gap-3">
    <DatePicker.RangePicker
      aria-label="Khoảng thời gian báo cáo"
      className="w-full sm:w-auto"
      allowClear={false}
      format="DD/MM/YYYY"
      value={[dayjs(from), dayjs(to)]}
      onChange={(dates) => {
        if (dates?.[0] && dates[1]) onChange(dates[0].format('YYYY-MM-DD'), dates[1].format('YYYY-MM-DD'));
      }}
    />
  </div>
);
export default ReportFilters;
