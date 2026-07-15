import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { api } from './api';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ role: string }>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      const token = await SecureStore.getItemAsync('opsora_token');
      if (token) {
        try {
          const res = await api.get<{ data: User }>('/auth/me');
          setUser(res.data.data || res.data);
        } catch {
          await SecureStore.deleteItemAsync('opsora_token');
          await SecureStore.deleteItemAsync('opsora_role');
        }
      }
      setLoading(false);
    }
    loadUser();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post<{ token: string; user: User }>('/auth/login', { email, password });
    await SecureStore.setItemAsync('opsora_token', res.data.token);
    await SecureStore.setItemAsync('opsora_role', res.data.user.role);
    setUser(res.data.user);
    return { role: res.data.user.role };
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {}
    await SecureStore.deleteItemAsync('opsora_token');
    await SecureStore.deleteItemAsync('opsora_role');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
