import { createContext, useCallback, useContext, useMemo, type PropsWithChildren } from 'react';

import { useStorageState } from '@/hooks/use-storage-state';

export type ThemePreference = 'light' | 'dark';

interface ThemePreferenceContextValue {
  /** What the user picked. Same value as `colorScheme` — kept as a
   *  separate field only because most callers just want the resolved
   *  scheme to render with. */
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
  colorScheme: ThemePreference;
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

// Mirrors the web app's manual Light/Dark toggle exactly (see ThemeMenu.tsx
// there) — no "follow the OS" option, and defaults to dark until the user
// picks, same as web's default when it has no theme cookie yet.
export function ThemePreferenceProvider({ children }: PropsWithChildren) {
  const [[, stored], setStored] = useStorageState(STORAGE_KEY);

  const preference: ThemePreference = stored === 'light' ? 'light' : 'dark';

  const setPreference = useCallback((next: ThemePreference) => setStored(next), [setStored]);

  const value = useMemo(
    () => ({ preference, setPreference, colorScheme: preference }),
    [preference, setPreference]
  );

  return <ThemePreferenceContext.Provider value={value}>{children}</ThemePreferenceContext.Provider>;
}
