import MainLayout from '../containers/layout/MainLayout';
import AuthSection from '../containers/auth/AuthSection';
import VerifyEmailForm from '../containers/auth/VerifyEmailForm';

// Trang Xác minh email = Khung chung + (Banner bên trái + Form nhập mã bên phải)
const VerifyEmailPage = () => {
  return (
    <MainLayout>
      <AuthSection>
        <VerifyEmailForm />
      </AuthSection>
    </MainLayout>
  );
};

export default VerifyEmailPage;
