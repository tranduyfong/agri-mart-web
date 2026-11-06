// Bố cục chung khách hàng: header, nội dung route, footer và đồng bộ giỏ/yêu thích khi có phiên đăng nhập.
import type { ReactNode } from 'react';
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import AOS from 'aos';
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
  const { pathname } = useLocation();
  const accessToken = useAppSelector((state) => state.auth.accessToken);
  const contentRef = useRef<HTMLElement>(null);

  // Tải lại khi mở trang hoặc đổi tài khoản để giá và số đếm luôn được đồng bộ
  useEffect(() => {
    if (accessToken) dispatch(fetchShopping());
  }, [accessToken, dispatch]);

  // API/ảnh/font tải xong có thể đổi chiều cao trang. Đo lại để các khối đang trong màn hình hiện ngay.
  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;
    let frame = 0;
    const refresh = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => AOS.refresh());
    };
    AOS.refreshHard();
    const observer = new ResizeObserver(refresh);
    observer.observe(content);
    content.addEventListener('load', refresh, true);
    return () => {
      observer.disconnect();
      content.removeEventListener('load', refresh, true);
      cancelAnimationFrame(frame);
    };
  }, [pathname]);

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar />
      <NavBar />
      {/* flex-1: phần nội dung giãn ra lấp chỗ trống, để chân trang luôn nằm sát đáy màn hình */}
      <main ref={contentRef} className="flex flex-1 flex-col">{children}</main>
      <Footer />
    </div>
  );
};

export default MainLayout;
