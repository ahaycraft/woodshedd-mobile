import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import type { AvailabilityStatus, ShowDetail } from '@/types/api';

const statusColors: Record<string, string> = {
  CONFIRMED: '#4d7c63',
  PENDING: '#5b6f99',
  CANCELLED: '#a05a52',
};
const typeLabel: Record<string, string> = { RECORDING: 'Recording', PRACTICE: 'Practice' };
const AVAILABLE_COLOR = '#4d7c63';
const UNAVAILABLE_COLOR = '#a05a52';

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export default function EventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { authedFetch, userId } = useAuth();

  const [show, setShow] = useState<ShowDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState(false);

  const load = useCallback(async () => {
    const res = await authedFetch(`/api/shows/${id}`);
    if (res.ok) setShow(await res.json());
    setLoading(false);
  }, [authedFetch, id]);

  useEffect(() => {
    Promise.resolve().then(load);
  }, [load]);

  async function respond(status: AvailabilityStatus) {
    setResponding(true);
    const res = await authedFetch(`/api/shows/${id}/availability`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      const updated = await res.json();
      setShow((prev) =>
        prev && userId
          ? { ...prev, availability: [...prev.availability.filter((a) => a.userId !== userId), updated] }
          : prev
      );
    }
    setResponding(false);
  }

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={[styles.safeArea, styles.centered]} edges={['bottom', 'left', 'right']}>
          <ActivityIndicator />
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (!show) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={[styles.safeArea, styles.centered]} edges={['bottom', 'left', 'right']}>
          <ThemedText themeColor="textSecondary">Event not found.</ThemedText>
        </SafeAreaView>
      </ThemedView>
    );
  }

  const isRecording = show.type === 'RECORDING';
  const location = [show.venue, show.city, show.state, show.venue || show.city ? show.country : null]
    .filter(Boolean)
    .join(', ');

  const timeline = [
    show.loadInTime && { label: isRecording ? 'Call' : 'Load in', time: show.loadInTime },
    show.doorsTime && { label: 'Doors', time: show.doorsTime },
    show.setTime && { label: isRecording ? 'Wrap' : 'Set', time: show.setTime },
  ].filter((s): s is { label: string; time: string } => !!s);

  const mine = userId ? show.availability.find((a) => a.userId === userId) : undefined;
  const myStatus = mine?.status ?? 'PENDING';
  const available = show.availability.filter((a) => a.status === 'AVAILABLE');
  const unavailable = show.availability.filter((a) => a.status === 'UNAVAILABLE');
  const pending = show.availability.filter((a) => a.status === 'PENDING');

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <ThemedText type="subtitle" style={styles.title}>
              {show.title}
            </ThemedText>
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, { backgroundColor: statusColors[show.status] }]} />
              <ThemedText type="small" themeColor="textSecondary">
                {show.status === 'CONFIRMED' ? 'Confirmed' : show.status === 'CANCELLED' ? 'Cancelled' : 'Pending'}
                {typeLabel[show.type] ? ` · ${typeLabel[show.type]}` : ''}
              </ThemedText>
            </View>
            <ThemedText style={styles.date}>{formatDate(show.date)}</ThemedText>
            {location && <ThemedText themeColor="textSecondary">{location}</ThemedText>}
            {show.venueAddress && (
              <ThemedText type="small" themeColor="textSecondary">
                {show.venueAddress}
              </ThemedText>
            )}
            {show.release && (
              <ThemedText type="small" themeColor="textSecondary">
                Tracking for {show.release.title}
              </ThemedText>
            )}
          </View>

          {timeline.length > 0 && (
            <ThemedView type="backgroundElement" style={styles.section}>
              {timeline.map((step) => (
                <View key={step.label} style={styles.timelineRow}>
                  <ThemedText style={styles.timelineLabel}>{step.label}</ThemedText>
                  <ThemedText themeColor="textSecondary">{formatTime(step.time)}</ThemedText>
                </View>
              ))}
            </ThemedView>
          )}

          {(show.guarantee || show.notes) && (
            <ThemedView type="backgroundElement" style={styles.section}>
              {show.guarantee != null && (
                <ThemedText>${show.guarantee.toFixed(0)} guarantee</ThemedText>
              )}
              {show.notes && <ThemedText>{show.notes}</ThemedText>}
            </ThemedView>
          )}

          <ThemedView type="backgroundElement" style={styles.section}>
            <ThemedText type="smallBold">My Availability</ThemedText>
            <View style={styles.respondButtons}>
              <Pressable
                disabled={responding}
                onPress={() => respond('AVAILABLE')}
                style={[styles.respondButton, myStatus === 'AVAILABLE' && styles.availableActive]}>
                <ThemedText
                  style={[styles.respondText, myStatus === 'AVAILABLE' && styles.respondTextActive]}>
                  Available
                </ThemedText>
              </Pressable>
              <Pressable
                disabled={responding}
                onPress={() => respond('UNAVAILABLE')}
                style={[styles.respondButton, myStatus === 'UNAVAILABLE' && styles.unavailableActive]}>
                <ThemedText
                  style={[styles.respondText, myStatus === 'UNAVAILABLE' && styles.respondTextActive]}>
                  Can&apos;t make it
                </ThemedText>
              </Pressable>
            </View>
          </ThemedView>

          <ThemedView type="backgroundElement" style={styles.section}>
            <ThemedText type="smallBold">
              Group Availability · {available.length} available
            </ThemedText>
            {show.availability.length === 0 ? (
              <ThemedText type="small" themeColor="textSecondary">
                No responses yet.
              </ThemedText>
            ) : (
              <>
                {available.length > 0 && (
                  <View style={styles.memberGroup}>
                    <ThemedText type="small" themeColor="textSecondary" style={styles.memberGroupLabel}>
                      AVAILABLE
                    </ThemedText>
                    {available.map((a) => (
                      <ThemedText key={a.id}>{a.user.name ?? 'Someone'}</ThemedText>
                    ))}
                  </View>
                )}
                {unavailable.length > 0 && (
                  <View style={styles.memberGroup}>
                    <ThemedText type="small" themeColor="textSecondary" style={styles.memberGroupLabel}>
                      UNAVAILABLE
                    </ThemedText>
                    {unavailable.map((a) => (
                      <ThemedText key={a.id}>{a.user.name ?? 'Someone'}</ThemedText>
                    ))}
                  </View>
                )}
                {pending.length > 0 && (
                  <View style={styles.memberGroup}>
                    <ThemedText type="small" themeColor="textSecondary" style={styles.memberGroupLabel}>
                      NO RESPONSE
                    </ThemedText>
                    {pending.map((a) => (
                      <ThemedText key={a.id} themeColor="textSecondary">
                        {a.user.name ?? 'Someone'}
                      </ThemedText>
                    ))}
                  </View>
                )}
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
  centered: { alignItems: 'center', justifyContent: 'center' },
  scrollContent: { padding: Spacing.three, gap: Spacing.three },
  header: { gap: Spacing.one },
  title: { fontSize: 24, lineHeight: 30 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginTop: Spacing.one },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  date: { fontWeight: '600', marginTop: Spacing.one },
  section: { borderRadius: Spacing.three, padding: Spacing.three, gap: Spacing.two },
  timelineRow: { flexDirection: 'row', justifyContent: 'space-between' },
  timelineLabel: { fontWeight: '600' },
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
  unavailableActive: { backgroundColor: UNAVAILABLE_COLOR, borderColor: UNAVAILABLE_COLOR },
  respondText: { fontSize: 13, fontWeight: '600' },
  respondTextActive: { color: '#ffffff' },
  memberGroup: { gap: 2 },
  memberGroupLabel: { letterSpacing: 0.5, marginBottom: 2 },
});
