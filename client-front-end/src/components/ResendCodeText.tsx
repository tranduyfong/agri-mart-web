interface ResendCodeTextProps {
  secondsLeft: number; // Số giây còn phải chờ, bằng 0 thì được bấm gửi lại
  isSending: boolean; // Đang gửi lại mã
  onResend: () => void;
}

// Dòng "Chưa nhận được mã? Gửi lại mã", có đếm ngược để tránh bấm gửi liên tục
const ResendCodeText = ({ secondsLeft, isSending, onResend }: ResendCodeTextProps) => {
  const canResend = secondsLeft === 0 && !isSending;

  return (
    <p className="mt-6 text-center text-sm text-gray-700">
      Chưa nhận được mã?{' '}
      {canResend ? (
        <button type="button" onClick={onResend} className="cursor-pointer font-semibold text-primary hover:underline">
          Gửi lại mã
        </button>
      ) : (
        <span className="font-semibold text-gray-400">
          {isSending ? 'Đang gửi...' : `Gửi lại mã sau ${secondsLeft}s`}
        </span>
      )}
    </p>
  );
};

export default ResendCodeText;
