import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { releaseKindLabel, releaseStatusColor, releaseStatusLabel } from '@/lib/releases';
import { songStatusColor, songStatusLabel } from '@/lib/songs';
import type { ReleaseDetail } from '@/types/api';

function formatTarget(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

function formatDuration(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

export default function ReleaseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { authedFetch } = useAuth();

  const [release, setRelease] = useState<ReleaseDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await authedFetch(`/api/releases/${id}`);
    if (res.ok) setRelease(await res.json());
    setLoading(false);
  }, [authedFetch, id]);

  useEffect(() => {
    Promise.resolve().then(load);
  }, [load]);

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={[styles.safeArea, styles.centered]} edges={['bottom', 'left', 'right']}>
          <ActivityIndicator />
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (!release) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={[styles.safeArea, styles.centered]} edges={['bottom', 'left', 'right']}>
          <ThemedText themeColor="textSecondary">Release not found.</ThemedText>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <ThemedText type="subtitle" style={styles.title}>
              {release.title}
            </ThemedText>
            <View style={styles.metaRow}>
              <View style={styles.kindChip}>
                <ThemedText type="small" themeColor="textSecondary">
                  {releaseKindLabel[release.kind]}
                </ThemedText>
              </View>
              <View style={styles.statusRow}>
                <View style={[styles.statusDot, { backgroundColor: releaseStatusColor[release.status] }]} />
                <ThemedText type="small" themeColor="textSecondary">
                  {releaseStatusLabel[release.status]}
                </ThemedText>
              </View>
            </View>
            {release.targetDate && (
              <ThemedText type="small" themeColor="textSecondary">
                Target: {formatTarget(release.targetDate)}
              </ThemedText>
            )}
          </View>

          {release.notes && (
            <ThemedView type="backgroundElement" style={styles.section}>
              <ThemedText type="smallBold">Notes</ThemedText>
              <ThemedText>{release.notes}</ThemedText>
            </ThemedView>
          )}

          <ThemedView type="backgroundElement" style={styles.section}>
            <ThemedText type="smallBold">
              Tracklist{release.tracks.length > 0 ? ` · ${release.tracks.length}` : ''}
            </ThemedText>
            {release.tracks.length === 0 ? (
              <ThemedText type="small" themeColor="textSecondary">
                No tracks yet.
              </ThemedText>
            ) : (
              release.tracks.map((track, i) => (
                <View key={track.id} style={styles.trackRow}>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.trackNumber}>
                    {i + 1}
                  </ThemedText>
                  <View style={styles.trackInfo}>
                    <ThemedText numberOfLines={1}>{track.song.title}</ThemedText>
                    <View style={styles.trackStatusRow}>
                      <View
                        style={[styles.statusDot, { backgroundColor: songStatusColor[track.song.status] }]}
                      />
                      <ThemedText type="small" themeColor="textSecondary">
                        {songStatusLabel[track.song.status]}
                      </ThemedText>
                    </View>
                  </View>
                  {track.song.duration != null && (
                    <ThemedText type="small" themeColor="textSecondary">
                      {formatDuration(track.song.duration)}
                    </ThemedText>
                  )}
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
  centered: { alignItems: 'center', justifyContent: 'center' },
  scrollContent: { padding: Spacing.three, gap: Spacing.three },
  header: { gap: Spacing.one },
  title: { fontSize: 24, lineHeight: 30 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, marginTop: Spacing.one },
  kindChip: {
    backgroundColor: 'rgba(128,128,128,0.2)',
    borderRadius: Spacing.four,
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  section: { borderRadius: Spacing.three, padding: Spacing.three, gap: Spacing.two },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.one,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.2)',
  },
  trackNumber: { width: 20 },
  trackInfo: { flex: 1, gap: 2 },
  trackStatusRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
});
