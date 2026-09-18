import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';

import { DeleteButton } from '@/components/delete-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/hooks/use-theme';
import type { SetlistSummary } from '@/types/api';

export default function SetlistsScreen() {
  const { authedFetch, activeBandId } = useAuth();
  const theme = useTheme();

  const [setlists, setSetlists] = useState<SetlistSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!activeBandId) return;
    const res = await authedFetch(`/api/bands/${activeBandId}/setlists`);
    if (res.ok) setSetlists(await res.json());
    setLoading(false);
  }, [authedFetch, activeBandId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  async function create() {
    if (!name.trim() || !activeBandId) return;
    setSaving(true);
    setError('');
    const res = await authedFetch(`/api/bands/${activeBandId}/setlists`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error || "Couldn't create setlist");
      return;
    }
    const setlist = await res.json();
    setName('');
    setAdding(false);
    router.push(`/setlists/${setlist.id}`);
  }

  async function removeSetlist(id: string) {
    const res = await authedFetch(`/api/setlists/${id}`, { method: 'DELETE' });
    if (res.ok) setSetlists((prev) => prev.filter((s) => s.id !== id));
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.sectionHeaderRow}>
            <ThemedText type="smallBold">Templates</ThemedText>
            {!adding && (
              <Pressable onPress={() => setAdding(true)}>
                <ThemedText style={styles.linkText}>New</ThemedText>
              </Pressable>
            )}
          </View>

          {adding && (
            <ThemedView type="backgroundElement" style={styles.addForm}>
              <TextInput
                autoFocus
                style={[styles.input, { backgroundColor: theme.backgroundSelected, color: theme.text }]}
                placeholder="e.g. Full Set"
                placeholderTextColor={theme.textSecondary}
                value={name}
                onChangeText={setName}
              />
              {error && <ThemedText style={styles.error}>{error}</ThemedText>}
              <View style={styles.formButtons}>
                <Pressable
                  onPress={() => {
                    setAdding(false);
                    setName('');
                    setError('');
                  }}
                  style={styles.cancelButton}>
                  <ThemedText>Cancel</ThemedText>
                </Pressable>
                <Pressable
                  disabled={saving || !name.trim()}
                  onPress={create}
                  style={[styles.saveButton, (saving || !name.trim()) && styles.saveButtonDisabled]}>
                  <ThemedText style={styles.saveButtonText}>{saving ? 'Creating…' : 'Create'}</ThemedText>
                </Pressable>
              </View>
            </ThemedView>
          )}

          {loading ? (
            <ThemedText type="small" themeColor="textSecondary">
              Loading…
            </ThemedText>
          ) : setlists.length === 0 && !adding ? (
            <ThemedText type="small" themeColor="textSecondary">
              No setlists yet. Make a reusable template like &ldquo;Full Set&rdquo; to apply to shows.
            </ThemedText>
          ) : (
            setlists.map((s) => (
              <ThemedView key={s.id} type="backgroundElement" style={styles.row}>
                <Pressable style={styles.rowMain} onPress={() => router.push(`/setlists/${s.id}`)}>
                  <ThemedText>{s.name}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {s._count.songs} song{s._count.songs === 1 ? '' : 's'}
                  </ThemedText>
                </Pressable>
                <DeleteButton
                  label="Remove"
                  confirmLabel={`Delete "${s.name}"?`}
                  onConfirm={() => removeSetlist(s.id)}
                />
              </ThemedView>
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
  scrollContent: { padding: Spacing.three, gap: Spacing.three },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  linkText: { color: '#208AEF', fontWeight: '600' },
  addForm: { borderRadius: Spacing.three, padding: Spacing.three, gap: Spacing.two },
  input: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 15,
  },
  error: { color: '#dc2626' },
  formButtons: { flexDirection: 'row', gap: Spacing.two, justifyContent: 'flex-end' },
  cancelButton: { paddingVertical: Spacing.two, paddingHorizontal: Spacing.three },
  saveButton: {
    backgroundColor: '#208AEF',
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two,
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
  },
  saveButtonDisabled: { opacity: 0.5 },
  saveButtonText: { color: '#ffffff', fontWeight: '600' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    borderRadius: Spacing.three,
    padding: Spacing.three,
  },
  rowMain: { flex: 1, gap: 2 },
});
