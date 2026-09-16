import { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { AccountButton } from '@/components/account-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import type { EventTypeStr, Show } from '@/types/api';

const BRAND_BLUE = '#208AEF';

// Same order/labels as the web app's mobile EventTypeTabs.
const TYPES: { type: EventTypeStr; label: string }[] = [
  { type: 'SHOW', label: 'Shows' },
  { type: 'PRACTICE', label: 'Practices' },
  { type: 'RECORDING', label: 'Recordings' },
];

const statusColors: Record<string, string> = {
  CONFIRMED: '#4d7c63',
  PENDING: '#5b6f99',
  CANCELLED: '#a05a52',
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function isUpcoming(show: Show) {
  if (show.status === 'CANCELLED') return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(show.date) >= today;
}

function EventRow({ show }: { show: Show }) {
  return (
    <Pressable onPress={() => router.push(`/event/${show.id}`)}>
      {({ pressed }) => (
        <ThemedView type="backgroundElement" style={[styles.row, pressed && styles.rowPressed]}>
          <View style={[styles.statusDot, { backgroundColor: statusColors[show.status] }]} />
          <View style={styles.rowInfo}>
            <ThemedText numberOfLines={1}>{show.title}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
              {formatDate(show.date)}
              {show.venue ? ` · ${show.venue}` : ''}
            </ThemedText>
          </View>
        </ThemedView>
      )}
    </Pressable>
  );
}

export default function EventsScreen() {
  const { authedFetch } = useAuth();
  const [shows, setShows] = useState<Show[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState<EventTypeStr>('SHOW');

  const load = useCallback(async () => {
    // 90 days back (matching the web list pages' LIST_PAST_DAYS) through a
    // year out — a list, not the calendar's tight visible-range query.
    const from = new Date();
    from.setDate(from.getDate() - 90);
    const to = new Date();
    to.setFullYear(to.getFullYear() + 1);
    const res = await authedFetch(
      `/api/shows?from=${from.toISOString().slice(0, 10)}&to=${to.toISOString().slice(0, 10)}`
    );
    if (res.ok) setShows(await res.json());
    setLoading(false);
  }, [authedFetch]);

  useEffect(() => {
    Promise.resolve().then(load);
  }, [load]);

  const filtered = useMemo(() => shows.filter((s) => s.type === activeType), [shows, activeType]);
  const upcoming = filtered.filter(isUpcoming);
  const past = filtered.filter((s) => !isUpcoming(s));

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.pageHeader}>
            <ThemedText type="title" style={styles.pageTitle}>
              Events
            </ThemedText>
            <View style={styles.headerActions}>
              <Pressable onPress={() => router.push('/event/new')} style={styles.addButton}>
                <ThemedText style={styles.addButtonText}>+ Add</ThemedText>
              </Pressable>
              <AccountButton />
            </View>
          </View>

          <View style={styles.typeTabs}>
            {TYPES.map(({ type, label }) => (
              <Pressable key={type} onPress={() => setActiveType(type)} style={styles.typeTabButton}>
                <View style={[styles.typeTab, type === activeType && styles.typeTabActive]}>
                  <ThemedText type="small" themeColor={type === activeType ? 'text' : 'textSecondary'}>
                    {label}
                  </ThemedText>
                </View>
              </Pressable>
            ))}
          </View>

          {loading ? (
            <ThemedText type="small" themeColor="textSecondary">
              Loading…
            </ThemedText>
          ) : (
            <>
              <View style={styles.section}>
                <ThemedText type="smallBold" themeColor="textSecondary">
                  Upcoming
                </ThemedText>
                {upcoming.length === 0 ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    Nothing upcoming.
                  </ThemedText>
                ) : (
                  upcoming.map((show) => <EventRow key={show.id} show={show} />)
                )}
              </View>

              {past.length > 0 && (
                <View style={styles.section}>
                  <ThemedText type="smallBold" themeColor="textSecondary">
                    Past
                  </ThemedText>
                  {past.map((show) => (
                    <EventRow key={show.id} show={show} />
                  ))}
                </View>
              )}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Spacing.three,
    paddingTop: Platform.select({ web: Spacing.six, default: Spacing.three }),
    paddingBottom: BottomTabInset + Spacing.three,
    gap: Spacing.three,
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  pageHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  pageTitle: { fontSize: 28, lineHeight: 34 },
  headerActions: { flexDirection: 'row', gap: Spacing.four },
  addButton: { paddingVertical: Spacing.one, paddingHorizontal: Spacing.two },
  addButtonText: { color: BRAND_BLUE, fontWeight: '600' },
  typeTabs: { flexDirection: 'row', gap: Spacing.one, padding: 4, backgroundColor: 'rgba(128,128,128,0.15)', borderRadius: Spacing.three },
  typeTabButton: { flex: 1 },
  typeTab: { paddingVertical: Spacing.two, borderRadius: Spacing.two, alignItems: 'center' },
  typeTabActive: { backgroundColor: 'rgba(128,128,128,0.3)' },
  section: { gap: Spacing.two },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Spacing.three,
    padding: Spacing.three,
  },
  rowPressed: { opacity: 0.7 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  rowInfo: { flex: 1, gap: 2 },
});
