import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar } from 'react-native-calendars';
import { router, useLocalSearchParams } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { VenueSearch, type VenueResult } from '@/components/venue-search';
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
  const { date: initialDate } = useLocalSearchParams<{ date?: string }>();
  const { authedFetch } = useAuth();
  const theme = useTheme();

  const [type, setType] = useState<EventTypeStr>('SHOW');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState<string | null>(initialDate ?? null);
  const [venue, setVenue] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [venueAddress, setVenueAddress] = useState<string | null>(null);
  const [venueCoords, setVenueCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onVenueChange(text: string) {
    setVenue(text);
    // Free-typing after picking a suggestion means the address/coords no
    // longer necessarily match — drop them rather than save stale ones.
    setVenueAddress(null);
    setVenueCoords(null);
  }

  function onVenueSelect(result: VenueResult) {
    setVenue(result.name);
    setVenueAddress(result.address || null);
    setVenueCoords(result.lat != null && result.lng != null ? { lat: result.lat, lng: result.lng } : null);
    if (result.city) setCity(result.city);
    if (result.state) setState(result.state);
  }

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
        venueAddress: venueAddress || undefined,
        venueLat: venueCoords?.lat,
        venueLng: venueCoords?.lng,
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
            current={date ?? undefined}
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

          <VenueSearch value={venue} onValueChange={onVenueChange} onSelect={onVenueSelect} />
          {venueAddress && (
            <ThemedText type="small" themeColor="textSecondary" style={styles.addressText}>
              📍 {venueAddress}
            </ThemedText>
          )}

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
  addressText: { marginTop: -Spacing.two },
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
