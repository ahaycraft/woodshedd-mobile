import { createContext, useCallback, useContext, useMemo, type PropsWithChildren } from 'react';

import { useStorageState } from '@/hooks/use-storage-state';
import { apiUrl } from '@/lib/api';

interface AuthContextValue {
  /** The bearer token, or null when signed out. Truthy = signed in. */
  session: string | null;
  isLoading: boolean;
  /** Resolves to an error message on failure, or null on success. */
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => void;
  /** fetch(), with the bearer token attached automatically. */
  authedFetch: (path: string, options?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return value;
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [[isLoading, session], setSession] = useStorageState('session');

  const signIn = useCallback(
    async (email: string, password: string): Promise<string | null> => {
      const res = await fetch(apiUrl('/api/mobile/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        return body.error || "Couldn't sign in";
      }
      const { token } = await res.json();
      setSession(token);
      return null;
    },
    [setSession]
  );

  const signOut = useCallback(() => setSession(null), [setSession]);

  const authedFetch = useCallback(
    (path: string, options: RequestInit = {}) => {
      const headers = new Headers(options.headers);
      if (session) headers.set('Authorization', `Bearer ${session}`);
      return fetch(apiUrl(path), { ...options, headers });
    },
    [session]
  );

  const value = useMemo(
    () => ({ session, isLoading, signIn, signOut, authedFetch }),
    [session, isLoading, signIn, signOut, authedFetch]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
