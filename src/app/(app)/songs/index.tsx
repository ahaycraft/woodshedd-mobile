import { useCallback, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';

import { AccountButton } from '@/components/account-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { SONG_STATUSES, songStatusColor, songStatusLabel } from '@/lib/songs';
import type { SongListItem, SongStatus } from '@/types/api';

function formatUpdated(dateStr: string) {
  return `edited ${new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
}

function SongRow({ song }: { song: SongListItem }) {
  const details = [song.key, song.tempo ? `${song.tempo} BPM` : null, song.timeSig]
    .filter(Boolean)
    .join(' · ');

  return (
    <Pressable onPress={() => router.push(`/songs/${song.id}`)}>
      {({ pressed }) => (
        <ThemedView type="backgroundElement" style={[styles.row, pressed && styles.rowPressed]}>
          <View style={styles.rowMain}>
            <View style={styles.titleLine}>
              <ThemedText style={styles.title} numberOfLines={1}>
                {song.title}
              </ThemedText>
              {song.tracks.map((t) => (
                <View key={t.release.id} style={styles.chip}>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.chipText} numberOfLines={1}>
                    {t.release.title}
                  </ThemedText>
                </View>
              ))}
            </View>
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
              {details ? `${details} · ` : ''}
              {formatUpdated(song.updatedAt)}
            </ThemedText>
          </View>
          {song._count.comments > 0 && (
            <ThemedText type="small" themeColor="textSecondary">
              💬 {song._count.comments}
            </ThemedText>
          )}
        </ThemedView>
      )}
    </Pressable>
  );
}

export default function SongsScreen() {
  const { authedFetch } = useAuth();
  const [songs, setSongs] = useState<SongListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await authedFetch('/api/songs');
    if (res.ok) setSongs(await res.json());
    setLoading(false);
  }, [authedFetch]);

  // useFocusEffect (not a plain mount effect) so returning from a delete,
  // edit, or "+ Add" screen refreshes the list.
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const byStatus = new Map<SongStatus, SongListItem[]>();
  for (const song of songs) {
    const list = byStatus.get(song.status) ?? [];
    list.push(song);
    byStatus.set(song.status, list);
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.pageHeader}>
            <ThemedText type="title" style={styles.pageTitle}>
              Songs
            </ThemedText>
            <View style={styles.headerActions}>
              <Pressable onPress={() => router.push('/songs/new')} style={styles.addButton}>
                <ThemedText style={styles.addButtonText}>+ Add</ThemedText>
              </Pressable>
              <AccountButton />
            </View>
          </View>

          {loading ? (
            <ThemedText type="small" themeColor="textSecondary">
              Loading…
            </ThemedText>
          ) : songs.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              No songs yet.
            </ThemedText>
          ) : (
            SONG_STATUSES.filter((status) => byStatus.has(status)).map((status) => (
              <View key={status} style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={[styles.statusDot, { backgroundColor: songStatusColor[status] }]} />
                  <ThemedText type="smallBold" themeColor="textSecondary">
                    {songStatusLabel[status]} · {byStatus.get(status)!.length}
                  </ThemedText>
                </View>
                <View style={styles.sectionRows}>
                  {byStatus.get(status)!.map((song) => (
                    <SongRow key={song.id} song={song} />
                  ))}
                </View>
              </View>
            ))
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
    gap: Spacing.four,
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  pageHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  pageTitle: { fontSize: 28, lineHeight: 34 },
  headerActions: { flexDirection: 'row', gap: Spacing.four },
  addButton: { paddingVertical: Spacing.one, paddingHorizontal: Spacing.two },
  addButtonText: { color: '#208AEF', fontWeight: '600' },
  section: { gap: Spacing.two },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  sectionRows: { gap: Spacing.two },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    borderRadius: Spacing.three,
    padding: Spacing.three,
  },
  rowPressed: { opacity: 0.7 },
  rowMain: { flex: 1, gap: 2 },
  titleLine: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, flexWrap: 'wrap' },
  title: { fontWeight: '600' },
  chip: {
    backgroundColor: 'rgba(128,128,128,0.2)',
    borderRadius: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
  },
  chipText: { fontSize: 11, lineHeight: 14 },
});
