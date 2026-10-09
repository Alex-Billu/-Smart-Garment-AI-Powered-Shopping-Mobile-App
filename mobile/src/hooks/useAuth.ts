import { useState, useCallback } from 'react';
import { useAuthStore } from '../store/authStore';
import { authService } from '../services';
import * as SecureStore from '../utils/storage';

export const useAuth = () => {
  const { user, accessToken, setTokens, setUser, clearAuth } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await authService.login(email, password);
      if (res.success && res.data) {
        const { user: u, access_token, refresh_token } = res.data as any;
        await SecureStore.setItemAsync('refresh_token', refresh_token);
        setTokens(access_token, refresh_token);
        setUser(u);
        return { success: true };
      }
      const msg = (res as any).error?.message || 'Login failed';
      setError(msg);
      return { success: false, error: msg };
    } catch (e: any) {
      const msg = e?.response?.data?.error?.message || 'Network error';
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  }, [setTokens, setUser]);

  const register = useCallback(async (payload: {
    name: string; email: string; phone: string; password: string;
    address?: string; city?: string; state?: string; pincode?: string;
  }) => {
    setLoading(true);
    setError(null);
    try {
      const res = await authService.register(payload);
      if (res.success && res.data) {
        const { user: u, access_token, refresh_token } = res.data as any;
        await SecureStore.setItemAsync('refresh_token', refresh_token);
        setTokens(access_token, refresh_token);
        setUser(u);
        return { success: true };
      }
      const msg = (res as any).error?.message || 'Registration failed';
      setError(msg);
      return { success: false, error: msg };
    } catch (e: any) {
      const msg = e?.response?.data?.error?.message || 'Network error';
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  }, [setTokens, setUser]);

  const logout = useCallback(async () => {
    try {
      const storedRefresh = await SecureStore.getItemAsync('refresh_token');
      if (storedRefresh) await authService.logout(storedRefresh);
    } catch (_) {}
    await SecureStore.deleteItemAsync('refresh_token');
    clearAuth();
  }, [clearAuth]);

  const logoutAll = useCallback(async () => {
    try {
      await authService.logoutAll();
    } catch (_) {}
    await SecureStore.deleteItemAsync('refresh_token');
    clearAuth();
  }, [clearAuth]);

  return {
    user,
    accessToken,
    isAuthenticated: !!accessToken,
    isAdmin: user?.role === 'admin',
    loading,
    error,
    login,
    register,
    logout,
    logoutAll,
  };
};
