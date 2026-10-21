import { useEffect, useState } from 'react';
import addressService from '../services/addressService';
import type { AddressOption } from '../types/address';
import { getErrorMessage } from '../utils/errorMessage';

interface AddressOptionsResult {
  requestKey: string;
  data: AddressOption[];
  errorMessage: string;
}

const useAddressOptions = (provinceCode?: number) => {
  const [provinceRetry, setProvinceRetry] = useState(0);
  const [wardRetry, setWardRetry] = useState(0);
  const [provinceResult, setProvinceResult] = useState<AddressOptionsResult | null>(null);
  const [wardResult, setWardResult] = useState<AddressOptionsResult | null>(null);
  const provinceKey = String(provinceRetry);
  const wardKey = JSON.stringify([provinceCode, wardRetry]);

  useEffect(() => {
    const controller = new AbortController();

    addressService.getProvinces(controller.signal)
      .then((response) => {
        if (controller.signal.aborted) return;

        setProvinceResult({
          requestKey: provinceKey,
          data: response.data,
          errorMessage: '',
        });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;

        setProvinceResult({
          requestKey: provinceKey,
          data: [],
          errorMessage: getErrorMessage(error),
        });
      });

    return () => controller.abort();
  }, [provinceKey]);

  useEffect(() => {
    if (!provinceCode) return;
    const controller = new AbortController();

    addressService.getWardsByProvince(provinceCode, controller.signal)
      .then((response) => {
        if (controller.signal.aborted) return;

        setWardResult({
          requestKey: wardKey,
          data: response.data,
          errorMessage: '',
        });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;

        setWardResult({
          requestKey: wardKey,
          data: [],
          errorMessage: getErrorMessage(error),
        });
      });

    // Hủy request cũ khi người dùng đổi tỉnh trước khi tải xong phường/xã.
    return () => controller.abort();
  }, [provinceCode, wardKey]);

  return {
    provinces: provinceResult?.requestKey === provinceKey ? provinceResult.data : [],
    wards: wardResult?.requestKey === wardKey ? wardResult.data : [],
    isLoadingProvinces: provinceResult?.requestKey !== provinceKey,
    isLoadingWards: !!provinceCode && wardResult?.requestKey !== wardKey,
    provinceError: provinceResult?.requestKey === provinceKey ? provinceResult.errorMessage : '',
    wardError: provinceCode && wardResult?.requestKey === wardKey ? wardResult.errorMessage : '',
    retryProvinces: () => setProvinceRetry((count) => count + 1),
    retryWards: () => setWardRetry((count) => count + 1),
  };
};

export default useAddressOptions;
