import { useCallback, useState } from 'react';
import { App, Button, DatePicker, Form, Image, Input, Modal, Select, Space, Switch, Upload } from 'antd';
import type { UploadFile } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { Link, useNavigate, useParams } from 'react-router-dom';
import bannerService from '../../services/bannerService';
import useData from '../../hooks/useData';
import LoadingCard from '../../components/LoadingCard';
import PageHeader from '../../components/PageHeader';
import Panel from '../../components/Panel';
import { getFileUrl } from '../../utils/fileUrl';
import { getErrorMessage } from '../../utils/errorMessage';
import type { Banner } from '../../types/staff';

interface Values {
  title: string;
  type: string;
  image_url: string;
  link_url: string;
  is_active: boolean;
  starts_at?: dayjs.Dayjs;
  ends_at?: dayjs.Dayjs;
}
const BannerForm = ({ banner }: { banner: Banner | null }) => {
  const [form] = Form.useForm<Values>();
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);
  const [localImage, setLocalImage] = useState('');
  const imageUrl = Form.useWatch('image_url', form);
  const title = Form.useWatch('title', form);
  const isPopup = Form.useWatch('type', form) === 'POPUP';
  const save = async (values: Values) => {
    if (!files.length && !values.image_url?.trim()) return void message.error('Hãy chọn ảnh hoặc nhập liên kết ảnh.');
    if (values.starts_at && values.ends_at && !values.ends_at.isAfter(values.starts_at))
      return void message.error('Thời gian kết thúc phải sau thời gian bắt đầu.');
    setSaving(true);
    try {
      const body = new FormData();
      body.set('title', values.title.trim());
      body.set('type', values.type);
      body.set('link_url', values.link_url?.trim() || '');
      body.set('image_url', values.image_url?.trim() || '');
      body.set('is_active', String(values.is_active));
      body.set('starts_at', values.starts_at?.toISOString() || '');
      body.set('ends_at', values.ends_at?.toISOString() || '');
      if (files[0]?.originFileObj) body.append('images', files[0].originFileObj);
      await bannerService.saveBanner(banner?.id, body);
      void message.success('Đã lưu banner.');
      navigate('/banners');
    } catch (error) {
      void message.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };
  return (
    <>
      <PageHeader
        title="Thiết lập banner"
        description="Chọn vị trí, hình ảnh và liên kết khi khách bấm vào quảng cáo."
      />
      <Form
        form={form}
        layout="vertical"
        onFinish={save}
        initialValues={{
          title: banner?.title || '',
          type: banner?.type || 'HOME_CAROUSEL',
          image_url: banner?.image_url || '',
          link_url: banner?.link_url || '',
          is_active: banner?.is_active ?? false,
          starts_at: banner?.starts_at ? dayjs(banner.starts_at) : undefined,
          ends_at: banner?.ends_at ? dayjs(banner.ends_at) : undefined,
        }}
      >
        <Panel title="Thông tin banner">
          <div className="grid gap-x-6 md:grid-cols-2">
            <Form.Item name="title" label="Tên banner" rules={[{ required: true, whitespace: true }]}>
              <Input maxLength={200} />
            </Form.Item>
            <Form.Item name="type" label="Vị trí hiển thị">
              <Select
                options={[
                  { value: 'HOME_CAROUSEL', label: 'Đầu trang chủ' },
                  { value: 'POPUP', label: 'Popup' },
                ]}
              />
            </Form.Item>
            <Form.Item
              name="link_url"
              label="Liên kết khi nhấn"
              rules={[{ pattern: /^(\/[^/]|\/$|https?:\/\/)/, message: 'Nhập đường dẫn /shop hoặc liên kết http(s).' }]}
            >
              <Input placeholder="/shop" />
            </Form.Item>
            <Form.Item name="is_active" label="Cho phép hiển thị" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item name="starts_at" label="Thời gian bắt đầu">
              <DatePicker showTime className="w-full" format="DD/MM/YYYY HH:mm" />
            </Form.Item>
            <Form.Item name="ends_at" label="Thời gian kết thúc">
              <DatePicker showTime className="w-full" format="DD/MM/YYYY HH:mm" />
            </Form.Item>
          </div>
        </Panel>
        <Panel title="Ảnh banner">
          <Upload
            accept="image/jpeg,image/png,image/webp,image/gif"
            maxCount={1}
            fileList={files}
            beforeUpload={(file) => {
              if (file.size > 5 * 1024 * 1024) {
                void message.error('Ảnh tối đa 5 MB.');
                return Upload.LIST_IGNORE;
              }
              const reader = new FileReader();
              reader.onload = () => setLocalImage(String(reader.result));
              reader.readAsDataURL(file);
              return false;
            }}
            onChange={({ fileList }) => {
              setFiles(fileList);
              if (!fileList.length) setLocalImage('');
            }}
          >
            <Button>Tải ảnh banner</Button>
          </Upload>
          <Form.Item name="image_url" label="Hoặc liên kết ảnh" className="mt-5">
            <Input placeholder="https://..." />
          </Form.Item>
          {(localImage || imageUrl) && (
            <Image src={localImage || getFileUrl(imageUrl)} style={{ maxHeight: 300, objectFit: 'contain' }} />
          )}
          <p className="mt-4 text-muted">
            Popup luôn có nút đóng để khách tiếp tục mua sắm. Bỏ trống thời gian nếu muốn hiển thị liên tục.
          </p>
        </Panel>
        <div className="flex justify-end">
          <Space>
            <Link to="/banners">
              <Button>Hủy</Button>
            </Link>
            <Button onClick={() => setPreview(true)}>Xem trước</Button>
            <Button type="primary" htmlType="submit" loading={saving}>
              Lưu banner
            </Button>
          </Space>
        </div>
      </Form>
      <Modal
        open={preview}
        aria-label={title || 'Xem trước banner'}
        title={isPopup ? undefined : title || 'Xem trước banner'}
        onCancel={() => setPreview(false)}
        footer={null}
        closable={!isPopup}
        styles={
          isPopup ? { container: { padding: 0, background: 'transparent', boxShadow: 'none', border: 0 } } : undefined
        }
      >
        <div className="relative">
          <img
            src={localImage || getFileUrl(imageUrl)}
            alt={title || 'Ảnh banner'}
            className="block max-h-[85vh] w-full object-contain"
          />
          {isPopup && (
            <button
              type="button"
              aria-label="Đóng xem trước"
              onClick={() => setPreview(false)}
              className="absolute left-2 top-2 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-black/60 text-white"
            >
              <CloseOutlined />
            </button>
          )}
        </div>
        {!isPopup && <p className="mt-4">{form.getFieldValue('link_url') || 'Không có liên kết'}</p>}
      </Modal>
    </>
  );
};
const BannerFormSection = () => {
  const { id } = useParams();
  const load = useCallback(() => (id ? bannerService.getBanner(id) : Promise.resolve(null)), [id]);
  const { data, error, loading, reload } = useData(load);
  return loading || error ? (
    <LoadingCard error={error} onRetry={reload} />
  ) : (
    <BannerForm key={id || 'new'} banner={data || null} />
  );
};
export default BannerFormSection;
