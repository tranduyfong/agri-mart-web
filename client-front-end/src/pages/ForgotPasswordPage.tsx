// Page được router mở cho màn hình này; phần dữ liệu và giao diện chính được giao cho MainLayout.
import MainLayout from '../containers/layout/MainLayout';
import AuthSection from '../containers/auth/AuthSection';
import ForgotPasswordFlow from '../containers/auth/ForgotPasswordFlow';

// Trang Quên mật khẩu = Khung chung + (Banner bên trái + các bước lấy lại mật khẩu bên phải)
const ForgotPasswordPage = () => {
  return (
    <MainLayout>
      <AuthSection>
        <ForgotPasswordFlow />
      </AuthSection>
    </MainLayout>
  );
};

export default ForgotPasswordPage;
