import { createContext } from 'react';
import type { AuthUser } from '../../types/auth';

export interface AuthContextValue {
  user: AuthUser | null;
  login: (email: string, password: string, rememberMe: boolean) => Promise<AuthUser>;
  signup: (input: Omit<AuthUser, 'role'> & { password: string }) => Promise<AuthUser>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
