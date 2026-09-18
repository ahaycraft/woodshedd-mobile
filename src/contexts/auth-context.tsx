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
import type { Band, MeResponse } from '@/types/api';

/** Header the backend reads the active band from — mobile has no cookie
 *  jar, so this is its equivalent of the web app's `active_band` cookie
 *  (see tour-calendar's src/lib/band.ts). */
const ACTIVE_BAND_HEADER = 'x-active-band';

interface AuthContextValue {
  /** The bearer token, or null when signed out. Truthy = signed in. */
  session: string | null;
  /** The signed-in user's own id (from GET /api/mobile/me), or null until
   *  that resolves — the bearer token is an encrypted JWE, so there's no
   *  way to read it out client-side without asking the backend. */
  userId: string | null;
  /** The signed-in user's role in the *active* band (from `bands`, matched
   *  against `activeBandId`) — used to mirror the web app's per-band
   *  permission checks (OWNER/ADMIN or the item's own creator) for things
   *  like deleting someone else's comment. Distinct from the global site
   *  role on `MeResponse.role`, which this deliberately ignores. */
  role: string | null;
  /** Profile fields shown on the Account screen — same GET /api/mobile/me
   *  call as userId/role, kept separate since nothing else in the app
   *  needs them. */
  profile: { name: string; email: string; phone: string | null } | null;
  /** Re-runs GET /api/mobile/me and updates userId/role/profile. Call
   *  after a profile edit so the Account screen reflects what was saved
   *  without waiting for the next app launch. */
  refreshProfile: () => Promise<void>;
  /** Every band the signed-in user belongs to, same GET /api/mobile/me
   *  call as userId/role. Empty until that resolves. */
  bands: Band[];
  /** The band whose data authedFetch currently scopes requests to — the
   *  `activeBandId` the backend last resolved, mirrored into storage so it
   *  survives app relaunches. Null until the initial fetch resolves. */
  activeBandId: string | null;
  /** Switches the active band. Local-only (no request): every future
   *  authedFetch call sends the new id as the `x-active-band` header, so
   *  screens pick it up next time they load — same as how switching bands
   *  on the web app takes effect on the next navigation. */
  switchBand: (bandId: string) => void;
  /** Whether this device should hold a registered push token — the mobile
   *  equivalent of the web app's PushToggle. Defaults to true (unset means
   *  "never touched the toggle") so existing installs keep the previous
   *  always-on behavior until someone explicitly turns it off. */
  pushEnabled: boolean;
  /** True only until the stored push preference's initial read resolves —
   *  mirrors `isLoading` for the same reason: avoids the Account screen's
   *  switch flashing "on" before a stored "off" loads in. */
  pushLoading: boolean;
  /** Turns push on/off: registers or unregisters this device's token with
   *  the backend (POST/DELETE /api/mobile/push-token) and persists the
   *  choice so it survives app relaunches. */
  setPushEnabled: (enabled: boolean) => Promise<void>;
  isLoading: boolean;
  /** Resolves to an error message on failure, or null on success. */
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => void;
  /** fetch(), with the bearer token and active-band header attached
   *  automatically. */
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
  const [[bandIdLoading, activeBandId], setActiveBandId] = useStorageState('activeBandId');
  const [[pushLoading, pushPref], setPushPref] = useStorageState('pushEnabled');
  const pushEnabled = pushPref !== 'false';

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
  const switchBand = useCallback((bandId: string) => setActiveBandId(bandId), [setActiveBandId]);

  const authedFetch = useCallback(
    (path: string, options: RequestInit = {}) => {
      const headers = new Headers(options.headers);
      if (session) headers.set('Authorization', `Bearer ${session}`);
      if (activeBandId) headers.set(ACTIVE_BAND_HEADER, activeBandId);
      return fetch(apiUrl(path), { ...options, headers });
    },
    [session, activeBandId]
  );

  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [profile, setProfile] = useState<AuthContextValue['profile']>(null);
  const [bands, setBands] = useState<Band[]>([]);

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
      setBands([]);
    }
  }

  const fetchMe = useCallback(async () => {
    try {
      const res = await authedFetch('/api/mobile/me');
      const me: MeResponse | null = res.ok ? await res.json() : null;
      const resolvedBandId = me?.activeBandId ?? activeBandId;
      setUserId(me?.id ?? null);
      setRole(me?.bands.find((b) => b.id === resolvedBandId)?.role ?? null);
      setProfile(me ? { name: me.name, email: me.email, phone: me.phone ?? null } : null);
      setBands(me?.bands ?? []);
      // Mirrors back whatever the backend actually resolved — covers the
      // very first launch (nothing stored yet, so no header was sent and
      // the backend fell back to the first membership) and self-heals a
      // stored id that stopped being valid (e.g. removed from that band).
      if (me?.activeBandId && me.activeBandId !== activeBandId) {
        setActiveBandId(me.activeBandId);
      }
    } catch {
      setUserId(null);
      setRole(null);
      setProfile(null);
      setBands([]);
    }
  }, [authedFetch, activeBandId, setActiveBandId]);

  useEffect(() => {
    // Waits for the active-band storage read too, not just session — firing
    // this before it resolves would send no x-active-band header, and the
    // backend would (harmlessly but wrongly) fall back to the first
    // membership instead of the one the user last picked.
    if (!session || bandIdLoading) return;
    // Wrapped in .then() rather than called directly — same reasoning as
    // the screens that fetch their own data: keeps the lint rule from
    // treating this awaited call's setState calls as synchronous.
    Promise.resolve().then(fetchMe);
  }, [session, bandIdLoading, fetchMe]);

  // Fire-and-forget: register this device for push once signed in, unless
  // the user has explicitly turned the toggle off. No component state
  // depends on the outcome (permission denied, no EAS project, running on
  // web/simulator, or the pref just hasn't loaded yet — all just mean no
  // push this session), so nothing here needs to be reflected in the UI.
  useEffect(() => {
    if (!session || pushLoading || !pushEnabled) return;
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
  }, [session, authedFetch, pushEnabled, pushLoading]);

  const setPushEnabled = useCallback(
    async (enabled: boolean) => {
      setPushPref(enabled ? 'true' : 'false');
      try {
        if (enabled) {
          const registration = await registerForPushNotifications();
          if (!registration) return;
          await authedFetch('/api/mobile/push-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(registration)
          });
        } else {
          // No permission prompt for turning off — only looks up the token
          // if one was already granted, so there's something to unregister.
          const registration = await registerForPushNotifications({ requestPermission: false });
          if (!registration) return;
          await authedFetch('/api/mobile/push-token', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: registration.token })
          });
        }
      } catch {
        // Best-effort, same as the launch-time registration above — the
        // preference itself is already saved either way.
      }
    },
    [authedFetch, setPushPref]
  );

  const value = useMemo(
    () => ({
      session,
      userId,
      role,
      profile,
      refreshProfile: fetchMe,
      bands,
      activeBandId,
      switchBand,
      pushEnabled,
      pushLoading,
      setPushEnabled,
      isLoading,
      signIn,
      signOut,
      authedFetch,
    }),
    [
      session,
      userId,
      role,
      profile,
      fetchMe,
      bands,
      activeBandId,
      switchBand,
      pushEnabled,
      pushLoading,
      setPushEnabled,
      isLoading,
      signIn,
      signOut,
      authedFetch,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
