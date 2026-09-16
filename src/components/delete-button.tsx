import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { ThemedText } from './themed-text';

/** Tap-to-reveal delete confirmation — an in-app row instead of a native
 *  confirm dialog, matching the web app's ConfirmDialog pattern. */
export function DeleteButton({
  label = 'Delete',
  confirmLabel,
  onConfirm,
}: {
  label?: string;
  confirmLabel: string;
  onConfirm: () => void | Promise<void>;
}) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!confirming) {
    return (
      <Pressable onPress={() => setConfirming(true)}>
        <ThemedText style={styles.deleteText}>{label}</ThemedText>
      </Pressable>
    );
  }

  return (
    <View style={styles.confirmRow}>
      <ThemedText type="small" themeColor="textSecondary" style={styles.confirmLabel}>
        {confirmLabel}
      </ThemedText>
      <Pressable disabled={busy} onPress={() => setConfirming(false)}>
        <ThemedText type="small">Cancel</ThemedText>
      </Pressable>
      <Pressable
        disabled={busy}
        onPress={async () => {
          setBusy(true);
          await onConfirm();
          setBusy(false);
        }}>
        <ThemedText type="small" style={styles.deleteText}>
          {busy ? 'Deleting…' : 'Confirm'}
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  confirmRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, flexWrap: 'wrap' },
  confirmLabel: { flexBasis: '100%' },
  deleteText: { color: '#dc2626', fontWeight: '600' },
});
