'use client';
/**
 * CapacitorInit — mounts native services once when the app starts.
 *
 * Rendered in the root layout. All operations are no-ops on web.
 * - Hides the splash screen after the first paint
 * - Initialises push notifications + stores device token
 * - Sets status bar style
 * - Wires up deep linking (delegates URL opens to Next.js router)
 */
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isNative, isIOS } from '@/lib/native/platform';
import { initDeepLinking, getLaunchUrl } from '@/lib/native/deep-link';
import { initPushNotifications, registerDeviceToken } from '@/lib/native/notifications';
import { set as nativeSet, STORAGE_KEYS } from '@/lib/native/storage';

export default function CapacitorInit() {
  const router = useRouter();

  useEffect(() => {
    if (!isNative()) return;

    let cancelled = false;

    async function bootstrap() {
      // ── Splash screen ──────────────────────────────────────────────
      try {
        const { SplashScreen } = await import('@capacitor/splash-screen');
        await SplashScreen.hide({ fadeOutDuration: 300 });
      } catch { /* splash screen plugin optional */ }

      // ── Status bar ─────────────────────────────────────────────────
      try {
        const { StatusBar, Style } = await import('@capacitor/status-bar');
        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.setBackgroundColor({ color: '#0f0c29' });
      } catch { /* status bar optional */ }

      if (cancelled) return;

      // ── Deep linking ───────────────────────────────────────────────
      await initDeepLinking(router);

      // Handle cold-start deep link
      const launchUrl = await getLaunchUrl();
      if (launchUrl) {
        try {
          const url = new URL(launchUrl);
          if (url.pathname !== '/') router.push(url.pathname + url.search);
        } catch { /* ignore invalid URL */ }
      }

      // ── Push notifications ─────────────────────────────────────────
      await initPushNotifications(
        // onToken: register with backend
        async ({ token, platform }) => {
          await nativeSet(STORAGE_KEYS.PUSH_TOKEN, token);
          await registerDeviceToken(token, platform);
        },
        // onMessage (foreground)
        (data) => {
          console.info('[push] foreground message:', data);
        },
        // onTap (notification tapped from tray)
        (data) => {
          if (data.route) router.push(data.route as string);
        },
      );
    }

    bootstrap().catch(err => console.error('[CapacitorInit]', err));
    return () => { cancelled = true; };
  }, [router]);

  return null;
}
