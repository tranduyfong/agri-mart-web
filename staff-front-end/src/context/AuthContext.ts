import { createContext } from 'react';
import type { StaffUser } from '../types/staff';

interface AuthValue {
  user: StaffUser | null;
  loading: boolean;
  pendingCount: number;
  ordersRevision: number;
  ordersConnected: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
}
export const AuthContext = createContext<AuthValue | null>(null);
