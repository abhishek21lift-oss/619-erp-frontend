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

export function initPwa(): void {
  if (started || typeof window === 'undefined') return;
  started = true;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // offer it in our own UI, at a moment that makes sense
    deferred = e as InstallEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => { deferred = null; notify(); });

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

/** iPhone/iPad Safari, where installing is a manual Share → Add to Home Screen. */
export function isIosSafari(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  return ios && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
}

export function canPromptInstall(): boolean { return deferred !== null; }

/** Show the browser's own install dialog. Resolves true if the person accepted. */
export async function promptInstall(): Promise<boolean> {
  const e = deferred;
  if (!e) return false;
  deferred = null; // the event can only be used once
  notify();
  await e.prompt();
  const { outcome } = await e.userChoice;
  return outcome === 'accepted';
}

export function onInstallAvailabilityChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}
