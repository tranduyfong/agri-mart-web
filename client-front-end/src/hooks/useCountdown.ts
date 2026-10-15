import { useEffect, useState } from 'react';

// Đếm ngược theo giây, dùng cho nút "Gửi lại mã" (VD: phải chờ 60 giây mới được gửi lại)
const useCountdown = (initialSeconds: number) => {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);

  useEffect(() => {
    if (secondsLeft <= 0) return;

    // Sau 1 giây thì giảm đi 1
    const timer = setTimeout(() => setSecondsLeft(secondsLeft - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  // Bắt đầu đếm lại từ đầu
  const restart = () => setSecondsLeft(initialSeconds);

  return { secondsLeft, restart };
};

export default useCountdown;
