import { useCallback, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, type DateData } from 'react-native-calendars';
import { router, useFocusEffect } from 'expo-router';

import { AccountButton } from '@/components/account-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useThemePreference } from '@/contexts/theme-preference-context';
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
type DayMark = {
  marked: boolean;
  dots: Dot[];
  selected?: boolean;
  selectedColor?: string;
  /** At least one band member is unavailable this day — drawn as a ring
   *  around the day number (see DayCell) rather than mixed in with the
   *  event dots, so it doesn't read as just another show. */
  unavailable?: boolean;
};
type Marks = Record<string, DayMark>;

// Matches react-native-calendars' own Day sizing (calendar/day/basic/style.js
// and calendar/day/dot/style.js) so this custom renderer lines up with the
// rest of the grid.
const DAY_SIZE = 32;
const RING_SIZE = 24;

function DayCell({
  date,
  state,
  marking,
  onPress,
  theme,
}: {
  date?: DateData;
  state?: string;
  // Deliberately weaker than DayMark (every field optional, `dots`
  // untyped) — this is react-native-calendars' own MarkingProps at
  // runtime, and TS requires a dayComponent's props to accept that
  // exact shape, not just the narrower one this screen constructs.
  marking?: {
    marked?: boolean;
    dots?: { key?: string; color: string }[];
    selected?: boolean;
    selectedColor?: string;
    unavailable?: boolean;
  };
  onPress?: (date?: DateData) => void;
  theme?: {
    dayTextColor?: string;
    textDisabledColor?: string;
    todayTextColor?: string;
    selectedDayTextColor?: string;
  };
}) {
  if (!date) return null;
  const isSelected = !!marking?.selected;
  const isToday = state === 'today';
  const isDisabled = state === 'disabled';

  const textColor = isSelected
    ? theme?.selectedDayTextColor
    : isDisabled
      ? theme?.textDisabledColor
      : isToday
        ? theme?.todayTextColor
        : theme?.dayTextColor;

  return (
    <Pressable
      onPress={() => onPress?.(date)}
      style={[
        dayStyles.base,
        isSelected && { backgroundColor: marking?.selectedColor, borderRadius: DAY_SIZE / 2 },
      ]}>
      <View style={[dayStyles.ring, marking?.unavailable && dayStyles.ringUnavailable]}>
        <Text allowFontScaling={false} style={[dayStyles.text, { color: textColor }]}>
          {date.day}
        </Text>
      </View>
      <View style={dayStyles.dotsRow}>
        {marking?.dots?.map((d) => (
          <View key={d.key} style={[dayStyles.dot, { backgroundColor: d.color }]} />
        ))}
      </View>
    </Pressable>
  );
}

const dayStyles = StyleSheet.create({
  base: { width: DAY_SIZE, height: DAY_SIZE, alignItems: 'center' },
  ring: {
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  ringUnavailable: { borderColor: UNAVAILABLE_COLOR },
  text: { fontSize: 16 },
  dotsRow: { flexDirection: 'row', height: 6 },
  dot: { width: 4, height: 4, marginTop: 1, marginHorizontal: 1, borderRadius: 2 },
});

export default function CalendarScreen() {
  const { authedFetch } = useAuth();
  const theme = useTheme();
  const { colorScheme } = useThemePreference();
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

  // Tracks whichever month is currently visible, so a focus-refresh (after
  // adding/editing/deleting an event) reloads that month instead of always
  // snapping back to today's.
  const now = new Date();
  const visibleMonthRef = useRef({ year: now.getFullYear(), month: now.getMonth() + 1 });

  const onVisibleMonthsChange = useCallback(
    (months: DateData[]) => {
      const month = months[0];
      if (month) {
        visibleMonthRef.current = { year: month.year, month: month.month };
        void loadMonth(month.year, month.month);
      }
    },
    [loadMonth]
  );

  // react-native-calendars wraps onVisibleMonthsChange in a "skip the first
  // render" hook internally, so it never fires for the initial month on
  // mount — only on later navigation. useFocusEffect covers both: the
  // initial load, and refreshing the visible month when this tab regains
  // focus after adding/editing/deleting an event.
  useFocusEffect(
    useCallback(() => {
      const { year, month } = visibleMonthRef.current;
      void loadMonth(year, month);
    }, [loadMonth])
  );

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
      entry.unavailable = true;
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
            <View style={styles.headerActions}>
              <Pressable onPress={() => router.push('/event/new')} style={styles.addButton}>
                <ThemedText style={styles.addButtonText}>+ Add</ThemedText>
              </Pressable>
              <AccountButton />
            </View>
          </View>

          <Calendar
            // react-native-calendars caches its header/frame styles in a
            // ref on mount and never recomputes them if the theme prop
            // changes later — forcing a remount on colorScheme change is
            // the only way to make dark/light actually take effect.
            key={colorScheme}
            markingType="multi-dot"
            markedDates={markedDates}
            dayComponent={DayCell}
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
              <View style={styles.emptyDay}>
                <ThemedText type="small" themeColor="textSecondary">
                  Nothing on {selectedDate}.
                </ThemedText>
                <Pressable onPress={() => router.push(`/event/new?date=${selectedDate}`)}>
                  <ThemedText style={styles.addButtonText}>+ Add event</ThemedText>
                </Pressable>
              </View>
            ) : (
              <>
                {dayShows.map((show) => (
                  <Pressable key={show.id} onPress={() => router.push(`/event/${show.id}`)}>
                    {({ pressed }) => (
                      <View style={[styles.eventRow, pressed && styles.eventRowPressed]}>
                        <View style={[styles.dot, { backgroundColor: paletteFor(show.type)[show.status] }]} />
                        <ThemedText style={styles.eventText}>
                          {show.title}
                          {show.venue ? ` — ${show.venue}` : ''}
                        </ThemedText>
                      </View>
                    )}
                  </Pressable>
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
  headerActions: { marginLeft: 'auto', flexDirection: 'row', gap: Spacing.four },
  addButton: { paddingVertical: Spacing.one, paddingHorizontal: Spacing.two },
  addButtonText: { color: '#208AEF', fontWeight: '600' },
  title: { fontSize: 28, lineHeight: 34 },
  dayPanel: { borderRadius: Spacing.three, padding: Spacing.three, gap: Spacing.two },
  emptyDay: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.one,
  },
  eventRowPressed: { opacity: 0.6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  eventText: { flex: 1 },
});
