import { useCallback, useState } from 'react';
import { App, Button, Empty, Image, Input, Select, Space, Upload } from 'antd';
import type { UploadFile } from 'antd';
import useAuth from '../../hooks/useAuth';
import useData from '../../hooks/useData';
import supportService from '../../services/supportService';
import PageHeader from '../../components/PageHeader';
import Panel from '../../components/Panel';
import LoadingCard from '../../components/LoadingCard';
import StatusTag from '../../components/StatusTag';
import { getFileUrl } from '../../utils/fileUrl';
import { getErrorMessage } from '../../utils/errorMessage';
import type { ChatDetail } from '../../types/staff';

const Conversation = ({ room, reload }: { room: ChatDetail; reload: () => void }) => {
  const { user } = useAuth();
  const { message, modal } = App.useApp();
  const [content, setContent] = useState('');
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [busy, setBusy] = useState(false);
  const canReply = room.status === 'STAFF_ACTIVE' && room.assigned_staff_id === user?.id;
  const claim = async () => {
    setBusy(true);
    try {
      await supportService.claimRoom(room.id);
      reload();
    } catch (error) {
      void message.error(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };
  const reply = async () => {
    if (!content.trim() && !files.length) return;
    setBusy(true);
    try {
      const body = new FormData();
      body.set('content', content.trim());
      files.forEach((file) => {
        if (file.originFileObj) body.append('images', file.originFileObj);
      });
      await supportService.reply(room.id, body);
      setContent('');
      setFiles([]);
      reload();
    } catch (error) {
      void message.error(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };
  const close = () =>
    modal.confirm({
      title: 'Kết thúc hỗ trợ?',
      content: 'Cuộc trò chuyện vẫn được lưu để tra cứu.',
      okText: 'Kết thúc',
      cancelText: 'Quay lại',
      onOk: async () => {
        try {
          await supportService.closeRoom(room.id);
          reload();
        } catch (error) {
          void message.error(getErrorMessage(error));
        }
      },
    });
  return (
    <Panel title={room.customer_name}>
      <Space wrap>
        <StatusTag status={room.status} />
        {room.staff_name && <span className="text-muted">Phụ trách: {room.staff_name}</span>}
      </Space>
      <div className="my-6 max-h-[520px] space-y-4 overflow-y-auto" aria-live="polite">
        <Image.PreviewGroup>
          {!room.messages.length && <Empty description="Chưa có tin nhắn" />}
          {room.messages.map((item) => (
            <div
              key={item.id}
              className={
                'rounded-lg p-4 ' + (item.sender_type === 'CUSTOMER' ? 'mr-6 bg-surface' : 'ml-6 bg-primary-soft')
              }
            >
              <p className="whitespace-pre-wrap break-words">{item.content}</p>
              {!!item.attachments.length && (
                <Space wrap className="mt-3">
                  {item.attachments.map((url) => (
                    <Image key={url} src={getFileUrl(url)} width={100} height={85} style={{ objectFit: 'cover' }} />
                  ))}
                </Space>
              )}
              <p className="mt-3 text-sm text-muted">
                {item.sender_type === 'CUSTOMER' ? 'Khách hàng' : item.sender_type === 'AI' ? 'Trợ lý AI' : 'Nhân viên'}{' '}
                · {new Date(item.created_at).toLocaleString('vi-VN')}
              </p>
            </div>
          ))}
        </Image.PreviewGroup>
      </div>
      {room.status === 'AI_ACTIVE' && (
        <Button type="primary" loading={busy} onClick={() => void claim()}>
          Tiếp nhận cuộc trò chuyện
        </Button>
      )}
      {room.status === 'STAFF_ACTIVE' && !canReply && (
        <p className="text-muted">Nhân viên khác đang phụ trách cuộc trò chuyện này.</p>
      )}
      <label className="mb-2 mt-5 block font-medium" htmlFor="support-reply">
        Nội dung trả lời
      </label>
      <Input.TextArea
        id="support-reply"
        rows={4}
        value={content}
        onChange={(event) => setContent(event.target.value)}
        disabled={!canReply || busy}
        maxLength={5000}
        placeholder={canReply ? 'Nhập nội dung trả lời...' : 'Tiếp nhận hội thoại để bắt đầu trả lời...'}
      />
      <Space wrap className="mt-4">
        <Upload
          accept="image/jpeg,image/png,image/webp,image/gif"
          maxCount={3}
          fileList={files}
          disabled={!canReply || busy}
          beforeUpload={(file) => {
            if (file.size > 5 * 1024 * 1024) {
              void message.error('Mỗi ảnh tối đa 5 MB.');
              return Upload.LIST_IGNORE;
            }
            return false;
          }}
          onChange={({ fileList }) => setFiles(fileList)}
        >
          <Button disabled={!canReply || busy}>Đính kèm ảnh</Button>
        </Upload>
        <Button
          type="primary"
          disabled={!canReply || (!content.trim() && !files.length)}
          loading={busy}
          onClick={() => void reply()}
        >
          Gửi
        </Button>
        {canReply && <Button onClick={close}>Kết thúc hỗ trợ</Button>}
      </Space>
    </Panel>
  );
};
const SupportSection = () => {
  const [selectedId, setSelectedId] = useState('');
  const [status, setStatus] = useState('');
  const loadRooms = useCallback(() => supportService.getRooms(status), [status]);
  const rooms = useData(loadRooms, 5000);
  const activeId = rooms.data?.some((room) => room.id === selectedId) ? selectedId : rooms.data?.[0]?.id;
  const loadRoom = useCallback(() => (activeId ? supportService.getRoom(activeId) : Promise.resolve(null)), [activeId]);
  const detail = useData(loadRoom, 5000);
  const reload = () => {
    rooms.reload();
    detail.reload();
  };
  return (
    <>
      <PageHeader title="Chăm sóc khách hàng" description="Tiếp nhận và trả lời các cuộc trò chuyện của khách hàng." />
      <Select
        className="mb-6 min-w-60"
        value={status}
        onChange={setStatus}
        options={[
          { value: '', label: 'Tất cả hội thoại' },
          { value: 'AI_ACTIVE', label: 'AI đang hỗ trợ / chưa tiếp nhận' },
          { value: 'STAFF_ACTIVE', label: 'Nhân viên đang hỗ trợ' },
          { value: 'CLOSED', label: 'Đã kết thúc' },
        ]}
      />
      {!rooms.data ? (
        <LoadingCard error={rooms.error} onRetry={rooms.reload} />
      ) : !rooms.data.length ? (
        <Panel>
          <Empty description="Chưa có hội thoại" />
        </Panel>
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[280px_1fr]">
          <Panel title="Hội thoại">
            <div className="max-h-[650px] space-y-3 overflow-y-auto">
              {rooms.data.map((room) => (
                <button
                  key={room.id}
                  onClick={() => setSelectedId(room.id)}
                  className={
                    'w-full rounded-lg p-4 text-left transition-colors hover:bg-primary-soft ' +
                    (activeId === room.id ? 'bg-primary-soft' : 'bg-surface')
                  }
                >
                  <p className="mb-2 font-medium">{room.customer_name}</p>
                  <StatusTag status={room.status} />
                  <p className="mt-2 text-xs text-muted">{new Date(room.updated_at).toLocaleString('vi-VN')}</p>
                </button>
              ))}
            </div>
          </Panel>
          {!detail.data ? (
            <LoadingCard error={detail.error} onRetry={detail.reload} />
          ) : (
            <Conversation key={detail.data.id} room={detail.data} reload={reload} />
          )}
        </div>
      )}
    </>
  );
};
export default SupportSection;
