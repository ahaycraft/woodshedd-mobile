import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
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
            onPress={() =>
              Linking.openURL(`https://www.google.com/maps/search/restaurants/@${lat},${lng},15z`)
            }>
            <ThemedText style={styles.buttonText}>🍽️ Food nearby</ThemedText>
          </Pressable>
          <Pressable
            style={styles.button}
            onPress={() =>
              Linking.openURL(`https://www.google.com/maps/search/gas+station/@${lat},${lng},15z`)
            }>
            <ThemedText style={styles.buttonText}>⛽ Gas nearby</ThemedText>
          </Pressable>
          <Pressable
            style={styles.button}
            onPress={() =>
              Linking.openURL(`https://www.google.com/maps/search/hotels/@${lat},${lng},15z`)
            }>
            <ThemedText style={styles.buttonText}>🏨 Hotels nearby</ThemedText>
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
  buttonRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  button: {
    flex: 1,
    minWidth: 100,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(128,128,128,0.3)',
  },
  buttonText: { fontWeight: '600', fontSize: 13 },
  link: { color: '#3c87f7' },
});
