// Bong bóng chat cố định góc phải; mở/thu nhỏ khung và hiển thị số tin chưa đọc trên mọi trang khách.
import { useState } from 'react';
import { Alert, Avatar, Badge, Button, Spin } from 'antd';
import { CloseOutlined, CommentOutlined, CustomerServiceOutlined, MinusOutlined } from '@ant-design/icons';
import { useAppSelector } from '../../hooks/useRedux';
import useCustomerChat from '../../hooks/useCustomerChat';
import ChatMessages from '../../components/chat/ChatMessages';
import ChatComposer from '../../components/chat/ChatComposer';

const ChatWindow = ({ token }: { token: string | null }) => {
  const [open, setOpen] = useState(false), [atBottom, setAtBottom] = useState(true), [loadingOlder, setLoadingOlder] = useState(false);
  const chat = useCustomerChat(token, open, atBottom);
  return <div className="fixed bottom-5 right-4 z-[1050] sm:bottom-6 sm:right-6">
    <section role="dialog" aria-label="Trò chuyện với Agri-Mart" aria-hidden={!open}
      style={{ display: open ? 'flex' : 'none' }}
      className="absolute bottom-20 right-0 h-[580px] max-h-[calc(100dvh-125px)] w-[380px] max-w-[calc(100vw-32px)] flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl">
      <div className="flex shrink-0 items-center gap-3 border-b border-gray-100 bg-white px-4 py-3">
        <Avatar size={42} icon={<CustomerServiceOutlined />} style={{ backgroundColor: '#12b80a' }} />
        <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-gray-900">Agri-Mart hỗ trợ</p>
          <p className="mt-0.5 text-[11px] text-gray-400">{!token ? 'Luôn sẵn sàng lắng nghe bạn' : !chat.connected ? 'Đang kết nối lại...'
            : chat.room?.status === 'STAFF_ACTIVE' ? 'Nhân viên đang hỗ trợ bạn' : chat.room?.waiting_for_staff ? 'Đang chờ nhân viên'
              : chat.room?.ai_enabled ? 'Trợ lý mua sắm AI' : 'Kết nối trực tiếp'}</p></div>
        <Button type="text" size="small" icon={<MinusOutlined />} aria-label="Thu nhỏ trò chuyện" onClick={() => setOpen(false)} />
        <Button type="text" size="small" icon={<CloseOutlined />} aria-label="Đóng trò chuyện" onClick={() => setOpen(false)} />
      </div>
      {!token ? <div className="flex flex-1 flex-col items-center justify-center gap-4 p-7 text-center">
        <CommentOutlined className="text-5xl text-primary" /><h3 className="text-lg font-semibold">Chào bạn!</h3>
        <p className="text-sm leading-relaxed text-gray-500">Đăng nhập để nhắn tin, gửi ảnh và lưu cuộc trò chuyện với cửa hàng.</p>
        <Button type="primary" href="/login">Đăng nhập để trò chuyện</Button>
      </div> : <>
        {chat.error && <Alert type="warning" title={chat.error} className="mx-3 mt-3" action={<Button size="small" onClick={chat.reload}>Thử lại</Button>} />}
        {chat.loading ? <div className="flex flex-1 items-center justify-center"><Spin /></div> :
          <ChatMessages messages={chat.room?.messages || []} customerView hasMore={chat.room?.has_more} loadingOlder={loadingOlder}
            onAtBottomChange={setAtBottom} onOlder={() => { setLoadingOlder(true); void chat.loadOlder().catch(() => chat.reload()).finally(() => setLoadingOlder(false)); }} />}
        {chat.room?.ai_pending && <p className="animate-pulse px-4 pb-2 text-[11px] text-primary" role="status">Trợ lý AI đang trả lời...</p>}
        {chat.room?.status !== 'STAFF_ACTIVE' && <div className="flex items-center justify-between gap-2 px-4 pb-2">
          <p className="text-[10px] text-gray-400">{chat.room?.waiting_for_staff ? 'Nhân viên sẽ tiếp nhận yêu cầu của bạn.'
            : chat.room?.ai_enabled ? 'AI hỗ trợ tìm sản phẩm còn hàng.' : 'Cửa hàng luôn sẵn sàng hỗ trợ bạn.'}</p>
          {chat.room?.waiting_for_staff && chat.room.ai_enabled ? (
            <Button type="link" size="small" onClick={() => void chat.resumeAi()}>Tiếp tục với AI</Button>
          ) : <Button type="link" size="small" disabled={chat.room?.waiting_for_staff} onClick={() => {
            const body = new FormData(); body.set('content', 'Tôi muốn gặp nhân viên cửa hàng.'); body.set('client_id', crypto.randomUUID());
            void chat.send(body).catch(() => chat.reload());
          }}>Gặp nhân viên</Button>}
        </div>}
        <ChatComposer onSend={chat.send} />
      </>}
    </section>
    <Badge count={chat.unread} overflowCount={99} offset={[-3, 5]} title={`${chat.unread} tin nhắn chưa đọc`}>
      <button type="button" aria-label={open ? 'Thu nhỏ trò chuyện' : `Mở trò chuyện, ${chat.unread} tin nhắn chưa đọc`}
        aria-expanded={open} onClick={() => setOpen((value) => !value)}
        className="flex h-15 w-15 cursor-pointer items-center justify-center rounded-full bg-primary text-3xl text-white shadow-lg transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">
        {open ? <CloseOutlined /> : <CommentOutlined />}
      </button>
    </Badge>
  </div>;
};
const ChatWidget = () => {
  const { user, accessToken } = useAppSelector((state) => state.auth);
  return <ChatWindow key={user?.id || 'guest'} token={user?.role === 'CUSTOMER' ? accessToken : null} />;
};
export default ChatWidget;
