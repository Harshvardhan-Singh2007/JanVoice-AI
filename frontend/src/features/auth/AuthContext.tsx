import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { apiClient, setAccessToken } from '../../lib/api/client';
import type { AuthResponse, AuthUser } from '../../types/auth';

interface AuthContextValue {
  user: AuthUser | null;
  login: (email: string, password: string, rememberMe: boolean) => Promise<AuthUser>;
  signup: (input: AuthUser & { password: string }) => Promise<AuthUser>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const tokenKey = 'janvoice_access_token';

function userFromToken(token: string): AuthUser | null {
  try {
    const encodedPayload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(encodedPayload.padEnd(encodedPayload.length + (4 - encodedPayload.length % 4) % 4, '='))) as { sub: string; fullName: string; email: string; role: AuthUser['role']; exp?: number };
    if (payload.exp && payload.exp * 1000 <= Date.now()) return null;
    return { fullName: payload.fullName, email: payload.email, role: payload.role };
  } catch { return null; }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const token = localStorage.getItem(tokenKey) ?? sessionStorage.getItem(tokenKey);
    if (!token) return null;
    const restoredUser = userFromToken(token);
    if (!restoredUser) localStorage.removeItem(tokenKey);
    else setAccessToken(token);
    return restoredUser;
  });
  const value = useMemo(() => ({
    user,
    login: async (email: string, password: string, rememberMe: boolean) => {
      const { data } = await apiClient.post<{ status: string; data: AuthResponse }>('/api/auth/login', { email, password });
      setAccessToken(data.data.token);
      if (rememberMe) { sessionStorage.removeItem(tokenKey); localStorage.setItem(tokenKey, data.data.token); }
      else { localStorage.removeItem(tokenKey); sessionStorage.setItem(tokenKey, data.data.token); }
      setUser(data.data.user);
      return data.data.user;
    },
    signup: async (input: AuthUser & { password: string }) => {
      const { data } = await apiClient.post<{ status: string; data: AuthResponse }>('/api/auth/register', input);
      setAccessToken(data.data.token);
      sessionStorage.removeItem(tokenKey);
      localStorage.setItem(tokenKey, data.data.token);
      setUser(data.data.user);
      return data.data.user;
    },
    logout: () => { localStorage.removeItem(tokenKey); sessionStorage.removeItem(tokenKey); setAccessToken(); setUser(null); },
  }), [user]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
