import { useEffect, useState } from 'react';
import { App } from 'antd';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from './useRedux';
import { logout, updateUser } from '../store/slices/authSlice';
import accountService from '../services/accountService';
import { clearAuth, getSavedAccessToken, saveAuth } from '../utils/authStorage';
import { getErrorMessage } from '../utils/errorMessage';
import { ROUTES } from '../utils/constants';
import type { AccountData, UserAddress } from '../types/account';
import type { AuthUser } from '../types/auth';

interface AccountResult {
  requestKey: string;
  data: AccountData | null;
  errorMessage: string;
}

// Hồ sơ và sổ địa chỉ dùng chung trong ba mục tài khoản, bỏ qua response của phiên cũ
const useAccount = () => {
  const sessionToken = useAppSelector((state) => state.auth.accessToken);
  const dispatch = useAppDispatch();
  const { message } = App.useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [retryCount, setRetryCount] = useState(0);
  const [result, setResult] = useState<AccountResult | null>(null);
  const requestKey = JSON.stringify([sessionToken, retryCount]);

  const syncUser = (user: AuthUser) => {
    if (!sessionToken || getSavedAccessToken() !== sessionToken) return;
    saveAuth(user, sessionToken);
    dispatch(updateUser(user));
  };

  useEffect(() => {
    if (!sessionToken) return;
    let isOutdated = false;

    accountService.getAccount()
      .then((response) => {
        if (isOutdated || getSavedAccessToken() !== sessionToken) return;
        setResult({ requestKey, data: response.data, errorMessage: '' });
        saveAuth(response.data.user, sessionToken);
        dispatch(updateUser(response.data.user));
      })
      .catch((error: unknown) => {
        if (isOutdated) return;
        setResult({ requestKey, data: null, errorMessage: getErrorMessage(error) });
      });

    return () => { isOutdated = true; };
  }, [sessionToken, requestKey, dispatch]);

  const onUserUpdated = (user: AuthUser) => {
    if (getSavedAccessToken() !== sessionToken) return;
    syncUser(user);
    setResult((current) => current?.data ? { ...current, data: { ...current.data, user } } : current);
  };

  const onAddressesUpdated = (addresses: UserAddress[]) => {
    if (getSavedAccessToken() !== sessionToken) return;
    setResult((current) => current?.data ? { ...current, data: { ...current.data, addresses } } : current);
  };

  const handleError = (error: unknown) => {
    if (getSavedAccessToken() !== sessionToken) return;
    if (axios.isAxiosError(error) && (error.response?.status === 401 || error.response?.status === 403)) {
      clearAuth();
      dispatch(logout());
      navigate(ROUTES.LOGIN, { replace: true, state: { returnTo: location.pathname } });
    }
    message.error(getErrorMessage(error));
  };

  return {
    account: result?.requestKey === requestKey ? result.data : null,
    isLoading: !!sessionToken && result?.requestKey !== requestKey,
    errorMessage: result?.requestKey === requestKey ? result.errorMessage : '',
    reload: () => setRetryCount((count) => count + 1),
    onUserUpdated,
    onAddressesUpdated,
    handleError,
  };
};

export default useAccount;
