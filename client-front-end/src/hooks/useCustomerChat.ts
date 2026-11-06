// Giữ kết nối chat của khách, đếm tin chưa đọc, tải lịch sử khi mở khung và đánh dấu đọc khi thật sự đang xem.
import { useCallback, useEffect, useState } from 'react';
import { isAxiosError } from 'axios';
import { io } from 'socket.io-client';
import { useAppDispatch } from './useRedux';
import { logout } from '../store/slices/authSlice';
import { clearAuth } from '../utils/authStorage';
import { getErrorMessage } from '../utils/errorMessage';
import chatService from '../services/chatService';
import apiClient from '../services/apiClient';
import type { ChatRoom } from '../types/chat';

// Ghép theo ID tin để cập nhật trang mới nhưng giữ những trang lịch sử đã tải trước.
const mergeRoom = (previous: ChatRoom | null, next: ChatRoom) => {
  if (!previous || previous.id !== next.id) return next;
  const messages = [...new Map([...previous.messages, ...next.messages].map((item) => [item.id, item])).values()].sort((a, b) => a.id.localeCompare(b.id));
  const keepOlder = previous.messages[0]?.id < (next.messages[0]?.id || '');
  return { ...next, messages, has_more: keepOlder ? previous.has_more : next.has_more };
};

const useCustomerChat = (token: string | null, open: boolean, atBottom: boolean) => {
  const dispatch = useAppDispatch();
  const [state, setState] = useState<{ token: string | null; room: ChatRoom | null; unread: number; loading: boolean; error: string; connected: boolean }>(
    { token, room: null, unread: 0, loading: !!token, error: '', connected: false });
  const [revision, setRevision] = useState(0);
  const [visible, setVisible] = useState(!document.hidden && document.hasFocus());
  const reload = useCallback(() => setRevision((value) => value + 1), []);
  const handleError = useCallback((error: unknown) => {
    if (isAxiosError(error) && error.response?.status === 401) { clearAuth(); dispatch(logout()); }
    return getErrorMessage(error);
  }, [dispatch]);

  // Giữ Socket theo token dù khung chat đóng; sự kiện và kiểm tra định kỳ làm mới số chưa đọc.
  useEffect(() => {
    if (!token) return;
    let disposed = false, pending = false, queued = false;
    const socket = io(new URL(apiClient.defaults.baseURL!, window.location.origin).origin, { auth: { token }, autoConnect: false });
    // Tải summary mới; nếu lượt trước chưa xong thì ghi nhận cần tải thêm thay vì gọi chồng request.
    const refresh = async () => {
      if (pending) { queued = true; return; }
      pending = true;
      try {
        const summary = await chatService.getSummary();
        if (!disposed) { setState((previous) => ({ ...previous, token, unread: summary.unread_count, connected: socket.connected })); reload(); }
      } catch (error) { if (!disposed) setState((previous) => ({ ...previous, token, error: handleError(error) })); }
      finally { pending = false; if (queued && !disposed) { queued = false; void refresh(); } }
    };
    const changed = () => { void refresh(); };
    const disconnected = () => { if (!disposed) setState((previous) => ({ ...previous, connected: false })); };
    const show = () => { setVisible(!document.hidden && document.hasFocus()); if (!document.hidden) { if (!socket.connected) socket.connect(); changed(); } };
    const blur = () => setVisible(false);
    socket.on('connect', changed); socket.on('chat:changed', changed);
    socket.on('disconnect', disconnected); socket.on('connect_error', disconnected);
    socket.connect(); changed();
    const timer = window.setInterval(() => { if (!document.hidden) changed(); }, 10000);
    document.addEventListener('visibilitychange', show); window.addEventListener('focus', show); window.addEventListener('blur', blur);
    return () => { disposed = true; window.clearInterval(timer); document.removeEventListener('visibilitychange', show);
      window.removeEventListener('focus', show); window.removeEventListener('blur', blur); socket.removeAllListeners(); socket.disconnect(); };
  }, [token, reload, handleError]);

  // Chỉ tải nội dung phòng khi khung đang mở, ghép theo ID để giữ các trang lịch sử đã tải trước.
  useEffect(() => {
    if (!token || !open) return;
    let disposed = false;
    chatService.getRoom().then((room) => {
      if (!disposed) setState((previous) => ({ ...previous, token, room: room ? mergeRoom(previous.token === token ? previous.room : null, room) : null, loading: false, error: '' }));
    }).catch((error) => { if (!disposed) setState((previous) => ({ ...previous, token, loading: false, error: handleError(error) })); });
    return () => { disposed = true; };
  }, [token, open, revision, handleError]);

  const room = state.token === token ? state.room : null;
  // Mốc đọc dùng ID tin cuối thực sự đã tải, tránh đánh dấu luôn cả tin vừa đến sau đó.
  const lastId = room?.messages.at(-1)?.id;
  // Chỉ xác nhận đã đọc khi tab có focus, khung mở và đang ở gần cuối; tin mới ngoài mốc đã thấy vẫn chưa đọc.
  useEffect(() => {
    if (!token || !open || !visible || !atBottom || !room?.unread_count || !lastId) return;
    let disposed = false;
    chatService.markRead(room.id, lastId).then(() => { if (!disposed) reload(); }).catch(handleError);
    return () => { disposed = true; };
  }, [token, open, visible, atBottom, room, lastId, reload, handleError]);

  // Gửi tin qua service rồi ghép phòng trả về vào lịch sử; lỗi được chuyển cho ô soạn giữ bản nháp.
  const send = async (data: FormData) => {
    try { const result = await chatService.send(data); setState((previous) => ({ ...previous, token, room: mergeRoom(previous.room, result), loading: false, error: '' })); reload(); }
    catch (error) { handleError(error); throw error; }
  };
  // Dùng ID tin đầu làm con trỏ để lấy trang trước rồi ghép vào lịch sử hiện có.
  const loadOlder = async () => {
    if (!room?.messages.length) return;
    const older = await chatService.getRoom(room.messages[0].id);
    if (older) setState((previous) => ({ ...previous, room: mergeRoom(previous.room, older) }));
  };
  const resumeAi = async () => {
    if (!room) return;
    try {
      const result = await chatService.resumeAi(room.id);
      setState((previous) => ({ ...previous, token, room: mergeRoom(previous.room, result), error: '' }));
      reload();
    } catch (error) { handleError(error); }
  };
  return { room, resumeAi, unread: state.token === token ? state.unread : 0, loading: state.token !== token || state.loading,
    connected: state.token === token && state.connected, error: state.token === token ? state.error : '', reload, send, loadOlder };
};
export default useCustomerChat;
