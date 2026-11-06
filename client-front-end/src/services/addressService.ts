// Các lời gọi API cho tỉnh/phường xã; tách giao tiếp HTTP khỏi component. response.data là thân response Axios,
// trường data bên trong là dữ liệu nghiệp vụ.
import apiClient from './apiClient';
import type { ApiResponse } from '../types/api';
import type { AddressOption } from '../types/address';

// Gọi API lấy danh sách tỉnh/thành; component chỉ nhận dữ liệu đã tách khỏi lớp Axios.
const getProvinces = async (signal?: AbortSignal) => {
  const response = await apiClient.get<ApiResponse<AddressOption[]>>('/address/provinces', {
    signal,
    timeout: 12000,
  });

  return response.data;
};

// Gọi API lấy phường/xã thuộc tỉnh đang chọn; component chỉ nhận dữ liệu đã tách khỏi lớp Axios.
const getWardsByProvince = async (provinceCode: number, signal?: AbortSignal) => {
  const response = await apiClient.get<ApiResponse<AddressOption[]>>(
    `/address/provinces/${provinceCode}/wards`,
    { signal, timeout: 12000 },
  );

  return response.data;
};

export default {
  getProvinces,
  getWardsByProvince,
};
