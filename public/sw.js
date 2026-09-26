/*
 * MY PT STUDIO service worker.
 *
 * One job: when a page navigation fails because the device is offline, show
 * a branded "you're offline" screen instead of the browser's dinosaur.
 *
 * What it deliberately does NOT do:
 *   - cache API responses. Everything under /api is a person's own data —
 *     payments, health screenings, messages — and a cache is a copy that
 *     outlives the session that was allowed to read it.
 *   - cache pages. A stale page after a deploy is a worse bug than no page.
 *   - touch cross-origin requests, or anything but GET navigations.
 *
 * Bump VERSION when offline.html or the precached assets change; activation
 * deletes every older cache.
 */
const VERSION = 'v1';
const CACHE = `mypt-offline-${VERSION}`;
const OFFLINE_URL = '/offline.html';
const PRECACHE = [OFFLINE_URL, '/icon-192.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(PRECACHE.map((u) => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('mypt-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // The offline page's own assets (its logo), from the cache when the network
  // is gone — otherwise the offline screen shows a broken image.
  if (req.mode !== 'navigate') {
    if (PRECACHE.includes(url.pathname)) {
      event.respondWith(fetch(req).catch(() => caches.match(url.pathname)));
    }
    return;
  }

  event.respondWith(
    fetch(req).catch(async () => {
      const cached = await caches.match(OFFLINE_URL);
      return cached || new Response('You are offline.', { status: 503, headers: { 'Content-Type': 'text/plain' } });
    }),
  );
});
