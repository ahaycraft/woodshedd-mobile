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
  /** The signed-in user's band role, from the same call as `userId`. Used
   *  to mirror the web app's canManage check (OWNER/ADMIN or the item's
   *  own creator) for things like deleting someone else's comment. */
  role: string | null;
  /** Profile fields shown on the Account screen — same GET /api/mobile/me
   *  call as userId/role, kept separate since nothing else in the app
   *  needs them. */
  profile: { name: string; email: string; phone: string | null } | null;
  /** Re-runs GET /api/mobile/me and updates userId/role/profile. Call
   *  after a profile edit so the Account screen reflects what was saved
   *  without waiting for the next app launch. */
  refreshProfile: () => Promise<void>;
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
  const [role, setRole] = useState<string | null>(null);
  const [profile, setProfile] = useState<AuthContextValue['profile']>(null);

  // Clearing userId the instant session goes falsy (sign-out) is adjusted
  // during render — React's documented pattern for "reset state when some
  // other value changes" — rather than in the effect below, which only
  // needs to own the actual async fetch.
  const [prevSession, setPrevSession] = useState(session);
  if (session !== prevSession) {
    setPrevSession(session);
    if (!session) {
      setUserId(null);
      setRole(null);
      setProfile(null);
    }
  }

  const fetchMe = useCallback(async () => {
    try {
      const res = await authedFetch('/api/mobile/me');
      const me = res.ok ? await res.json() : null;
      setUserId(me?.id ?? null);
      setRole(me?.role ?? null);
      setProfile(me ? { name: me.name, email: me.email, phone: me.phone ?? null } : null);
    } catch {
      setUserId(null);
      setRole(null);
      setProfile(null);
    }
  }, [authedFetch]);

  useEffect(() => {
    if (!session) return;
    // Wrapped in .then() rather than called directly — same reasoning as
    // the screens that fetch their own data: keeps the lint rule from
    // treating this awaited call's setState calls as synchronous.
    Promise.resolve().then(fetchMe);
  }, [session, fetchMe]);

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
    () => ({
      session,
      userId,
      role,
      profile,
      refreshProfile: fetchMe,
      isLoading,
      signIn,
      signOut,
      authedFetch,
    }),
    [session, userId, role, profile, fetchMe, isLoading, signIn, signOut, authedFetch]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
