import MainLayout from '../containers/layout/MainLayout';
import HomeWelcome from '../containers/home/HomeWelcome';

// Trang chủ (tạm thời chỉ có lời chào)
const HomePage = () => {
  return (
    <MainLayout>
      <HomeWelcome />
    </MainLayout>
  );
};

export default HomePage;
