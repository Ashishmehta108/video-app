'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';
import { getStoredUser, getToken, setAuth, clearAuth, isAuthenticated } from '@/lib/auth';

export function useAuth(requireAuth = false) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      setLoading(false);
      if (requireAuth) router.replace('/login');
      return;
    }

    const stored = getStoredUser();
    if (stored) setUser(stored);

    try {
      const { data } = await authApi.me();
      setUser(data.user);
      setAuth(getToken(), data.user);
    } catch {
      clearAuth();
      setUser(null);
      if (requireAuth) router.replace('/login');
    } finally {
      setLoading(false);
    }
  }, [requireAuth, router]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = async (email, password) => {
    const { data } = await authApi.login({ email, password });
    setAuth(data.token, data.user);
    setUser(data.user);
    return data;
  };

  const register = async (name, email, password) => {
    const { data } = await authApi.register({ name, email, password });
    setAuth(data.token, data.user);
    setUser(data.user);
    return data;
  };

  const logout = () => {
    clearAuth();
    setUser(null);
    router.push('/login');
  };

  return { user, loading, login, register, logout, refresh, isAuth: isAuthenticated() };
}
