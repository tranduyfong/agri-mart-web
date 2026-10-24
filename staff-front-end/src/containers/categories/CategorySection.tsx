import { useCallback, useState } from 'react';
import { Alert, App, Button, Form, Input, Table } from 'antd';
import PageHeader from '../../components/PageHeader';
import Panel from '../../components/Panel';
import useData from '../../hooks/useData';
import categoryService from '../../services/categoryService';
import { tablePagination } from '../../utils/tablePagination';
import { getErrorMessage } from '../../utils/errorMessage';
import type { Category } from '../../types/staff';
import ImageInput from '../../components/ImageInput';
import { appendImage, type ImageValue } from '../../utils/imageInput';
import { getFileUrl } from '../../utils/fileUrl';
const CategorySection = () => {
  const [query, setQuery] = useState({ keyword: '', pageNumber: 0, pageSize: 10 });
  const [editing, setEditing] = useState<Category | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const [form] = Form.useForm();
  const { message } = App.useApp();
  const load = useCallback(() => categoryService.getCategories(query), [query]);
  const { data, loading, error: loadError, reload } = useData(load);
  const edit = (item: Category) => {
    setEditing(item);
    form.setFieldsValue({ ...item, image: { url: item.image_url || '' } });
    document.getElementById('category-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };
  const submit = async (values: { name: string; slug: string; image?: ImageValue }) => {
    setBusy(true);
    setError('');
    try {
      const body = new FormData();
      body.append('name', values.name);
      body.append('slug', values.slug || '');
      appendImage(body, values.image);
      await categoryService.saveCategory(editing?.id, body);
      message.success('Đã lưu danh mục');
      setEditing(null);
      form.resetFields();
      reload();
    } catch (reason) {
      setError(getErrorMessage(reason));
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <PageHeader
        title="Danh mục sản phẩm"
        description="Sắp xếp danh mục dùng chung để khách hàng dễ tìm và lựa chọn."
      />
      <Input.Search
        className="mb-6 w-full! sm:w-80!"
        placeholder="Tìm danh mục"
        allowClear
        onSearch={(keyword) => setQuery({ ...query, keyword, pageNumber: 0 })}
      />
      {loadError && <Alert className="mb-5" type="error" title={loadError} />}
      <div className="space-y-6">
        <Panel title="Danh sách danh mục">
          <Table
            rowKey="id"
            dataSource={data?.data || []}
            loading={loading}
            scroll={{ x: 650 }}
            pagination={tablePagination(query.pageNumber, data?.totalElements || 0, (pageNumber) =>
              setQuery({ ...query, pageNumber }),
            )}
            columns={[
              {
                title: 'Ảnh',
                render: (_, item) =>
                  item.image_url ? (
                    <img
                      src={getFileUrl(item.image_url)}
                      alt={item.name}
                      className="h-14 w-14 rounded-lg object-contain"
                    />
                  ) : (
                    '—'
                  ),
              },
              { title: 'Tên danh mục', dataIndex: 'name' },
              { title: 'Đường dẫn', dataIndex: 'slug' },
              { title: 'Sản phẩm đang bán', dataIndex: 'product_count' },
              {
                title: 'Thao tác',
                render: (_, item) => (
                  <Button type="link" onClick={() => edit(item)}>
                    Chỉnh sửa
                  </Button>
                ),
              },
            ]}
          />
        </Panel>
        <div id="category-form">
          <Panel title={editing ? 'Chỉnh sửa danh mục' : 'Thêm danh mục'}>
            <Form form={form} layout="vertical" onFinish={submit} disabled={busy}>
              <div className="grid gap-x-6 sm:grid-cols-2">
                <Form.Item
                  name="name"
                  label="Tên danh mục *"
                  rules={[{ required: true, message: 'Vui lòng nhập tên danh mục' }]}
                >
                  <Input maxLength={150} />
                </Form.Item>
                <Form.Item
                  name="slug"
                  label="Đường dẫn"
                  rules={[{ pattern: /^[a-z0-9-]+$/, message: 'Chỉ dùng chữ thường không dấu, số và dấu gạch ngang' }]}
                >
                  <Input placeholder="Để trống để tự tạo từ tên" />
                </Form.Item>
              </div>
              <Form.Item name="image" label="Ảnh danh mục">
                <ImageInput />
              </Form.Item>
              {error && <Alert className="mb-4" type="error" title={error} />}
              <div className="flex justify-end gap-3">
                <Button
                  onClick={() => {
                    setEditing(null);
                    form.resetFields();
                    setError('');
                  }}
                >
                  Hủy
                </Button>
                <Button type="primary" htmlType="submit" loading={busy}>
                  Lưu danh mục
                </Button>
              </div>
            </Form>
          </Panel>
        </div>
      </div>
    </>
  );
};
export default CategorySection;
