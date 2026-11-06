// Page được router mở cho màn hình này; phần dữ liệu và giao diện chính được giao cho MainLayout.
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
