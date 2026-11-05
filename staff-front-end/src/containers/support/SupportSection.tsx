import { useCallback, useEffect, useState } from 'react';
import { Alert, App, Avatar, Badge, Button, Empty, Input, Select, Spin, Tooltip } from 'antd';
import { ArrowLeftOutlined, CheckCircleOutlined, CommentOutlined, CustomerServiceOutlined } from '@ant-design/icons';
import useAuth from '../../hooks/useAuth';
import useData from '../../hooks/useData';
import useConversation from '../../hooks/useConversation';
import supportService from '../../services/supportService';
import PageHeader from '../../components/PageHeader';
import ChatMessages from '../../components/chat/ChatMessages';
import ChatComposer from '../../components/chat/ChatComposer';
import { getFileUrl } from '../../utils/fileUrl';
import { getErrorMessage } from '../../utils/errorMessage';

const Conversation = ({ id, active, onBack }: { id: string; active: boolean; onBack: () => void }) => {
  const { user, chatRevision } = useAuth();
  const { message, modal } = App.useApp();
  const [atBottom, setAtBottom] = useState(true), [busy, setBusy] = useState(false), [loadingOlder, setLoadingOlder] = useState(false);
  const chat = useConversation(id, chatRevision, atBottom, active);
  const room = chat.room;
  const canReply = room?.status === 'STAFF_ACTIVE' && room.assigned_staff_id === user?.id;
  const claim = async () => {
    setBusy(true);
    try { await supportService.claimRoom(id); chat.reload(); }
    catch (error) { void message.error(getErrorMessage(error)); }
    finally { setBusy(false); }
  };
  const close = () => modal.confirm({ title: 'Kết thúc cuộc trò chuyện?', content: 'Lịch sử tin nhắn vẫn được lưu. Khách hàng có thể nhắn lại khi cần hỗ trợ.',
    okText: 'Kết thúc', cancelText: 'Tiếp tục hỗ trợ', onOk: async () => {
      try { await supportService.closeRoom(id); chat.reload(); }
      catch (error) { void message.error(getErrorMessage(error)); }
    } });
  if (!room) return <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
    {chat.error ? <Alert type="error" title={chat.error} action={<Button onClick={chat.reload}>Thử lại</Button>} /> : <Spin />}
    <Button className="md:hidden" onClick={onBack} icon={<ArrowLeftOutlined />}>Danh sách hội thoại</Button>
  </div>;
  return <>
    <div className="flex shrink-0 items-center gap-3 border-b border-line/70 px-4 py-4 sm:px-5">
      <Button type="text" className="md:hidden" icon={<ArrowLeftOutlined />} aria-label="Quay lại hội thoại" onClick={onBack} />
      <Avatar size={42} src={getFileUrl(room.customer_avatar) || undefined} style={{ backgroundColor: '#ebf6e8', color: '#287a32' }}>{room.customer_name[0]}</Avatar>
      <div className="min-w-0 flex-1"><h2 className="truncate font-semibold">{room.customer_name}</h2>
        <p className="mt-1 truncate text-xs text-muted">{room.status === 'AI_ACTIVE' ? room.waiting_for_staff || !room.ai_enabled ? 'Khách đang chờ nhân viên' : 'Trợ lý AI đang hỗ trợ' : room.status === 'CLOSED' ? 'Đã kết thúc hỗ trợ' : `Phụ trách: ${room.staff_name || 'Nhân viên'}`}</p></div>
      {canReply && <Tooltip title="Kết thúc hỗ trợ"><Button type="text" icon={<CheckCircleOutlined />} aria-label="Kết thúc hỗ trợ" onClick={close} /></Tooltip>}
    </div>
    {chat.error && <Alert type="warning" title={chat.error} className="mx-4 mt-3" action={<Button size="small" onClick={chat.reload}>Tải lại</Button>} />}
    <ChatMessages messages={room.messages} hasMore={room.has_more} loadingOlder={loadingOlder} onAtBottomChange={setAtBottom}
      onOlder={() => { setLoadingOlder(true); void chat.loadOlder().catch((error) => message.error(getErrorMessage(error))).finally(() => setLoadingOlder(false)); }} />
    {room.status === 'AI_ACTIVE' && <div className="border-t border-line/50 bg-primary-soft px-4 py-3 text-center">
      {room.ai_pending && <p className="mb-2 text-xs text-muted">AI đang soạn phản hồi. Tiếp nhận để tự hỗ trợ khách.</p>}
      <Button type="primary" icon={<CustomerServiceOutlined />} loading={busy} onClick={() => void claim()}>Tiếp nhận cuộc trò chuyện</Button>
    </div>}
    {room.status === 'STAFF_ACTIVE' && !canReply && <p className="px-4 py-2 text-center text-xs text-muted">Nhân viên khác đang phụ trách cuộc trò chuyện này.</p>}
    <ChatComposer disabled={!canReply} placeholder={canReply ? 'Nhập tin nhắn...' : room.status === 'CLOSED' ? 'Hội thoại đã kết thúc' : 'Tiếp nhận hội thoại để trả lời'} onSend={chat.send} />
  </>;
};

