import { useCallback, useState } from 'react';
import { Alert, App, Button, Form, Input, Modal, Space, Table } from 'antd';
import { Link, useNavigate, useParams } from 'react-router-dom';
import useData from '../../hooks/useData';
import newsletterService from '../../services/newsletterService';
import PageHeader from '../../components/PageHeader';
import Panel from '../../components/Panel';
import LoadingCard from '../../components/LoadingCard';
import MarkdownPreview from '../../components/MarkdownPreview';
import ContentEditor from '../../components/ContentEditor';
import StatusTag from '../../components/StatusTag';
import { getErrorMessage } from '../../utils/errorMessage';
import type { NewsletterDetail } from '../../types/staff';

interface Values {
  subject: string;
  content: string;
}
const NewsletterEditor = ({
  newsletter,
  subscribers,
}: {
  newsletter: NewsletterDetail | null;
  subscribers: number;
}) => {
  const [form] = Form.useForm<Values>();
  const { message, modal } = App.useApp();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);
  const readOnly = !!newsletter && newsletter.status !== 'DRAFT';
  const save = async (values: Values, send = false) => {
    setSaving(true);
    try {
      const result = await newsletterService.saveNewsletter(newsletter?.id, values);
      if (send) await newsletterService.sendNewsletter(result.id);
      void message.success(
        send ? 'Đã bắt đầu gửi bản tin. Bạn có thể theo dõi kết quả trong lịch sử.' : 'Đã lưu bản nháp.',
      );
      navigate(send ? '/newsletters' : '/newsletters/' + result.id + '/edit', { replace: true });
    } catch (error) {
      void message.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };
  const confirmSend = async () => {
    try {
      const values = await form.validateFields();
      modal.confirm({
        title: 'Xác nhận gửi bản tin?',
        content: `Bản tin sẽ được gửi đến ${subscribers.toLocaleString('vi-VN')} email đang đăng ký. Sau khi gửi, nội dung không thể chỉnh sửa.`,
        okText: 'Gửi bản tin',
        cancelText: 'Kiểm tra lại',
        onOk: () => save(values, true),
      });
    } catch {
      /* Form hiển thị các trường cần sửa. */
    }
  };
  return (
    <>
      <PageHeader
        title={readOnly ? 'Chi tiết bản tin' : 'Soạn bản tin email'}
        description="Kiểm tra nội dung và danh sách nhận trước khi gửi."
      />
      <Form
        form={form}
        layout="vertical"
        initialValues={{ subject: newsletter?.subject || '', content: newsletter?.content || '' }}
        onFinish={(values) => save(values)}
        disabled={readOnly}
      >
        <Panel title="Thông tin bản tin">
          <div className="grid gap-6 md:grid-cols-2">
            <Form.Item name="subject" label="Tiêu đề email" rules={[{ required: true, whitespace: true }]}>
              <Input maxLength={200} />
            </Form.Item>
            <Form.Item label="Người nhận">
              <Input readOnly value={`${subscribers.toLocaleString('vi-VN')} email đang đăng ký bản tin`} />
            </Form.Item>
          </div>
        </Panel>
        <Panel title="Nội dung">
          {readOnly ? (
            <MarkdownPreview content={newsletter.content} />
          ) : (
            <Form.Item
              name="content"
              rules={[{ required: true, whitespace: true, message: 'Hãy nhập nội dung bản tin.' }]}
            >
              <ContentEditor />
            </Form.Item>
          )}
          <p className="text-muted">Cuối email có liên kết hủy đăng ký nhận bản tin.</p>
        </Panel>
        {!readOnly && (
          <Space wrap>
            <Button htmlType="submit" loading={saving}>
              Lưu bản nháp
            </Button>
            <Button onClick={() => setPreview(true)}>Xem trước</Button>
            <Button type="primary" disabled={!subscribers || saving} onClick={() => void confirmSend()}>
              Xác nhận gửi bản tin
            </Button>
            <Link to="/newsletters">
              <Button>Quay lại</Button>
            </Link>
          </Space>
        )}
      </Form>
      {readOnly && (
        <Panel title="Kết quả gửi">
          <Alert type="info" showIcon title={<StatusTag status={newsletter.status} />} className="mb-4" />
          <Table
            rowKey="email"
            dataSource={newsletter.recipients}
            scroll={{ x: 600 }}
            columns={[
              { title: 'Email', dataIndex: 'email' },
              {
                title: 'Kết quả',
                render: (_, row) => (
                  <StatusTag status={row.status} label={row.status === 'PENDING' ? 'Chờ gửi' : undefined} />
                ),
              },
              { title: 'Chi tiết', dataIndex: 'error' },
            ]}
          />
          <Link to="/newsletters">
            <Button>Quay lại lịch sử</Button>
          </Link>
        </Panel>
      )}
      <Modal
        open={preview}
        title={form.getFieldValue('subject') || 'Xem trước bản tin'}
        footer={null}
        onCancel={() => setPreview(false)}
        width={750}
      >
        <MarkdownPreview content={form.getFieldValue('content') || ''} />
        <hr className="my-5 border-line" />
        <small>Hủy đăng ký nhận bản tin</small>
      </Modal>
    </>
  );
};
const NewsletterEditorSection = () => {
  const { id } = useParams();
  const load = useCallback(async () => {
    if (id) {
      const newsletter = await newsletterService.getNewsletter(id);
      return { newsletter, subscribers: newsletter.subscriber_count };
    }
    const list = await newsletterService.getNewsletters({ pageSize: 1 });
    return { newsletter: null, subscribers: list.meta.subscribers.active };
  }, [id]);
  const { data, error, reload } = useData(load);
  return !data ? <LoadingCard error={error} onRetry={reload} /> : <NewsletterEditor key={id || 'new'} {...data} />;
};
export default NewsletterEditorSection;
