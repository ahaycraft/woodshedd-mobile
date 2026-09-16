import { Pressable, StyleSheet } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { router } from 'expo-router';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Icon-only link to the Account screen, shown in every tab's header now
 *  that Account isn't a tab of its own (see app-tabs.tsx). */
export function AccountButton() {
  const theme = useTheme();
  return (
    <Pressable onPress={() => router.push('/account')} style={styles.button} aria-label="Account">
      <SymbolView
        name={{ ios: 'person.crop.circle', android: 'account_circle', web: 'account_circle' }}
        size={22}
        tintColor={theme.text}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { paddingVertical: Spacing.one, paddingHorizontal: Spacing.two },
});
