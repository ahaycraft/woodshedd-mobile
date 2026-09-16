import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export interface PushRegistration {
  token: string;
  platform: 'ios' | 'android';
}

/**
 * Requests notification permission (if not already granted) and returns an
 * Expo push token for this device — or null if permission was denied, this
 * isn't a physical device (simulators/emulators/web can't receive real
 * push), or there's no EAS project configured yet (`eas init`, which is
 * what fills in app.json's extra.eas.projectId).
 */
export async function registerForPushNotifications(): Promise<PushRegistration | null> {
  if (Platform.OS === 'web' || !Device.isDevice) return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#208AEF',
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  const finalStatus =
    existingStatus === 'granted'
      ? existingStatus
      : (await Notifications.requestPermissionsAsync()).status;
  if (finalStatus !== 'granted') return null;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) return null;

  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
  return { token, platform: Platform.OS === 'ios' ? 'ios' : 'android' };
}
