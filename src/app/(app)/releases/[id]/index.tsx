import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Calendar } from 'react-native-calendars';
import DraggableFlatList, {
  RenderItemParams,
  ScaleDecorator,
} from 'react-native-draggable-flatlist';

import { DeleteButton } from '@/components/delete-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useThemePreference } from '@/contexts/theme-preference-context';
import { useTheme } from '@/hooks/use-theme';
import { RELEASE_STATUSES, releaseKindLabel, releaseStatusColor, releaseStatusLabel } from '@/lib/releases';
import { songStatusColor, songStatusLabel } from '@/lib/songs';
import type { ReleaseDetail, ReleaseKind, ReleaseTrack } from '@/types/api';

const CAN_MANAGE_ROLES = ['OWNER', 'ADMIN'];
const RELEASE_KINDS: ReleaseKind[] = ['ALBUM', 'EP', 'SINGLE', 'GROUP'];
const BRAND_BLUE = '#208AEF';

function formatTarget(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

function formatDuration(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

export default function ReleaseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { authedFetch, userId, role } = useAuth();
  const theme = useTheme();
  const { colorScheme } = useThemePreference();

  const [release, setRelease] = useState<ReleaseDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editKind, setEditKind] = useState<ReleaseKind>('ALBUM');
  const [editStatus, setEditStatus] = useState<ReleaseDetail['status']>('PLANNING');
  const [editTargetDate, setEditTargetDate] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [pickingDate, setPickingDate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await authedFetch(`/api/releases/${id}`);
    if (res.ok) setRelease(await res.json());
    setLoading(false);
  }, [authedFetch, id]);

  // useFocusEffect (not a plain mount effect) so returning from the "Add
  // songs" picker refreshes the tracklist without a manual reload.
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  function startEditing(current: ReleaseDetail) {
    setEditTitle(current.title);
    setEditKind(current.kind);
    setEditStatus(current.status);
    setEditTargetDate(current.targetDate ? current.targetDate.slice(0, 10) : null);
    setEditNotes(current.notes ?? '');
    setPickingDate(false);
    setSaveError(null);
    setEditing(true);
  }

  async function saveEdits() {
    if (!editTitle.trim()) return;
    setSaving(true);
    setSaveError(null);
    const res = await authedFetch(`/api/releases/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: editTitle.trim(),
        kind: editKind,
        status: editStatus,
        targetDate: editTargetDate,
        notes: editNotes.trim() || null,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setSaveError(body.error || "Couldn't save");
      return;
    }
    setRelease((prev) =>
      prev
        ? {
            ...prev,
            title: editTitle.trim(),
            kind: editKind,
            status: editStatus,
            targetDate: editTargetDate,
            notes: editNotes.trim() || null,
          }
        : prev
    );
    setEditing(false);
  }

  async function deleteRelease() {
    const res = await authedFetch(`/api/releases/${id}`, { method: 'DELETE' });
    if (res.ok) router.back();
  }

  async function reorderTracks(newOrder: ReleaseTrack[]) {
    if (!release) return;
    const previous = release.tracks;
    setRelease({ ...release, tracks: newOrder });
    const res = await authedFetch(`/api/releases/${id}/tracks`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ songIds: newOrder.map((t) => t.song.id) }),
    });
    if (!res.ok) setRelease((prev) => (prev ? { ...prev, tracks: previous } : prev));
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

  if (!release) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={[styles.safeArea, styles.centered]} edges={['bottom', 'left', 'right']}>
          <ThemedText themeColor="textSecondary">Release not found.</ThemedText>
        </SafeAreaView>
      </ThemedView>
    );
  }

  const canManageRelease = release.createdById === userId || (!!role && CAN_MANAGE_ROLES.includes(role));

  const header = (
    <View style={styles.headerArea}>
      {editing ? (
        <ThemedView type="backgroundElement" style={styles.section}>
          <ThemedText type="small" themeColor="textSecondary">
            Title
          </ThemedText>
          <TextInput
            style={[styles.input, { backgroundColor: theme.backgroundSelected, color: theme.text }]}
            value={editTitle}
            onChangeText={setEditTitle}
          />

          <ThemedText type="small" themeColor="textSecondary">
            Kind
          </ThemedText>
          <View style={styles.chipRow}>
            {RELEASE_KINDS.map((kind) => (
              <Pressable key={kind} onPress={() => setEditKind(kind)}>
                <View style={[styles.editChip, kind === editKind && styles.editChipActive]}>
                  <ThemedText type="small" themeColor={kind === editKind ? 'text' : 'textSecondary'}>
                    {releaseKindLabel[kind]}
                  </ThemedText>
                </View>
              </Pressable>
            ))}
          </View>

          <ThemedText type="small" themeColor="textSecondary">
            Status
          </ThemedText>
          <View style={styles.chipRow}>
            {RELEASE_STATUSES.map((status) => (
              <Pressable key={status} onPress={() => setEditStatus(status)}>
                <View
                  style={[
                    styles.editChip,
                    status === editStatus && { backgroundColor: releaseStatusColor[status] },
                  ]}>
                  <ThemedText type="small" themeColor={status === editStatus ? 'text' : 'textSecondary'}>
                    {releaseStatusLabel[status]}
                  </ThemedText>
                </View>
              </Pressable>
            ))}
          </View>

          <View style={styles.targetDateRow}>
            <ThemedText type="small" themeColor="textSecondary">
              Target: {editTargetDate ? formatTarget(editTargetDate) : 'None'}
            </ThemedText>
            <Pressable onPress={() => setPickingDate((p) => !p)}>
              <ThemedText style={styles.linkText}>{pickingDate ? 'Close' : 'Change'}</ThemedText>
            </Pressable>
            {editTargetDate && (
              <Pressable onPress={() => setEditTargetDate(null)}>
                <ThemedText style={styles.linkText}>Clear</ThemedText>
              </Pressable>
            )}
          </View>
          {pickingDate && (
            <Calendar
              key={colorScheme}
              onDayPress={(day) => {
                setEditTargetDate(day.dateString);
                setPickingDate(false);
              }}
              markedDates={editTargetDate ? { [editTargetDate]: { selected: true, selectedColor: BRAND_BLUE } } : {}}
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

          <ThemedText type="small" themeColor="textSecondary">
            Notes
          </ThemedText>
          <TextInput
            style={[styles.input, { backgroundColor: theme.backgroundSelected, color: theme.text }]}
            value={editNotes}
            onChangeText={setEditNotes}
            multiline
          />

          {saveError && <ThemedText style={styles.error}>{saveError}</ThemedText>}

          <View style={styles.formButtons}>
            <Pressable onPress={() => setEditing(false)} style={styles.cancelButton}>
              <ThemedText>Cancel</ThemedText>
            </Pressable>
            <Pressable
              disabled={saving || !editTitle.trim()}
              onPress={saveEdits}
              style={[styles.saveButton, (saving || !editTitle.trim()) && styles.saveButtonDisabled]}>
              <ThemedText style={styles.saveButtonText}>{saving ? 'Saving…' : 'Save'}</ThemedText>
            </Pressable>
          </View>
        </ThemedView>
      ) : (
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <ThemedText type="subtitle" style={styles.title}>
              {release.title}
            </ThemedText>
            {canManageRelease && (
              <View style={styles.headerActions}>
                <Pressable onPress={() => startEditing(release)}>
                  <ThemedText style={styles.linkText}>Edit</ThemedText>
                </Pressable>
                <DeleteButton confirmLabel={`Delete "${release.title}"?`} onConfirm={deleteRelease} />
              </View>
            )}
          </View>
          <View style={styles.metaRow}>
            <View style={styles.kindChip}>
              <ThemedText type="small" themeColor="textSecondary">
                {releaseKindLabel[release.kind]}
              </ThemedText>
            </View>
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, { backgroundColor: releaseStatusColor[release.status] }]} />
              <ThemedText type="small" themeColor="textSecondary">
                {releaseStatusLabel[release.status]}
              </ThemedText>
            </View>
          </View>
          {release.targetDate && (
            <ThemedText type="small" themeColor="textSecondary">
              Target: {formatTarget(release.targetDate)}
            </ThemedText>
          )}
        </View>
      )}

      {!editing && release.notes && (
        <ThemedView type="backgroundElement" style={styles.section}>
          <ThemedText type="smallBold">Notes</ThemedText>
          <ThemedText>{release.notes}</ThemedText>
        </ThemedView>
      )}

      <View style={styles.tracklistHeader}>
        <ThemedText type="smallBold">
          Tracklist{release.tracks.length > 0 ? ` · ${release.tracks.length}` : ''}
        </ThemedText>
        <Pressable onPress={() => router.push(`/releases/${release.id}/add-songs`)}>
          <ThemedText style={styles.addSongsLink}>+ Add songs</ThemedText>
        </Pressable>
      </View>
      {release.tracks.length > 1 && (
        <ThemedText type="small" themeColor="textSecondary" style={styles.dragHint}>
          Hold and drag ≡ to reorder
        </ThemedText>
      )}
      {release.tracks.length === 0 && (
        <ThemedView type="backgroundElement" style={styles.section}>
          <ThemedText type="small" themeColor="textSecondary">
            No tracks yet.
          </ThemedText>
        </ThemedView>
      )}
    </View>
  );

  function renderItem({ item, drag, isActive, getIndex }: RenderItemParams<ReleaseTrack>) {
    const index = getIndex() ?? 0;
    return (
      <ScaleDecorator>
        <ThemedView type="backgroundElement" style={[styles.trackRow, isActive && styles.trackRowActive]}>
          <ThemedText type="small" themeColor="textSecondary" style={styles.trackNumber}>
            {index + 1}
          </ThemedText>
          <View style={styles.trackInfo}>
            <ThemedText numberOfLines={1}>{item.song.title}</ThemedText>
            <View style={styles.trackStatusRow}>
              <View style={[styles.statusDot, { backgroundColor: songStatusColor[item.song.status] }]} />
              <ThemedText type="small" themeColor="textSecondary">
                {songStatusLabel[item.song.status]}
              </ThemedText>
            </View>
          </View>
          {item.song.duration != null && (
            <ThemedText type="small" themeColor="textSecondary">
              {formatDuration(item.song.duration)}
            </ThemedText>
          )}
          <Pressable onLongPress={drag} disabled={isActive} style={styles.dragHandleButton}>
            <ThemedText themeColor="textSecondary" style={styles.dragHandle}>
              ≡
            </ThemedText>
          </Pressable>
        </ThemedView>
      </ScaleDecorator>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
        <DraggableFlatList
          data={release.tracks}
          onDragEnd={({ data }) => reorderTracks(data)}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListHeaderComponent={header}
          contentContainerStyle={styles.scrollContent}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  centered: { alignItems: 'center', justifyContent: 'center' },
  scrollContent: { padding: Spacing.three, gap: Spacing.two },
  headerArea: { gap: Spacing.three, marginBottom: Spacing.two },
  header: { gap: Spacing.one },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  linkText: { color: '#3c87f7', fontWeight: '600' },
  title: { fontSize: 24, lineHeight: 30 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, marginTop: Spacing.one },
  kindChip: {
    backgroundColor: 'rgba(128,128,128,0.2)',
    borderRadius: Spacing.four,
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  section: { borderRadius: Spacing.three, padding: Spacing.three, gap: Spacing.two },
  tracklistHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  addSongsLink: { color: '#208AEF', fontWeight: '600' },
  dragHint: { marginTop: -Spacing.one },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.two,
    borderRadius: Spacing.two,
    marginBottom: Spacing.one,
  },
  trackRowActive: { opacity: 0.9 },
  trackNumber: { width: 20 },
  trackInfo: { flex: 1, gap: 2 },
  trackStatusRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  dragHandleButton: { paddingHorizontal: Spacing.one, paddingVertical: Spacing.one },
  dragHandle: { fontSize: 18 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  editChip: {
    borderRadius: Spacing.four,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    backgroundColor: 'rgba(128,128,128,0.2)',
  },
  editChipActive: { backgroundColor: BRAND_BLUE },
  targetDateRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
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
});
