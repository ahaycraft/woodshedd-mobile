import { Linking, Platform, Pressable, StyleSheet, View } from 'react-native';
import Mapbox, { Camera, MapView, PointAnnotation } from '@rnmapbox/maps';

import { Spacing } from '@/constants/theme';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

// Same public token the web app ships in its client bundle (see that
// repo's NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN) — a "pk." token is meant for
// client-side use, not a secret.
const token = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;
if (token) Mapbox.setAccessToken(token);

const MAP_HEIGHT = 200;

// The web app links to a Google Maps search URL, which is right there —
// opening in a browser is exactly what "the web app" does. On a phone,
// that same https:// link just opens Safari instead of the Maps app
// already on the device, so this uses each platform's native maps URL
// scheme (Apple Maps' `maps://`, Android's `geo:`) to hand off directly
// to whatever maps app is installed.
function openMapsSearch(query: string, coords?: { lat: number; lng: number }) {
  const q = encodeURIComponent(query);
  const url = Platform.select({
    // `ll` drops a single labeled pin at that exact point — `sll` is Apple
    // Maps' "search centered near here" parameter, which is what actually
    // runs a nearby search instead of just pinning the query text.
    ios: coords ? `maps://?q=${q}&sll=${coords.lat},${coords.lng}&z=15` : `maps://?q=${q}`,
    android: coords ? `geo:${coords.lat},${coords.lng}?q=${q}` : `geo:0,0?q=${q}`,
    default: `https://www.google.com/maps/search/?api=1&query=${q}`,
  });
  Linking.openURL(url);
}

// Mirrors the web app's VenueMap: same dark map style, same pin look, same
// Food/Gas Google Maps search links. Pan/pinch-zoom are left on (unlike
// web's scrollZoom:false, which exists there only to stop the mouse wheel
// from hijacking page scroll — not a concern with touch gestures).
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

      {hasCoords ? (
        <>
          <View style={styles.mapWrap}>
            <MapView
              style={styles.map}
              styleURL="mapbox://styles/mapbox/dark-v11"
              scaleBarEnabled={false}
              pitchEnabled={false}
              rotateEnabled={false}
              attributionEnabled={false}
              logoEnabled={false}>
              <Camera centerCoordinate={[lng, lat]} zoomLevel={14} animationMode="none" />
              <PointAnnotation id="venue" coordinate={[lng, lat]}>
                <View style={styles.pin} />
              </PointAnnotation>
            </MapView>
          </View>

          {address && (
            <ThemedText type="small" themeColor="textSecondary">
              {address}
            </ThemedText>
          )}

          <View style={styles.buttonRow}>
            <Pressable
              style={styles.button}
              onPress={() => openMapsSearch('restaurants', { lat, lng })}>
              <ThemedText style={styles.buttonText}>🍽️ Food nearby</ThemedText>
            </Pressable>
            <Pressable
              style={styles.button}
              onPress={() => openMapsSearch('gas station', { lat, lng })}>
              <ThemedText style={styles.buttonText}>⛽ Gas nearby</ThemedText>
            </Pressable>
            <Pressable
              style={styles.button}
              onPress={() => openMapsSearch('hotels', { lat, lng })}>
              <ThemedText style={styles.buttonText}>🏨 Hotels nearby</ThemedText>
            </Pressable>
          </View>
        </>
      ) : (
        <ThemedText type="small" themeColor="textSecondary">
          No location pinned for this venue.{' '}
          <ThemedText
            type="small"
            style={styles.link}
            onPress={() => openMapsSearch([label, address].filter(Boolean).join(' '))}>
            Search Maps ↗
          </ThemedText>
        </ThemedText>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Spacing.three, padding: Spacing.three, gap: Spacing.two },
  mapWrap: { height: MAP_HEIGHT, borderRadius: Spacing.two, overflow: 'hidden' },
  map: { flex: 1 },
  pin: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#3b82f6',
    borderWidth: 2,
    borderColor: '#fafafa',
  },
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
  // Plain, uncolored — matches the bottom nav's untinted icon style rather
  // than the blue accent used for hyperlink-style text elsewhere.
  buttonText: { fontWeight: '600', fontSize: 13 },
  link: { color: '#3c87f7' },
});
