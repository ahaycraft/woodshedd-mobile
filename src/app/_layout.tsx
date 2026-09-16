import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AuthProvider, useAuth } from '@/contexts/auth-context';

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { session, isLoading } = useAuth();

  // Keep the native splash screen up (AnimatedSplashOverlay hides it once
  // mounted) until we know whether there's a session — otherwise a signed-in
  // user would flash the sign-in screen for a moment on cold start.
  if (isLoading) return null;

  return (
    <>
      <AnimatedSplashOverlay />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={!!session}>
          <Stack.Screen name="(app)" />
          <Stack.Screen
            name="event/[id]"
            options={{ headerShown: true, title: 'Event', headerBackTitle: 'Calendar' }}
          />
          <Stack.Screen
            name="event/new"
            options={{ headerShown: true, title: 'New Event', headerBackTitle: 'Calendar', presentation: 'modal' }}
          />
          <Stack.Screen
            name="account"
            options={{ headerShown: true, title: 'Account', presentation: 'modal' }}
          />
        </Stack.Protected>
        <Stack.Protected guard={!session}>
          <Stack.Screen name="sign-in" />
        </Stack.Protected>
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
