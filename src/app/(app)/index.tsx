import { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, type DateData } from 'react-native-calendars';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/hooks/use-theme';
import type { MemberUnavailability, Show } from '@/types/api';

// Same palette as CalendarView.tsx in the web app, so events read the same
// way on both — cool blue = pending show, green = confirmed, clay =
// cancelled, plum = recording, teal = practice, ochre = member unavailable.
const statusColors: Record<string, string> = {
  CONFIRMED: '#4d7c63',
  PENDING: '#5b6f99',
  CANCELLED: '#a05a52',
};
const recordingColors: Record<string, string> = {
  CONFIRMED: '#63548a',
  PENDING: '#836c92',
  CANCELLED: '#a05a52',
};
const practiceColors: Record<string, string> = {
  CONFIRMED: '#2f7d76',
  PENDING: '#4f8a84',
  CANCELLED: '#a05a52',
};
const UNAVAILABLE_COLOR = '#c2894a';
const BRAND_BLUE = '#208AEF';

function paletteFor(type: string): Record<string, string> {
  if (type === 'RECORDING') return recordingColors;
  if (type === 'PRACTICE') return practiceColors;
  return statusColors;
}

// DateData.month is 1-indexed; `to` is exclusive, matching the API.
function monthRange(year: number, month: number) {
  const from = new Date(Date.UTC(year, month - 1, 1)).toISOString().slice(0, 10);
  const to = new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10);
  return { from, to };
}

type Dot = { key: string; color: string };
type Marks = Record<string, { marked: boolean; dots: Dot[]; selected?: boolean; selectedColor?: string }>;

export default function CalendarScreen() {
  const { authedFetch } = useAuth();
  const theme = useTheme();
  const [shows, setShows] = useState<Show[]>([]);
  const [unavailable, setUnavailable] = useState<MemberUnavailability[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadMonth = useCallback(
    async (year: number, month: number) => {
      const { from, to } = monthRange(year, month);
      setLoading(true);
      const [showsRes, unavailRes] = await Promise.all([
        authedFetch(`/api/shows?from=${from}&to=${to}`),
        authedFetch(`/api/unavailability?from=${from}&to=${to}`),
      ]);
      if (showsRes.ok) setShows(await showsRes.json());
      if (unavailRes.ok) setUnavailable(await unavailRes.json());
      setLoading(false);
    },
    [authedFetch]
  );

  const onVisibleMonthsChange = useCallback(
    (months: DateData[]) => {
      const month = months[0];
      if (month) void loadMonth(month.year, month.month);
    },
    [loadMonth]
  );

  // react-native-calendars wraps onVisibleMonthsChange in a "skip the first
  // render" hook internally, so it never fires for the initial month on
  // mount — only on later navigation. Load the current month explicitly.
  // Wrapped in .then() rather than called directly, same reasoning as the
  // Availability screen: satisfies the lint rule that (correctly) flags an
  // awaited async function's setState calls as if they ran synchronously
  // in the effect.
  useEffect(() => {
    const now = new Date();
    Promise.resolve().then(() => loadMonth(now.getFullYear(), now.getMonth() + 1));
  }, [loadMonth]);

  const markedDates = useMemo(() => {
    const marks: Marks = {};
    for (const show of shows) {
      const day = show.date.slice(0, 10);
      const palette = paletteFor(show.type);
      const entry = marks[day] ?? { marked: true, dots: [] };
      entry.dots.push({ key: show.id, color: palette[show.status] ?? statusColors.PENDING });
      marks[day] = entry;
    }
    for (const u of unavailable) {
      const day = u.date.slice(0, 10);
      const entry = marks[day] ?? { marked: true, dots: [] };
      entry.dots.push({ key: u.id, color: UNAVAILABLE_COLOR });
      marks[day] = entry;
    }
    if (selectedDate) {
      marks[selectedDate] = {
        ...(marks[selectedDate] ?? { marked: false, dots: [] }),
        selected: true,
        selectedColor: theme.backgroundSelected,
      };
    }
    return marks;
  }, [shows, unavailable, selectedDate, theme.backgroundSelected]);

  const dayShows = selectedDate ? shows.filter((s) => s.date.slice(0, 10) === selectedDate) : [];
  const dayUnavailable = selectedDate
    ? unavailable.filter((u) => u.date.slice(0, 10) === selectedDate)
    : [];

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <ThemedText type="title" style={styles.title}>
              Calendar
            </ThemedText>
            {loading && (
              <ThemedText type="small" themeColor="textSecondary">
                Loading…
              </ThemedText>
            )}
          </View>

          <Calendar
            markingType="multi-dot"
            markedDates={markedDates}
            onDayPress={(day) => setSelectedDate(day.dateString)}
            onVisibleMonthsChange={onVisibleMonthsChange}
            theme={{
              calendarBackground: theme.background,
              dayTextColor: theme.text,
              textDisabledColor: theme.textSecondary,
              monthTextColor: theme.text,
              textSectionTitleColor: theme.textSecondary,
              todayTextColor: BRAND_BLUE,
              arrowColor: theme.text,
              selectedDayTextColor: theme.text,
            }}
          />

          <ThemedView type="backgroundElement" style={styles.dayPanel}>
            {!selectedDate ? (
              <ThemedText type="small" themeColor="textSecondary">
                Tap a date to see what&apos;s happening.
              </ThemedText>
            ) : dayShows.length === 0 && dayUnavailable.length === 0 ? (
              <ThemedText type="small" themeColor="textSecondary">
                Nothing on {selectedDate}.
              </ThemedText>
            ) : (
              <>
                {dayShows.map((show) => (
                  <View key={show.id} style={styles.eventRow}>
                    <View style={[styles.dot, { backgroundColor: paletteFor(show.type)[show.status] }]} />
                    <ThemedText style={styles.eventText}>
                      {show.title}
                      {show.venue ? ` — ${show.venue}` : ''}
                    </ThemedText>
                  </View>
                ))}
                {dayUnavailable.map((u) => (
                  <View key={u.id} style={styles.eventRow}>
                    <View style={[styles.dot, { backgroundColor: UNAVAILABLE_COLOR }]} />
                    <ThemedText style={styles.eventText}>
                      {u.user.name ?? 'Someone'} unavailable
                      {u.note ? ` — ${u.note}` : ''}
                    </ThemedText>
                  </View>
                ))}
              </>
            )}
          </ThemedView>
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
    // The web tab bar (app-tabs.web.tsx) floats over the content instead of
    // pushing it down, so web needs extra clearance up top; native's own
    // status bar is already handled by SafeAreaView.
    paddingTop: Platform.select({ web: Spacing.six, default: Spacing.three }),
    paddingBottom: BottomTabInset + Spacing.three,
    gap: Spacing.three,
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  header: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.two },
  title: { fontSize: 28, lineHeight: 34 },
  dayPanel: { borderRadius: Spacing.three, padding: Spacing.three, gap: Spacing.two },
  eventRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  dot: { width: 8, height: 8, borderRadius: 4 },
  eventText: { flex: 1 },
});
