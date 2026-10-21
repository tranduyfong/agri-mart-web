import apiClient from './apiClient';
import type { ApiResponse } from '../types/api';
import type { AuthUser } from '../types/auth';
import type { AccountData, AddressFormValues, ChangePasswordFormValues, ProfileFormValues, UserAddress } from '../types/account';

const getAccount = async () => (await apiClient.get<ApiResponse<AccountData>>('/account')).data;

const updateProfile = async (values: ProfileFormValues) => {
  return (await apiClient.patch<ApiResponse<AuthUser>>('/account/profile', values)).data;
};

const saveAddress = async (id: string | null, values: AddressFormValues) => {
  if (id) return (await apiClient.put<ApiResponse<UserAddress[]>>(`/account/addresses/${id}`, values)).data;
  return (await apiClient.post<ApiResponse<UserAddress[]>>('/account/addresses', values)).data;
};

const setDefaultAddress = async (id: string) => {
  return (await apiClient.patch<ApiResponse<UserAddress[]>>(`/account/addresses/${id}/default`)).data;
};

const removeAddress = async (id: string) => {
  return (await apiClient.delete<ApiResponse<UserAddress[]>>(`/account/addresses/${id}`)).data;
};

const changePassword = async (values: ChangePasswordFormValues) => {
  return (await apiClient.post<ApiResponse<null>>('/account/change-password', values)).data;
};

export default { getAccount, updateProfile, saveAddress, setDefaultAddress, removeAddress, changePassword };
