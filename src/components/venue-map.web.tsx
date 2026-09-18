import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

// @rnmapbox/maps is a native module with no meaningful web support, so the
// Expo web target (used for local testing, see /explore.tsx etc.) gets this
// lighter fallback instead — same info and Food/Gas links, no map render.
// Metro picks this file automatically for web builds; the native one
// (venue-map.tsx) is never bundled here.
export function VenueMap({
  lat,
  lng,
  label,
  address,
}: {
  lat: number | null;
  lng: number | null;
  label: string;
  address?: string | null;
}) {
  const hasCoords = lat != null && lng != null;
  const theme = useTheme();

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="smallBold">📍 Location</ThemedText>

      {address && (
        <ThemedText type="small" themeColor="textSecondary">
          {address}
        </ThemedText>
      )}

      {hasCoords ? (
        <View style={styles.buttonRow}>
          <Pressable
            style={styles.button}
            accessibilityLabel="Food nearby"
            onPress={() =>
              Linking.openURL(`https://www.google.com/maps/search/restaurants/@${lat},${lng},15z`)
            }>
            <SymbolView
              name={{ ios: 'fork.knife', android: 'restaurant', web: 'restaurant' }}
              size={24}
              tintColor={theme.text}
            />
          </Pressable>
          <Pressable
            style={styles.button}
            accessibilityLabel="Gas nearby"
            onPress={() =>
              Linking.openURL(`https://www.google.com/maps/search/gas+station/@${lat},${lng},15z`)
            }>
            <SymbolView
              name={{ ios: 'fuelpump.fill', android: 'local_gas_station', web: 'local_gas_station' }}
              size={24}
              tintColor={theme.text}
            />
          </Pressable>
          <Pressable
            style={styles.button}
            accessibilityLabel="Hotels nearby"
            onPress={() =>
              Linking.openURL(`https://www.google.com/maps/search/hotels/@${lat},${lng},15z`)
            }>
            <SymbolView
              name={{ ios: 'bed.double.fill', android: 'hotel', web: 'hotel' }}
              size={24}
              tintColor={theme.text}
            />
          </Pressable>
        </View>
      ) : (
        <ThemedText type="small" themeColor="textSecondary">
          No location pinned for this venue.{' '}
          <ThemedText
            type="small"
            style={styles.link}
            onPress={() =>
              Linking.openURL(
                `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  [label, address].filter(Boolean).join(' ')
                )}`
              )
            }>
            Search Maps ↗
          </ThemedText>
        </ThemedText>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Spacing.three, padding: Spacing.three, gap: Spacing.two },
  buttonRow: { flexDirection: 'row', gap: Spacing.two },
  button: {
    flex: 1,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(128,128,128,0.3)',
  },
  link: { color: '#3c87f7' },
});
