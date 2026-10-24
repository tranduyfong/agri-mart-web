import { Alert, Button } from 'antd';
import { Link } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import useData from '../../hooks/useData';
import staffService from '../../services/staffService';
import PageHeader from '../../components/PageHeader';
import Panel from '../../components/Panel';
import StatCard from '../../components/StatCard';
import OrderTable from '../../components/OrderTable';
import LoadingCard from '../../components/LoadingCard';
const DashboardSection = () => {
  const { user, hasPermission, ordersRevision } = useAuth();
  const { data, loading, error, reload } = useData(staffService.getDashboard, 30000, ordersRevision);
  return (
    <>
      <PageHeader
        title="Công việc hôm nay"
        description={`Chào ${user?.full_name}, cùng kiểm tra công việc tại cửa hàng.`}
      />
      {loading || error || !data ? (
        <LoadingCard error={error} onRetry={reload} />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {hasPermission('ORDER_MANAGE') && (
              <>
                <Link to="/orders?status=PENDING">
                  <StatCard label="Đơn chờ xác nhận" value={data.pending} hint="Mở danh sách để gọi điện xác nhận" />
                </Link>
                <StatCard label="Đơn đang chuẩn bị" value={data.preparing} hint="Cần bàn giao vận chuyển" />
              </>
            )}
            {hasPermission('INVENTORY_MANAGE') && (
              <StatCard label="Lô sắp hết hạn" value={data.expiring} hint="Trong vòng 3 ngày" />
            )}
            {hasPermission('SUPPORT_MANAGE') && (
              <StatCard label="Hội thoại AI đang hỗ trợ" value={data.support} hint="Có thể tiếp nhận khi khách cần" />
            )}
          </div>
          {data.missing_images > 0 && (
            <Alert
              type="warning"
              showIcon
              title={`Có ${data.missing_images} sản phẩm nháp chưa có ảnh. Hoàn thiện thông tin trước khi đăng bán.`}
              action={
                <Link to="/products?status=DRAFT">
                  <Button size="small">Xem sản phẩm</Button>
                </Link>
              }
            />
          )}
          {hasPermission('ORDER_MANAGE') && (
            <Panel title="Đơn hàng mới nhất">
              <OrderTable orders={data.orders} onOrderApproved={reload} />
            </Panel>
          )}
          <div className="flex flex-wrap gap-3">
            {hasPermission('ORDER_MANAGE') && (
              <Link to="/orders">
                <Button type="primary">Xử lý đơn hàng</Button>
              </Link>
            )}
            {hasPermission('INVENTORY_MANAGE') && (
              <Link to="/inventory?status=EXPIRING">
                <Button>Kiểm tra hạn dùng</Button>
              </Link>
            )}
            {hasPermission('SUPPORT_MANAGE') && (
              <Link to="/support">
                <Button>Tiếp nhận hỗ trợ</Button>
              </Link>
            )}
          </div>
        </div>
      )}
    </>
  );
};
export default DashboardSection;
