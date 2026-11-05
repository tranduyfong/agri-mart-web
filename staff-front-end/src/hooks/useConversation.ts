import { useCallback, useEffect, useState } from 'react';
import supportService from '../services/supportService';
import { getErrorMessage } from '../utils/errorMessage';
import type { ChatDetail } from '../types/staff';

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
  useEffect(() => {
    let disposed = false;
    supportService.getRoom(id).then((room) => { if (!disposed) setState((previous) => ({ room: merge(previous.room, room) })); })
      .catch((error) => { if (!disposed) setState((previous) => ({ ...previous, error: getErrorMessage(error) })); });
    return () => { disposed = true; };
  }, [id, revision, chatRevision]);
  useEffect(() => {
    const show = () => { setVisible(!document.hidden && document.hasFocus()); if (!document.hidden) reload(); };
    const blur = () => setVisible(false);
    document.addEventListener('visibilitychange', show); window.addEventListener('focus', show); window.addEventListener('blur', blur);
    return () => { document.removeEventListener('visibilitychange', show); window.removeEventListener('focus', show); window.removeEventListener('blur', blur); };
  }, [reload]);
  const lastId = state.room?.messages.at(-1)?.id;
  useEffect(() => {
    if (!active || !visible || !atBottom || !state.room?.unread_count || !lastId) return;
    let disposed = false;
    supportService.markRead(id, lastId).then(() => { if (!disposed) reload(); }).catch(() => {});
    return () => { disposed = true; };
  }, [id, state.room, lastId, active, visible, atBottom, reload]);
  const send = async (body: FormData) => { const room = await supportService.reply(id, body); setState((previous) => ({ room: merge(previous.room, room) })); reload(); };
  const loadOlder = async () => {
    if (!state.room?.messages.length) return;
    const room = await supportService.getRoom(id, state.room.messages[0].id);
    setState((previous) => ({ room: merge(previous.room, room) }));
  };
  return { ...state, reload, send, loadOlder };
};
export default useConversation;
