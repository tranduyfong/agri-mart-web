import { createContext } from 'react';
import type { AdminUser } from '../types/admin';
interface AuthValue {
  user: AdminUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshSession: () => Promise<void>;
}
export const AuthContext = createContext<AuthValue | null>(null);
