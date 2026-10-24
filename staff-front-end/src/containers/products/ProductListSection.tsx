import { useCallback, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button, Input, Select, Table, Alert } from 'antd';
import { PlusOutlined, PictureOutlined } from '@ant-design/icons';
import PageHeader from '../../components/PageHeader';
import Panel from '../../components/Panel';
import StatusTag from '../../components/StatusTag';
import useAuth from '../../hooks/useAuth';
import useData from '../../hooks/useData';
import productService from '../../services/productService';
import staffService from '../../services/staffService';
import { tablePagination } from '../../utils/tablePagination';
import { formatPrice } from '../../utils/format';
import { getFileUrl } from '../../utils/fileUrl';
const ProductListSection = () => {
  const { hasPermission } = useAuth();
  const [params] = useSearchParams();
  const [query, setQuery] = useState({
    keyword: '',
    status: params.get('status') || '',
    category_id: '',
    pageNumber: 0,
    pageSize: 10,
  });
  const load = useCallback(() => productService.getProducts(query), [query]);
  const { data, loading, error, reload } = useData(load);
  const { data: lookups } = useData(staffService.getLookups);
  return (
    <>
      <PageHeader
        title="Sản phẩm"
        description="Quản lý sản phẩm, giá bán và số lượng có thể bán tại cửa hàng."
        actions={
          <Link to="/products/new">
            <Button type="primary" icon={<PlusOutlined />}>
              Thêm sản phẩm
            </Button>
          </Link>
        }
      />
      <div className="mb-6 flex flex-wrap gap-3">
        <Input.Search
          className="w-full! sm:w-72!"
          placeholder="Tìm tên, mã sản phẩm hoặc SKU"
          allowClear
          onSearch={(keyword) => setQuery({ ...query, keyword, pageNumber: 0 })}
        />
        <Select
          className="w-52"
          allowClear
          placeholder="Tất cả danh mục"
          value={query.category_id || undefined}
          options={lookups?.categories.map((category) => ({ value: category.id, label: category.name }))}
          onChange={(category_id) => setQuery({ ...query, category_id: category_id || '', pageNumber: 0 })}
        />
        <Select
          className="w-48"
          allowClear
          placeholder="Tất cả trạng thái"
          value={query.status || undefined}
          options={[
            { value: 'DRAFT', label: 'Bản nháp' },
            { value: 'PUBLISHED', label: 'Đang bán' },
            { value: 'ARCHIVED', label: 'Ngừng bán' },
          ]}
          onChange={(status) => setQuery({ ...query, status: status || '', pageNumber: 0 })}
        />
      </div>
      {error && (
        <Alert className="mb-5" type="error" title={error} action={<Button onClick={reload}>Thử lại</Button>} />
      )}
      <Panel title="Danh sách sản phẩm">
        <Table
          rowKey="id"
          dataSource={data?.data || []}
          loading={loading}
          scroll={{ x: 900 }}
          pagination={tablePagination(query.pageNumber, data?.totalElements || 0, (pageNumber) =>
            setQuery({ ...query, pageNumber }),
          )}
          columns={[
            {
              title: 'Sản phẩm / SKU',
              render: (_, item) => (
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-page-gray">
                    {item.thumbnail_url ? (
                      <img className="h-11 w-11 object-contain" src={getFileUrl(item.thumbnail_url)} alt="" />
                    ) : (
                      <PictureOutlined className="text-muted" />
                    )}
                  </div>
                  <div>
                    <Link className="font-medium" to={'/products/' + item.id + '/edit'}>
                      {item.name}
                    </Link>
                    <p className="mt-1 text-xs text-muted">{item.skus?.join(', ') || item.code}</p>
                  </div>
                </div>
              ),
            },
            { title: 'Danh mục', dataIndex: 'category_name' },
            { title: 'Đơn vị', dataIndex: 'unit' },
            {
              title: 'Giá niêm yết',
              dataIndex: 'min_price',
              render: (value: number | null) => (value == null ? 'Chưa có giá' : formatPrice(value)),
            },
            { title: 'Có thể bán', dataIndex: 'total_stock', render: (value: number) => value.toLocaleString('vi-VN') },
            { title: 'Trạng thái', dataIndex: 'status', render: (status: string) => <StatusTag status={status} /> },
            { title: 'Thao tác', render: (_, item) => <Link to={'/products/' + item.id + '/edit'}>Chỉnh sửa</Link> },
          ]}
        />
      </Panel>
      {hasPermission('INVENTORY_MANAGE') && (
        <Link to="/imports" className="mt-5 inline-block">
          <Button>Nhập hàng từ file</Button>
        </Link>
      )}
    </>
  );
};
export default ProductListSection;
