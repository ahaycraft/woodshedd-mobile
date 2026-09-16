import { createContext, useCallback, useContext, useMemo, type PropsWithChildren } from 'react';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useStorageState } from '@/hooks/use-storage-state';

export type ThemePreference = 'light' | 'dark' | 'system';

interface ThemePreferenceContextValue {
  /** What the user picked — 'system' (the default) means "follow the OS". */
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
  /** `preference` resolved against the OS setting when it's 'system' — use
   *  this, not the raw OS scheme, for anything that actually renders. */
  colorScheme: 'light' | 'dark';
}

const ThemePreferenceContext = createContext<ThemePreferenceContextValue | null>(null);

export function useThemePreference(): ThemePreferenceContextValue {
  const value = useContext(ThemePreferenceContext);
  if (!value) {
    throw new Error('useThemePreference must be used within a ThemePreferenceProvider');
  }
  return value;
}

const STORAGE_KEY = 'theme_preference';

// Mirrors the web app's manual Light/Dark toggle (see ThemeMenu.tsx there),
// plus a 'system' option native apps are expected to default to.
export function ThemePreferenceProvider({ children }: PropsWithChildren) {
  const systemScheme = useColorScheme();
  const [[, stored], setStored] = useStorageState(STORAGE_KEY);

  const preference: ThemePreference = stored === 'light' || stored === 'dark' ? stored : 'system';

  const setPreference = useCallback(
    (next: ThemePreference) => setStored(next === 'system' ? null : next),
    [setStored]
  );

  const colorScheme: 'light' | 'dark' =
    preference === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : preference;

  const value = useMemo(
    () => ({ preference, setPreference, colorScheme }),
    [preference, setPreference, colorScheme]
  );

  return <ThemePreferenceContext.Provider value={value}>{children}</ThemePreferenceContext.Provider>;
}
