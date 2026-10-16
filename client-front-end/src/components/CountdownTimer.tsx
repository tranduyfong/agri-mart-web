import useTimeLeft from '../hooks/useTimeLeft';

interface CountdownTimerProps {
  endTime: string; // Thời điểm kết thúc
  showLabels?: boolean; // Hiện chữ "Ngày / Giờ / Phút / Giây" bên dưới (kiểu lớn)
}

// Chuyển số thành 2 chữ số, VD: 5 -> ['0', '5']
const toDigits = (value: number) => String(value).padStart(2, '0').split('');

// Đồng hồ đếm ngược, mỗi chữ số nằm trong 1 ô vuông. VD: 02 : 14 : 59 : 08
const CountdownTimer = ({ endTime, showLabels = false }: CountdownTimerProps) => {
  const { days, hours, minutes, seconds } = useTimeLeft(endTime);

  const groups = [
    { label: 'Ngày', value: days },
    { label: 'Giờ', value: hours },
    { label: 'Phút', value: minutes },
    { label: 'Giây', value: seconds },
  ];

  const boxClass = showLabels
    ? 'flex h-9 w-8 items-center justify-center rounded-md bg-white text-lg font-bold text-gray-900 shadow-sm'
    : 'flex h-7 w-6 items-center justify-center rounded border border-gray-200 bg-white text-sm font-bold text-gray-900';

  return (
    <div className="flex items-start gap-2">
      {groups.map((group, index) => (
        <div key={group.label} className="flex items-start gap-2">
          <div className="flex flex-col items-center">
            <div className="flex gap-1">
              {toDigits(group.value).map((digit, digitIndex) => (
                <span key={digitIndex} className={boxClass}>
                  {digit}
                </span>
              ))}
            </div>
            {showLabels && <span className="mt-1 text-xs text-gray-600">{group.label}</span>}
          </div>

          {/* Dấu ":" giữa các nhóm */}
          {index < groups.length - 1 && (
            <span className={`font-bold text-gray-500 ${showLabels ? 'pt-1.5 text-lg' : 'pt-0.5'}`}>:</span>
          )}
        </div>
      ))}
    </div>
  );
};

export default CountdownTimer;
