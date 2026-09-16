import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SymbolView, type AndroidSymbol, type SFSymbol } from 'expo-symbols';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useThemePreference, type ThemePreference } from '@/contexts/theme-preference-context';
import { useTheme } from '@/hooks/use-theme';

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
