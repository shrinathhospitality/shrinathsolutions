import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { ApiError, adminFetch, setCsrfToken } from '../lib/api';

export type AdminUser = {
  id: number;
  name: string;
  username: string;
  email: string;
  role: string;
  must_change_password: boolean;
};

type SessionResponse = { authenticated: true; user: AdminUser; csrf_token: string };
type LoginResponse = { user: AdminUser; csrf_token: string };

type AuthContextValue = {
  user: AdminUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<AdminUser>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await adminFetch<SessionResponse>('/api/admin/session');
      setCsrfToken(data.csrf_token);
      setUser(data.user);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setCsrfToken(null);
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(async (username: string, password: string) => {
    const data = await adminFetch<LoginResponse>('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    setCsrfToken(data.csrf_token);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    await adminFetch('/api/admin/logout', { method: 'POST' }).catch(() => {});
    setCsrfToken(null);
    setUser(null);
  }, []);

  return <AuthContext.Provider value={{ user, loading, login, logout, refresh }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