const SupportSection = () => {
  const { chatUnreadCount, chatConnected, chatRevision } = useAuth();
  const [selectedId, setSelectedId] = useState(''), [status, setStatus] = useState(''), [keyword, setKeyword] = useState('');
  const [mobileDetail, setMobileDetail] = useState(false);
  const loadRooms = useCallback(() => supportService.getRooms(status, keyword), [status, keyword]);
  const rooms = useData(loadRooms, 0, chatRevision);
  const activeId = rooms.data?.some((room) => room.id === selectedId) ? selectedId : undefined;
  // Màn hình rộng luôn mở khung chi tiết; điện thoại chỉ đánh dấu đọc sau khi chọn hội thoại.
  const [wide, setWide] = useState(() => window.matchMedia('(min-width: 768px)').matches);
  useEffect(() => {
    const media = window.matchMedia('(min-width: 768px)');
    const update = () => setWide(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  return <>
    <PageHeader title="Tin nhắn khách hàng" description="Trò chuyện, gửi ảnh và hỗ trợ khách hàng tại một nơi." />
    <div className="flex h-[calc(100dvh-220px)] min-h-[520px] overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
      <aside className={(mobileDetail ? 'hidden md:flex' : 'flex') + ' w-full shrink-0 flex-col border-r border-line/70 md:w-72 xl:w-80'}>
        <div className="space-y-3 border-b border-line/70 px-4 py-4">
          <div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Hội thoại <Badge count={chatUnreadCount} /></h2>
            <Tooltip title={chatConnected ? 'Đang nhận tin trực tiếp' : 'Đang kết nối lại'}><span className={'h-2.5 w-2.5 rounded-full ' + (chatConnected ? 'bg-green-500' : 'bg-amber-400')} /></Tooltip></div>
          <Input.Search placeholder="Tìm tên khách hàng" allowClear onSearch={setKeyword} aria-label="Tìm cuộc trò chuyện" />
          <Select value={status} onChange={setStatus} className="w-full" options={[
            { value: '', label: 'Tất cả hội thoại' }, { value: 'AI_ACTIVE', label: 'Chờ tiếp nhận' },
            { value: 'STAFF_ACTIVE', label: 'Đang hỗ trợ' }, { value: 'CLOSED', label: 'Đã kết thúc' },
          ]} />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {rooms.loading && <div className="p-10 text-center"><Spin /></div>}
          {rooms.error && <Alert type="error" title={rooms.error} action={<Button size="small" onClick={rooms.reload}>Thử lại</Button>} />}
          {rooms.data && !rooms.data.length && <Empty className="mt-14" description="Chưa có hội thoại phù hợp" />}
          {rooms.data?.map((room) => <button key={room.id} type="button" onClick={() => { setSelectedId(room.id); setMobileDetail(true); }}
            className={'mb-1 flex w-full cursor-pointer items-center gap-3 rounded-xl p-3 text-left transition hover:bg-page-gray ' + (activeId === room.id ? 'bg-primary-soft' : '')}>
            <Avatar size={44} src={getFileUrl(room.customer_avatar) || undefined} className="shrink-0" style={{ backgroundColor: '#ebf6e8', color: '#287a32' }}>{room.customer_name[0]}</Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2"><p className={'min-w-0 flex-1 truncate text-sm ' + (room.unread_count ? 'font-bold' : 'font-medium')}>{room.customer_name}</p>
                <Badge count={room.unread_count} size="small" /></div>
              <p className={'mt-1 truncate text-xs ' + (room.unread_count ? 'font-semibold text-gray-700' : 'text-muted')}>
                {room.last_message ? (room.last_message.sender_type !== 'CUSTOMER' ? 'Agri-Mart: ' : '') + (room.last_message.content || (room.last_message.has_images ? 'Đã gửi hình ảnh' : 'Tin nhắn')) : 'Chưa có tin nhắn'}</p>
              <p className="mt-1 text-[10px] text-muted">{new Date(room.updated_at).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          </button>)}
        </div>
      </aside>
      <div className={(mobileDetail ? 'flex' : 'hidden md:flex') + ' min-w-0 flex-1 flex-col bg-white'}>
        {activeId ? <Conversation key={activeId} id={activeId} active={wide || mobileDetail} onBack={() => setMobileDetail(false)} /> :
          <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center"><CommentOutlined className="text-5xl text-primary" />
            <p className="text-lg font-semibold">Kết nối với khách hàng</p><p className="text-sm text-muted">Chọn một hội thoại để xem và trả lời tin nhắn.</p></div>}
      </div>
    </div>
  </>;
};
export default SupportSection;
