// Đọc dữ liệu tài khoản mà AccountSection cung cấp qua outlet context cho màn hình con.
import { useOutletContext } from 'react-router-dom';
import type { AccountContextValue } from '../types/account';

// Đọc dữ liệu chung do AccountSection cung cấp cho từng mục con
const useAccountContext = () => useOutletContext<AccountContextValue>();

export default useAccountContext;
