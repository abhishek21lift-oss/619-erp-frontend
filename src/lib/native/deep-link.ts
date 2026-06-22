'use client';
/**
 * deep-link.ts — Deep link / URL scheme handling
 *
 * URL scheme: 619fitness://path
 * Universal Link: https://619-erp-frontend.vercel.app/path
 *
 * Listens for:
 *   - App opened from a deep link while closed (appUrlOpen)
 *   - App resumed from background via a link (appUrlOpen)
 *   - Back button press on Android (backButton)
 *
 * Call initDeepLinking(router) once in the root layout.
 */

import { isNative } from './platform';

type RouterLike = { push: (href: string) => void; back: () => void };

let _deepLinkCleanup: (() => void) | null = null;

export async function initDeepLinking(router: RouterLike): Promise<void> {
  if (!isNative()) return;
  if (_deepLinkCleanup) _deepLinkCleanup();

  const { App } = await import('@capacitor/app');

  // ── URL-opened deep link ─────────────────────────────────────────
  const urlHandle = await App.addListener('appUrlOpen', (event) => {
    try {
      const url = new URL(event.url);
      // Map custom scheme: 619fitness://path → /path
      // Map universal link: https://domain.com/path → /path
      const pathname = url.pathname || '/';
      const search   = url.search  || '';
      router.push(`${pathname}${search}`);
    } catch {
      console.warn('[deep-link] invalid URL:', event.url);
    }
  });

  // ── Android hardware back button ──────────────────────────────────
  const backHandle = await App.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack) {
      router.back();
    } else {
      // Exit the app
      App.exitApp();
    }
  });

  _deepLinkCleanup = () => {
    urlHandle.remove();
    backHandle.remove();
  };
}

/** Get the URL the app was launched with (for cold-start deep links). */
export async function getLaunchUrl(): Promise<string | null> {
  if (!isNative()) return null;
  const { App } = await import('@capacitor/app');
  const launch = await App.getLaunchUrl();
  return launch?.url ?? null;
}

/** Clean up all deep link listeners. */
export function removeDeepLinkListeners(): void {
  _deepLinkCleanup?.();
  _deepLinkCleanup = null;
}
