import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';

import { DeleteButton } from '@/components/delete-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/hooks/use-theme';
import type { SetlistDetail, SetlistSong } from '@/types/api';

function moveSong(songs: SetlistSong[], index: number, direction: -1 | 1): SetlistSong[] {
  const target = index + direction;
  if (target < 0 || target >= songs.length) return songs;
  const next = [...songs];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export default function SetlistScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { authedFetch } = useAuth();
  const theme = useTheme();

  const [setlist, setSetlist] = useState<SetlistDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [addingSong, setAddingSong] = useState(false);

  const load = useCallback(async () => {
    const res = await authedFetch(`/api/setlists/${id}`);
    if (res.ok) {
      const data: SetlistDetail = await res.json();
      setSetlist(data);
      setName(data.name);
    }
    setLoading(false);
  }, [authedFetch, id]);

  useEffect(() => {
    Promise.resolve().then(load);
  }, [load]);

  async function saveName() {
    if (!name.trim() || name === setlist?.name) return;
    setSavingName(true);
    const res = await authedFetch(`/api/setlists/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim() }),
    });
    setSavingName(false);
    if (res.ok) await load();
  }

  async function addSong() {
    if (!newTitle.trim()) return;
    setAddingSong(true);
    const res = await authedFetch(`/api/setlists/${id}/songs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle }),
    });
    setAddingSong(false);
    if (res.ok) {
      const song = await res.json();
      setSetlist((prev) => (prev ? { ...prev, songs: [...prev.songs, song] } : prev));
      setNewTitle('');
    }
  }

  async function removeSong(songId: string) {
    setSetlist((prev) => (prev ? { ...prev, songs: prev.songs.filter((s) => s.id !== songId) } : prev));
    await authedFetch(`/api/setlists/${id}/songs/${songId}`, { method: 'DELETE' });
  }

  function reorder(index: number, direction: -1 | 1) {
    if (!setlist) return;
    const next = moveSong(setlist.songs, index, direction);
    setSetlist({ ...setlist, songs: next });
    void authedFetch(`/api/setlists/${id}/songs`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ songIds: next.map((s) => s.id) }),
    });
  }

  async function deleteSetlist() {
    const res = await authedFetch(`/api/setlists/${id}`, { method: 'DELETE' });
    if (res.ok) router.back();
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

  if (!setlist) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={[styles.safeArea, styles.centered]} edges={['bottom', 'left', 'right']}>
          <ThemedText themeColor="textSecondary">Setlist not found.</ThemedText>
        </SafeAreaView>
      </ThemedView>
    );
  }

  const dirtyName = name.trim() !== setlist.name && !!name.trim();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.nameRow}>
            <TextInput
              style={[styles.nameInput, { color: theme.text }]}
              value={name}
              onChangeText={setName}
            />
            {dirtyName && (
              <Pressable disabled={savingName} onPress={saveName} style={styles.saveNameButton}>
                <ThemedText style={styles.saveButtonText}>{savingName ? '…' : 'Save'}</ThemedText>
              </Pressable>
            )}
          </View>

          <ThemedView type="backgroundElement" style={styles.section}>
            <ThemedText type="smallBold">
              Songs <ThemedText themeColor="textSecondary">{setlist.songs.length}</ThemedText>
            </ThemedText>

            {setlist.songs.length === 0 ? (
              <ThemedText type="small" themeColor="textSecondary">
                No songs yet.
              </ThemedText>
            ) : (
              setlist.songs.map((s, i) => (
                <View key={s.id} style={styles.songRow}>
                  <ThemedText style={styles.songTitle} numberOfLines={1}>
                    {s.title}
                  </ThemedText>
                  <View style={styles.songActions}>
                    <Pressable disabled={i === 0} onPress={() => reorder(i, -1)} hitSlop={8}>
                      <SymbolView
                        name={{ ios: 'chevron.up', android: 'keyboard_arrow_up', web: 'keyboard_arrow_up' }}
                        size={16}
                        tintColor={i === 0 ? theme.textSecondary : theme.text}
                      />
                    </Pressable>
                    <Pressable disabled={i === setlist.songs.length - 1} onPress={() => reorder(i, 1)} hitSlop={8}>
                      <SymbolView
                        name={{ ios: 'chevron.down', android: 'keyboard_arrow_down', web: 'keyboard_arrow_down' }}
                        size={16}
                        tintColor={i === setlist.songs.length - 1 ? theme.textSecondary : theme.text}
                      />
                    </Pressable>
                    <Pressable onPress={() => removeSong(s.id)} hitSlop={8}>
                      <SymbolView name={{ ios: 'xmark', android: 'close', web: 'close' }} size={16} tintColor={theme.textSecondary} />
                    </Pressable>
                  </View>
                </View>
              ))
            )}

            <View style={styles.addRow}>
              <TextInput
                style={[styles.input, styles.flex1, { backgroundColor: theme.backgroundSelected, color: theme.text }]}
                placeholder="Add a song…"
                placeholderTextColor={theme.textSecondary}
                value={newTitle}
                onChangeText={setNewTitle}
                onSubmitEditing={addSong}
              />
              <Pressable disabled={addingSong || !newTitle.trim()} onPress={addSong} style={styles.addSongButton}>
                <SymbolView name={{ ios: 'plus', android: 'add', web: 'add' }} size={18} tintColor="#ffffff" />
              </Pressable>
            </View>
          </ThemedView>

          <View style={styles.deleteRow}>
            <DeleteButton
              label="Delete setlist"
              confirmLabel={`Delete "${setlist.name}"? Shows that already applied it keep their own copy.`}
              onConfirm={deleteSetlist}
            />
          </View>
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
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  nameInput: { flex: 1, fontSize: 24, fontWeight: '700' },
  saveNameButton: {
    backgroundColor: '#208AEF',
    borderRadius: Spacing.two,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
  },
  saveButtonText: { color: '#ffffff', fontWeight: '600' },
  section: { borderRadius: Spacing.three, padding: Spacing.three, gap: Spacing.two },
  songRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    paddingVertical: Spacing.one,
  },
  songTitle: { flex: 1 },
  songActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  addRow: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.one },
  flex1: { flex: 1 },
  input: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 15,
  },
  addSongButton: {
    backgroundColor: '#208AEF',
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteRow: { marginTop: Spacing.two },
});
