// Logo/liên kết về màn hình chính, dùng lại ở các phần bố cục.
import { Link } from 'react-router-dom';
import logo from '../assets/images/agri-mart-logo.png';
const Logo = () => (
  <Link to="/" className="inline-flex shrink-0 items-center" aria-label="Agri-Mart · Trang chủ">
    <img src={logo} alt="Agri-Mart" width={2172} height={724} className="h-auto w-48 max-w-full object-contain" />
  </Link>
);
export default Logo;
