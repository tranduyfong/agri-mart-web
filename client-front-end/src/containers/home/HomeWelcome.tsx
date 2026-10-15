import { Link } from 'react-router-dom';
import { useAppSelector } from '../../hooks/useRedux';
import { ROUTES, STORE_INFO } from '../../utils/constants';

// Lời chào tạm thời ở trang chủ (trang chủ thật sẽ được xây dựng sau)
const HomeWelcome = () => {
  const user = useAppSelector((state) => state.auth.user);

  return (
    <section className="flex flex-1 items-center justify-center bg-page-gray px-4 py-24">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">
          {user ? `Xin chào, ${user.full_name}!` : `Chào mừng đến với ${STORE_INFO.name}`}
        </h1>
        <p className="mt-4 text-gray-600">Trang chủ đang được xây dựng, vui lòng quay lại sau.</p>

        {!user && (
          <Link to={ROUTES.LOGIN} className="mt-6 inline-block font-semibold text-primary hover:underline">
            Đăng nhập ngay
          </Link>
        )}
      </div>
    </section>
  );
};

export default HomeWelcome;
