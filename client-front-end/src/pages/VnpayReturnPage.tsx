// Page được router mở cho màn hình này; phần dữ liệu và giao diện chính được giao cho MainLayout.
import MainLayout from '../containers/layout/MainLayout';
import VnpayReturnSection from '../containers/checkout/VnpayReturnSection';

const VnpayReturnPage = () => <MainLayout><VnpayReturnSection /></MainLayout>;

export default VnpayReturnPage;
