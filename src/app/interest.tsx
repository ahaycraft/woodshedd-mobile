import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { apiUrl } from '@/lib/api';
import { useTheme } from '@/hooks/use-theme';
import type { InterestRole } from '@/types/api';

const ROLES: { role: InterestRole; label: string }[] = [
  { role: 'ARTIST', label: 'Artist' },
  { role: 'BAND', label: 'Band' },
  { role: 'PRODUCER', label: 'Producer' },
  { role: 'MANAGER', label: 'Manager' },
  { role: 'BOOKING_AGENT', label: 'Booking Agent' },
];
const BRAND_BLUE = '#208AEF';

export default function InterestScreen() {
  const theme = useTheme();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<InterestRole | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const canSubmit = firstName.trim() && lastName.trim() && email.trim() && role;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    const res = await fetch(apiUrl('/api/interest'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        role,
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error || 'Something went wrong');
      return;
    }
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={[styles.safeArea, styles.centered]}>
          <ThemedText type="title" style={styles.centeredText}>
            Thanks!
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.centeredText}>
            We&apos;ve got your info and will reach out when Woodshedd opens up.
          </ThemedText>
          <Pressable onPress={() => router.back()} style={styles.backLink}>
            <ThemedText style={styles.linkText}>Back to sign in</ThemedText>
          </Pressable>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <ThemedText type="title" style={styles.title}>
            Express interest
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.subtitle}>
            Woodshedd is invite-only right now. Leave your info and we&apos;ll reach out when
            there&apos;s room.
          </ThemedText>

          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.flex1, { backgroundColor: theme.backgroundElement, color: theme.text }]}
              placeholder="First name"
              placeholderTextColor={theme.textSecondary}
              value={firstName}
              onChangeText={setFirstName}
            />
            <TextInput
              style={[styles.input, styles.flex1, { backgroundColor: theme.backgroundElement, color: theme.text }]}
              placeholder="Last name"
              placeholderTextColor={theme.textSecondary}
              value={lastName}
              onChangeText={setLastName}
            />
          </View>

          <TextInput
            style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text }]}
            placeholder="Email"
            placeholderTextColor={theme.textSecondary}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />

          <ThemedText type="small" themeColor="textSecondary">
            I&apos;m a...
          </ThemedText>
          <View style={styles.chipRow}>
            {ROLES.map((r) => (
              <Pressable key={r.role} onPress={() => setRole(r.role)}>
                <View style={[styles.chip, r.role === role && styles.chipActive]}>
                  <ThemedText type="small" themeColor={r.role === role ? 'text' : 'textSecondary'}>
                    {r.label}
                  </ThemedText>
                </View>
              </Pressable>
            ))}
          </View>

          {error && <ThemedText style={styles.error}>{error}</ThemedText>}

          <Pressable
            disabled={!canSubmit || submitting}
            onPress={handleSubmit}
            style={[styles.button, (!canSubmit || submitting) && styles.buttonDisabled]}>
            <ThemedText style={styles.buttonText}>{submitting ? 'Submitting…' : 'Submit'}</ThemedText>
          </Pressable>

          <Pressable onPress={() => router.back()} style={styles.backLink}>
            <ThemedText type="small" themeColor="textSecondary">
              Back to sign in
            </ThemedText>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  centered: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.four },
  centeredText: { textAlign: 'center' },
  scrollContent: { padding: Spacing.four, gap: Spacing.three },
  title: { textAlign: 'center' },
  subtitle: { textAlign: 'center', marginBottom: Spacing.two },
  row: { flexDirection: 'row', gap: Spacing.two },
  flex1: { flex: 1 },
  input: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: {
    borderRadius: Spacing.four,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    backgroundColor: 'rgba(128,128,128,0.2)',
  },
  chipActive: { backgroundColor: BRAND_BLUE },
  error: { color: '#dc2626' },
  button: {
    backgroundColor: BRAND_BLUE,
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#ffffff', fontWeight: '600' },
  linkText: { color: '#3c87f7', fontWeight: '600' },
  backLink: { alignItems: 'center', marginTop: Spacing.two },
});
