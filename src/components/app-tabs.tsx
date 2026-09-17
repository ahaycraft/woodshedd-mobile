import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { Colors } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useThemePreference } from '@/contexts/theme-preference-context';

export default function AppTabs() {
  const { colorScheme } = useThemePreference();
  const colors = Colors[colorScheme];
  // Booking Agent has no access to songs/releases at all (see tour-calendar's
  // canAccessContent) — hiding the tabs here mirrors that on mobile.
  const { role } = useAuth();
  const canAccessContent = role !== 'BOOKING_AGENT';

  return (
    <NativeTabs
      backgroundColor={colors.background}
      indicatorColor={colors.backgroundElement}
      labelStyle={{ selected: { color: colors.text } }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Calendar</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="calendar" md="calendar_month" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="events">
        <NativeTabs.Trigger.Label>Events</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="calendar.badge.clock" md="event" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="songs" hidden={!canAccessContent}>
        <NativeTabs.Trigger.Label>Songs</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="music.note" md="library_music" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="releases" hidden={!canAccessContent}>
        <NativeTabs.Trigger.Label>Releases</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="opticaldisc" md="album" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="explore">
        <NativeTabs.Trigger.Label>Availability</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/explore.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
