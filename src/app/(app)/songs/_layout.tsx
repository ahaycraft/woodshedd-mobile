import { Stack } from 'expo-router';

export default function SongsLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="[id]" options={{ title: 'Song', headerBackTitle: 'Songs' }} />
      <Stack.Screen name="new" options={{ title: 'New Song', headerBackTitle: 'Songs', presentation: 'modal' }} />
    </Stack>
  );
}
