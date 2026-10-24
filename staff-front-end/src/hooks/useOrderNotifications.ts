import { useEffect, useState } from 'react';
import { isAxiosError } from 'axios';
import { io } from 'socket.io-client';
import orderService from '../services/orderService';
import apiClient from '../services/apiClient';

const useOrderNotifications = (token: string | null, enabled: boolean) => {
  const [state, setState] = useState({ token, pendingCount: 0, ordersRevision: 0, ordersConnected: false });

  useEffect(() => {
    if (!token || !enabled) return;
    let disposed = false;
    let loading = false;
    let queued = false;
    const url = new URL(apiClient.defaults.baseURL!, window.location.origin);
    const socket = io(url.origin, { auth: { token }, autoConnect: false });
    const refresh = async () => {
      if (loading) {
        queued = true;
        return;
      }
      loading = true;
      try {
        const summary = await orderService.getSummary();
        if (!disposed)
          setState((previous) => ({
            token,
            pendingCount: summary.pending_count,
            ordersConnected: socket.connected,
            ordersRevision: previous.ordersRevision + (previous.pendingCount !== summary.pending_count ? 1 : 0),
          }));
      } catch (error) {
        if (!disposed && isAxiosError(error) && [401, 403].includes(error.response?.status || 0)) {
          socket.disconnect();
          setState((previous) => ({ ...previous, token, pendingCount: 0, ordersConnected: false }));
        }
      } finally {
        loading = false;
        if (queued && !disposed) {
          queued = false;
          void refresh();
        }
      }
    };
    const changed = () => {
      setState((previous) => ({
        ...previous,
        token,
        ordersConnected: socket.connected,
        ordersRevision: previous.ordersRevision + 1,
      }));
      void refresh();
    };
    const disconnected = () => {
      if (!disposed) setState((previous) => ({ ...previous, ordersConnected: false }));
    };
    socket.on('connect', changed);
    socket.on('orders:changed', changed);
    socket.on('disconnect', disconnected);
    socket.on('connect_error', disconnected);
    socket.connect();
    void refresh();
    // Bù sự kiện bị lỡ, kể cả khi kết nối trực tiếp tạm mất hoặc quay lại tab.
    const timer = window.setInterval(() => {
      if (!document.hidden) void refresh();
    }, 5000);
    const visible = () => {
      if (!document.hidden) changed();
    };
    document.addEventListener('visibilitychange', visible);
    return () => {
      disposed = true;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', visible);
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [token, enabled]);

  return enabled && state.token === token ? state : { pendingCount: 0, ordersRevision: 0, ordersConnected: false };
};

export default useOrderNotifications;
