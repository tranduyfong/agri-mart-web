// Tải và ghép lịch sử một phòng chat; chỉ đánh dấu đọc khi phòng đang hiển thị và người dùng ở gần cuối.
import { useCallback, useEffect, useState } from 'react';
import supportService from '../services/supportService';
import { getErrorMessage } from '../utils/errorMessage';
import type { ChatDetail } from '../types/staff';

// Ghép tin mới vào lịch sử hiện có, bỏ trùng ID và giữ thông tin còn trang cũ.
const merge = (previous: ChatDetail | undefined, next: ChatDetail) => {
  if (!previous || previous.id !== next.id) return next;
  const messages = [...new Map([...previous.messages, ...next.messages].map((item) => [item.id, item])).values()].sort((a, b) => a.id.localeCompare(b.id));
  return { ...next, messages, has_more: previous.messages[0]?.id < (next.messages[0]?.id || '') ? previous.has_more : next.has_more };
};
const useConversation = (id: string, chatRevision: number, atBottom: boolean, active: boolean) => {
  const [state, setState] = useState<{ room?: ChatDetail; error?: string }>({});
  const [revision, setRevision] = useState(0);
  const [visible, setVisible] = useState(!document.hidden && document.hasFocus());
  const reload = useCallback(() => setRevision((value) => value + 1), []);
  // Tải lại khi chọn phòng hoặc có revision mới từ Socket; ghép tin bằng ID để không lặp/mất lịch sử đã tải.
  useEffect(() => {
    let disposed = false;
    supportService.getRoom(id).then((room) => { if (!disposed) setState((previous) => ({ room: merge(previous.room, room) })); })
      .catch((error) => { if (!disposed) setState((previous) => ({ ...previous, error: getErrorMessage(error) })); });
    return () => { disposed = true; };
  }, [id, revision, chatRevision]);
  // Theo dõi focus/tab hiển thị để phòng đang ẩn không tự xóa số tin chưa đọc.
  useEffect(() => {
    const show = () => { setVisible(!document.hidden && document.hasFocus()); if (!document.hidden) reload(); };
    const blur = () => setVisible(false);
    document.addEventListener('visibilitychange', show); window.addEventListener('focus', show); window.addEventListener('blur', blur);
    return () => { document.removeEventListener('visibilitychange', show); window.removeEventListener('focus', show); window.removeEventListener('blur', blur); };
  }, [reload]);
  // Chỉ gửi mốc đã nhìn thấy lên API đọc; số chưa đọc là dữ liệu lưu ở backend, không chỉ là state trong tab.
  const lastId = state.room?.messages.at(-1)?.id;
  // Đánh dấu tới tin cuối đã xem, chỉ khi phòng thực sự mở và vùng lịch sử ở gần cuối.
  useEffect(() => {
    if (!active || !visible || !atBottom || !state.room?.unread_count || !lastId) return;
    let disposed = false;
    supportService.markRead(id, lastId).then(() => { if (!disposed) reload(); }).catch(() => {});
    return () => { disposed = true; };
  }, [id, state.room, lastId, active, visible, atBottom, reload]);
  // Gửi tin qua service rồi ghép phòng trả về vào lịch sử; lỗi được chuyển cho ô soạn giữ bản nháp.
  const send = async (body: FormData) => { const room = await supportService.reply(id, body); setState((previous) => ({ room: merge(previous.room, room) })); reload(); };
  // Dùng ID tin đầu làm con trỏ để lấy trang trước rồi ghép vào lịch sử hiện có.
  const loadOlder = async () => {
    if (!state.room?.messages.length) return;
    const room = await supportService.getRoom(id, state.room.messages[0].id);
    setState((previous) => ({ room: merge(previous.room, room) }));
  };
  return { ...state, reload, send, loadOlder };
};
export default useConversation;
