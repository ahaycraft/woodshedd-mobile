import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/hooks/use-theme';
import { SONG_STATUSES, songStatusColor, songStatusLabel } from '@/lib/songs';
import type { SongComment, SongDetail, SongStatus } from '@/types/api';

const CAN_MANAGE_ROLES = ['OWNER', 'ADMIN'];

function relativeTime(dateStr: string) {
  const seconds = Math.max(0, (Date.now() - new Date(dateStr).getTime()) / 1000);
  const units: [string, number][] = [
    ['year', 31536000],
    ['month', 2592000],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ];
  for (const [label, secondsPerUnit] of units) {
    const value = Math.floor(seconds / secondsPerUnit);
    if (value >= 1) return `${value} ${label}${value === 1 ? '' : 's'} ago`;
  }
  return 'just now';
}

export default function SongScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { authedFetch, userId, role } = useAuth();
  const theme = useTheme();

  const [song, setSong] = useState<SongDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [commentBody, setCommentBody] = useState('');
  const [posting, setPosting] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);

  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editStatus, setEditStatus] = useState<SongStatus>('IDEA');
  const [editKey, setEditKey] = useState('');
  const [editTempo, setEditTempo] = useState('');
  const [editTimeSig, setEditTimeSig] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  function startEditing(current: SongDetail) {
    setEditTitle(current.title);
    setEditStatus(current.status);
    setEditKey(current.key ?? '');
    setEditTempo(current.tempo != null ? String(current.tempo) : '');
    setEditTimeSig(current.timeSig ?? '');
    setEditNotes(current.notes ?? '');
    setSaveError(null);
    setEditing(true);
  }

  async function saveEdits() {
    if (!editTitle.trim()) return;
    setSaving(true);
    setSaveError(null);
    const res = await authedFetch(`/api/songs/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: editTitle.trim(),
        status: editStatus,
        key: editKey.trim() || null,
        tempo: editTempo.trim() ? Number(editTempo.trim()) : null,
        timeSig: editTimeSig.trim() || null,
        notes: editNotes.trim() || null,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setSaveError(body.error || "Couldn't save");
      return;
    }
    setSong((prev) =>
      prev
        ? {
            ...prev,
            title: editTitle.trim(),
            status: editStatus,
            key: editKey.trim() || null,
            tempo: editTempo.trim() ? Number(editTempo.trim()) : null,
            timeSig: editTimeSig.trim() || null,
            notes: editNotes.trim() || null,
          }
        : prev
    );
    setEditing(false);
  }

  const load = useCallback(async () => {
    const res = await authedFetch(`/api/songs/${id}`);
    if (res.ok) setSong(await res.json());
    setLoading(false);
  }, [authedFetch, id]);

  useEffect(() => {
    Promise.resolve().then(load);
  }, [load]);

  async function postComment() {
    const text = commentBody.trim();
    if (!text) return;
    setPosting(true);
    setCommentError(null);
    const res = await authedFetch(`/api/songs/${id}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: text }),
    });
    setPosting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setCommentError(body.error || "Couldn't post comment");
      return;
    }
    const created: SongComment = await res.json();
    setSong((prev) => (prev ? { ...prev, comments: [...prev.comments, created] } : prev));
    setCommentBody('');
  }

  async function deleteComment(commentId: string) {
    setSong((prev) =>
      prev ? { ...prev, comments: prev.comments.filter((c) => c.id !== commentId) } : prev
    );
    const res = await authedFetch(`/api/songs/${id}/comments`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commentId }),
    });
    if (!res.ok) void load();
  }

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={[styles.safeArea, styles.centered]}>
          <ActivityIndicator />
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (!song) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={[styles.safeArea, styles.centered]}>
          <ThemedText themeColor="textSecondary">Song not found.</ThemedText>
        </SafeAreaView>
      </ThemedView>
    );
  }

  const details = [
    song.key,
    song.tempo ? `${song.tempo} BPM` : null,
    song.timeSig,
    song.duration ? `${Math.floor(song.duration / 60)}:${String(song.duration % 60).padStart(2, '0')}` : null,
  ].filter(Boolean);

  const canManageComment = (comment: SongComment) =>
    comment.userId === userId || (!!role && CAN_MANAGE_ROLES.includes(role));

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
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
                Status
              </ThemedText>
              <View style={styles.chipRow}>
                {SONG_STATUSES.map((status) => (
                  <Pressable key={status} onPress={() => setEditStatus(status)}>
                    <View
                      style={[
                        styles.statusChip,
                        status === editStatus && { backgroundColor: songStatusColor[status] },
                      ]}>
                      <ThemedText type="small" themeColor={status === editStatus ? 'text' : 'textSecondary'}>
                        {songStatusLabel[status]}
                      </ThemedText>
                    </View>
                  </Pressable>
                ))}
              </View>

              <View style={styles.editRow}>
                <View style={styles.editField}>
                  <ThemedText type="small" themeColor="textSecondary">
                    Key
                  </ThemedText>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.backgroundSelected, color: theme.text }]}
                    value={editKey}
                    onChangeText={setEditKey}
                  />
                </View>
                <View style={styles.editField}>
                  <ThemedText type="small" themeColor="textSecondary">
                    Tempo
                  </ThemedText>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.backgroundSelected, color: theme.text }]}
                    value={editTempo}
                    onChangeText={setEditTempo}
                    keyboardType="number-pad"
                  />
                </View>
                <View style={styles.editField}>
                  <ThemedText type="small" themeColor="textSecondary">
                    Time sig
                  </ThemedText>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.backgroundSelected, color: theme.text }]}
                    value={editTimeSig}
                    onChangeText={setEditTimeSig}
                  />
                </View>
              </View>

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
                  style={[styles.postButton, (saving || !editTitle.trim()) && styles.postButtonDisabled]}>
                  <ThemedText style={styles.postButtonText}>{saving ? 'Saving…' : 'Save'}</ThemedText>
                </Pressable>
              </View>
            </ThemedView>
          ) : (
            <View style={styles.header}>
              <View style={styles.titleRow}>
                <ThemedText type="subtitle" style={styles.title}>
                  {song.title}
                </ThemedText>
                <Pressable onPress={() => startEditing(song)}>
                  <ThemedText style={styles.linkText}>Edit</ThemedText>
                </Pressable>
              </View>
              <View style={styles.statusRow}>
                <View style={[styles.statusDot, { backgroundColor: songStatusColor[song.status] }]} />
                <ThemedText type="small" themeColor="textSecondary">
                  {songStatusLabel[song.status]}
                </ThemedText>
              </View>
              {details.length > 0 && (
                <ThemedText type="small" themeColor="textSecondary">
                  {details.join(' · ')}
                </ThemedText>
              )}
              {song.tracks.length > 0 && (
                <View style={styles.chipRow}>
                  {song.tracks.map((t) => (
                    <View key={t.release.id} style={styles.chip}>
                      <ThemedText type="small" themeColor="textSecondary">
                        {t.release.title}
                      </ThemedText>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {!editing && song.notes && (
            <ThemedView type="backgroundElement" style={styles.section}>
              <ThemedText type="smallBold">Notes</ThemedText>
              <ThemedText>{song.notes}</ThemedText>
            </ThemedView>
          )}

          <ThemedView type="backgroundElement" style={styles.section}>
            <ThemedText type="smallBold">Demos</ThemedText>
            {song.demos.length === 0 ? (
              <ThemedText type="small" themeColor="textSecondary">
                No demos yet.
              </ThemedText>
            ) : (
              song.demos.map((demo) => (
                <Pressable key={demo.id} onPress={() => Linking.openURL(demo.url)} style={styles.demoRow}>
                  <ThemedText style={styles.linkText} numberOfLines={1}>
                    {demo.label || 'Demo'}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {relativeTime(demo.createdAt)}
                  </ThemedText>
                </Pressable>
              ))
            )}
          </ThemedView>

          <ThemedView type="backgroundElement" style={styles.section}>
            <ThemedText type="smallBold">
              Feedback{song.comments.length > 0 ? ` · ${song.comments.length}` : ''}
            </ThemedText>

            {song.comments.length === 0 ? (
              <ThemedText type="small" themeColor="textSecondary">
                No notes yet.
              </ThemedText>
            ) : (
              song.comments.map((comment) => (
                <View key={comment.id} style={styles.commentRow}>
                  <View style={styles.commentHeader}>
                    <ThemedText type="smallBold">{comment.user.name ?? 'Someone'}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {relativeTime(comment.createdAt)}
                    </ThemedText>
                    {canManageComment(comment) && (
                      <Pressable onPress={() => deleteComment(comment.id)} style={styles.deleteButton}>
                        <ThemedText type="small" style={styles.deleteText}>
                          Delete
                        </ThemedText>
                      </Pressable>
                    )}
                  </View>
                  <ThemedText>{comment.body}</ThemedText>
                </View>
              ))
            )}

            <View style={styles.commentForm}>
              <TextInput
                style={[styles.input, { backgroundColor: theme.backgroundSelected, color: theme.text }]}
                placeholder="What do you think of this one?"
                placeholderTextColor={theme.textSecondary}
                value={commentBody}
                onChangeText={setCommentBody}
                multiline
              />
              {commentError && <ThemedText style={styles.error}>{commentError}</ThemedText>}
              <Pressable
                disabled={posting || !commentBody.trim()}
                onPress={postComment}
                style={[styles.postButton, (posting || !commentBody.trim()) && styles.postButtonDisabled]}>
                <ThemedText style={styles.postButtonText}>{posting ? 'Posting…' : 'Post'}</ThemedText>
              </Pressable>
            </View>
          </ThemedView>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  centered: { alignItems: 'center', justifyContent: 'center' },
  scrollContent: {
    padding: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.three,
    gap: Spacing.three,
  },
  header: { gap: Spacing.two },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  title: { fontSize: 24, lineHeight: 30 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: {
    backgroundColor: 'rgba(128,128,128,0.2)',
    borderRadius: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
  },
  statusChip: {
    backgroundColor: 'rgba(128,128,128,0.2)',
    borderRadius: Spacing.four,
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
  },
  editRow: { flexDirection: 'row', gap: Spacing.two },
  editField: { flex: 1, gap: 2 },
  formButtons: { flexDirection: 'row', gap: Spacing.two, justifyContent: 'flex-end' },
  cancelButton: { paddingVertical: Spacing.two, paddingHorizontal: Spacing.three },
  section: { borderRadius: Spacing.three, padding: Spacing.three, gap: Spacing.two },
  demoRow: {
    gap: 2,
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.2)',
  },
  linkText: { color: '#3c87f7' },
  commentRow: {
    gap: 2,
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.2)',
  },
  commentHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  deleteButton: { marginLeft: 'auto' },
  deleteText: { color: '#dc2626' },
  commentForm: { gap: Spacing.two, marginTop: Spacing.two },
  input: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 15,
    minHeight: 44,
  },
  error: { color: '#dc2626' },
  postButton: {
    backgroundColor: '#208AEF',
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two,
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.four,
  },
  postButtonDisabled: { opacity: 0.5 },
  postButtonText: { color: '#ffffff', fontWeight: '600' },
});
