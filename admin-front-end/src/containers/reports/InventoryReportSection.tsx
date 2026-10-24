import { useCallback, useState } from 'react';
import { Alert, App, Button, Input, Select, Table } from 'antd';
import dayjs from 'dayjs';
import PageHeader from '../../components/PageHeader';
import Panel from '../../components/Panel';
import ReportFilters from '../../components/ReportFilters';
import MetricCard from '../../components/MetricCard';
import LoadingCard from '../../components/LoadingCard';
import useData from '../../hooks/useData';
import adminService from '../../services/adminService';
import reportService from '../../services/reportService';
import { tablePagination } from '../../utils/tablePagination';
import { formatPrice } from '../../utils/format';
import { getErrorMessage } from '../../utils/errorMessage';
import { downloadCsv } from '../../utils/exportCsv';
const number = (value: number) => value.toLocaleString('vi-VN');
const InventoryReportSection = () => {
  const { message } = App.useApp();
  const [query, setQuery] = useState({
    from: dayjs().startOf('month').format('YYYY-MM-DD'),
    to: dayjs().format('YYYY-MM-DD'),
    category_id: '',
    keyword: '',
    pageNumber: 0,
    pageSize: 10,
  });
  const [exporting, setExporting] = useState(false);
  const { data: lookups } = useData(adminService.getLookups);
  const load = useCallback(() => reportService.getInventory(query), [query]);
  const { data, error, reload } = useData(load);
  const exportReport = async () => {
    setExporting(true);
    try {
      const first = await reportService.getInventory({
        ...query,
        pageNumber: 0,
        pageSize: 100,
      });
      const rows = [...first.data];
      for (let page = 1; page < first.totalPages; page++) {
        const next = await reportService.getInventory({
          ...query,
          pageNumber: page,
          pageSize: 100,
        });
        rows.push(...next.data);
      }
      downloadCsv(
        'nhap-ban-ton-' + query.from,
        rows.map((row) => ({
          'Từ ngày': query.from,
          'Đến ngày': query.to,
          'Sản phẩm': row.name,
          SKU: row.sku,
          'Đơn vị': row.unit,
          'Nhập trong kỳ': row.imported_quantity,
          'Bán hoàn tất trong kỳ': row.sold_quantity,
          'Đang phân bổ hiện tại': row.reserved_quantity,
          'Tồn sổ hiện tại': row.stock_quantity,
          'Còn hạn hiện tại': row.available_quantity,
        })),
      );
    } catch (reason) {
      void message.error(getErrorMessage(reason));
    } finally {
      setExporting(false);
    }
  };
  return (
    <>
      <PageHeader
        title="Báo cáo nhập – bán – tồn"
        description="Theo dõi lượng nhập, lượng bán và tồn kho theo từng quy cách, đơn vị."
        actions={
          <Button onClick={() => void exportReport()} loading={exporting} disabled={!data}>
            Xuất CSV ↓
          </Button>
        }
      />
      <ReportFilters
        from={query.from}
        to={query.to}
        onChange={(from, to) => setQuery({ ...query, from, to, pageNumber: 0 })}
      />
      <div className="mb-6 flex flex-wrap gap-3">
        <Input.Search
          allowClear
          className="w-full! sm:w-80!"
          placeholder="Tìm tên hoặc SKU"
          onSearch={(keyword) => setQuery({ ...query, keyword, pageNumber: 0 })}
        />
        <Select
          className="w-64"
          allowClear
          placeholder="Tất cả danh mục"
          options={lookups?.categories.map((item) => ({ value: item.id, label: item.name }))}
          onChange={(category_id) => setQuery({ ...query, category_id: category_id || '', pageNumber: 0 })}
        />
      </div>
      {!data ? (
        <LoadingCard error={error} onRetry={reload} />
      ) : (
        <div className="space-y-6">
          <Alert
            type="success"
            showIcon
            title="Số lượng tách theo SKU và đơn vị; không cộng chung kg, gói, bó, chai."
          />
          <Alert
            type="info"
            showIcon
            title="Nhập và bán lọc theo kỳ; các cột tồn kho là số liệu hiện tại."
            description="Hệ thống chưa có sổ điều chỉnh kho theo thời gian, nên không suy đoán tồn đầu hoặc tồn cuối quá khứ. Tồn sổ đã trừ lượng phân bổ cho đơn, vẫn gồm hàng hết hạn chưa xử lý."
          />
          <Panel title="Đối chiếu số lượng">
            <Table
              rowKey="id"
              dataSource={data.data}
              scroll={{ x: 1100 }}
              pagination={tablePagination(query.pageNumber, data.totalElements, (pageNumber) =>
                setQuery({ ...query, pageNumber }),
              )}
              columns={[
                {
                  title: 'Sản phẩm / SKU',
                  render: (_, row) => (
                    <div className="font-medium">
                      {row.name}
                      <p className="mt-1 text-xs font-normal text-muted">{row.sku}</p>
                    </div>
                  ),
                },
                { title: 'Đơn vị', dataIndex: 'unit' },
                { title: 'Nhập trong kỳ', dataIndex: 'imported_quantity', render: number },
                { title: 'Bán hoàn tất trong kỳ', dataIndex: 'sold_quantity', render: number },
                { title: 'Đang phân bổ hiện tại', dataIndex: 'reserved_quantity', render: number },
                { title: 'Tồn sổ hiện tại', dataIndex: 'stock_quantity', render: number },
                {
                  title: 'Còn hạn hiện tại',
                  dataIndex: 'available_quantity',
                  render: (value: number) => <span className="font-medium text-primary">{number(value)}</span>,
                },
              ]}
            />
            <p className="mt-4 text-xs text-muted">
              Cập nhật tồn lúc {new Date(data.meta.as_of).toLocaleString('vi-VN')}.
            </p>
          </Panel>
          <div className="grid gap-4 sm:grid-cols-2">
            <MetricCard
              label="Giá trị hàng nhập trong kỳ"
              value={formatPrice(data.meta.import_amount)}
              hint="Theo thời gian và danh mục được lọc"
            />
            <MetricCard
              label="Số phiếu nhập ghi nhận"
              value={data.meta.receipt_count}
              hint="Phiếu có ít nhất một dòng thuộc danh mục lọc"
            />
          </div>
          {!!data.meta.legacy_receipt_lines && (
            <Alert
              type="warning"
              showIcon
              title={`${data.meta.legacy_receipt_lines} dòng phiếu cũ chưa lưu đơn vị; báo cáo dùng đơn vị hiện tại của SKU.`}
            />
          )}
        </div>
      )}
    </>
  );
};
export default InventoryReportSection;
