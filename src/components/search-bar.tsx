import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Mirrors the web app's SearchInput: a magnifying-glass-prefixed field with
 *  a clear (×) button once there's something typed. Filtering itself is the
 *  caller's job, via src/lib/search.ts's matchesQuery — same split as web. */
export function SearchBar({
  value,
  onChangeText,
  placeholder = 'Search',
}: {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}) {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundSelected }]}>
      <SymbolView
        name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }}
        size={15}
        tintColor={theme.textSecondary}
      />
      <TextInput
        style={[styles.input, { color: theme.text }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.textSecondary}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
      />
      {value.length > 0 && (
        <Pressable onPress={() => onChangeText('')} aria-label="Clear search">
          <SymbolView
            name={{ ios: 'xmark.circle.fill', android: 'cancel', web: 'cancel' }}
            size={16}
            tintColor={theme.textSecondary}
          />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  input: {
    flex: 1,
    paddingVertical: Spacing.two,
    fontSize: 15,
  },
});
