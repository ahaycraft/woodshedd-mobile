import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/hooks/use-theme';
import { MAX_SECTION_NAME, SECTION_PRESETS, planPresetAdd, sectionAccentColor } from '@/lib/arrangement';
import type { SongSection } from '@/types/api';
import { DeleteButton } from './delete-button';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

const BRAND_BLUE = '#208AEF';

// Mirrors the web app's SongArrangement: same preset vocabulary and
// "Verse" -> "Verse 1"/"Verse 2" promotion, same per-section name/notes/
// lyrics and live autosave. Reordering uses up/down buttons rather than
// drag — this card sits inside the song screen's own ScrollView, and a
// nested drag-list there is exactly what caused the venue-search freeze
// earlier, so it's avoided here on purpose.
export function SongArrangementCard({
  songId,
  sections,
  onSectionsChange,
}: {
  songId: string;
  sections: SongSection[];
  onSectionsChange: (sections: SongSection[]) => void;
}) {
  const { authedFetch } = useAuth();
  const theme = useTheme();

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [customName, setCustomName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateLocal(id: string, data: Partial<Pick<SongSection, 'name' | 'notes' | 'lyrics'>>) {
    onSectionsChange(sections.map((s) => (s.id === id ? { ...s, ...data } : s)));
  }

  async function patchSection(id: string, data: Partial<Pick<SongSection, 'name' | 'notes' | 'lyrics'>>) {
    await authedFetch(`/api/songs/${songId}/sections/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  }

  async function persistOrder(newSections: SongSection[]) {
    onSectionsChange(newSections);
    await authedFetch(`/api/songs/${songId}/sections`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order: newSections.map((s) => s.id) }),
    });
  }

  function moveSection(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= sections.length) return;
    const next = [...sections];
    [next[index], next[target]] = [next[target], next[index]];
    void persistOrder(next);
  }

  async function addSection(name: string, promote?: { id: string; name: string }) {
    if (busy) return;
    setBusy(true);
    setError(null);
    if (promote) {
      updateLocal(promote.id, { name: promote.name });
      await patchSection(promote.id, { name: promote.name });
    }
    const res = await authedFetch(`/api/songs/${songId}/sections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    setBusy(false);
    if (!res.ok) {
      setError("Couldn't add that section");
      return;
    }
    const created = await res.json();
    const row: SongSection = {
      id: created.id,
      songId,
      name: created.name,
      notes: created.notes ?? null,
      lyrics: created.lyrics ?? null,
      position: created.position,
    };
    onSectionsChange([...sections, row]);
    setExpanded((e) => new Set(e).add(row.id));
  }

  function addPreset(preset: string) {
    const { name, promote } = planPresetAdd(preset, sections);
    void addSection(name, promote);
  }

  function addCustom() {
    const name = customName.trim();
    if (!name) return;
    setCustomName('');
    void addSection(name);
  }

  async function deleteSection(id: string) {
    const previous = sections;
    onSectionsChange(sections.filter((s) => s.id !== id));
    const res = await authedFetch(`/api/songs/${songId}/sections/${id}`, { method: 'DELETE' });
    if (!res.ok) onSectionsChange(previous);
  }

  function toggleExpanded(id: string) {
    setExpanded((e) => {
      const next = new Set(e);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="smallBold">
        Arrangement{sections.length > 0 ? ` · ${sections.length}` : ''}
      </ThemedText>

      {sections.map((section, i) => {
        const isExpanded = expanded.has(section.id);
        return (
          <View key={section.id} style={styles.sectionRow}>
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.positionDot, { backgroundColor: sectionAccentColor(section.name) }]}>
                <ThemedText type="small" style={styles.positionText}>
                  {i + 1}
                </ThemedText>
              </View>
              <TextInput
                style={[styles.nameInput, { color: theme.text }]}
                value={section.name}
                onChangeText={(text) => updateLocal(section.id, { name: text })}
                onEndEditing={(e) => {
                  const text = e.nativeEvent.text.trim();
                  if (text) patchSection(section.id, { name: text });
                }}
                maxLength={MAX_SECTION_NAME}
              />
              <Pressable disabled={i === 0} onPress={() => moveSection(i, -1)} style={styles.iconButton}>
                <ThemedText themeColor={i === 0 ? 'textSecondary' : 'text'}>▲</ThemedText>
              </Pressable>
              <Pressable
                disabled={i === sections.length - 1}
                onPress={() => moveSection(i, 1)}
                style={styles.iconButton}>
                <ThemedText themeColor={i === sections.length - 1 ? 'textSecondary' : 'text'}>▼</ThemedText>
              </Pressable>
              <Pressable onPress={() => toggleExpanded(section.id)} style={styles.iconButton}>
                <ThemedText themeColor="textSecondary">{isExpanded ? '︿' : '﹀'}</ThemedText>
              </Pressable>
            </View>

            {isExpanded && (
              <View style={styles.sectionDetails}>
                <ThemedText type="small" themeColor="textSecondary">
                  Notes
                </ThemedText>
                <TextInput
                  style={[styles.textArea, { backgroundColor: theme.backgroundSelected, color: theme.text }]}
                  value={section.notes ?? ''}
                  onChangeText={(text) => updateLocal(section.id, { notes: text })}
                  onEndEditing={(e) => patchSection(section.id, { notes: e.nativeEvent.text || null })}
                  placeholder="Feel, dynamics, who comes in…"
                  placeholderTextColor={theme.textSecondary}
                  multiline
                />
                <ThemedText type="small" themeColor="textSecondary">
                  Lyrics
                </ThemedText>
                <TextInput
                  style={[
                    styles.textArea,
                    styles.lyricsArea,
                    { backgroundColor: theme.backgroundSelected, color: theme.text },
                  ]}
                  value={section.lyrics ?? ''}
                  onChangeText={(text) => updateLocal(section.id, { lyrics: text })}
                  onEndEditing={(e) => patchSection(section.id, { lyrics: e.nativeEvent.text || null })}
                  placeholder="Lines for this section…"
                  placeholderTextColor={theme.textSecondary}
                  multiline
                />
                <DeleteButton
                  label="Delete section"
                  confirmLabel={`Delete "${section.name}"?`}
                  onConfirm={() => deleteSection(section.id)}
                />
              </View>
            )}
          </View>
        );
      })}

      {error && <ThemedText style={styles.error}>{error}</ThemedText>}

      <View style={styles.presetRow}>
        {SECTION_PRESETS.map((preset) => (
          <Pressable key={preset} disabled={busy} onPress={() => addPreset(preset)}>
            <View style={styles.presetChip}>
              <ThemedText type="small" themeColor="textSecondary">
                + {preset}
              </ThemedText>
            </View>
          </Pressable>
        ))}
      </View>

      <View style={styles.customRow}>
        <TextInput
          style={[styles.customInput, { backgroundColor: theme.backgroundSelected, color: theme.text }]}
          placeholder="Custom section…"
          placeholderTextColor={theme.textSecondary}
          value={customName}
          onChangeText={setCustomName}
          maxLength={MAX_SECTION_NAME}
          onSubmitEditing={addCustom}
        />
        <Pressable
          disabled={busy || !customName.trim()}
          onPress={addCustom}
          style={[styles.addCustomButton, (busy || !customName.trim()) && styles.addCustomButtonDisabled]}>
          <ThemedText style={styles.addCustomButtonText}>Add</ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Spacing.three, padding: Spacing.three, gap: Spacing.two },
  sectionRow: {
    borderRadius: Spacing.two,
    backgroundColor: 'rgba(128,128,128,0.12)',
    overflow: 'hidden',
  },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one, padding: Spacing.one },
  positionDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  positionText: { color: '#ffffff', fontSize: 11 },
  nameInput: { flex: 1, fontSize: 15, paddingHorizontal: Spacing.two, paddingVertical: Spacing.one },
  iconButton: { paddingHorizontal: Spacing.one, paddingVertical: Spacing.one },
  sectionDetails: {
    gap: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingBottom: Spacing.two,
  },
  textArea: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    fontSize: 14,
    minHeight: 44,
  },
  lyricsArea: { minHeight: 80 },
  error: { color: '#dc2626' },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one, marginTop: Spacing.one },
  presetChip: {
    borderRadius: Spacing.four,
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
    backgroundColor: 'rgba(128,128,128,0.2)',
  },
  customRow: { flexDirection: 'row', gap: Spacing.two, alignItems: 'center' },
  customInput: {
    flex: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 14,
  },
  addCustomButton: {
    backgroundColor: BRAND_BLUE,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  addCustomButtonDisabled: { opacity: 0.5 },
  addCustomButtonText: { color: '#ffffff', fontWeight: '600' },
});
