// Gắn bộ định tuyến để hiển thị trang hiện tại trong ứng dụng quản lý.
import { RouterProvider } from 'react-router-dom';
import router from './app/router';
const App = () => <RouterProvider router={router} />;
export default App;
