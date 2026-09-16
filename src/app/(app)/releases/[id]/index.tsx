import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import DraggableFlatList, {
  RenderItemParams,
  ScaleDecorator,
} from 'react-native-draggable-flatlist';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { releaseKindLabel, releaseStatusColor, releaseStatusLabel } from '@/lib/releases';
import { songStatusColor, songStatusLabel } from '@/lib/songs';
import type { ReleaseDetail, ReleaseTrack } from '@/types/api';

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

  // useFocusEffect (not a plain mount effect) so returning from the "Add
  // songs" picker refreshes the tracklist without a manual reload.
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  async function reorderTracks(newOrder: ReleaseTrack[]) {
    if (!release) return;
    const previous = release.tracks;
    setRelease({ ...release, tracks: newOrder });
    const res = await authedFetch(`/api/releases/${id}/tracks`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ songIds: newOrder.map((t) => t.song.id) }),
    });
    if (!res.ok) setRelease((prev) => (prev ? { ...prev, tracks: previous } : prev));
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

  if (!release) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={[styles.safeArea, styles.centered]} edges={['bottom', 'left', 'right']}>
          <ThemedText themeColor="textSecondary">Release not found.</ThemedText>
        </SafeAreaView>
      </ThemedView>
    );
  }

  const header = (
    <View style={styles.headerArea}>
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

      <View style={styles.tracklistHeader}>
        <ThemedText type="smallBold">
          Tracklist{release.tracks.length > 0 ? ` · ${release.tracks.length}` : ''}
        </ThemedText>
        <Pressable onPress={() => router.push(`/releases/${release.id}/add-songs`)}>
          <ThemedText style={styles.addSongsLink}>+ Add songs</ThemedText>
        </Pressable>
      </View>
      {release.tracks.length > 1 && (
        <ThemedText type="small" themeColor="textSecondary" style={styles.dragHint}>
          Hold and drag ≡ to reorder
        </ThemedText>
      )}
      {release.tracks.length === 0 && (
        <ThemedView type="backgroundElement" style={styles.section}>
          <ThemedText type="small" themeColor="textSecondary">
            No tracks yet.
          </ThemedText>
        </ThemedView>
      )}
    </View>
  );

  function renderItem({ item, drag, isActive, getIndex }: RenderItemParams<ReleaseTrack>) {
    const index = getIndex() ?? 0;
    return (
      <ScaleDecorator>
        <ThemedView type="backgroundElement" style={[styles.trackRow, isActive && styles.trackRowActive]}>
          <ThemedText type="small" themeColor="textSecondary" style={styles.trackNumber}>
            {index + 1}
          </ThemedText>
          <View style={styles.trackInfo}>
            <ThemedText numberOfLines={1}>{item.song.title}</ThemedText>
            <View style={styles.trackStatusRow}>
              <View style={[styles.statusDot, { backgroundColor: songStatusColor[item.song.status] }]} />
              <ThemedText type="small" themeColor="textSecondary">
                {songStatusLabel[item.song.status]}
              </ThemedText>
            </View>
          </View>
          {item.song.duration != null && (
            <ThemedText type="small" themeColor="textSecondary">
              {formatDuration(item.song.duration)}
            </ThemedText>
          )}
          <Pressable onLongPress={drag} disabled={isActive} style={styles.dragHandleButton}>
            <ThemedText themeColor="textSecondary" style={styles.dragHandle}>
              ≡
            </ThemedText>
          </Pressable>
        </ThemedView>
      </ScaleDecorator>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
        <DraggableFlatList
          data={release.tracks}
          onDragEnd={({ data }) => reorderTracks(data)}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListHeaderComponent={header}
          contentContainerStyle={styles.scrollContent}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  centered: { alignItems: 'center', justifyContent: 'center' },
  scrollContent: { padding: Spacing.three, gap: Spacing.two },
  headerArea: { gap: Spacing.three, marginBottom: Spacing.two },
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
  tracklistHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  addSongsLink: { color: '#208AEF', fontWeight: '600' },
  dragHint: { marginTop: -Spacing.one },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.two,
    borderRadius: Spacing.two,
    marginBottom: Spacing.one,
  },
  trackRowActive: { opacity: 0.9 },
  trackNumber: { width: 20 },
  trackInfo: { flex: 1, gap: 2 },
  trackStatusRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  dragHandleButton: { paddingHorizontal: Spacing.one, paddingVertical: Spacing.one },
  dragHandle: { fontSize: 18 },
});
