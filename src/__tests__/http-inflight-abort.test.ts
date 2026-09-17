/**
 * In-flight GET de-duplication, and the cancellation it must not share.
 *
 * ── The bug ────────────────────────────────────────────────────────────────
 *
 * http() shares one promise between concurrent callers of the same GET. That
 * is right until a caller brings its own AbortSignal: the shared promise then
 * carries THAT caller's cancellation to everybody else, so the second caller
 * does not get a slow answer, it gets a rejected one for a reason of somebody
 * else's making.
 *
 * AuthProvider is exactly such a caller. It passes a signal and aborts it in
 * its effect cleanup. React StrictMode mounts, cleans up and remounts every
 * effect in development — and Fast Refresh does the same in any session — so
 * the remount asked for /api/auth/me, was handed the promise the first mount
 * had just cancelled, saw it reject, concluded there was no session, and sent
 * a signed-in person to /login with a valid cookie in the jar. No retry
 * happened, because as far as http() was concerned the request had been made.
 *
 * Caught by an E2E journey that opened a deep link in a fresh browser context
 * — no cached user in sessionStorage to mask it — and landed on the sign-in
 * screen. These tests hold the unit-level contract so it cannot come back.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { http, resetRedirectLock } from '@/lib/http';

const API_URL = 'http://localhost:5000';

beforeEach(() => {
  process.env.NEXT_PUBLIC_API_URL = API_URL;
  resetRedirectLock();
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** A fetch that honours the AbortSignal it is handed, like the real one. */
function abortAwareFetch(body: unknown, delayMs = 10) {
  return vi.fn((_url: string, init?: RequestInit) =>
    new Promise<Response>((resolve, reject) => {
      const signal = init?.signal;
      const timer = setTimeout(
        () => resolve({ ok: true, status: 200, json: () => Promise.resolve(body) } as Response),
        delayMs,
      );
      if (signal) {
        if (signal.aborted) { clearTimeout(timer); reject(new DOMException('Aborted', 'AbortError')); return; }
        signal.addEventListener('abort', () => {
          clearTimeout(timer);
          reject(new DOMException('Aborted', 'AbortError'));
        });
      }
    }),
  );
}

describe('http() in-flight GET sharing', () => {
  it('still de-duplicates concurrent GETs that carry no signal', async () => {
    const fetchMock = abortAwareFetch({ ok: true }, 5);
    vi.stubGlobal('fetch', fetchMock);

    const [a, b] = await Promise.all([
      http<{ ok: boolean }>('/api/ping'),
      http<{ ok: boolean }>('/api/ping'),
    ]);

    expect(a).toEqual({ ok: true });
    expect(b).toEqual({ ok: true });
    expect(fetchMock, 'two callers, one request').toHaveBeenCalledTimes(1);
  });

  it('does not hand one caller\'s cancellation to another', async () => {
    const fetchMock = abortAwareFetch({ user: { id: 'u1' } }, 50);
    vi.stubGlobal('fetch', fetchMock);

    // The first mount asks, then its cleanup aborts.
    const first = new AbortController();
    const firstCall = http('/api/auth/me', { signal: first.signal }).catch((e) => e);

    // The remount asks for the same thing with its own, live, controller.
    const second = new AbortController();
    const secondCall = http<{ user: { id: string } }>('/api/auth/me', { signal: second.signal });

    first.abort();

    await firstCall; // rejects, as its owner asked
    await expect(secondCall, 'the second caller gets a real answer').resolves.toEqual({ user: { id: 'u1' } });
    expect(fetchMock, 'a signal-bearing request is its own request').toHaveBeenCalledTimes(2);
  });

  it('a signal-bearing request does not evict a shared entry others are waiting on', async () => {
    const fetchMock = abortAwareFetch({ n: 1 }, 40);
    vi.stubGlobal('fetch', fetchMock);

    // Two shared callers join one request…
    const shared1 = http<{ n: number }>('/api/thing');
    const shared2 = http<{ n: number }>('/api/thing');

    // …while a third, with its own signal, starts and finishes its own.
    const own = new AbortController();
    const solo = http('/api/thing', { signal: own.signal }).catch((e) => e);
    own.abort();
    await solo;

    await expect(shared1).resolves.toEqual({ n: 1 });
    await expect(shared2).resolves.toEqual({ n: 1 });
    expect(fetchMock, 'one shared request plus one private one').toHaveBeenCalledTimes(2);
  });

  it('does not retry a request its caller cancelled', async () => {
    // GETs retry twice on network errors. An abort is not a network blip: the
    // retry re-enters fetch with the same dead signal and fails instantly,
    // three times, for nothing.
    const fetchMock = abortAwareFetch({ ok: true }, 50);
    vi.stubGlobal('fetch', fetchMock);

    const ac = new AbortController();
    const call = http('/api/slow', { signal: ac.signal });
    ac.abort();

    await expect(call).rejects.toBeInstanceOf(DOMException);
    expect(fetchMock, 'one attempt, not three').toHaveBeenCalledTimes(1);
  });
});
