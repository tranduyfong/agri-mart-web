import Logo from '../components/Logo';
import LoginForm from '../containers/auth/LoginForm';
const LoginPage = () => (
  <main className="flex min-h-screen items-center justify-center bg-page-gray px-4 py-12">
    <div className="w-full max-w-md rounded-3xl border border-line bg-white p-7 shadow-sm sm:p-10">
      <Logo />
      <p className="mt-8 text-xs font-medium uppercase tracking-widest text-primary">Quản trị hệ thống</p>
      <h1 className="mb-3 mt-3 text-2xl font-semibold">Chào mừng bạn trở lại</h1>
      <p className="mb-7 text-sm leading-6 text-muted">
        Đăng nhập để quản lý tài khoản và theo dõi hoạt động kinh doanh của cửa hàng.
      </p>
      <LoginForm />
    </div>
  </main>
);
export default LoginPage;
