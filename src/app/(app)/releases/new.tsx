import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/hooks/use-theme';
import { releaseKindLabel } from '@/lib/releases';
import type { ReleaseKind } from '@/types/api';

const KINDS: ReleaseKind[] = ['ALBUM', 'EP', 'SINGLE', 'GROUP'];
const BRAND_BLUE = '#208AEF';

export default function NewReleaseScreen() {
  const { authedFetch } = useAuth();
  const theme = useTheme();

  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<ReleaseKind>('ALBUM');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!title.trim()) return;
    setSaving(true);
    setError(null);
    const res = await authedFetch('/api/releases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: title.trim(), kind }),
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error || "Couldn't save");
      return;
    }
    const created = await res.json();
    router.replace(`/releases/${created.id}`);
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <TextInput
            style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text }]}
            placeholder="Title"
            placeholderTextColor={theme.textSecondary}
            value={title}
            onChangeText={setTitle}
            autoFocus
          />

          <ThemedText type="small" themeColor="textSecondary">
            Kind
          </ThemedText>
          <View style={styles.chipRow}>
            {KINDS.map((k) => (
              <Pressable key={k} onPress={() => setKind(k)}>
                <View style={[styles.chip, k === kind && styles.chipActive]}>
                  <ThemedText type="small" themeColor={k === kind ? 'text' : 'textSecondary'}>
                    {releaseKindLabel[k]}
                  </ThemedText>
                </View>
              </Pressable>
            ))}
          </View>

          {error && <ThemedText style={styles.error}>{error}</ThemedText>}

          <Pressable
            disabled={saving || !title.trim()}
            onPress={save}
            style={[styles.saveButton, (saving || !title.trim()) && styles.saveButtonDisabled]}>
            <ThemedText style={styles.saveButtonText}>{saving ? 'Saving…' : 'Save'}</ThemedText>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  scrollContent: { padding: Spacing.three, gap: Spacing.three },
  input: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 15,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: {
    borderRadius: Spacing.four,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    backgroundColor: 'rgba(128,128,128,0.2)',
  },
  chipActive: { backgroundColor: BRAND_BLUE },
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
