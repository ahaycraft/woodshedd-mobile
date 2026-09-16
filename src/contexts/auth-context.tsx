import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';

import { useStorageState } from '@/hooks/use-storage-state';
import { apiUrl } from '@/lib/api';
import { registerForPushNotifications } from '@/lib/push-notifications';

interface AuthContextValue {
  /** The bearer token, or null when signed out. Truthy = signed in. */
  session: string | null;
  /** The signed-in user's own id (from GET /api/mobile/me), or null until
   *  that resolves — the bearer token is an encrypted JWE, so there's no
   *  way to read it out client-side without asking the backend. */
  userId: string | null;
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

  const [userId, setUserId] = useState<string | null>(null);

  // Clearing userId the instant session goes falsy (sign-out) is adjusted
  // during render — React's documented pattern for "reset state when some
  // other value changes" — rather than in the effect below, which only
  // needs to own the actual async fetch.
  const [prevSession, setPrevSession] = useState(session);
  if (session !== prevSession) {
    setPrevSession(session);
    if (!session) setUserId(null);
  }

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    authedFetch('/api/mobile/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((me) => {
        if (!cancelled) setUserId(me?.id ?? null);
      })
      .catch(() => {
        if (!cancelled) setUserId(null);
      });
    return () => {
      cancelled = true;
    };
  }, [session, authedFetch]);

  // Fire-and-forget: register this device for push once signed in. No
  // component state depends on the outcome (permission denied, no EAS
  // project, running on web/simulator — all just mean no push this
  // session), so nothing here needs to be reflected in the UI.
  useEffect(() => {
    if (!session) return;
    registerForPushNotifications()
      .then((registration) => {
        if (!registration) return;
        return authedFetch('/api/mobile/push-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(registration)
        });
      })
      .catch(() => {
        // Best-effort — see comment above.
      });
  }, [session, authedFetch]);

  const value = useMemo(
    () => ({ session, userId, isLoading, signIn, signOut, authedFetch }),
    [session, userId, isLoading, signIn, signOut, authedFetch]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
