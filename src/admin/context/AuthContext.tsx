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

type SessionResponse = { authenticated: true; user: AdminUser; seo_capabilities?: string[]; venture_capabilities?: string[]; csrf_token: string };
type LoginResponse = { user: AdminUser; seo_capabilities?: string[]; venture_capabilities?: string[]; csrf_token: string };

type AuthContextValue = {
  user: AdminUser | null;
  loading: boolean;
  /** The current session's SEO Studio capabilities, straight from the authenticated
   *  /api/admin/session (or /login) response — never inferred from `user.role` in the
   *  browser. `null` while the session hasn't loaded yet (distinct from `[]`, which means
   *  "loaded, has none") so callers can avoid flashing unauthorized controls before this
   *  resolves — see docs/SEO_STUDIO_ARCHITECTURE.md Part 4 §frontend permission gating.
   *  Backend enforcement (api/lib/seo/permissions.php) remains authoritative regardless of
   *  what this says; this is UX only. */
  seoCapabilities: string[] | null;
  /** Same pattern as seoCapabilities, for the Ventures CMS (api/lib/ventures_permissions.php)
   *  — backend enforcement there remains authoritative too. */
  ventureCapabilities: string[] | null;
  login: (username: string, password: string) => Promise<AdminUser>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [seoCapabilities, setSeoCapabilities] = useState<string[] | null>(null);
  const [ventureCapabilities, setVentureCapabilities] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await adminFetch<SessionResponse>('/api/admin/session');
      setCsrfToken(data.csrf_token);
      setUser(data.user);
      setSeoCapabilities(data.seo_capabilities ?? []);
      setVentureCapabilities(data.venture_capabilities ?? []);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setCsrfToken(null);
        setUser(null);
        setSeoCapabilities(null);
        setVentureCapabilities(null);
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
    setSeoCapabilities(data.seo_capabilities ?? []);
    setVentureCapabilities(data.venture_capabilities ?? []);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    await adminFetch('/api/admin/logout', { method: 'POST' }).catch(() => {});
    setCsrfToken(null);
    setUser(null);
    setSeoCapabilities(null);
    setVentureCapabilities(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, seoCapabilities, ventureCapabilities, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
