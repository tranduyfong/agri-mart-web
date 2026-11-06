// Nhận sự kiện chat qua Socket, lấy số chưa đọc và cập nhật lại khi nối mạng/quay về tab.
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { isAxiosError } from 'axios';
import apiClient from '../services/apiClient';
import supportService from '../services/supportService';

const useChatNotifications = (token: string | null, enabled: boolean) => {
  const [state, setState] = useState({ token, chatUnreadCount: 0, chatRevision: 0, chatConnected: false });
  // Mở Socket khi có phiên/quyền hỗ trợ; lấy summary sau sự kiện, kết nối lại hoặc quay về tab và dọn kết nối khi rời
  // phiên.
  useEffect(() => {
    if (!token || !enabled) return;
    let disposed = false, loading = false, queued = false;
    const socket = io(new URL(apiClient.defaults.baseURL!, window.location.origin).origin, { auth: { token }, autoConnect: false });
    // Tải summary mới; nếu lượt trước chưa xong thì ghi nhận cần tải thêm thay vì gọi chồng request.
    const refresh = async () => {
      if (loading) { queued = true; return; }
      loading = true;
      try {
        const summary = await supportService.getSummary();
        if (!disposed) setState((previous) => ({ token, chatUnreadCount: summary.unread_count,
          chatRevision: previous.chatRevision + 1, chatConnected: socket.connected }));
      } catch (error) { if (!disposed) setState((previous) => ({ ...previous, token,
        chatUnreadCount: isAxiosError(error) && [401, 403].includes(error.response?.status || 0) ? 0 : previous.chatUnreadCount, chatConnected: false })); }
      finally { loading = false; if (queued && !disposed) { queued = false; void refresh(); } }
    };
    const changed = () => { void refresh(); };
    const disconnected = () => { if (!disposed) setState((previous) => ({ ...previous, chatConnected: false })); };
    const visible = () => { if (!document.hidden) { if (!socket.connected) socket.connect(); changed(); } };
    socket.on('connect', changed);
    socket.on('chat:changed', changed);
    socket.on('disconnect', disconnected);
    socket.on('connect_error', disconnected);
    socket.connect();
    changed();
    const timer = window.setInterval(visible, 10000);
    document.addEventListener('visibilitychange', visible);
    window.addEventListener('focus', visible);
    return () => { disposed = true; window.clearInterval(timer); document.removeEventListener('visibilitychange', visible);
      window.removeEventListener('focus', visible); socket.removeAllListeners(); socket.disconnect(); };
  }, [token, enabled]);
  return enabled && state.token === token ? state : { chatUnreadCount: 0, chatRevision: 0, chatConnected: false };
};
export default useChatNotifications;
