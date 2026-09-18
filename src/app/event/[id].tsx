import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Calendar } from 'react-native-calendars';
// The package root now points at expo-calendar's newer object-oriented API
// (calendar-read-based); createEventInCalendarAsync — the systemProvidedUI
// dialog that needs no calendar-read permission — only lives in /legacy.
import * as ExpoCalendar from 'expo-calendar/legacy';
import * as MailComposer from 'expo-mail-composer';
import { SymbolView } from 'expo-symbols';

import { DeleteButton } from '@/components/delete-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { VenueMap, openMapsSearch } from '@/components/venue-map';
import { VenueSearch, type VenueResult } from '@/components/venue-search';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useThemePreference } from '@/contexts/theme-preference-context';
import { useTheme } from '@/hooks/use-theme';
import { showToCalendarEvent } from '@/lib/calendar';
import { buildItineraryMessage } from '@/lib/itinerary';
import type {
  AvailabilityStatus,
  BandDetail,
  EventTypeStr,
  HotelResponsibility,
  SetlistSong,
  SetlistSummary,
  ShowDetail,
} from '@/types/api';

const CAN_MANAGE_ROLES = ['OWNER', 'ADMIN', 'MANAGER', 'TOUR_MANAGER', 'BOOKING_AGENT'];
const statusColors: Record<string, string> = {
  CONFIRMED: '#4d7c63',
  PENDING: '#5b6f99',
  CANCELLED: '#a05a52',
};
const typeLabel: Record<string, string> = { RECORDING: 'Recording', PRACTICE: 'Practice' };
const EDIT_TYPES: EventTypeStr[] = ['SHOW', 'PRACTICE', 'RECORDING'];
const EDIT_TYPE_LABEL: Record<EventTypeStr, string> = {
  SHOW: 'Show',
  PRACTICE: 'Practice',
  RECORDING: 'Recording',
};
const AVAILABLE_COLOR = '#4d7c63';
const UNAVAILABLE_COLOR = '#a05a52';
const CONFIRMED_COLOR = '#4d7c63';
const CANCELLED_COLOR = '#a05a52';
const EVENT_NOUN: Record<EventTypeStr, string> = {
  SHOW: 'show',
  RECORDING: 'session',
  PRACTICE: 'practice',
};
const BRAND_BLUE = '#208AEF';

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function moveSong(songs: SetlistSong[], index: number, direction: -1 | 1): SetlistSong[] {
  const target = index + direction;
  if (target < 0 || target >= songs.length) return songs;
  const next = [...songs];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export default function EventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { authedFetch, userId, role, activeBandId } = useAuth();
  const theme = useTheme();
  const { colorScheme } = useThemePreference();

  const [show, setShow] = useState<ShowDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState(false);
  // Whether the Available/Can't make it chooser is open — an already
  // -answered show shows a single status line instead (see below), so a
  // stray tap can't silently flip an existing answer.
  const [editingAvailability, setEditingAvailability] = useState(false);

  const [editing, setEditing] = useState(false);
  const [editType, setEditType] = useState<EventTypeStr>('SHOW');
  const [editTitle, setEditTitle] = useState('');
  const [editDate, setEditDate] = useState<string | null>(null);
  const [editVenue, setEditVenue] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editState, setEditState] = useState('');
  const [editVenueAddress, setEditVenueAddress] = useState<string | null>(null);
  const [editVenueCoords, setEditVenueCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [editVenueContactName, setEditVenueContactName] = useState('');
  const [editVenueContactEmail, setEditVenueContactEmail] = useState('');
  const [editHotelResponsibility, setEditHotelResponsibility] = useState<HotelResponsibility | ''>('');
  const [editHotelName, setEditHotelName] = useState('');
  const [editHotelAddress, setEditHotelAddress] = useState<string | null>(null);
  const [editHotelCoords, setEditHotelCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [editHotelNotes, setEditHotelNotes] = useState('');
  const [emailingRider, setEmailingRider] = useState(false);
  const [riderError, setRiderError] = useState<string | null>(null);
  const [addingGuests, setAddingGuests] = useState(false);
  const [guestNames, setGuestNames] = useState('');
  const [savingGuests, setSavingGuests] = useState(false);
  const [guestError, setGuestError] = useState<string | null>(null);
  const [setlistTemplates, setSetlistTemplates] = useState<SetlistSummary[]>([]);
  const [newSongTitle, setNewSongTitle] = useState('');
  const [addingSong, setAddingSong] = useState(false);
  const [pickingTemplate, setPickingTemplate] = useState(false);
  const [pendingTemplate, setPendingTemplate] = useState<SetlistSummary | null>(null);
  const [applyingTemplate, setApplyingTemplate] = useState(false);
  const [pickingDate, setPickingDate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [confirmingAnyway, setConfirmingAnyway] = useState(false);
  // A confirmed show reads as one settled line (mirroring My Availability
  // above) instead of exposing Mark Pending/Cancel Show as standing
  // buttons — changing a confirmed show takes a deliberate Edit tap first.
  const [editingStatus, setEditingStatus] = useState(false);

  function onVenueChange(text: string) {
    setEditVenue(text);
    setEditVenueAddress(null);
    setEditVenueCoords(null);
  }

  function onVenueSelect(result: VenueResult) {
    setEditVenue(result.name);
    setEditVenueAddress(result.address || null);
    setEditVenueCoords(
      result.lat != null && result.lng != null ? { lat: result.lat, lng: result.lng } : null
    );
    if (result.city) setEditCity(result.city);
    if (result.state) setEditState(result.state);
  }

  function onHotelChange(text: string) {
    setEditHotelName(text);
    setEditHotelAddress(null);
    setEditHotelCoords(null);
  }

  function onHotelSelect(result: VenueResult) {
    setEditHotelName(result.name);
    setEditHotelAddress(result.address || null);
    setEditHotelCoords(
      result.lat != null && result.lng != null ? { lat: result.lat, lng: result.lng } : null
    );
  }

  const load = useCallback(async () => {
    const res = await authedFetch(`/api/shows/${id}`);
    if (res.ok) setShow(await res.json());
    setLoading(false);
  }, [authedFetch, id]);

  useEffect(() => {
    Promise.resolve().then(load);
  }, [load]);

  useEffect(() => {
    if (!activeBandId) return;
    Promise.resolve().then(async () => {
      const res = await authedFetch(`/api/bands/${activeBandId}/setlists`);
      if (res.ok) setSetlistTemplates(await res.json());
    });
  }, [authedFetch, activeBandId]);

  function startEditing(current: ShowDetail) {
    setEditType(current.type);
    setEditTitle(current.title);
    setEditDate(current.date.slice(0, 10));
    setEditVenue(current.venue ?? '');
    setEditCity(current.city ?? '');
    setEditState(current.state ?? '');
    setEditVenueAddress(current.venueAddress ?? null);
    setEditVenueCoords(null);
    setEditNotes(current.notes ?? '');
    setEditVenueContactName(current.venueContactName ?? '');
    setEditVenueContactEmail(current.venueContactEmail ?? '');
    setEditHotelResponsibility(current.hotelResponsibility ?? '');
    setEditHotelName(current.hotelName ?? '');
    setEditHotelAddress(current.hotelAddress ?? null);
    setEditHotelCoords(null);
    setEditHotelNotes(current.hotelNotes ?? '');
    setPickingDate(false);
    setSaveError(null);
    setEditing(true);
  }

  async function saveEdits() {
    if (!editTitle.trim() || !editDate) return;
    setSaving(true);
    setSaveError(null);
    const res = await authedFetch(`/api/shows/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: editType,
        title: editTitle.trim(),
        date: editDate,
        venue: editVenue.trim() || null,
        city: editCity.trim() || null,
        state: editState.trim() || null,
        venueAddress: editVenueAddress,
        venueLat: editVenueCoords?.lat,
        venueLng: editVenueCoords?.lng,
        notes: editNotes.trim() || null,
        ...(editType === 'SHOW' && {
          venueContactName: editVenueContactName.trim() || null,
          venueContactEmail: editVenueContactEmail.trim() || null,
          hotelResponsibility: editHotelResponsibility || null,
          hotelName: editHotelName.trim() || null,
          hotelAddress: editHotelAddress,
          hotelLat: editHotelCoords?.lat,
          hotelLng: editHotelCoords?.lng,
          hotelNotes: editHotelNotes.trim() || null,
        }),
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setSaveError(body.error || "Couldn't save");
      return;
    }
    await load();
    setEditing(false);
  }

  async function deleteEvent() {
    const res = await authedFetch(`/api/shows/${id}`, { method: 'DELETE' });
    if (res.ok) router.back();
  }

  // sms: URIs pre-fill the message body differently by platform — iOS wants
  // `&body=`, Android wants `?body=`. Mirrors the web app's own
  // TextItineraryButton (there it reads navigator.userAgent instead).
  //
  // itineraryPhones defaults to [] since it's undefined against a backend
  // that predates it (e.g. still on production without this endpoint change
  // deployed) — the button just goes inert rather than crashing the screen.
  const itineraryPhones = show?.itineraryPhones ?? [];

  function textItinerary() {
    if (!show || itineraryPhones.length === 0) return;
    const message = buildItineraryMessage(show);
    const separator = Platform.OS === 'ios' ? '&' : '?';
    Linking.openURL(`sms:${itineraryPhones.join(',')}${separator}body=${encodeURIComponent(message)}`);
  }

  // Launches the OS's own "Add Event" UI pre-filled with the show's details
  // — the user still taps Save themselves, so this needs no calendar-read
  // permission and never touches the web app's (cookie-authenticated) .ics
  // endpoint, which a mobile Bearer-token session can't reach directly.
  async function addToCalendar() {
    if (!show) return;
    try {
      await ExpoCalendar.createEventInCalendarAsync(showToCalendarEvent(show));
    } catch {
      // Best-effort — the user cancelled, or the OS declined.
    }
  }

  // Opens the device's mail composer pre-filled with the band's rider as the
  // body — no server-side sending, so this is just local data assembly. The
  // rider lives on the band (not the show), so it's fetched fresh here
  // rather than kept in ShowDetail.
  async function emailRider() {
    if (!show?.venueContactEmail || !activeBandId) return;
    setRiderError(null);
    setEmailingRider(true);
    try {
      const available = await MailComposer.isAvailableAsync();
      if (!available) {
        setRiderError("Mail isn't set up on this device.");
        return;
      }
      const res = await authedFetch(`/api/bands/${activeBandId}`);
      if (!res.ok) {
        setRiderError("Couldn't load the band's rider.");
        return;
      }
      const band: BandDetail = await res.json();
      if (!band.rider) {
        setRiderError('No rider set yet — add one from the Account screen.');
        return;
      }
      const body = show.guestList ? `${band.rider}\n\nGuest List:\n${show.guestList}` : band.rider;
      await MailComposer.composeAsync({
        recipients: [show.venueContactEmail],
        subject: `${band.name} — Rider for ${show.title}`,
        body,
      });
    } finally {
      setEmailingRider(false);
    }
  }

  async function saveGuests() {
    if (!guestNames.trim()) return;
    setSavingGuests(true);
    setGuestError(null);
    const res = await authedFetch(`/api/shows/${id}/guests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ names: guestNames }),
    });
    setSavingGuests(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setGuestError(body.error || "Couldn't save");
      return;
    }
    setGuestNames('');
    setAddingGuests(false);
    await load();
  }

  function cancelAddGuests() {
    setAddingGuests(false);
    setGuestNames('');
    setGuestError(null);
  }

  async function addSong() {
    if (!newSongTitle.trim()) return;
    setAddingSong(true);
    const res = await authedFetch(`/api/shows/${id}/setlist/songs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newSongTitle }),
    });
    setAddingSong(false);
    if (res.ok) {
      const song = await res.json();
      setShow((prev) =>
        prev
          ? {
              ...prev,
              setlist: prev.setlist
                ? { ...prev.setlist, songs: [...prev.setlist.songs, song] }
                : { sourceSetlistName: null, songs: [song] },
            }
          : prev
      );
      setNewSongTitle('');
    }
  }

  async function removeSong(songId: string) {
    setShow((prev) =>
      prev && prev.setlist
        ? { ...prev, setlist: { ...prev.setlist, songs: prev.setlist.songs.filter((s) => s.id !== songId) } }
        : prev
    );
    await authedFetch(`/api/shows/${id}/setlist/songs/${songId}`, { method: 'DELETE' });
  }

  function reorderSong(index: number, direction: -1 | 1) {
    if (!show?.setlist) return;
    const next = moveSong(show.setlist.songs, index, direction);
    setShow((prev) => (prev && prev.setlist ? { ...prev, setlist: { ...prev.setlist, songs: next } } : prev));
    void authedFetch(`/api/shows/${id}/setlist/songs`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ songIds: next.map((s) => s.id) }),
    });
  }

  function onSelectTemplate(template: SetlistSummary) {
    setPickingTemplate(false);
    if (show?.setlist && show.setlist.songs.length > 0) {
      setPendingTemplate(template);
    } else {
      void applyTemplate(template.id);
    }
  }

  async function applyTemplate(setlistId: string) {
    setApplyingTemplate(true);
    const res = await authedFetch(`/api/shows/${id}/setlist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ setlistId }),
    });
    setApplyingTemplate(false);
    setPendingTemplate(null);
    if (res.ok) {
      const data = await res.json();
      setShow((prev) =>
        prev ? { ...prev, setlist: { sourceSetlistName: data.sourceSetlistName, songs: data.songs } } : prev
      );
    }
  }

  async function clearSetlist() {
    setShow((prev) => (prev ? { ...prev, setlist: null } : prev));
    await authedFetch(`/api/shows/${id}/setlist`, { method: 'DELETE' });
  }

  function getHotelDirections() {
    if (!show?.hotelName) return;
    openMapsSearch(
      show.hotelName,
      show.hotelLat != null && show.hotelLng != null
        ? { lat: show.hotelLat, lng: show.hotelLng }
        : undefined
    );
  }

  async function updateStatus(status: ShowDetail['status']) {
    setStatusUpdating(true);
    setConfirmingAnyway(false);
    const res = await authedFetch(`/api/shows/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (res.ok) await load();
    setStatusUpdating(false);
    setEditingStatus(false);
  }

  async function respond(status: AvailabilityStatus) {
    setResponding(true);
    const res = await authedFetch(`/api/shows/${id}/availability`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      const updated = await res.json();
      setShow((prev) =>
        prev && userId
          ? { ...prev, availability: [...prev.availability.filter((a) => a.userId !== userId), updated] }
          : prev
      );
    }
    setResponding(false);
    setEditingAvailability(false);
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

  if (!show) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={[styles.safeArea, styles.centered]} edges={['bottom', 'left', 'right']}>
          <ThemedText themeColor="textSecondary">Event not found.</ThemedText>
        </SafeAreaView>
      </ThemedView>
    );
  }

  const isRecording = show.type === 'RECORDING';
  const location = [show.venue, show.city, show.state, show.venue || show.city ? show.country : null]
    .filter(Boolean)
    .join(', ');

  const timeline = [
    show.loadInTime && { label: isRecording ? 'Call' : 'Load in', time: show.loadInTime },
    show.doorsTime && { label: 'Doors', time: show.doorsTime },
    show.setTime && { label: isRecording ? 'Wrap' : 'Set', time: show.setTime },
  ].filter((s): s is { label: string; time: string } => !!s);

  const mine = userId ? show.availability.find((a) => a.userId === userId) : undefined;
  const myStatus = mine?.status ?? 'PENDING';
  const available = show.availability.filter((a) => a.status === 'AVAILABLE');
  const unavailable = show.availability.filter((a) => a.status === 'UNAVAILABLE');
  const pending = show.availability.filter((a) => a.status === 'PENDING');
  const canManageEvent = show.createdBy.id === userId || (!!role && CAN_MANAGE_ROLES.includes(role));
  const everyoneAvailable = show.memberCount > 0 && available.length >= show.memberCount;
  const eventNoun = EVENT_NOUN[show.type];
  const Noun = eventNoun[0].toUpperCase() + eventNoun.slice(1);
  const hasLodging = !!(show.hotelResponsibility || show.hotelName || show.hotelNotes);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {editing ? (
            <ThemedView type="backgroundElement" style={styles.section}>
              <ThemedText type="small" themeColor="textSecondary">
                Type
              </ThemedText>
              <View style={styles.chipRow}>
                {EDIT_TYPES.map((t) => (
                  <Pressable key={t} onPress={() => setEditType(t)}>
                    <View style={[styles.editChip, t === editType && styles.editChipActive]}>
                      <ThemedText type="small" themeColor={t === editType ? 'text' : 'textSecondary'}>
                        {EDIT_TYPE_LABEL[t]}
                      </ThemedText>
                    </View>
                  </Pressable>
                ))}
              </View>

              <ThemedText type="small" themeColor="textSecondary">
                Title
              </ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: theme.backgroundSelected, color: theme.text }]}
                value={editTitle}
                onChangeText={setEditTitle}
              />

              <View style={styles.targetDateRow}>
                <ThemedText type="small" themeColor="textSecondary">
                  Date: {editDate ? formatDate(editDate) : 'None'}
                </ThemedText>
                <Pressable onPress={() => setPickingDate((p) => !p)}>
                  <ThemedText style={styles.linkText}>{pickingDate ? 'Close' : 'Change'}</ThemedText>
                </Pressable>
              </View>
              {pickingDate && (
                <Calendar
                  key={colorScheme}
                  onDayPress={(day) => {
                    setEditDate(day.dateString);
                    setPickingDate(false);
                  }}
                  markedDates={editDate ? { [editDate]: { selected: true, selectedColor: BRAND_BLUE } } : {}}
                  theme={{
                    calendarBackground: theme.backgroundSelected,
                    dayTextColor: theme.text,
                    monthTextColor: theme.text,
                    textSectionTitleColor: theme.textSecondary,
                    textDisabledColor: theme.textSecondary,
                    arrowColor: theme.text,
                  }}
                />
              )}

              <VenueSearch
                value={editVenue}
                onValueChange={onVenueChange}
                onSelect={onVenueSelect}
                surface="backgroundSelected"
              />
              {editVenueAddress && (
                <ThemedText type="small" themeColor="textSecondary" style={styles.addressText}>
                  📍 {editVenueAddress}
                </ThemedText>
              )}
              <View style={styles.editRow}>
                <TextInput
                  style={[styles.input, styles.flex1, { backgroundColor: theme.backgroundSelected, color: theme.text }]}
                  placeholder="City"
                  placeholderTextColor={theme.textSecondary}
                  value={editCity}
                  onChangeText={setEditCity}
                />
                <TextInput
                  style={[styles.input, styles.flex1, { backgroundColor: theme.backgroundSelected, color: theme.text }]}
                  placeholder="State"
                  placeholderTextColor={theme.textSecondary}
                  value={editState}
                  onChangeText={setEditState}
                />
              </View>
              <TextInput
                style={[styles.input, { backgroundColor: theme.backgroundSelected, color: theme.text }]}
                placeholder="Notes"
                placeholderTextColor={theme.textSecondary}
                value={editNotes}
                onChangeText={setEditNotes}
                multiline
              />

              {editType === 'SHOW' && (
                <View style={styles.editRow}>
                  <TextInput
                    style={[styles.input, styles.flex1, { backgroundColor: theme.backgroundSelected, color: theme.text }]}
                    placeholder="Promoter/venue contact"
                    placeholderTextColor={theme.textSecondary}
                    value={editVenueContactName}
                    onChangeText={setEditVenueContactName}
                  />
                  <TextInput
                    style={[styles.input, styles.flex1, { backgroundColor: theme.backgroundSelected, color: theme.text }]}
                    placeholder="Contact email"
                    placeholderTextColor={theme.textSecondary}
                    value={editVenueContactEmail}
                    onChangeText={setEditVenueContactEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              )}

              {editType === 'SHOW' && (
                <>
                  <ThemedText type="small" themeColor="textSecondary">
                    Lodging
                  </ThemedText>
                  <View style={styles.chipRow}>
                    {(
                      [
                        { value: '' as const, label: 'Not set' },
                        { value: 'PROMOTER' as const, label: 'Promoter provides' },
                        { value: 'BAND' as const, label: 'Band arranges' },
                      ]
                    ).map(({ value, label }) => (
                      <Pressable key={value || 'unset'} onPress={() => setEditHotelResponsibility(value)}>
                        <View style={[styles.editChip, editHotelResponsibility === value && styles.editChipActive]}>
                          <ThemedText
                            type="small"
                            themeColor={editHotelResponsibility === value ? 'text' : 'textSecondary'}>
                            {label}
                          </ThemedText>
                        </View>
                      </Pressable>
                    ))}
                  </View>
                  <VenueSearch
                    value={editHotelName}
                    onValueChange={onHotelChange}
                    onSelect={onHotelSelect}
                    placeholder="Search hotels…"
                    surface="backgroundSelected"
                  />
                  {editHotelAddress && (
                    <ThemedText type="small" themeColor="textSecondary" style={styles.addressText}>
                      📍 {editHotelAddress}
                    </ThemedText>
                  )}
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.backgroundSelected, color: theme.text }]}
                    placeholder="Confirmation #, check-in notes, etc."
                    placeholderTextColor={theme.textSecondary}
                    value={editHotelNotes}
                    onChangeText={setEditHotelNotes}
                    multiline
                  />
                </>
              )}

              {saveError && <ThemedText style={styles.error}>{saveError}</ThemedText>}

              <View style={styles.formButtons}>
                <Pressable onPress={() => setEditing(false)} style={styles.cancelButton}>
                  <ThemedText>Cancel</ThemedText>
                </Pressable>
                <Pressable
                  disabled={saving || !editTitle.trim() || !editDate}
                  onPress={saveEdits}
                  style={[
                    styles.saveButton,
                    (saving || !editTitle.trim() || !editDate) && styles.saveButtonDisabled,
                  ]}>
                  <ThemedText style={styles.saveButtonText}>{saving ? 'Saving…' : 'Save'}</ThemedText>
                </Pressable>
              </View>
            </ThemedView>
          ) : (
            <View style={styles.header}>
              <View style={styles.titleRow}>
                <ThemedText type="subtitle" style={styles.title}>
                  {show.title}
                </ThemedText>
                {canManageEvent && (
                  <View style={styles.headerActions}>
                    <Pressable onPress={() => startEditing(show)}>
                      <ThemedText style={styles.linkText}>Edit</ThemedText>
                    </Pressable>
                    <DeleteButton confirmLabel={`Delete "${show.title}"?`} onConfirm={deleteEvent} />
                  </View>
                )}
              </View>
              <View style={styles.statusRow}>
                <View style={[styles.statusDot, { backgroundColor: statusColors[show.status] }]} />
                <ThemedText type="small" themeColor="textSecondary">
                  {show.status === 'CONFIRMED' ? 'Confirmed' : show.status === 'CANCELLED' ? 'Cancelled' : 'Pending'}
                  {typeLabel[show.type] ? ` · ${typeLabel[show.type]}` : ''}
                </ThemedText>
              </View>
              <ThemedText style={styles.date}>{formatDate(show.date)}</ThemedText>
              {location && <ThemedText themeColor="textSecondary">{location}</ThemedText>}
              {show.venueAddress && (
                <ThemedText type="small" themeColor="textSecondary">
                  {show.venueAddress}
                </ThemedText>
              )}
              {show.release && (
                <ThemedText type="small" themeColor="textSecondary">
                  Tracking for {show.release.title}
                </ThemedText>
              )}
            </View>
          )}

          {!editing && (
            <View style={styles.quickActions}>
              <Pressable
                onPress={textItinerary}
                disabled={itineraryPhones.length === 0}
                style={[styles.quickActionButton, itineraryPhones.length === 0 && styles.quickActionDisabled]}>
                <SymbolView name={{ ios: 'message', android: 'sms', web: 'sms' }} size={14} tintColor={theme.text} />
                <ThemedText type="small">Text itinerary</ThemedText>
              </Pressable>
              <Pressable onPress={addToCalendar} style={styles.quickActionButton}>
                <SymbolView
                  name={{ ios: 'calendar.badge.plus', android: 'calendar_add_on', web: 'calendar_add_on' }}
                  size={14}
                  tintColor={theme.text}
                />
                <ThemedText type="small">Add to calendar</ThemedText>
              </Pressable>
              {show.venueContactEmail && (
                <Pressable
                  onPress={emailRider}
                  disabled={emailingRider}
                  style={[styles.quickActionButton, emailingRider && styles.quickActionDisabled]}>
                  <SymbolView name={{ ios: 'envelope', android: 'mail', web: 'mail' }} size={14} tintColor={theme.text} />
                  <ThemedText type="small">Email rider to promoter</ThemedText>
                </Pressable>
              )}
            </View>
          )}

          {!editing && riderError && <ThemedText style={styles.error}>{riderError}</ThemedText>}

          {!editing && timeline.length > 0 && (
            <ThemedView type="backgroundElement" style={styles.section}>
              {timeline.map((step) => (
                <View key={step.label} style={styles.timelineRow}>
                  <ThemedText style={styles.timelineLabel}>{step.label}</ThemedText>
                  <ThemedText themeColor="textSecondary">{formatTime(step.time)}</ThemedText>
                </View>
              ))}
            </ThemedView>
          )}

          {!editing && (show.venue || show.city) && (
            <VenueMap
              lat={show.venueLat}
              lng={show.venueLng}
              label={show.venue || show.city || show.title}
              address={show.venueAddress}
            />
          )}

          {!editing && (show.guarantee || show.notes) && (
            <ThemedView type="backgroundElement" style={styles.section}>
              {show.guarantee != null && (
                <ThemedText>${show.guarantee.toFixed(0)} guarantee</ThemedText>
              )}
              {show.notes && <ThemedText>{show.notes}</ThemedText>}
            </ThemedView>
          )}

          {!editing && hasLodging && (
            <ThemedView type="backgroundElement" style={styles.section}>
              <View style={styles.lodgingTitleRow}>
                <SymbolView
                  name={{ ios: 'bed.double.fill', android: 'hotel', web: 'hotel' }}
                  size={16}
                  tintColor={theme.text}
                />
                <ThemedText type="smallBold">Lodging</ThemedText>
              </View>
              {show.hotelResponsibility && (
                <ThemedText type="small" themeColor="textSecondary">
                  {show.hotelResponsibility === 'PROMOTER' ? 'Promoter provides' : 'Band arranges'}
                </ThemedText>
              )}
              {show.hotelName && <ThemedText>{show.hotelName}</ThemedText>}
              {show.hotelAddress && (
                <ThemedText type="small" themeColor="textSecondary">
                  {show.hotelAddress}
                </ThemedText>
              )}
              {show.hotelName && (
                <Pressable onPress={getHotelDirections} hitSlop={8}>
                  <ThemedText type="small" style={styles.linkText}>
                    Get directions ↗
                  </ThemedText>
                </Pressable>
              )}
              {show.hotelNotes && <ThemedText>{show.hotelNotes}</ThemedText>}
            </ThemedView>
          )}

          <ThemedView type="backgroundElement" style={styles.section}>
            <ThemedText type="smallBold">My Availability</ThemedText>
            {myStatus === 'PENDING' || editingAvailability ? (
              <View style={styles.respondButtons}>
                <Pressable
                  disabled={responding}
                  onPress={() => respond('AVAILABLE')}
                  style={[styles.respondButton, myStatus === 'AVAILABLE' && styles.availableActive]}>
                  <ThemedText
                    style={[styles.respondText, myStatus === 'AVAILABLE' && styles.respondTextActive]}>
                    Available
                  </ThemedText>
                </Pressable>
                <Pressable
                  disabled={responding}
                  onPress={() => respond('UNAVAILABLE')}
                  style={[styles.respondButton, myStatus === 'UNAVAILABLE' && styles.unavailableActive]}>
                  <ThemedText
                    style={[styles.respondText, myStatus === 'UNAVAILABLE' && styles.respondTextActive]}>
                    Can&apos;t make it
                  </ThemedText>
                </Pressable>
              </View>
            ) : (
              // A settled answer reads as one unambiguous line rather than
              // "which of these two buttons is greener" — and changing it
              // takes a deliberate second tap (Edit, then a choice) instead
              // of one stray tap silently flipping an existing response.
              <View style={styles.availabilityStatusRow}>
                <ThemedText
                  style={[
                    styles.availabilityStatusText,
                    { color: myStatus === 'AVAILABLE' ? AVAILABLE_COLOR : UNAVAILABLE_COLOR },
                  ]}>
                  {myStatus === 'AVAILABLE' ? '✓ Available' : "Can't make it"}
                </ThemedText>
                <Pressable onPress={() => setEditingAvailability(true)} hitSlop={8}>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.editLink}>
                    Edit
                  </ThemedText>
                </Pressable>
              </View>
            )}
          </ThemedView>

          <ThemedView type="backgroundElement" style={styles.section}>
            <ThemedText type="smallBold">
              Group Availability · {available.length} available
            </ThemedText>
            {show.availability.length === 0 ? (
              <ThemedText type="small" themeColor="textSecondary">
                No responses yet.
              </ThemedText>
            ) : (
              <>
                {available.length > 0 && (
                  <View style={styles.memberGroup}>
                    <ThemedText type="small" themeColor="textSecondary" style={styles.memberGroupLabel}>
                      AVAILABLE
                    </ThemedText>
                    {available.map((a) => (
                      <ThemedText key={a.id}>{a.user.name ?? 'Someone'}</ThemedText>
                    ))}
                  </View>
                )}
                {unavailable.length > 0 && (
                  <View style={styles.memberGroup}>
                    <ThemedText type="small" themeColor="textSecondary" style={styles.memberGroupLabel}>
                      UNAVAILABLE
                    </ThemedText>
                    {unavailable.map((a) => (
                      <ThemedText key={a.id}>{a.user.name ?? 'Someone'}</ThemedText>
                    ))}
                  </View>
                )}
                {pending.length > 0 && (
                  <View style={styles.memberGroup}>
                    <ThemedText type="small" themeColor="textSecondary" style={styles.memberGroupLabel}>
                      NO RESPONSE
                    </ThemedText>
                    {pending.map((a) => (
                      <ThemedText key={a.id} themeColor="textSecondary">
                        {a.user.name ?? 'Someone'}
                      </ThemedText>
                    ))}
                  </View>
                )}
              </>
            )}
          </ThemedView>

          {!editing && (
            <ThemedView type="backgroundElement" style={styles.section}>
              <View style={styles.statusControlsHeader}>
                <ThemedText type="smallBold">Guest List</ThemedText>
                {!addingGuests && (
                  <Pressable onPress={() => setAddingGuests(true)}>
                    <ThemedText type="small" style={styles.linkText}>
                      Add guests
                    </ThemedText>
                  </Pressable>
                )}
              </View>

              {show.guestList ? (
                <ThemedText>{show.guestList}</ThemedText>
              ) : (
                !addingGuests && (
                  <ThemedText type="small" themeColor="textSecondary">
                    No guests added yet.
                  </ThemedText>
                )
              )}

              {addingGuests && (
                <>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.backgroundSelected, color: theme.text }]}
                    placeholder={'One name per line, e.g.\nJane Smith\nJohn Doe'}
                    placeholderTextColor={theme.textSecondary}
                    value={guestNames}
                    onChangeText={setGuestNames}
                    multiline
                  />
                  {guestError && <ThemedText style={styles.error}>{guestError}</ThemedText>}
                  <View style={styles.formButtons}>
                    <Pressable onPress={cancelAddGuests} style={styles.cancelButton}>
                      <ThemedText>Cancel</ThemedText>
                    </Pressable>
                    <Pressable
                      disabled={savingGuests || !guestNames.trim()}
                      onPress={saveGuests}
                      style={[styles.saveButton, (savingGuests || !guestNames.trim()) && styles.saveButtonDisabled]}>
                      <ThemedText style={styles.saveButtonText}>{savingGuests ? 'Adding…' : 'Add'}</ThemedText>
                    </Pressable>
                  </View>
                </>
              )}
            </ThemedView>
          )}

          {!editing && (
            <ThemedView type="backgroundElement" style={styles.section}>
              <View style={styles.statusControlsHeader}>
                <ThemedText type="smallBold">Setlist</ThemedText>
                {show.setlist?.sourceSetlistName && (
                  <ThemedText type="small" themeColor="textSecondary">
                    From: {show.setlist.sourceSetlistName}
                  </ThemedText>
                )}
              </View>

              {setlistTemplates.length > 0 && (
                <>
                  <Pressable onPress={() => setPickingTemplate((p) => !p)}>
                    <View style={[styles.input, { backgroundColor: theme.backgroundSelected }]}>
                      <ThemedText themeColor="textSecondary">
                        {show.setlist && show.setlist.songs.length > 0
                          ? 'Apply a different template…'
                          : 'Apply a template…'}
                      </ThemedText>
                    </View>
                  </Pressable>
                  {pickingTemplate && (
                    <View style={[styles.pickerList, { backgroundColor: theme.backgroundSelected }]}>
                      {setlistTemplates.map((t) => (
                        <Pressable key={t.id} style={styles.pickerRow} onPress={() => onSelectTemplate(t)}>
                          <ThemedText type="small">{t.name}</ThemedText>
                        </Pressable>
                      ))}
                    </View>
                  )}
                </>
              )}

              {pendingTemplate && (
                <View style={styles.confirmAnywayBox}>
                  <ThemedText type="small" themeColor="textSecondary">
                    Apply &ldquo;{pendingTemplate.name}&rdquo;? This replaces the show&apos;s current setlist.
                  </ThemedText>
                  <View style={styles.formButtons}>
                    <Pressable onPress={() => setPendingTemplate(null)} style={styles.cancelButton}>
                      <ThemedText>Cancel</ThemedText>
                    </Pressable>
                    <Pressable
                      disabled={applyingTemplate}
                      onPress={() => applyTemplate(pendingTemplate.id)}
                      style={[styles.saveButton, applyingTemplate && styles.saveButtonDisabled]}>
                      <ThemedText style={styles.saveButtonText}>
                        {applyingTemplate ? 'Applying…' : 'Apply'}
                      </ThemedText>
                    </Pressable>
                  </View>
                </View>
              )}

              {!show.setlist || show.setlist.songs.length === 0 ? (
                <ThemedText type="small" themeColor="textSecondary">
                  No songs yet.
                </ThemedText>
              ) : (
                show.setlist.songs.map((s, i) => (
                  <View key={s.id} style={styles.songRow}>
                    <ThemedText style={styles.songTitle} numberOfLines={1}>
                      {s.title}
                    </ThemedText>
                    <View style={styles.songActions}>
                      <Pressable disabled={i === 0} onPress={() => reorderSong(i, -1)} hitSlop={8}>
                        <SymbolView
                          name={{ ios: 'chevron.up', android: 'keyboard_arrow_up', web: 'keyboard_arrow_up' }}
                          size={16}
                          tintColor={i === 0 ? theme.textSecondary : theme.text}
                        />
                      </Pressable>
                      <Pressable
                        disabled={i === show.setlist!.songs.length - 1}
                        onPress={() => reorderSong(i, 1)}
                        hitSlop={8}>
                        <SymbolView
                          name={{ ios: 'chevron.down', android: 'keyboard_arrow_down', web: 'keyboard_arrow_down' }}
                          size={16}
                          tintColor={i === show.setlist!.songs.length - 1 ? theme.textSecondary : theme.text}
                        />
                      </Pressable>
                      <Pressable onPress={() => removeSong(s.id)} hitSlop={8}>
                        <SymbolView name={{ ios: 'xmark', android: 'close', web: 'close' }} size={16} tintColor={theme.textSecondary} />
                      </Pressable>
                    </View>
                  </View>
                ))
              )}

              <View style={styles.editRow}>
                <TextInput
                  style={[styles.input, styles.flex1, { backgroundColor: theme.backgroundSelected, color: theme.text }]}
                  placeholder="Add a song…"
                  placeholderTextColor={theme.textSecondary}
                  value={newSongTitle}
                  onChangeText={setNewSongTitle}
                  onSubmitEditing={addSong}
                />
                <Pressable
                  disabled={addingSong || !newSongTitle.trim()}
                  onPress={addSong}
                  style={[styles.saveButton, (addingSong || !newSongTitle.trim()) && styles.saveButtonDisabled]}>
                  <ThemedText style={styles.saveButtonText}>{addingSong ? '…' : 'Add'}</ThemedText>
                </Pressable>
              </View>

              {show.setlist && show.setlist.songs.length > 0 && (
                <Pressable onPress={clearSetlist}>
                  <ThemedText type="small" style={styles.error}>
                    Clear setlist
                  </ThemedText>
                </Pressable>
              )}
            </ThemedView>
          )}

          {!editing && canManageEvent && (
            <ThemedView type="backgroundElement" style={styles.section}>
              <View style={styles.statusControlsHeader}>
                <ThemedText type="smallBold">Admin Actions</ThemedText>
                <ThemedText
                  type="small"
                  style={{ color: everyoneAvailable ? AVAILABLE_COLOR : UNAVAILABLE_COLOR }}>
                  {available.length} of {show.memberCount} available
                </ThemedText>
              </View>
              {show.status === 'CONFIRMED' && !editingStatus ? (
                <View style={styles.availabilityStatusRow}>
                  <ThemedText style={[styles.availabilityStatusText, { color: CONFIRMED_COLOR }]}>
                    ✓ Confirmed
                  </ThemedText>
                  <Pressable onPress={() => setEditingStatus(true)} hitSlop={8}>
                    <ThemedText type="small" themeColor="textSecondary" style={styles.editLink}>
                      Edit
                    </ThemedText>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.chipRow}>
                  {show.status !== 'CONFIRMED' && (
                    <Pressable
                      disabled={statusUpdating}
                      onPress={() => (everyoneAvailable ? updateStatus('CONFIRMED') : setConfirmingAnyway(true))}
                      style={[styles.statusActionChip, { backgroundColor: CONFIRMED_COLOR }]}>
                      <ThemedText style={styles.statusActionText}>Confirm {Noun}</ThemedText>
                    </Pressable>
                  )}
                  {show.status !== 'PENDING' && (
                    <Pressable
                      disabled={statusUpdating}
                      onPress={() => updateStatus('PENDING')}
                      style={[styles.statusActionChip, { backgroundColor: statusColors.PENDING }]}>
                      <ThemedText style={styles.statusActionText}>Mark Pending</ThemedText>
                    </Pressable>
                  )}
                  {show.status !== 'CANCELLED' && (
                    <Pressable
                      disabled={statusUpdating}
                      onPress={() => updateStatus('CANCELLED')}
                      style={[styles.statusActionChip, { backgroundColor: CANCELLED_COLOR }]}>
                      <ThemedText style={styles.statusActionText}>Cancel {Noun}</ThemedText>
                    </Pressable>
                  )}
                </View>
              )}

              {confirmingAnyway && (
                <View style={styles.confirmAnywayBox}>
                  <ThemedText type="small" themeColor="textSecondary">
                    Only {available.length} of {show.memberCount} members have marked available. You
                    can still confirm this {eventNoun}.
                  </ThemedText>
                  <View style={styles.formButtons}>
                    <Pressable onPress={() => setConfirmingAnyway(false)} style={styles.cancelButton}>
                      <ThemedText>Cancel</ThemedText>
                    </Pressable>
                    <Pressable
                      disabled={statusUpdating}
                      onPress={() => updateStatus('CONFIRMED')}
                      style={[styles.statusActionChip, { backgroundColor: CONFIRMED_COLOR }]}>
                      <ThemedText style={styles.statusActionText}>Confirm {Noun}</ThemedText>
                    </Pressable>
                  </View>
                </View>
              )}
            </ThemedView>
          )}
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
  header: { gap: Spacing.one },
  quickActions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  quickActionButton: {
    flexGrow: 1,
    flexBasis: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    borderRadius: Spacing.four,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(128,128,128,0.3)',
  },
  quickActionDisabled: { opacity: 0.4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  linkText: { color: '#3c87f7', fontWeight: '600' },
  lodgingTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  songRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two, paddingVertical: Spacing.one },
  songTitle: { flex: 1 },
  songActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  pickerList: { borderRadius: Spacing.two, overflow: 'hidden' },
  pickerRow: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.2)',
  },
  addressText: { marginTop: -Spacing.one },
  title: { fontSize: 24, lineHeight: 30 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginTop: Spacing.one },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  date: { fontWeight: '600', marginTop: Spacing.one },
  section: { borderRadius: Spacing.three, padding: Spacing.three, gap: Spacing.two },
  timelineRow: { flexDirection: 'row', justifyContent: 'space-between' },
  timelineLabel: { fontWeight: '600' },
  respondButtons: { flexDirection: 'row', gap: Spacing.two },
  respondButton: {
    flex: 1,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(128,128,128,0.3)',
  },
  availableActive: { backgroundColor: AVAILABLE_COLOR, borderColor: AVAILABLE_COLOR },
  unavailableActive: { backgroundColor: UNAVAILABLE_COLOR, borderColor: UNAVAILABLE_COLOR },
  respondText: { fontSize: 13, fontWeight: '600' },
  respondTextActive: { color: '#ffffff' },
  availabilityStatusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  availabilityStatusText: { fontSize: 13, fontWeight: '600' },
  editLink: { textDecorationLine: 'underline' },
  memberGroup: { gap: 2 },
  memberGroupLabel: { letterSpacing: 0.5, marginBottom: 2 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  editChip: {
    borderRadius: Spacing.four,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    backgroundColor: 'rgba(128,128,128,0.2)',
  },
  editChipActive: { backgroundColor: BRAND_BLUE },
  targetDateRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  editRow: { flexDirection: 'row', gap: Spacing.two },
  flex1: { flex: 1 },
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
    backgroundColor: BRAND_BLUE,
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two,
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.four,
  },
  saveButtonDisabled: { opacity: 0.5 },
  saveButtonText: { color: '#ffffff', fontWeight: '600' },
  statusControlsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  statusActionChip: {
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  statusActionText: { color: '#ffffff', fontWeight: '600', fontSize: 13 },
  confirmAnywayBox: { gap: Spacing.two, marginTop: Spacing.one },
});
