import { useCallback, useEffect, useReducer } from 'react';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

type UseStateHook<T> = [[boolean, T | null], (value: T | null) => void];

function useAsyncState<T>(initialValue: [boolean, T | null] = [true, null]): UseStateHook<T> {
  return useReducer(
    (_state: [boolean, T | null], action: T | null = null): [boolean, T | null] => [false, action],
    initialValue
  ) as UseStateHook<T>;
}

async function setStorageItemAsync(key: string, value: string | null) {
  if (Platform.OS === 'web') {
    try {
      if (value === null) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, value);
      }
    } catch (e) {
      console.error('Local storage is unavailable:', e);
    }
  } else if (value == null) {
    await SecureStore.deleteItemAsync(key);
  } else {
    await SecureStore.setItemAsync(key, value);
  }
}

/**
 * Persists a value under `key` — Keychain-backed SecureStore on native,
 * localStorage on web (web has no Keychain equivalent; this is Expo's own
 * documented fallback for the web target). Returned as `[[isLoading, value],
 * setValue]`: `isLoading` is true only until the initial read resolves.
 */
export function useStorageState(key: string): UseStateHook<string> {
  const [state, setState] = useAsyncState<string>();

  useEffect(() => {
    if (Platform.OS === 'web') {
      try {
        setState(typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null);
      } catch (e) {
        console.error('Local storage is unavailable:', e);
      }
    } else {
      SecureStore.getItemAsync(key).then(setState);
    }
  }, [key, setState]);

  const setValue = useCallback(
    (value: string | null) => {
      setState(value);
      void setStorageItemAsync(key, value);
    },
    [key, setState]
  );

  return [state, setValue];
}
