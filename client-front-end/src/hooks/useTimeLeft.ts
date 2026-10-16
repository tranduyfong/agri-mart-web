import { useEffect, useState } from 'react';

// Tính thời gian còn lại từ bây giờ tới endTime
const getTimeLeft = (endTime: string) => {
  const totalMs = Math.max(new Date(endTime).getTime() - Date.now(), 0);

  return {
    days: Math.floor(totalMs / (24 * 60 * 60 * 1000)),
    hours: Math.floor(totalMs / (60 * 60 * 1000)) % 24,
    minutes: Math.floor(totalMs / (60 * 1000)) % 60,
    seconds: Math.floor(totalMs / 1000) % 60,
    isEnded: totalMs === 0,
  };
};

// Đếm ngược tới thời điểm kết thúc (VD: hạn của khuyến mãi), tự cập nhật mỗi giây
const useTimeLeft = (endTime: string) => {
  const [timeLeft, setTimeLeft] = useState(() => getTimeLeft(endTime));

  useEffect(() => {
    const timer = setInterval(() => setTimeLeft(getTimeLeft(endTime)), 1000);
    return () => clearInterval(timer);
  }, [endTime]);

  return timeLeft;
};

export default useTimeLeft;
