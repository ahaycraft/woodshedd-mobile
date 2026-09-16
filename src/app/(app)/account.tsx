import { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/hooks/use-theme';

export default function AccountScreen() {
  const { authedFetch, profile, refreshProfile, signOut } = useAuth();
  const theme = useTheme();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

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
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <ThemedText type="title" style={styles.title}>
            Account
          </ThemedText>

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
    paddingHorizontal: Spacing.three,
    paddingTop: Platform.select({ web: Spacing.six, default: Spacing.three }),
    paddingBottom: BottomTabInset + Spacing.three,
    gap: Spacing.four,
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  title: { fontSize: 28, lineHeight: 34 },
  section: { borderRadius: Spacing.three, padding: Spacing.three, gap: Spacing.three },
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
