import MainLayout from '../containers/layout/MainLayout';
import AccountSection from '../containers/account/AccountSection';

// Ba mục tài khoản dùng chung khung trang và menu điều hướng
const AccountPage = () => {
  return (
    <MainLayout>
      <AccountSection />
    </MainLayout>
  );
};

export default AccountPage;
