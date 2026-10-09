import React, { useEffect } from 'react';
import * as ExpoNotifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { notificationService } from '../services';
import { useAuthStore } from '../store/authStore';
import { router } from 'expo-router';

// Configure notification handler behaviour
ExpoNotifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Device.isDevice) {
    console.warn('[PUSH] Must use physical device for push notifications.');
    return null;
  }

  const { status: existingStatus } = await ExpoNotifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await ExpoNotifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('[PUSH] Push notification permission denied.');
    return null;
  }

  if (Platform.OS === 'android') {
    await ExpoNotifications.setNotificationChannelAsync('default', {
      name: 'Smart Garment',
      importance: ExpoNotifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#6366f1',
    });
  }

  try {
    const token = (await ExpoNotifications.getExpoPushTokenAsync()).data;
    return token;
  } catch (e) {
    console.warn('[PUSH] Failed to get push token:', e);
    return null;
  }
}

export const NotificationSetup: React.FC = () => {
  const accessToken = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    if (!accessToken) return;

    let responseListener: ExpoNotifications.Subscription;

    const setup = async () => {
      const token = await registerForPushNotificationsAsync();
      if (token) {
        try {
          await notificationService.registerDeviceToken(token, Platform.OS);
          console.log('[PUSH] FCM token registered:', token.slice(0, 20) + '...');
        } catch (e) {
          console.warn('[PUSH] Failed to register token:', e);
        }
      }

      // Handle notification tap → deep link
      responseListener = ExpoNotifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data as any;
        if (data?.type === 'order_status' && data?.order_id) {
          router.push(`/orders/${data.order_id}` as any);
        } else if (data?.type === 'order_created' && data?.order_id) {
          router.push(`/orders/${data.order_id}` as any);
        } else if (data?.type === 'low_stock' && data?.product_id) {
          router.push(`/(admin)/products` as any);
        }
      });
    };

    setup();

    return () => {
      if (responseListener) responseListener.remove();
    };
  }, [accessToken]);

  return null;
};
