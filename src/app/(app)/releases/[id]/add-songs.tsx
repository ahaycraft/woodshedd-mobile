import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { songStatusColor, songStatusLabel } from '@/lib/songs';
import type { ReleaseDetail, SongListItem } from '@/types/api';

const BRAND_BLUE = '#208AEF';

export default function AddSongsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { authedFetch } = useAuth();

  const [songs, setSongs] = useState<SongListItem[]>([]);
  // Ordered so existing tracklist order survives the save — starts as the
  // release's current track order, then newly-checked songs append to the end.
  const [order, setOrder] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [songsRes, releaseRes] = await Promise.all([
      authedFetch('/api/songs'),
      authedFetch(`/api/releases/${id}`),
    ]);
    if (songsRes.ok) setSongs(await songsRes.json());
    if (releaseRes.ok) {
      const release: ReleaseDetail = await releaseRes.json();
      setOrder(release.tracks.map((t) => t.song.id));
    }
    setLoading(false);
  }, [authedFetch, id]);

  useEffect(() => {
    Promise.resolve().then(load);
  }, [load]);

  function toggle(songId: string) {
    setOrder((prev) => (prev.includes(songId) ? prev.filter((s) => s !== songId) : [...prev, songId]));
  }

  async function save() {
    setSaving(true);
    setError(null);
    const res = await authedFetch(`/api/releases/${id}/tracks`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ songIds: order }),
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error || "Couldn't save");
      return;
    }
    router.back();
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

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
        <FlatList
          data={songs}
          keyExtractor={(song) => song.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <ThemedText type="small" themeColor="textSecondary">
              No songs yet.
            </ThemedText>
          }
          renderItem={({ item: song }) => {
            const checked = order.includes(song.id);
            return (
              <Pressable onPress={() => toggle(song.id)}>
                <ThemedView type="backgroundElement" style={styles.row}>
                  <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                    {checked && <ThemedText style={styles.checkmark}>✓</ThemedText>}
                  </View>
                  <View style={styles.rowInfo}>
                    <ThemedText numberOfLines={1}>{song.title}</ThemedText>
                    <View style={styles.statusRow}>
                      <View style={[styles.statusDot, { backgroundColor: songStatusColor[song.status] }]} />
                      <ThemedText type="small" themeColor="textSecondary">
                        {songStatusLabel[song.status]}
                      </ThemedText>
                    </View>
                  </View>
                </ThemedView>
              </Pressable>
            );
          }}
        />

        <View style={styles.footer}>
          {error && <ThemedText style={styles.error}>{error}</ThemedText>}
          <Pressable disabled={saving} onPress={save} style={[styles.saveButton, saving && styles.saveButtonDisabled]}>
            <ThemedText style={styles.saveButtonText}>{saving ? 'Saving…' : `Done · ${order.length}`}</ThemedText>
          </Pressable>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  centered: { alignItems: 'center', justifyContent: 'center' },
  listContent: { padding: Spacing.three, gap: Spacing.two },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
    marginBottom: Spacing.two,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: 'rgba(128,128,128,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: BRAND_BLUE, borderColor: BRAND_BLUE },
  checkmark: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
  rowInfo: { flex: 1, gap: 2 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  footer: { padding: Spacing.three, gap: Spacing.two },
  error: { color: '#dc2626' },
  saveButton: {
    backgroundColor: BRAND_BLUE,
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  saveButtonDisabled: { opacity: 0.5 },
  saveButtonText: { color: '#ffffff', fontWeight: '600' },
});
