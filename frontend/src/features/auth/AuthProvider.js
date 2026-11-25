'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, ApiError } from '@/lib/api';

const AuthContext = createContext(null);

/** Holds who is signed in. The server decides; this only mirrors GET /auth/me. */
export function AuthProvider({ children }) {
  const [state, setState] = useState({ status: 'loading', user: null, session: null, passkeyCount: 0, error: '' });

  const refresh = useCallback(async () => {
    try {
      const data = await api.me();
      setState({ status: 'authenticated', user: data.user, session: data.session, passkeyCount: data.passkeyCount || 0, error: '' });
      return true;
    } catch (err) {
      const unauthenticated = err instanceof ApiError && err.status === 401;
      setState({
        status: 'unauthenticated',
        user: null,
        session: null,
        passkeyCount: 0,
        error: unauthenticated ? '' : (err && err.message) || 'Could not check your session.',
      });
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } finally {
      setState({ status: 'unauthenticated', user: null, session: null, passkeyCount: 0, error: '' });
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const value = useMemo(() => ({ ...state, refresh, logout }), [state, refresh, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
