import { useState } from 'react';
import { Linking, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/hooks/use-theme';
import { relativeTime } from '@/lib/time';
import type { SongDemo } from '@/types/api';
import { DeleteButton } from './delete-button';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

const BRAND_BLUE = '#208AEF';
const CAN_MANAGE_ROLES = ['OWNER', 'ADMIN'];

// Mirrors the web app's SongDemos: add a link + optional label, remove one
// you added yourself or (if OWNER/ADMIN) any demo on the song.
export function SongDemosCard({
  songId,
  demos,
  onDemosChange,
}: {
  songId: string;
  demos: SongDemo[];
  onDemosChange: (demos: SongDemo[]) => void;
}) {
  const { authedFetch, userId, role } = useAuth();
  const theme = useTheme();

  const [url, setUrl] = useState('');
  const [label, setLabel] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canManage = !!role && CAN_MANAGE_ROLES.includes(role);

  async function addDemo() {
    const link = url.trim();
    if (!link || adding) return;
    setAdding(true);
    setError(null);

    const res = await authedFetch(`/api/songs/${songId}/demos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: link, label: label.trim() || undefined }),
    });

    setAdding(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error || "Couldn't add that");
      return;
    }

    const created: SongDemo = await res.json();
    onDemosChange([created, ...demos]);
    setUrl('');
    setLabel('');
  }

  async function removeDemo(id: string) {
    const previous = demos;
    onDemosChange(demos.filter((d) => d.id !== id));
    const res = await authedFetch(`/api/songs/${songId}/demos/${id}`, { method: 'DELETE' });
    if (!res.ok) onDemosChange(previous);
  }

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="smallBold">Demos{demos.length > 0 ? ` · ${demos.length}` : ''}</ThemedText>

      {demos.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          No demos yet.
        </ThemedText>
      ) : (
        demos.map((demo) => {
          const canRemove = canManage || demo.createdById === userId;
          return (
            <View key={demo.id} style={styles.demoRow}>
              <Pressable onPress={() => Linking.openURL(demo.url)} style={styles.demoInfo}>
                <ThemedText style={styles.linkText} numberOfLines={1}>
                  {demo.label || 'Demo'}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {demo.createdBy.name ?? 'Someone'} · {relativeTime(demo.createdAt)}
                </ThemedText>
              </Pressable>
              {canRemove && (
                <DeleteButton label="Remove" confirmLabel="Remove this demo?" onConfirm={() => removeDemo(demo.id)} />
              )}
            </View>
          );
        })
      )}

      {error && <ThemedText style={styles.error}>{error}</ThemedText>}

      <View style={styles.addForm}>
        <TextInput
          style={[styles.input, { backgroundColor: theme.backgroundSelected, color: theme.text }]}
          placeholder="Samply, SoundCloud, or direct audio link…"
          placeholderTextColor={theme.textSecondary}
          value={url}
          onChangeText={setUrl}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <View style={styles.addRow}>
          <TextInput
            style={[styles.input, styles.labelInput, { backgroundColor: theme.backgroundSelected, color: theme.text }]}
            placeholder="Label (rough mix v2)"
            placeholderTextColor={theme.textSecondary}
            value={label}
            onChangeText={setLabel}
          />
          <Pressable
            disabled={adding || !url.trim()}
            onPress={addDemo}
            style={[styles.addButton, (adding || !url.trim()) && styles.addButtonDisabled]}>
            <ThemedText style={styles.addButtonText}>{adding ? 'Adding…' : 'Add'}</ThemedText>
          </Pressable>
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Spacing.three, padding: Spacing.three, gap: Spacing.two },
  demoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.2)',
  },
  demoInfo: { flex: 1, gap: 2 },
  linkText: { color: '#3c87f7' },
  error: { color: '#dc2626' },
  addForm: { gap: Spacing.two, marginTop: Spacing.one },
  addRow: { flexDirection: 'row', gap: Spacing.two, alignItems: 'center' },
  input: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 14,
  },
  labelInput: { flex: 1 },
  addButton: {
    backgroundColor: BRAND_BLUE,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  addButtonDisabled: { opacity: 0.5 },
  addButtonText: { color: '#ffffff', fontWeight: '600' },
});
