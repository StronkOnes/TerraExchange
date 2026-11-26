import React, {createContext, useCallback, useContext, useState} from 'react';
import type {BusinessAccount, MarketplaceCorridor, UserAccount} from '../types/terraexchange';

interface AuthState {
  token: string | null;
  user: UserAccount | null;
  business: BusinessAccount | null;
}

interface AuthContextValue extends AuthState {
  corridorFilter: 'ALL' | MarketplaceCorridor;
  setCorridorFilter: (corridor: 'ALL' | MarketplaceCorridor) => void;
  setSession: (token: string, user: UserAccount, business: BusinessAccount | null) => void;
  updateBusiness: (business: BusinessAccount) => void;
  logout: () => void;
  apiFetch: <T = unknown>(path: string, init?: RequestInit) => Promise<T>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({children}: {children: React.ReactNode}) {
  // Keep session token strictly in React memory (never persisted to localStorage/sessionStorage).
  const [auth, setAuth] = useState<AuthState>({
    token: null,
    user: null,
    business: null,
  });

  const [corridorFilter, setCorridorFilter] = useState<'ALL' | MarketplaceCorridor>('ALL');

  const setSession = useCallback(
    (token: string, user: UserAccount, business: BusinessAccount | null) => {
      setAuth({token, user, business});
    },
    []
  );

  const updateBusiness = useCallback((business: BusinessAccount) => {
    setAuth((prev) => ({...prev, business}));
  }, []);

  const logout = useCallback(() => {
    setAuth({token: null, user: null, business: null});
  }, []);

  const apiFetch = useCallback(
    async <T = unknown>(path: string, init?: RequestInit): Promise<T> => {
      const headers = new Headers(init?.headers || {});
      if (!headers.has('Content-Type') && init?.body) {
        headers.set('Content-Type', 'application/json');
      }
      if (auth.token) {
        headers.set('Authorization', `Bearer ${auth.token}`);
      }
      const res = await fetch(`/api/v1${path}`, {
        ...init,
        headers,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((data as {error?: string}).error || `Request failed (${res.status})`);
      }
      return data as T;
    },
    [auth.token]
  );

  return (
    <AuthContext.Provider
      value={{
        ...auth,
        corridorFilter,
        setCorridorFilter,
        setSession,
        updateBusiness,
        logout,
        apiFetch,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
