'use client';
/**
 * notifications.ts — Push notification setup and handling
 *
 * Call initPushNotifications() once on app mount (in the root layout).
 * On web: no-ops (web push would be handled via service worker separately).
 *
 * Flow:
 *   1. Request permission
 *   2. Get device FCM/APNs token
 *   3. Register token with backend POST /api/v1/notifications/register-device
 *   4. Listen for incoming messages (foreground + tap)
 */

import { isNative } from './platform';

export type PushToken = { token: string; platform: 'android' | 'ios' };

let _initialized = false;

export async function initPushNotifications(
  onToken?: (t: PushToken) => void,
  onMessage?: (data: Record<string, string>) => void,
  onTap?: (data: Record<string, string>) => void,
): Promise<void> {
  if (!isNative() || _initialized) return;
  _initialized = true;

  const { PushNotifications } = await import('@capacitor/push-notifications');

  // Request permission
  const { receive } = await PushNotifications.requestPermissions();
  if (receive !== 'granted') {
    console.warn('[push] permission not granted');
    return;
  }

  await PushNotifications.register();

  PushNotifications.addListener('registration', (token) => {
    const platform = (window as any).Capacitor?.getPlatform?.() === 'ios' ? 'ios' : 'android';
    onToken?.({ token: token.value, platform });
  });

  PushNotifications.addListener('registrationError', (err) => {
    console.error('[push] registration error:', err.error);
  });

  PushNotifications.addListener('pushNotificationReceived', (notification) => {
    onMessage?.(notification.data ?? {});
  });

  PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
    onTap?.(action.notification.data ?? {});
  });
}

/** Register the device token with the backend. */
export async function registerDeviceToken(token: string, platform: 'android' | 'ios'): Promise<void> {
  try {
    await fetch('/api/v1/notifications/register-device', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ token, platform }),
    });
  } catch (err) {
    console.warn('[push] registerDeviceToken failed:', err);
  }
}

/** Remove all delivered notifications from the notification center. */
export async function clearAllNotifications(): Promise<void> {
  if (!isNative()) return;
  const { PushNotifications } = await import('@capacitor/push-notifications');
  await PushNotifications.removeAllDeliveredNotifications().catch(() => {});
}
