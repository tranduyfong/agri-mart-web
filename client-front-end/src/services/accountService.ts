// Các lời gọi API cho hồ sơ và địa chỉ; tách giao tiếp HTTP khỏi component. response.data là thân response Axios,
// trường data bên trong là dữ liệu nghiệp vụ.
import apiClient from './apiClient';
import type { ApiResponse } from '../types/api';
import type { AuthUser } from '../types/auth';
import type { AccountData, AddressFormValues, ChangePasswordFormValues, ProfileFormValues, UserAddress } from '../types/account';

// Gọi API lấy thông tin tài khoản; component chỉ nhận dữ liệu đã tách khỏi lớp Axios.
const getAccount = async () => (await apiClient.get<ApiResponse<AccountData>>('/account')).data;

// Gọi API để lưu hồ sơ khách hàng; backend vẫn là nơi kiểm tra quyền và dữ liệu.
const updateProfile = async (values: ProfileFormValues) => {
  return (await apiClient.patch<ApiResponse<AuthUser>>('/account/profile', values)).data;
};

// Gọi API để thêm/sửa địa chỉ đã lưu; backend vẫn là nơi kiểm tra quyền và dữ liệu.
const saveAddress = async (id: string | null, values: AddressFormValues) => {
  if (id) return (await apiClient.put<ApiResponse<UserAddress[]>>(`/account/addresses/${id}`, values)).data;
  return (await apiClient.post<ApiResponse<UserAddress[]>>('/account/addresses', values)).data;
};

// Gọi API để chọn địa chỉ mặc định; backend vẫn là nơi kiểm tra quyền và dữ liệu.
const setDefaultAddress = async (id: string) => {
  return (await apiClient.patch<ApiResponse<UserAddress[]>>(`/account/addresses/${id}/default`)).data;
};

// Gọi API để xóa địa chỉ thuộc tài khoản; backend vẫn là nơi kiểm tra quyền và dữ liệu.
const removeAddress = async (id: string) => {
  return (await apiClient.delete<ApiResponse<UserAddress[]>>(`/account/addresses/${id}`)).data;
};

// Gọi API để đổi mật khẩu với mật khẩu hiện tại; backend vẫn là nơi kiểm tra quyền và dữ liệu.
const changePassword = async (values: ChangePasswordFormValues) => {
  return (await apiClient.post<ApiResponse<null>>('/account/change-password', values)).data;
};

export default { getAccount, updateProfile, saveAddress, setDefaultAddress, removeAddress, changePassword };
