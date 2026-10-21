import apiClient from './apiClient';
import type { ApiResponse } from '../types/api';
import type { AddressOption } from '../types/address';

const getProvinces = async (signal?: AbortSignal) => {
  const response = await apiClient.get<ApiResponse<AddressOption[]>>('/address/provinces', {
    signal,
    timeout: 12000,
  });

  return response.data;
};

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
