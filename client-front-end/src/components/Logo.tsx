// Logo/liên kết về màn hình chính, dùng lại ở các phần bố cục.
import { Link } from 'react-router-dom';
import { ROUTES } from '../utils/constants';
import logo from '../assets/images/agri-mart-logo.png';

// Logo giỏ lá nền trong suốt; bấm vào để về trang chủ.
const Logo = () => {
  return (
    <Link to={ROUTES.HOME} className="inline-flex shrink-0 items-center" aria-label="Agri-Mart · Trang chủ">
      <img src={logo} alt="Agri-Mart" width={2172} height={724} className="h-auto w-36 object-contain sm:w-48" />
    </Link>
  );
};

export default Logo;
