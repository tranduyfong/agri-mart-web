// Hiển thị bong bóng tin, ảnh và thời gian; giữ vị trí cuộn khi đọc tin cũ hoặc tải thêm lịch sử.
import { useLayoutEffect, useRef } from 'react';
import { Button, Image } from 'antd';
import { CommentOutlined } from '@ant-design/icons';
import type { ChatMessage } from '../../types/chat';
import { getFileUrl } from '../../utils/fileUrl';
import ChatRecommendations from './ChatRecommendations';

interface Props {
  messages: ChatMessage[];
  customerView?: boolean;
  hasMore?: boolean;
  loadingOlder?: boolean;
  onOlder: () => void;
  onAtBottomChange: (value: boolean) => void;
}
const ChatMessages = ({ messages, customerView = false, hasMore, loadingOlder, onOlder, onAtBottomChange }: Props) => {
  const scroll = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const previous = useRef({ first: '', last: '', height: 0 });
  const first = messages[0]?.id || '', last = messages.at(-1)?.id || '';
  // Đo sau khi DOM đổi: tải tin cũ thì giữ chỗ đang đọc; ở gần cuối hoặc vừa tự gửi thì cuộn xuống.
  useLayoutEffect(() => {
    const element = scroll.current;
    if (!element) return;
    const old = previous.current;
    const ownLast = messages.at(-1)?.sender_type === (customerView ? 'CUSTOMER' : 'STAFF');
    if (old.first && first !== old.first && last === old.last) element.scrollTop += element.scrollHeight - old.height;
    else if (stickToBottom.current || (last !== old.last && ownLast)) element.scrollTop = element.scrollHeight;
    previous.current = { first, last, height: element.scrollHeight };
  }, [first, last, messages, customerView]);
  return (
    <div ref={scroll} className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-5 sm:px-5"
      aria-label="Lịch sử tin nhắn" onScroll={() => {
        const element = scroll.current!;
        stickToBottom.current = element.scrollHeight - element.scrollTop - element.clientHeight < 80;
        onAtBottomChange(stickToBottom.current);
      }}>
      {hasMore && <div className="text-center"><Button type="text" size="small" loading={loadingOlder} onClick={onOlder}>Xem tin nhắn trước</Button></div>}
      {!messages.length && <div className="flex h-full min-h-40 flex-col items-center justify-center gap-3 text-center text-gray-400">
        <CommentOutlined className="text-4xl text-primary" /><p className="text-sm">Bắt đầu cuộc trò chuyện với Agri-Mart.</p>
        <p className="max-w-64 text-xs">Bạn có thể gửi tin nhắn hoặc hình ảnh để được hỗ trợ.</p>
      </div>}
      <Image.PreviewGroup>
        {messages.map((item, index) => {
          const own = customerView ? item.sender_type === 'CUSTOMER' : item.sender_type !== 'CUSTOMER';
          const date = new Date(item.created_at);
          const newDay = !index || date.toDateString() !== new Date(messages[index - 1].created_at).toDateString();
          return <div key={item.id}>
            {newDay && <p className="mb-4 mt-2 text-center text-[11px] text-gray-400">{date.toLocaleDateString('vi-VN')}</p>}
            <div className={'flex ' + (own ? 'justify-end' : 'justify-start')}>
              <div className="max-w-[85%] sm:max-w-[78%]">
                {!!item.content && <div className={'whitespace-pre-wrap break-words rounded-2xl px-4 py-2.5 text-sm leading-relaxed [overflow-wrap:anywhere] ' +
                  (own ? 'rounded-br-md bg-primary text-white' : 'rounded-bl-md bg-[#edf0ec] text-gray-800')}>{item.content}</div>}
                {!!item.attachments.length && <div className="mt-2 grid w-56 max-w-full grid-cols-1 gap-2">
                  {item.attachments.map((url) => <Image key={url} src={getFileUrl(url) || undefined} alt="Ảnh được gửi trong cuộc trò chuyện"
                    width="100%" height={170} style={{ objectFit: 'cover', borderRadius: 12 }} />)}
                </div>}
                {!!item.recommendations?.length && <ChatRecommendations items={item.recommendations} />}
                <p className={'mt-1.5 px-1 text-[10px] text-gray-400 ' + (own ? 'text-right' : '')}>
                  {item.sender_type === 'AI' ? 'Trợ lý AI' : own ? 'Bạn' : item.sender_type === 'CUSTOMER' ? item.sender_name : 'Agri-Mart'} · <time dateTime={item.created_at}>{date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</time>
                </p>
              </div>
            </div>
          </div>;
        })}
      </Image.PreviewGroup>
    </div>
  );
};
export default ChatMessages;
