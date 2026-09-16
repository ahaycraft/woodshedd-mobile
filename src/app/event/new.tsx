import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar } from 'react-native-calendars';
import { router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/hooks/use-theme';
import type { EventTypeStr } from '@/types/api';

const TYPES: EventTypeStr[] = ['SHOW', 'PRACTICE', 'RECORDING'];
const TYPE_LABEL: Record<EventTypeStr, string> = {
  SHOW: 'Show',
  PRACTICE: 'Practice',
  RECORDING: 'Recording',
};
const BRAND_BLUE = '#208AEF';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function NewEventScreen() {
  const { authedFetch } = useAuth();
  const theme = useTheme();

  const [type, setType] = useState<EventTypeStr>('SHOW');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState<string | null>(null);
  const [venue, setVenue] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!title.trim() || !date) return;
    setSaving(true);
    setError(null);
    const res = await authedFetch('/api/shows', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type,
        title: title.trim(),
        date,
        venue: venue.trim() || undefined,
        city: city.trim() || undefined,
        state: state.trim() || undefined,
        notes: notes.trim() || undefined,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error || "Couldn't save");
      return;
    }
    const created = await res.json();
    router.replace(`/event/${created.id}`);
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.chipRow}>
            {TYPES.map((t) => (
              <Pressable key={t} onPress={() => setType(t)}>
                <View style={[styles.typeChip, t === type && styles.typeChipActive]}>
                  <ThemedText type="small" themeColor={t === type ? 'text' : 'textSecondary'}>
                    {TYPE_LABEL[t]}
                  </ThemedText>
                </View>
              </Pressable>
            ))}
          </View>

          <TextInput
            style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text }]}
            placeholder="Title"
            placeholderTextColor={theme.textSecondary}
            value={title}
            onChangeText={setTitle}
          />

          <Calendar
            minDate={todayStr()}
            onDayPress={(day) => setDate(day.dateString)}
            markedDates={date ? { [date]: { selected: true, selectedColor: BRAND_BLUE } } : {}}
            theme={{
              calendarBackground: theme.backgroundElement,
              dayTextColor: theme.text,
              monthTextColor: theme.text,
              textSectionTitleColor: theme.textSecondary,
              textDisabledColor: theme.textSecondary,
              arrowColor: theme.text,
            }}
          />

          <TextInput
            style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text }]}
            placeholder="Venue"
            placeholderTextColor={theme.textSecondary}
            value={venue}
            onChangeText={setVenue}
          />
          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.flex1, { backgroundColor: theme.backgroundElement, color: theme.text }]}
              placeholder="City"
              placeholderTextColor={theme.textSecondary}
              value={city}
              onChangeText={setCity}
            />
            <TextInput
              style={[styles.input, styles.flex1, { backgroundColor: theme.backgroundElement, color: theme.text }]}
              placeholder="State"
              placeholderTextColor={theme.textSecondary}
              value={state}
              onChangeText={setState}
            />
          </View>
          <TextInput
            style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text }]}
            placeholder="Notes"
            placeholderTextColor={theme.textSecondary}
            value={notes}
            onChangeText={setNotes}
            multiline
          />

          {error && <ThemedText style={styles.error}>{error}</ThemedText>}

          <Pressable
            disabled={saving || !title.trim() || !date}
            onPress={save}
            style={[styles.saveButton, (saving || !title.trim() || !date) && styles.saveButtonDisabled]}>
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
  chipRow: { flexDirection: 'row', gap: Spacing.two },
  typeChip: {
    borderRadius: Spacing.four,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    backgroundColor: 'rgba(128,128,128,0.2)',
  },
  typeChipActive: { backgroundColor: BRAND_BLUE },
  input: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 15,
  },
  row: { flexDirection: 'row', gap: Spacing.two },
  flex1: { flex: 1 },
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
