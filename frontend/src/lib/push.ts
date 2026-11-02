import * as Device from 'expo-device';
import {
  AndroidImportance,
  getExpoPushTokenAsync,
  getPermissionsAsync,
  requestPermissionsAsync,
  setNotificationChannelAsync,
  setNotificationHandler,
} from 'expo-notifications';
import { Platform } from 'react-native';

import { PAYMENT_CHANNEL_ID } from './constants';
import { EAS_PROJECT_ID } from './env';

export function configureNotifications(): void {
  setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export async function registerForPushNotificationsAsync(): Promise<string> {
  if (!Device.isDevice) {
    throw new Error('Push notifications require a physical Android device.');
  }

  if (Platform.OS === 'android') {
    await setNotificationChannelAsync(PAYMENT_CHANNEL_ID, {
      name: 'Payment reminders',
      importance: AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#1DB954',
      sound: 'default',
    });
  }

  const { status: existingStatus } = await getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    throw new Error('Notification permission was not granted.');
  }

  if (!EAS_PROJECT_ID) {
    throw new Error(
      'Push notifications need an EAS project ID. Run eas init, then rebuild the app.',
    );
  }

  const token = await getExpoPushTokenAsync({ projectId: EAS_PROJECT_ID });
  return token.data;
}
