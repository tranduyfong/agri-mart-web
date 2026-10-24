import useTimeLeft from '../hooks/useTimeLeft';

interface CountdownTimerProps {
  endTime: string; // Thời điểm kết thúc
  showLabels?: boolean; // Hiện chữ "Ngày / Giờ / Phút / Giây" bên dưới (kiểu lớn)
  compact?: boolean;
  onImage?: boolean;
}

// Chuyển số thành 2 chữ số, VD: 5 -> ['0', '5']
const toDigits = (value: number) => String(value).padStart(2, '0').split('');

// Đồng hồ đếm ngược, mỗi chữ số nằm trong 1 ô vuông. VD: 02 : 14 : 59 : 08
const CountdownTimer = ({ endTime, showLabels = false, compact = false, onImage = false }: CountdownTimerProps) => {
  const { days, hours, minutes, seconds } = useTimeLeft(endTime);

  const groups = [
    { label: 'Ngày', value: days },
    { label: 'Giờ', value: hours },
    { label: 'Phút', value: minutes },
    { label: 'Giây', value: seconds },
  ];

  const boxClass = `flex shrink-0 items-center justify-center rounded bg-white font-bold text-gray-900 shadow-sm ${
    compact ? 'h-7 min-w-8 px-1 text-sm' : showLabels ? 'h-9 w-6 text-lg sm:w-8' : 'h-7 w-6 text-sm'
  }`;

  return (
    <div
      className="flex items-start gap-1 sm:gap-2"
      aria-label={`${days} ngày ${hours} giờ ${minutes} phút ${seconds} giây`}
    >
      {groups.map((group, index) => (
        <div key={group.label} className="flex items-start gap-1 sm:gap-2">
          <div className="flex flex-col items-center">
            <div className="flex gap-1">
              {(compact ? [String(group.value).padStart(2, '0')] : toDigits(group.value)).map((digit, digitIndex) => (
                <span key={digitIndex} className={boxClass}>
                  {digit}
                </span>
              ))}
            </div>
            {(showLabels || compact) && (
              <span className={`mt-1 text-xs ${onImage ? 'text-white/90' : 'text-gray-600'}`}>{group.label}</span>
            )}
          </div>

          {/* Dấu ":" giữa các nhóm */}
          {!compact && index < groups.length - 1 && (
            <span
              className={`font-bold ${onImage ? 'text-white/80' : 'text-gray-500'} ${showLabels ? 'pt-1.5 text-lg' : 'pt-0.5'}`}
            >
              :
            </span>
          )}
        </div>
      ))}
    </div>
  );
};

export default CountdownTimer;
