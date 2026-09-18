import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SymbolView, type AndroidSymbol, type SFSymbol } from 'expo-symbols';

import { DeleteButton } from '@/components/delete-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useThemePreference, type ThemePreference } from '@/contexts/theme-preference-context';
import { useTheme } from '@/hooks/use-theme';
import type { BandDetail } from '@/types/api';

const THEME_OPTIONS: {
  value: ThemePreference;
  label: string;
  icon: { ios: SFSymbol; android: AndroidSymbol };
}[] = [
  { value: 'light', label: 'Light', icon: { ios: 'sun.max', android: 'light_mode' } },
  { value: 'dark', label: 'Dark', icon: { ios: 'moon', android: 'dark_mode' } },
];

export default function AccountScreen() {
  const {
    authedFetch,
    profile,
    refreshProfile,
    bands,
    activeBandId,
    switchBand,
    role,
    pushEnabled,
    pushLoading,
    setPushEnabled,
    signOut,
  } = useAuth();
  const theme = useTheme();
  const { preference, setPreference } = useThemePreference();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [pushBusy, setPushBusy] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const canManageBand = role === 'OWNER' || role === 'ADMIN';
  const [bandDetail, setBandDetail] = useState<BandDetail | null>(null);
  const [riderText, setRiderText] = useState('');
  const [editingRider, setEditingRider] = useState(false);
  const [riderBusy, setRiderBusy] = useState(false);
  const [riderError, setRiderError] = useState('');

  const loadBand = useCallback(async () => {
    if (!activeBandId) return;
    const res = await authedFetch(`/api/bands/${activeBandId}`);
    if (!res.ok) return;
    const band: BandDetail = await res.json();
    setBandDetail(band);
    setRiderText(band.rider ?? '');
  }, [authedFetch, activeBandId]);

  useEffect(() => {
    Promise.resolve().then(loadBand);
  }, [loadBand]);

  async function saveRider() {
    if (!activeBandId || riderText === (bandDetail?.rider ?? '')) return;
    setRiderBusy(true);
    setRiderError('');
    const res = await authedFetch(`/api/bands/${activeBandId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rider: riderText }),
    });
    setRiderBusy(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setRiderError(body.error || "Couldn't save");
      return;
    }
    await loadBand();
    setEditingRider(false);
  }

  function cancelEditRider() {
    setRiderText(bandDetail?.rider ?? '');
    setEditingRider(false);
    setRiderError('');
  }

  async function togglePush(value: boolean) {
    setPushBusy(true);
    await setPushEnabled(value);
    setPushBusy(false);
  }

  // Seeds the form fields once the profile has loaded; re-syncing on every
  // render would clobber whatever the user is currently typing.
  const [seededFor, setSeededFor] = useState<string | null>(null);
  if (profile && profile.email !== seededFor) {
    setSeededFor(profile.email);
    setName(profile.name);
    setPhone(profile.phone ?? '');
  }

  useEffect(() => {
    Promise.resolve().then(refreshProfile);
  }, [refreshProfile]);

  const dirty = !!profile && (name.trim() !== profile.name || phone.trim() !== (profile.phone ?? ''));

  async function save() {
    if (!name.trim() || !dirty) return;
    setBusy(true);
    setError('');
    const res = await authedFetch('/api/account', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), phone: phone.trim() || null }),
    });
    setBusy(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error || "Couldn't save");
      return;
    }
    await refreshProfile();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  // Apple requires account deletion be reachable from within the app (App
  // Store Review Guideline 5.1.1(v)) — see the backend route for what
  // actually happens to a deleted user's band-shared content.
  async function deleteAccount() {
    setDeleteError('');
    const res = await authedFetch('/api/account', { method: 'DELETE' });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setDeleteError(body.error || "Couldn't delete your account");
      return;
    }
    signOut();
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {!profile ? (
            <ThemedText type="small" themeColor="textSecondary">
              Loading…
            </ThemedText>
          ) : (
            <ThemedView type="backgroundElement" style={styles.section}>
              <View style={styles.field}>
                <ThemedText type="small" themeColor="textSecondary">
                  Name
                </ThemedText>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.backgroundSelected, color: theme.text }]}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.field}>
                <ThemedText type="small" themeColor="textSecondary">
                  Email
                </ThemedText>
                <ThemedText>{profile.email}</ThemedText>
              </View>

              <View style={styles.field}>
                <ThemedText type="small" themeColor="textSecondary">
                  Phone
                </ThemedText>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.backgroundSelected, color: theme.text }]}
                  placeholder="Add a phone number"
                  placeholderTextColor={theme.textSecondary}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  textContentType="telephoneNumber"
                />
                <ThemedText type="small" themeColor="textSecondary">
                  Shown to your bandmates so they can text you.
                </ThemedText>
              </View>

              {error && <ThemedText style={styles.error}>{error}</ThemedText>}

              <Pressable
                disabled={busy || !name.trim() || !dirty}
                onPress={save}
                style={[styles.saveButton, (busy || !name.trim() || !dirty) && styles.saveButtonDisabled]}>
                <ThemedText style={styles.saveButtonText}>
                  {busy ? 'Saving…' : saved ? 'Saved' : 'Save'}
                </ThemedText>
              </Pressable>
            </ThemedView>
          )}

          {bands.length > 1 && (
            <ThemedView type="backgroundElement" style={styles.section}>
              <ThemedText type="small" themeColor="textSecondary">
                Group
              </ThemedText>
              <View style={styles.chipRow}>
                {bands.map((band) => (
                  <Pressable key={band.id} onPress={() => switchBand(band.id)}>
                    <View style={[styles.chip, band.id === activeBandId && styles.chipActive]}>
                      <ThemedText
                        type="small"
                        themeColor={band.id === activeBandId ? 'text' : 'textSecondary'}>
                        {band.name}
                      </ThemedText>
                    </View>
                  </Pressable>
                ))}
              </View>
            </ThemedView>
          )}

          {activeBandId && (
            <ThemedView type="backgroundElement" style={styles.section}>
              <ThemedText type="small" themeColor="textSecondary">
                Rider
              </ThemedText>
              {canManageBand && editingRider ? (
                <>
                  <TextInput
                    style={[
                      styles.input,
                      styles.riderInput,
                      { backgroundColor: theme.backgroundSelected, color: theme.text },
                    ]}
                    placeholder="Backline, hospitality, stage plot, etc."
                    placeholderTextColor={theme.textSecondary}
                    value={riderText}
                    onChangeText={setRiderText}
                    multiline
                  />
                  {riderError && <ThemedText style={styles.error}>{riderError}</ThemedText>}
                  <View style={styles.formButtons}>
                    <Pressable onPress={cancelEditRider} style={styles.cancelButton}>
                      <ThemedText>Cancel</ThemedText>
                    </Pressable>
                    <Pressable
                      disabled={riderBusy || riderText === (bandDetail?.rider ?? '')}
                      onPress={saveRider}
                      style={[
                        styles.saveButton,
                        (riderBusy || riderText === (bandDetail?.rider ?? '')) && styles.saveButtonDisabled,
                      ]}>
                      <ThemedText style={styles.saveButtonText}>{riderBusy ? 'Saving…' : 'Save'}</ThemedText>
                    </Pressable>
                  </View>
                </>
              ) : (
                <>
                  <ThemedText themeColor={bandDetail?.rider ? undefined : 'textSecondary'}>
                    {bandDetail?.rider || 'No rider set yet.'}
                  </ThemedText>
                  {canManageBand && (
                    <Pressable onPress={() => setEditingRider(true)}>
                      <ThemedText style={styles.linkText}>Edit</ThemedText>
                    </Pressable>
                  )}
                </>
              )}
            </ThemedView>
          )}

          {!pushLoading && (
            <ThemedView type="backgroundElement" style={styles.section}>
              <View style={styles.switchRow}>
                <ThemedText type="small" themeColor="textSecondary">
                  Push notifications
                </ThemedText>
                <Switch
                  value={pushEnabled}
                  onValueChange={togglePush}
                  disabled={pushBusy}
                  trackColor={{ false: theme.backgroundSelected, true: '#208AEF' }}
                />
              </View>
            </ThemedView>
          )}

          <ThemedView type="backgroundElement" style={styles.section}>
            <ThemedText type="small" themeColor="textSecondary">
              Appearance
            </ThemedText>
            <View style={[styles.segmentedControl, { backgroundColor: theme.backgroundSelected }]}>
              {THEME_OPTIONS.map((opt) => {
                const active = opt.value === preference;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => setPreference(opt.value)}
                    style={[styles.segment, active && styles.segmentActive]}>
                    <SymbolView
                      name={{ ios: opt.icon.ios, android: opt.icon.android, web: opt.icon.android }}
                      size={14}
                      tintColor={active ? '#ffffff' : theme.textSecondary}
                    />
                    <ThemedText
                      type="small"
                      themeColor={active ? undefined : 'textSecondary'}
                      style={active ? styles.segmentActiveText : undefined}>
                      {opt.label}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </ThemedView>

          <Pressable onPress={signOut} style={styles.signOutButton}>
            <ThemedText style={styles.signOutText}>Sign out</ThemedText>
          </Pressable>

          <ThemedView type="backgroundElement" style={styles.section}>
            <ThemedText type="small" themeColor="textSecondary">
              Delete account
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Permanently deletes your account and personal data. Shows and
              songs you added stay with your band.
            </ThemedText>
            {deleteError && <ThemedText style={styles.error}>{deleteError}</ThemedText>}
            <DeleteButton
              label="Delete account"
              confirmLabel="Delete your account? This can't be undone."
              onConfirm={deleteAccount}
            />
          </ThemedView>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  scrollContent: {
    padding: Spacing.three,
    gap: Spacing.four,
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  section: { borderRadius: Spacing.three, padding: Spacing.three, gap: Spacing.three },
  chipRow: { flexDirection: 'row', gap: Spacing.two },
  chip: {
    borderRadius: Spacing.four,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    backgroundColor: 'rgba(128,128,128,0.2)',
  },
  chipActive: { backgroundColor: '#208AEF' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  segmentedControl: {
    flexDirection: 'row',
    borderRadius: Spacing.two,
    padding: 2,
    gap: 2,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    borderRadius: Spacing.one,
    paddingVertical: Spacing.two,
  },
  segmentActive: { backgroundColor: '#208AEF' },
  segmentActiveText: { color: '#ffffff' },
  field: { gap: Spacing.one },
  input: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 15,
  },
  riderInput: { minHeight: 100, textAlignVertical: 'top' },
  linkText: { color: '#208AEF', fontWeight: '600' },
  formButtons: { flexDirection: 'row', gap: Spacing.two, justifyContent: 'flex-end' },
  cancelButton: { paddingVertical: Spacing.two, paddingHorizontal: Spacing.three },
  error: { color: '#dc2626' },
  saveButton: {
    backgroundColor: '#208AEF',
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two,
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.four,
  },
  saveButtonDisabled: { opacity: 0.5 },
  saveButtonText: { color: '#ffffff', fontWeight: '600' },
  signOutButton: {
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(128,128,128,0.3)',
  },
  signOutText: { color: '#dc2626', fontWeight: '600' },
});
