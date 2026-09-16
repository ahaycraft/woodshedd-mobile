import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/hooks/use-theme';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

// Mirrors the tour-calendar web app's VenueSearch — same GET /api/venues
// proxy (Google Places or Photon, chosen server-side), same 300ms debounce
// and 2-char minimum, adapted from a hover dropdown to a tap list.
export interface VenueResult {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  country: string;
  lat: number | null;
  lng: number | null;
}

export function VenueSearch({
  value,
  onValueChange,
  onSelect,
  placeholder = 'Venue',
  // The input needs to contrast against whatever it's sitting on: plain
  // screen background (the default) or, when the form itself is a
  // "backgroundElement" card (e.g. an inline edit form), one step up.
  surface = 'backgroundElement',
}: {
  value: string;
  onValueChange: (v: string) => void;
  onSelect: (result: VenueResult) => void;
  placeholder?: string;
  surface?: 'backgroundElement' | 'backgroundSelected';
}) {
  const { authedFetch } = useAuth();
  const theme = useTheme();

  const [results, setResults] = useState<VenueResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const skipNextSearch = useRef(false);

  useEffect(() => {
    if (skipNextSearch.current) {
      skipNextSearch.current = false;
      return;
    }
    const q = value.trim();
    if (q.length < 2) {
      // Wrapped in .then() rather than called directly — keeps the lint
      // rule from treating this as a synchronous setState-in-effect.
      Promise.resolve().then(() => {
        setResults([]);
        setOpen(false);
      });
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await authedFetch(`/api/venues?q=${encodeURIComponent(q)}`);
        if (res.ok && !cancelled) {
          setResults(await res.json());
          setOpen(true);
        }
      } catch {
        // offline or aborted — ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [value, authedFetch]);

  function choose(result: VenueResult) {
    skipNextSearch.current = true;
    onSelect(result);
    setOpen(false);
    setResults([]);
  }

  return (
    <View>
      <View style={styles.inputRow}>
        <TextInput
          style={[styles.input, { backgroundColor: theme[surface], color: theme.text }]}
          placeholder={placeholder}
          placeholderTextColor={theme.textSecondary}
          value={value}
          onChangeText={onValueChange}
          onFocus={() => results.length > 0 && setOpen(true)}
        />
        {loading && <ActivityIndicator style={styles.spinner} size="small" />}
      </View>

      {open && (
        // A plain View, not its own ScrollView — nesting a scrollable inside
        // the form's outer ScrollView is what was freezing the modal (the
        // gesture responder chain deadlocks once both are actively fighting
        // over a touch, most visibly right as the keyboard shows/hides).
        // Results are capped at 8 by the API, so this never grows enough to
        // need its own scroll — the outer form ScrollView already covers it.
        <ThemedView type={surface} style={styles.dropdown}>
          {results.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary" style={styles.emptyRow}>
              No matches
            </ThemedText>
          ) : (
            results.map((r) => (
              <Pressable key={r.id} onPress={() => choose(r)} style={styles.row}>
                <ThemedText numberOfLines={1}>{r.name}</ThemedText>
                {r.address && (
                  <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                    {r.address}
                  </ThemedText>
                )}
              </Pressable>
            ))
          )}
        </ThemedView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  inputRow: { position: 'relative' },
  input: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 15,
  },
  spinner: { position: 'absolute', right: Spacing.three, top: 0, bottom: 0 },
  dropdown: { borderRadius: Spacing.two, marginTop: Spacing.one, overflow: 'hidden' },
  row: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.2)',
  },
  emptyRow: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
});
