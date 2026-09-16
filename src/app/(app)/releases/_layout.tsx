import { Stack } from 'expo-router';

export default function ReleasesLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="[id]" options={{ title: 'Release', headerBackTitle: 'Releases' }} />
      <Stack.Screen
        name="new"
        options={{ title: 'New Release', headerBackTitle: 'Releases', presentation: 'modal' }}
      />
      <Stack.Screen
        name="[id]/add-songs"
        options={{ title: 'Add Songs', headerBackTitle: 'Release', presentation: 'modal' }}
      />
    </Stack>
  );
}
