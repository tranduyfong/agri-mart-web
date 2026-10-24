import { Link } from 'react-router-dom';
const Logo = () => (
  <Link to="/" className="inline-flex items-center gap-3 text-xl font-semibold text-primary">
    <svg width="27" height="27" viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <path
        d="M10 28C8 14 18 10 31 9c-1 13-5 23-18 20m-3 3 16-17"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
    Agri-Mart
  </Link>
);
export default Logo;
