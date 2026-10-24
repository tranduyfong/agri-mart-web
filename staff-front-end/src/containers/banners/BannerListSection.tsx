import { useCallback, useState } from 'react';
import { Button, Image, Input, Space, Table } from 'antd';
import { Link } from 'react-router-dom';
import bannerService from '../../services/bannerService';
import useData from '../../hooks/useData';
import PageHeader from '../../components/PageHeader';
import Panel from '../../components/Panel';
import LoadingCard from '../../components/LoadingCard';
import StatusTag from '../../components/StatusTag';
import { getFileUrl } from '../../utils/fileUrl';
import { tablePagination } from '../../utils/tablePagination';
import type { Banner } from '../../types/staff';

const BannerListSection = () => {
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(0);
  const load = useCallback(
    () => bannerService.getBanners({ keyword, pageNumber: page, pageSize: 10 }),
    [keyword, page],
  );
  const { data, error, reload } = useData(load);
  return (
    <>
      <PageHeader
        title="Banner quảng cáo"
        description="Quản lý hình ảnh trên trang chủ và cửa sổ quảng cáo của toàn hệ thống."
        actions={
          <Link to="/banners/new">
            <Button type="primary">+ Thêm banner</Button>
          </Link>
        }
      />
      <Input.Search
        className="mb-6 max-w-sm"
        placeholder="Tìm tên banner..."
        allowClear
        onSearch={(value) => {
          setKeyword(value);
          setPage(0);
        }}
      />
      {!data ? (
        <LoadingCard error={error} onRetry={reload} />
      ) : (
        <Panel title="Danh sách banner">
          <Table<Banner>
            rowKey="id"
            dataSource={data.data}
            scroll={{ x: 850 }}
            pagination={tablePagination(page, data.totalElements, setPage)}
            columns={[
              {
                title: 'Banner',
                render: (_, row) => (
                  <Space>
                    <Image
                      width={90}
                      height={48}
                      style={{ objectFit: 'cover', borderRadius: 6 }}
                      src={getFileUrl(row.image_url)}
                    />
                    <Link to={'/banners/' + row.id + '/edit'}>{row.title}</Link>
                  </Space>
                ),
              },
              { title: 'Vị trí', render: (_, row) => (row.type === 'POPUP' ? 'Popup có nút đóng' : 'Đầu trang chủ') },
              { title: 'Liên kết', dataIndex: 'link_url', render: (value) => value || '—' },
              { title: 'Trạng thái', render: (_, row) => <StatusTag status={row.status} /> },
              { title: 'Thao tác', render: (_, row) => <Link to={'/banners/' + row.id + '/edit'}>Chỉnh sửa</Link> },
            ]}
          />
        </Panel>
      )}
    </>
  );
};
export default BannerListSection;
