import { useCallback, useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { AccountButton } from '@/components/account-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { releaseKindLabel, releaseStatusColor, releaseStatusLabel } from '@/lib/releases';
import type { ReleaseListItem } from '@/types/api';

function formatTarget(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
}

function ReleaseRow({ release }: { release: ReleaseListItem }) {
  return (
    <Pressable onPress={() => router.push(`/releases/${release.id}`)}>
      {({ pressed }) => (
        <ThemedView type="backgroundElement" style={[styles.row, pressed && styles.rowPressed]}>
          <View style={styles.titleLine}>
            <ThemedText style={styles.title} numberOfLines={1}>
              {release.title}
            </ThemedText>
            <View style={styles.kindChip}>
              <ThemedText type="small" themeColor="textSecondary">
                {releaseKindLabel[release.kind]}
              </ThemedText>
            </View>
          </View>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: releaseStatusColor[release.status] }]} />
            <ThemedText type="small" themeColor="textSecondary">
              {releaseStatusLabel[release.status]}
            </ThemedText>
          </View>
          <ThemedText type="small" themeColor="textSecondary">
            {release._count.tracks} {release._count.tracks === 1 ? 'track' : 'tracks'}
            {release.targetDate ? ` · target ${formatTarget(release.targetDate)}` : ''}
          </ThemedText>
        </ThemedView>
      )}
    </Pressable>
  );
}

export default function ReleasesScreen() {
  const { authedFetch } = useAuth();
  const [releases, setReleases] = useState<ReleaseListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await authedFetch('/api/releases');
    if (res.ok) setReleases(await res.json());
    setLoading(false);
  }, [authedFetch]);

  useEffect(() => {
    Promise.resolve().then(load);
  }, [load]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.pageHeader}>
            <ThemedText type="title" style={styles.pageTitle}>
              Releases
            </ThemedText>
            <View style={styles.headerActions}>
              <Pressable onPress={() => router.push('/releases/new')} style={styles.addButton}>
                <ThemedText style={styles.addButtonText}>+ Add</ThemedText>
              </Pressable>
              <AccountButton />
            </View>
          </View>

          {loading ? (
            <ThemedText type="small" themeColor="textSecondary">
              Loading…
            </ThemedText>
          ) : releases.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              No releases yet.
            </ThemedText>
          ) : (
            <View style={styles.rows}>
              {releases.map((release) => (
                <ReleaseRow key={release.id} release={release} />
              ))}
            </View>
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
  addButtonText: { color: '#208AEF', fontWeight: '600' },
  rows: { gap: Spacing.two },
  row: { borderRadius: Spacing.three, padding: Spacing.three, gap: Spacing.one },
  rowPressed: { opacity: 0.7 },
  titleLine: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, flexWrap: 'wrap' },
  title: { fontWeight: '600' },
  kindChip: {
    backgroundColor: 'rgba(128,128,128,0.2)',
    borderRadius: Spacing.four,
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
});
