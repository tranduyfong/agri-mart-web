import { useEffect, useState } from 'react';
import { getErrorMessage } from '../utils/errorMessage';

// load được bọc bằng useCallback ở nơi dùng. Bỏ qua response cũ khi đổi bộ lọc.
const useData = <T>(load: () => Promise<T>, interval = 0) => {
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{ load: typeof load; revision: number; data?: T; error?: string } | null>(null);
  useEffect(() => {
    let outdated = false;
    let pending = false;
    const run = async () => {
      if (pending) return;
      pending = true;
      try {
        const data = await load();
        if (!outdated) setResult({ load, revision, data });
      } catch (error) {
        if (!outdated) setResult({ load, revision, error: getErrorMessage(error) });
      } finally {
        pending = false;
      }
    };
    void run();
    const timer = interval
      ? window.setInterval(() => {
          if (!document.hidden) void run();
        }, interval)
      : null;
    return () => {
      outdated = true;
      if (timer) window.clearInterval(timer);
    };
  }, [load, revision, interval]);
  const matches = result?.load === load && result?.revision === revision;
  return {
    data: matches ? result.data : undefined,
    error: matches ? result.error : undefined,
    loading: !matches,
    reload: () => setRevision((value) => value + 1),
  };
};
export default useData;
