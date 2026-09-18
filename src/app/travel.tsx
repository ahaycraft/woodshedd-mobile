import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { SymbolView, type AndroidSymbol, type SFSymbol } from 'expo-symbols';

import { DeleteButton } from '@/components/delete-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { AIRLINE_PROGRAMS, HOTEL_PROGRAMS, OTHER_PROGRAM } from '@/constants/travel-programs';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/hooks/use-theme';
import type { BandMemberLoyalty, LoyaltyAccount, LoyaltyType } from '@/types/api';

const TYPE_LABEL: Record<LoyaltyType, string> = { HOTEL: 'Hotel', AIRLINE: 'Airline' };
const TYPE_ICON: Record<LoyaltyType, { ios: SFSymbol; android: AndroidSymbol }> = {
  HOTEL: { ios: 'bed.double.fill', android: 'hotel' },
  AIRLINE: { ios: 'airplane', android: 'flight' },
};

function AccountIcon({ type }: { type: LoyaltyType }) {
  const theme = useTheme();
  const icon = TYPE_ICON[type];
  return (
    <SymbolView
      name={{ ios: icon.ios, android: icon.android, web: icon.android }}
      size={18}
      tintColor={theme.text}
    />
  );
}

export default function TravelScreen() {
  const { authedFetch, userId, activeBandId } = useAuth();
  const theme = useTheme();

  const [myAccounts, setMyAccounts] = useState<LoyaltyAccount[]>([]);
  const [members, setMembers] = useState<BandMemberLoyalty[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [mineRes, bandRes] = await Promise.all([
      authedFetch('/api/account/loyalty'),
      activeBandId ? authedFetch(`/api/bands/${activeBandId}/loyalty`) : Promise.resolve(null),
    ]);
    if (mineRes.ok) setMyAccounts(await mineRes.json());
    if (bandRes?.ok) setMembers(await bandRes.json());
    setLoading(false);
  }, [authedFetch, activeBandId]);

  useEffect(() => {
    Promise.resolve().then(load);
  }, [load]);

  const [adding, setAdding] = useState(false);
  const [type, setType] = useState<LoyaltyType>('HOTEL');
  const [program, setProgram] = useState('');
  const [customProgram, setCustomProgram] = useState('');
  const [pickingProgram, setPickingProgram] = useState(false);
  const [memberNumber, setMemberNumber] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const programOptions = type === 'HOTEL' ? HOTEL_PROGRAMS : AIRLINE_PROGRAMS;
  const resolvedProgram = program === OTHER_PROGRAM ? customProgram.trim() : program;

  function resetForm() {
    setAdding(false);
    setType('HOTEL');
    setProgram('');
    setCustomProgram('');
    setPickingProgram(false);
    setMemberNumber('');
    setError('');
  }

  async function save() {
    if (!resolvedProgram || !memberNumber.trim()) return;
    setSaving(true);
    setError('');
    const res = await authedFetch('/api/account/loyalty', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, program: resolvedProgram, memberNumber: memberNumber.trim() }),
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error || "Couldn't save");
      return;
    }
    resetForm();
    await load();
  }

  async function removeAccount(id: string) {
    const res = await authedFetch(`/api/account/loyalty/${id}`, { method: 'DELETE' });
    if (res.ok) await load();
  }

  async function copy(text: string, id: string) {
    await Clipboard.setStringAsync(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId((c) => (c === id ? null : c)), 1500);
  }

  const bandmates = members.filter((m) => m.userId !== userId && m.accounts.length > 0);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <ThemedView type="backgroundElement" style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <ThemedText type="smallBold">My Accounts</ThemedText>
              {!adding && (
                <Pressable onPress={() => setAdding(true)}>
                  <ThemedText style={styles.linkText}>Add</ThemedText>
                </Pressable>
              )}
            </View>

            {myAccounts.length === 0 && !adding && (
              <ThemedText type="small" themeColor="textSecondary">
                No loyalty accounts saved yet.
              </ThemedText>
            )}

            {myAccounts.map((a) => (
              <View key={a.id} style={styles.accountRow}>
                <AccountIcon type={a.type} />
                <View style={styles.accountInfo}>
                  <ThemedText>{a.program}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {a.memberNumber}
                  </ThemedText>
                </View>
                <DeleteButton
                  label="Remove"
                  confirmLabel={`Remove ${a.program}?`}
                  onConfirm={() => removeAccount(a.id)}
                />
              </View>
            ))}

            {adding && (
              <View style={styles.addForm}>
                <View style={styles.chipRow}>
                  {(['HOTEL', 'AIRLINE'] as LoyaltyType[]).map((t) => (
                    <Pressable
                      key={t}
                      onPress={() => {
                        setType(t);
                        setProgram('');
                        setPickingProgram(false);
                      }}>
                      <View style={[styles.chip, t === type && styles.chipActive]}>
                        <ThemedText type="small" themeColor={t === type ? 'text' : 'textSecondary'}>
                          {TYPE_LABEL[t]}
                        </ThemedText>
                      </View>
                    </Pressable>
                  ))}
                </View>

                <Pressable onPress={() => setPickingProgram((p) => !p)}>
                  <View style={[styles.input, { backgroundColor: theme.backgroundSelected }]}>
                    <ThemedText themeColor={program ? undefined : 'textSecondary'}>
                      {program || 'Choose a program'}
                    </ThemedText>
                  </View>
                </Pressable>

                {pickingProgram && (
                  <View style={[styles.pickerList, { backgroundColor: theme.backgroundSelected }]}>
                    <ScrollView style={styles.pickerScroll} nestedScrollEnabled>
                      {[...programOptions, OTHER_PROGRAM].map((p) => (
                        <Pressable
                          key={p}
                          style={styles.pickerRow}
                          onPress={() => {
                            setProgram(p);
                            setPickingProgram(false);
                          }}>
                          <ThemedText type="small">{p}</ThemedText>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {program === OTHER_PROGRAM && (
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.backgroundSelected, color: theme.text }]}
                    placeholder="Program name"
                    placeholderTextColor={theme.textSecondary}
                    value={customProgram}
                    onChangeText={setCustomProgram}
                    autoCapitalize="words"
                  />
                )}

                <TextInput
                  style={[styles.input, { backgroundColor: theme.backgroundSelected, color: theme.text }]}
                  placeholder="Member number"
                  placeholderTextColor={theme.textSecondary}
                  value={memberNumber}
                  onChangeText={setMemberNumber}
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                {error && <ThemedText style={styles.error}>{error}</ThemedText>}

                <View style={styles.formButtons}>
                  <Pressable onPress={resetForm} style={styles.cancelButton}>
                    <ThemedText>Cancel</ThemedText>
                  </Pressable>
                  <Pressable
                    disabled={saving || !resolvedProgram || !memberNumber.trim()}
                    onPress={save}
                    style={[
                      styles.saveButton,
                      (saving || !resolvedProgram || !memberNumber.trim()) && styles.saveButtonDisabled,
                    ]}>
                    <ThemedText style={styles.saveButtonText}>{saving ? 'Saving…' : 'Save'}</ThemedText>
                  </Pressable>
                </View>
              </View>
            )}
          </ThemedView>

          {bandmates.map((m) => (
            <ThemedView key={m.userId} type="backgroundElement" style={styles.section}>
              <ThemedText type="smallBold">{m.name}</ThemedText>
              {m.accounts.map((a) => (
                <View key={a.id} style={styles.accountRow}>
                  <AccountIcon type={a.type} />
                  <View style={styles.accountInfo}>
                    <ThemedText>{a.program}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {a.memberNumber}
                    </ThemedText>
                  </View>
                  <Pressable onPress={() => copy(a.memberNumber, a.id)} hitSlop={8}>
                    <ThemedText type="small" style={styles.linkText}>
                      {copiedId === a.id ? 'Copied' : 'Copy'}
                    </ThemedText>
                  </Pressable>
                </View>
              ))}
            </ThemedView>
          ))}

          {!loading && bandmates.length === 0 && (
            <ThemedText type="small" themeColor="textSecondary" style={styles.emptyBandmates}>
              No bandmates have saved travel rewards yet.
            </ThemedText>
          )}
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
    gap: Spacing.three,
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  section: { borderRadius: Spacing.three, padding: Spacing.three, gap: Spacing.three },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  linkText: { color: '#208AEF', fontWeight: '600' },
  accountRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  accountInfo: { flex: 1, gap: 2 },
  addForm: { gap: Spacing.two, marginTop: Spacing.one },
  chipRow: { flexDirection: 'row', gap: Spacing.two },
  chip: {
    borderRadius: Spacing.four,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    backgroundColor: 'rgba(128,128,128,0.2)',
  },
  chipActive: { backgroundColor: '#208AEF' },
  input: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 15,
  },
  pickerList: { borderRadius: Spacing.two, overflow: 'hidden' },
  pickerScroll: { maxHeight: 220 },
  pickerRow: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.2)',
  },
  error: { color: '#dc2626' },
  formButtons: { flexDirection: 'row', gap: Spacing.two, justifyContent: 'flex-end' },
  cancelButton: { paddingVertical: Spacing.two, paddingHorizontal: Spacing.three },
  saveButton: {
    backgroundColor: '#208AEF',
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two,
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
  },
  saveButtonDisabled: { opacity: 0.5 },
  saveButtonText: { color: '#ffffff', fontWeight: '600' },
  emptyBandmates: { textAlign: 'center' },
});
