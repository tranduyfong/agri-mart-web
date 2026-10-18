import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks/useRedux';
import { fetchShopping } from '../../store/slices/shoppingSlice';
import TopBar from './TopBar';
import NavBar from './NavBar';
import Footer from './Footer';

interface MainLayoutProps {
  children: ReactNode; // Nội dung riêng của từng trang
}

// Khung chung của các trang phía khách hàng: thanh trên cùng + thanh điều hướng + nội dung + chân trang
const MainLayout = ({ children }: MainLayoutProps) => {
  const dispatch = useAppDispatch();
  const accessToken = useAppSelector((state) => state.auth.accessToken);

  // Tải lại khi mở trang hoặc đổi tài khoản để giá và số đếm luôn được đồng bộ
  useEffect(() => {
    if (accessToken) dispatch(fetchShopping());
  }, [accessToken, dispatch]);

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar />
      <NavBar />
      {/* flex-1: phần nội dung giãn ra lấp chỗ trống, để chân trang luôn nằm sát đáy màn hình */}
      <main className="flex flex-1 flex-col">{children}</main>
      <Footer />
    </div>
  );
};

export default MainLayout;
