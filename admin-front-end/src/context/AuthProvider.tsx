import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { AuthContext } from './AuthContext';
import adminService from '../services/adminService';
import { clearAuth, getSavedAccessToken, saveAccessToken } from '../utils/authStorage';
import type { AdminSession } from '../types/admin';
const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState(getSavedAccessToken);
  const [checkedToken, setCheckedToken] = useState<string | null>(null);
  const [session, setSession] = useState<AdminSession | null>(null);
  const logout = useCallback(() => {
    clearAuth();
    setToken(null);
    setSession(null);
  }, []);
  useEffect(() => {
    window.addEventListener('admin-session-expired', logout);
    return () => window.removeEventListener('admin-session-expired', logout);
  }, [logout]);
  useEffect(() => {
    if (!token) return;
    let outdated = false;
    adminService
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
    const data = await adminService.login(email, password);
    saveAccessToken(data.accessToken);
    try {
      const validated = await adminService.getSession();
      setSession(validated);
      setCheckedToken(data.accessToken);
      setToken(data.accessToken);
    } catch (error) {
      logout();
      throw error;
    }
  };
  const refreshSession = async () => {
    const data = await adminService.getSession();
    setSession(data);
  };
  return (
    <AuthContext.Provider
      value={{
        user: token ? session?.user || null : null,
        loading: !!token && checkedToken !== token,
        login,
        logout,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
export default AuthProvider;
