import MainLayout from '../containers/layout/MainLayout';
import AuthSection from '../containers/auth/AuthSection';
import RegisterForm from '../containers/auth/RegisterForm';

// Trang Đăng ký = Khung chung + (Banner bên trái + Form đăng ký bên phải)
const RegisterPage = () => {
  return (
    <MainLayout>
      <AuthSection>
        <RegisterForm />
      </AuthSection>
    </MainLayout>
  );
};

export default RegisterPage;
