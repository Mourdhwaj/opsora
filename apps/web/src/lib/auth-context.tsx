'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { api } from './api';

interface User {
  userId: string;
  tenantId: string;
  email: string;
  role: string;
  fullName?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('opsora_token');
    if (token) {
      api.get<{ userId: string; tenantId: string; email: string; role: string; fullName?: string }>('/auth/me')
        .then(u => setUser(u))
        .catch(() => {
          localStorage.removeItem('opsora_token');
          document.cookie = 'opsora_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
          document.cookie = 'opsora_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post<{ token: string; user: User }>('/auth/login', { email, password });
    localStorage.setItem('opsora_token', res.token);
    document.cookie = `opsora_token=${res.token}; path=/; max-age=86400`;
    document.cookie = `opsora_role=${res.user.role}; path=/; max-age=86400`;
    setUser(res.user);
  }, []);

  const logout = useCallback(async () => {
    try { await api.post('/auth/logout'); } catch {}
    localStorage.removeItem('opsora_token');
    document.cookie = 'opsora_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    document.cookie = 'opsora_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    setUser(null);
    window.location.href = '/login';
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
