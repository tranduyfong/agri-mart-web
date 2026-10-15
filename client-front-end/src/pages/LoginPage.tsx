import MainLayout from '../containers/layout/MainLayout';
import AuthSection from '../containers/auth/AuthSection';
import LoginForm from '../containers/auth/LoginForm';

// Trang Đăng nhập = Khung chung + (Banner bên trái + Form đăng nhập bên phải)
const LoginPage = () => {
  return (
    <MainLayout>
      <AuthSection>
        <LoginForm />
      </AuthSection>
    </MainLayout>
  );
};

export default LoginPage;
