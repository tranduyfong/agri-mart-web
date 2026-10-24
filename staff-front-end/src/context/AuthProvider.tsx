import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { AuthContext } from './AuthContext';
import staffService from '../services/staffService';
import { clearAuth, getSavedAccessToken, saveAccessToken } from '../utils/authStorage';
import type { StaffSession } from '../types/staff';
import useOrderNotifications from '../hooks/useOrderNotifications';

const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState(getSavedAccessToken);
  const [checkedToken, setCheckedToken] = useState<string | null>(null);
  const [session, setSession] = useState<StaffSession | null>(null);
  const orderNotifications = useOrderNotifications(
    token,
    !!token &&
      token === checkedToken &&
      (session?.user.role === 'ADMIN' || !!session?.user.permissions.includes('ORDER_MANAGE')),
  );
  const logout = useCallback(() => {
    clearAuth();
    setToken(null);
    setSession(null);
  }, []);

  useEffect(() => {
    window.addEventListener('staff-session-expired', logout);
    return () => window.removeEventListener('staff-session-expired', logout);
  }, [logout]);
  useEffect(() => {
    if (!token) return;
    let outdated = false;
    staffService
      .getSession()
      .then((data) => {
        if (outdated) return;
        setSession(data);
        setCheckedToken(token);
      })
      .catch(() => {
        if (!outdated) logout();
      });
    return () => {
      outdated = true;
    };
  }, [token, logout]);

  const login = async (email: string, password: string) => {
    const data = await staffService.login(email, password);
    saveAccessToken(data.accessToken);
    try {
      const validated = await staffService.getSession();
      setSession(validated);
      setCheckedToken(data.accessToken);
      setToken(data.accessToken);
    } catch (error) {
      logout();
      throw error;
    }
  };
  return (
    <AuthContext.Provider
      value={{
        ...orderNotifications,
        user: token ? session?.user || null : null,
        loading: !!token && token !== checkedToken,
        login,
        logout,
        hasPermission: (permission) =>
          session?.user.role === 'ADMIN' || !!session?.user.permissions.includes(permission),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
export default AuthProvider;
