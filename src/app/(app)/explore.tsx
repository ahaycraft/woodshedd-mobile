import { useCallback, useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar } from 'react-native-calendars';

import { AccountButton } from '@/components/account-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useThemePreference } from '@/contexts/theme-preference-context';
import { useResetOnBandChange } from '@/hooks/use-reset-on-band-change';
import { useTheme } from '@/hooks/use-theme';
import type { AvailabilityStatus, MemberUnavailability, Show } from '@/types/api';

const BRAND_BLUE = '#208AEF';
const AVAILABLE_COLOR = '#4d7c63';
const UNAVAILABLE_COLOR_ACTIVE = '#a05a52';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(dateStr: string) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export default function AvailabilityScreen() {
  const { authedFetch, userId } = useAuth();
  const theme = useTheme();
  const { colorScheme } = useThemePreference();

  const [shows, setShows] = useState<Show[]>([]);
  const [unavailable, setUnavailable] = useState<MemberUnavailability[]>([]);
  // Starts true and only ever flips to false — `load` only runs once, on
  // mount, so there's no case that needs to flip it back to true yet.
  const [loading, setLoading] = useState(true);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  // Which show's chooser is open for editing — an already-answered show
  // shows a single status line instead, so a stray tap while scrolling
  // can't silently flip an existing answer; only one show is edited at a
  // time, same as respondingId above.
  const [editingShowId, setEditingShowId] = useState<string | null>(null);

  const [pickingDate, setPickingDate] = useState(false);
  const [newDate, setNewDate] = useState<string | null>(null);
  const [newNote, setNewNote] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  // A year out is enough runway to plan around without an unbounded query —
  // same reasoning as the web app's 90-day-back cap on its list pages, just
  // forward-looking since this screen only cares about what's upcoming.
  const load = useCallback(async () => {
    const from = todayStr();
    const oneYearOut = new Date();
    oneYearOut.setFullYear(oneYearOut.getFullYear() + 1);
    const to = oneYearOut.toISOString().slice(0, 10);
    const [showsRes, unavailRes] = await Promise.all([
      authedFetch(`/api/shows?from=${from}&to=${to}`),
      authedFetch(`/api/unavailability?from=${from}&to=${to}`),
    ]);
    if (showsRes.ok) setShows(await showsRes.json());
    if (unavailRes.ok) setUnavailable(await unavailRes.json());
    setLoading(false);
  }, [authedFetch]);

  useEffect(() => {
    // Wrapped in .then() rather than called directly: the lint rule's
    // static analysis traces into an awaited async function's body as if
    // its setState calls were synchronous, same as it would for a plain
    // function call — routing the call through a .then() callback (like
    // the fetch in AuthProvider above) reads as the deferred async work it
    // actually is.
    Promise.resolve().then(load);
  }, [load]);

  // `load` above already re-runs on a band switch (it depends on
  // authedFetch, which depends on activeBandId) — but that alone still
  // renders the previous band's shows until the new fetch resolves. Clear
  // them the instant the band changes so there's nothing stale to flash.
  useResetOnBandChange(
    useCallback(() => {
      setShows([]);
      setUnavailable([]);
      setLoading(true);
    }, [])
  );

  async function respond(showId: string, status: AvailabilityStatus) {
    setRespondingId(showId);
    const res = await authedFetch(`/api/shows/${showId}/availability`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      const updated = await res.json();
      setShows((prev) =>
        prev.map((show) =>
          show.id === showId && userId
            ? { ...show, availability: [...show.availability.filter((a) => a.userId !== userId), updated] }
            : show
        )
      );
    }
    setRespondingId(null);
    setEditingShowId(null);
  }

  async function addBlockedDate() {
    if (!newDate) return;
    setAdding(true);
    setAddError(null);
    const res = await authedFetch('/api/unavailability', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: newDate, note: newNote || undefined }),
    });
    setAdding(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setAddError(body.error || "Couldn't block that date");
      return;
    }
    const records: MemberUnavailability[] = await res.json();
    setUnavailable((prev) => {
      const byId = new Map(prev.map((u) => [u.id, u] as const));
      for (const record of records) byId.set(record.id, record);
      return Array.from(byId.values()).sort((a, b) => a.date.localeCompare(b.date));
    });
    setNewDate(null);
    setNewNote('');
    setPickingDate(false);
  }

  async function removeBlockedDate(id: string, date: string) {
    setRemovingId(id);
    const res = await authedFetch('/api/unavailability', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date }),
    });
    if (res.ok) setUnavailable((prev) => prev.filter((u) => u.id !== id));
    setRemovingId(null);
  }

  const upcomingShows = shows.filter((s) => s.status !== 'CANCELLED');
  const myUnavailable = userId ? unavailable.filter((u) => u.userId === userId) : [];

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.pageHeader}>
            <ThemedText type="title" style={styles.title}>
              Availability
            </ThemedText>
            <AccountButton />
          </View>

          <ThemedView type="backgroundElement" style={styles.section}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Upcoming Shows
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Let the band know if you can make it.
            </ThemedText>

            {loading ? (
              <ThemedText type="small" themeColor="textSecondary">
                Loading…
              </ThemedText>
            ) : upcomingShows.length === 0 ? (
              <ThemedText type="small" themeColor="textSecondary">
                No upcoming shows.
              </ThemedText>
            ) : (
              upcomingShows.map((show) => {
                const mine = userId ? show.availability.find((a) => a.userId === userId) : undefined;
                const status = mine?.status ?? 'PENDING';
                const busy = respondingId === show.id;
                const needsResponse = status === 'PENDING';
                const choosing = needsResponse || editingShowId === show.id;
                return (
                  <View
                    key={show.id}
                    style={[
                      styles.showRow,
                      choosing && [
                        styles.needsResponse,
                        { borderColor: theme.text, borderBottomColor: theme.text },
                      ],
                    ]}>
                    <View style={styles.showInfo}>
                      <ThemedText style={styles.showTitle}>{show.title}</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {formatDate(show.date.slice(0, 10))}
                        {show.venue ? ` — ${show.venue}` : ''}
                      </ThemedText>
                    </View>
                    {choosing ? (
                      <View style={styles.respondButtons}>
                        <Pressable
                          disabled={busy}
                          onPress={() => respond(show.id, 'AVAILABLE')}
                          style={[styles.respondButton, status === 'AVAILABLE' && styles.availableActive]}>
                          <ThemedText
                            style={[styles.respondText, status === 'AVAILABLE' && styles.respondTextActive]}>
                            Available
                          </ThemedText>
                        </Pressable>
                        <Pressable
                          disabled={busy}
                          onPress={() => respond(show.id, 'UNAVAILABLE')}
                          style={[styles.respondButton, status === 'UNAVAILABLE' && styles.unavailableActive]}>
                          <ThemedText
                            style={[styles.respondText, status === 'UNAVAILABLE' && styles.respondTextActive]}>
                            Can&apos;t make it
                          </ThemedText>
                        </Pressable>
                      </View>
                    ) : (
                      // A settled answer reads as one unambiguous line rather
                      // than "which of these two buttons is greener" — and
                      // changing it takes a deliberate second tap (Edit, then
                      // a choice) instead of one stray tap in a scrolling list
                      // silently flipping an existing response.
                      <View style={styles.statusRow}>
                        <ThemedText
                          style={[
                            styles.statusText,
                            { color: status === 'AVAILABLE' ? AVAILABLE_COLOR : UNAVAILABLE_COLOR_ACTIVE },
                          ]}>
                          {status === 'AVAILABLE' ? '✓ Available' : "Can't make it"}
                        </ThemedText>
                        <Pressable onPress={() => setEditingShowId(show.id)} hitSlop={8}>
                          <ThemedText type="small" themeColor="textSecondary" style={styles.editLink}>
                            Edit
                          </ThemedText>
                        </Pressable>
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </ThemedView>

          <ThemedView type="backgroundElement" style={styles.section}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Blocked Dates
            </ThemedText>

            {!pickingDate ? (
              <Pressable onPress={() => setPickingDate(true)} style={styles.addButton}>
                <ThemedText style={styles.addButtonText}>Block a date</ThemedText>
              </Pressable>
            ) : (
              <View style={styles.addForm}>
                <Calendar
                  key={colorScheme}
                  minDate={todayStr()}
                  onDayPress={(day) => setNewDate(day.dateString)}
                  markedDates={newDate ? { [newDate]: { selected: true, selectedColor: BRAND_BLUE } } : {}}
                  theme={{
                    calendarBackground: theme.backgroundSelected,
                    dayTextColor: theme.text,
                    monthTextColor: theme.text,
                    textSectionTitleColor: theme.textSecondary,
                    textDisabledColor: theme.textSecondary,
                    arrowColor: theme.text,
                  }}
                />
                <TextInput
                  style={[styles.input, { backgroundColor: theme.backgroundSelected, color: theme.text }]}
                  placeholder="Reason (optional)"
                  placeholderTextColor={theme.textSecondary}
                  value={newNote}
                  onChangeText={setNewNote}
                />
                {addError && <ThemedText style={styles.error}>{addError}</ThemedText>}
                <View style={styles.formButtons}>
                  <Pressable
                    onPress={() => {
                      setPickingDate(false);
                      setNewDate(null);
                      setNewNote('');
                      setAddError(null);
                    }}
                    style={styles.cancelButton}>
                    <ThemedText>Cancel</ThemedText>
                  </Pressable>
                  <Pressable
                    disabled={!newDate || adding}
                    onPress={addBlockedDate}
                    style={[styles.addButton, (!newDate || adding) && styles.addButtonDisabled]}>
                    <ThemedText style={styles.addButtonText}>{adding ? 'Blocking…' : 'Block date'}</ThemedText>
                  </Pressable>
                </View>
              </View>
            )}

            {myUnavailable.length === 0 ? (
              <ThemedText type="small" themeColor="textSecondary">
                No blocked dates. All clear!
              </ThemedText>
            ) : (
              myUnavailable.map((u) => (
                <View key={u.id} style={styles.blockedRow}>
                  <View style={styles.showInfo}>
                    <ThemedText>{formatDate(u.date.slice(0, 10))}</ThemedText>
                    {u.note && (
                      <ThemedText type="small" themeColor="textSecondary">
                        {u.note}
                      </ThemedText>
                    )}
                  </View>
                  <Pressable
                    disabled={removingId === u.id}
                    onPress={() => removeBlockedDate(u.id, u.date.slice(0, 10))}>
                    <ThemedText style={styles.removeText}>Remove</ThemedText>
                  </Pressable>
                </View>
              ))
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
  pageHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  title: { fontSize: 28, lineHeight: 34 },
  section: { borderRadius: Spacing.three, padding: Spacing.three, gap: Spacing.three },
  sectionTitle: { fontSize: 20, lineHeight: 26 },
  showRow: {
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.2)',
  },
  // Outlines a not-yet-answered show so it's easy to spot at a glance
  // among ones already responded to — borderColor is set inline per-row
  // since it needs the current theme's text color, not a fixed white that
  // would vanish in light mode.
  needsResponse: {
    borderWidth: 1.5,
    borderBottomWidth: 1.5,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.two,
  },
  showInfo: { gap: 2 },
  showTitle: { fontWeight: '600' },
  respondButtons: { flexDirection: 'row', gap: Spacing.two },
  respondButton: {
    flex: 1,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(128,128,128,0.3)',
  },
  availableActive: { backgroundColor: AVAILABLE_COLOR, borderColor: AVAILABLE_COLOR },
  unavailableActive: { backgroundColor: UNAVAILABLE_COLOR_ACTIVE, borderColor: UNAVAILABLE_COLOR_ACTIVE },
  respondText: { fontSize: 13, fontWeight: '600' },
  respondTextActive: { color: '#ffffff' },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statusText: { fontSize: 13, fontWeight: '600' },
  editLink: { textDecorationLine: 'underline' },
  addButton: {
    backgroundColor: BRAND_BLUE,
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  addButtonDisabled: { opacity: 0.5 },
  addButtonText: { color: '#ffffff', fontWeight: '600' },
  addForm: { gap: Spacing.two },
  input: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 15,
  },
  error: { color: '#dc2626' },
  formButtons: { flexDirection: 'row', gap: Spacing.two, justifyContent: 'flex-end' },
  cancelButton: { paddingVertical: Spacing.two, paddingHorizontal: Spacing.three },
  blockedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.2)',
  },
  removeText: { color: '#dc2626', fontSize: 13 },
});
