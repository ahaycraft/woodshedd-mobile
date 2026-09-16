import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';

export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];

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

      <NativeTabs.Trigger name="songs">
        <NativeTabs.Trigger.Label>Songs</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="music.note" md="library_music" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="releases">
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
