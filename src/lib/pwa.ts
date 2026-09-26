/**
 * Installable-app plumbing: the service worker and the install prompt.
 *
 * ── The service worker ─────────────────────────────────────────────────────
 *
 * /sw.js does one thing — show /offline.html when a navigation fails for want
 * of a connection. It caches no pages and no API data (see the file). It is
 * registered in production only: in development it would hold on to a stale
 * worker across rebuilds for no benefit.
 *
 * ── The install prompt ─────────────────────────────────────────────────────
 *
 * Chrome and Edge on Android fire `beforeinstallprompt` once, early, often
 * before the page that wants to offer "Install" has mounted. So it is caught
 * here, at app start, and kept until a component asks for it. iOS Safari has
 * no such event; there the offer is instructions (Share → Add to Home Screen).
 *
 * Nothing is offered when the app is already installed, or when it is running
 * inside the Android APK (a Capacitor WebView), which is an app already.
 */

type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

let deferred: InstallEvent | null = null;
const listeners = new Set<() => void>();
let started = false;

function notify() { listeners.forEach((fn) => fn()); }

type EarlyWindow = Window & { __myptInstallPrompt?: InstallEvent | null };

/** Take whatever /pwa-early.js caught — it runs before hydration, this does not. */
function syncFromEarly() {
  deferred = (window as EarlyWindow).__myptInstallPrompt ?? null;
  notify();
}

export function initPwa(): void {
  if (started || typeof window === 'undefined') return;
  started = true;

  // The event itself is caught by /pwa-early.js in <head>: Chrome often fires
  // it before React hydrates, and a listener added here would miss it.
  syncFromEarly();
  window.addEventListener('mypt:installable', syncFromEarly);

  if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator && window.isSecureContext) {
    const register = () => {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        // An offline page is a nicety. Failing to register must never be
        // visible, but it should be findable.
        console.warn('[pwa] service worker registration failed', err);
      });
    };
    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register, { once: true });
  }
}

/** Running as an installed app (home screen, standalone) or inside the APK. */
export function isInstalledApp(): boolean {
  if (typeof window === 'undefined') return false;
  const w = window as Window & { Capacitor?: unknown; navigator: Navigator & { standalone?: boolean } };
  return Boolean(
    w.Capacitor
    || w.matchMedia?.('(display-mode: standalone)').matches
    || w.navigator.standalone,
  );
}

/** iPhone/iPad, any browser: installing is a manual Share → Add to Home Screen. */
export function isIos(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

/**
 * How this device installs the app:
 *   'prompt' — the browser handed us its install dialog (Chrome/Edge/Samsung on Android, desktop Chrome/Edge)
 *   'ios'    — iPhone/iPad: Share → Add to Home Screen (Safari; also Chrome/Edge on iOS 16.4+)
 *   'menu'   — another phone browser: the browser menu's Install / Add to Home screen
 *   null     — already installed, inside the Android APK, or a desktop with no prompt
 */
export type InstallMode = 'prompt' | 'ios' | 'menu' | null;

export function installMode(): InstallMode {
  if (typeof window === 'undefined' || isInstalledApp()) return null;
  if (canPromptInstall()) return 'prompt';
  if (isIos()) return 'ios';
  const phone = window.matchMedia?.('(pointer: coarse)').matches && Math.min(window.screen.width, window.screen.height) < 820;
  return phone ? 'menu' : null;
}

export function canPromptInstall(): boolean { return deferred !== null; }

/** Show the browser's own install dialog. Resolves true if the person accepted. */
export async function promptInstall(): Promise<boolean> {
  const e = deferred;
  if (!e) return false;
  deferred = null; // the event can only be used once
  (window as EarlyWindow).__myptInstallPrompt = null;
  notify();
  await e.prompt();
  const { outcome } = await e.userChoice;
  return outcome === 'accepted';
}

export function onInstallAvailabilityChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}
