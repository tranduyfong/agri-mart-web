import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, App, Button, Input, Select, Table } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import PageHeader from '../../components/PageHeader';
import Panel from '../../components/Panel';
import StatusTag from '../../components/StatusTag';
import useData from '../../hooks/useData';
import promotionService from '../../services/promotionService';
import { formatDate, formatPrice } from '../../utils/format';
import { getErrorMessage } from '../../utils/errorMessage';
import { tablePagination } from '../../utils/tablePagination';
const PromotionListSection = ({
  scope = 'PRODUCT',
  onEdit,
  revision = 0,
}: {
  scope?: 'PRODUCT' | 'SHIPPING';
  onEdit?: (id: string) => void;
  revision?: number;
}) => {
  const [query, setQuery] = useState({ keyword: '', status: '', pageNumber: 0, pageSize: 10 });
  const { modal, message } = App.useApp();
  const load = useCallback(() => {
    void revision;
    return promotionService.getPromotions({ ...query, scope });
  }, [query, scope, revision]);
  const { data, loading, error, reload } = useData(load);
  const end = (id: string) =>
    modal.confirm({
      title: 'Kết thúc chương trình này?',
      content: 'Khách hàng sẽ không thể áp dụng ưu đãi này cho đơn mới.',
      okText: 'Kết thúc',
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          await promotionService.endPromotion(id);
          message.success('Đã kết thúc chương trình');
          reload();
        } catch (reason) {
          message.error(getErrorMessage(reason));
          throw reason;
        }
      },
    });
  return (
    <>
      {scope === 'PRODUCT' && (
        <PageHeader
          title="Chương trình khuyến mãi"
          description="Thiết lập ưu đãi tự động và mã giảm giá sản phẩm dùng chung toàn hệ thống."
          actions={
            <Link to="/promotions/new">
              <Button type="primary" icon={<PlusOutlined />}>
                Tạo chương trình
              </Button>
            </Link>
          }
        />
      )}
      <div className="mb-6 flex flex-wrap gap-3">
        <Input.Search
          className="w-full! sm:w-80!"
          placeholder="Tìm mã hoặc tên chương trình"
          allowClear
          onSearch={(keyword) => setQuery({ ...query, keyword, pageNumber: 0 })}
        />
        <Select
          className="w-52"
          allowClear
          placeholder="Tất cả trạng thái"
          options={[
            { value: 'ACTIVE', label: 'Đang áp dụng' },
            { value: 'UPCOMING', label: 'Sắp diễn ra' },
            { value: 'ENDED', label: 'Đã kết thúc' },
          ]}
          onChange={(status) => setQuery({ ...query, status: status || '', pageNumber: 0 })}
        />
      </div>
      {error && <Alert className="mb-5" type="error" title={error} />}
      <Panel title={scope === 'SHIPPING' ? 'Mã giảm phí giao hiện có' : 'Danh sách chương trình'}>
        <Table
          rowKey="id"
          loading={loading}
          dataSource={data?.data || []}
          scroll={{ x: 950 }}
          pagination={tablePagination(query.pageNumber, data?.totalElements || 0, (pageNumber) =>
            setQuery({ ...query, pageNumber }),
          )}
          columns={[
            {
              title: 'Chương trình / Mã',
              render: (_, item) => (
                <div className="font-medium">
                  {item.name}
                  <p className="mt-1 text-xs font-normal text-muted">
                    {item.code} ·{' '}
                    {item.requires_code || scope === 'SHIPPING' || item.discount_type === 'AMOUNT'
                      ? 'Nhập mã khi thanh toán'
                      : 'Giảm tự động'}
                  </p>
                </div>
              ),
            },
            {
              title: 'Thời gian',
              render: (_, item) => `${formatDate(item.valid_from)} – ${formatDate(item.valid_to)}`,
            },
            {
              title: 'Ưu đãi',
              render: (_, item) =>
                item.discount_type === 'PERCENT' ? item.discount_value + '%' : formatPrice(item.discount_value),
            },
            { title: 'Đơn tối thiểu', dataIndex: 'min_order_value', render: formatPrice },
            { title: 'Trạng thái', dataIndex: 'status', render: (status: string) => <StatusTag status={status} /> },
            {
              title: 'Thao tác',
              render: (_, item) => (
                <div className="flex flex-col items-start gap-1">
                  {onEdit ? (
                    <Button type="link" className="px-0!" onClick={() => onEdit(item.id)}>
                      Chỉnh sửa
                    </Button>
                  ) : (
                    <Link to={'/promotions/' + item.id + '/edit'}>Chỉnh sửa</Link>
                  )}
                  {item.status !== 'ENDED' && (
                    <Button type="text" danger className="px-0!" onClick={() => end(item.id)}>
                      Kết thúc
                    </Button>
                  )}
                </div>
              ),
            },
          ]}
        />
      </Panel>
    </>
  );
};
export default PromotionListSection;
