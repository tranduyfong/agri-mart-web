import { Link } from 'react-router-dom';
import { ROUTES, STORE_INFO } from '../utils/constants';

// Logo của cửa hàng: icon mầm cây + tên cửa hàng, bấm vào sẽ về trang chủ
const Logo = () => {
  return (
    <Link to={ROUTES.HOME} className="flex items-center gap-2 text-primary">
      <svg
        viewBox="0 0 24 24"
        className="h-7 w-7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 22V11" />
        <path d="M12 11C12 7 9 4 4 4c0 5 3 7 8 7Z" />
        <path d="M12 14c0-4 3-7 8-7 0 5-3 7-8 7Z" />
      </svg>
      <span className="text-lg font-bold whitespace-nowrap sm:text-xl">{STORE_INFO.name}</span>
    </Link>
  );
};

export default Logo;
