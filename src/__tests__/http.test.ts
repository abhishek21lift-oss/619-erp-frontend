import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { http, ApiError, resetRedirectLock } from '@/lib/http';
import { writeCachedUser, readCachedUser, clearCachedUser } from '@/lib/session-cache';

const API_URL = 'http://localhost:5000';

beforeEach(() => {
  process.env.NEXT_PUBLIC_API_URL = API_URL;
  resetRedirectLock();
  // jsdom default location
  Object.defineProperty(window, 'location', {
    value: { ...window.location, hostname: 'localhost', pathname: '/' },
    writable: true,
  });
  vi.stubGlobal('fetch', vi.fn());
  if (typeof window !== 'undefined' && window.localStorage) window.localStorage.clear();
  clearCachedUser();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function mockJsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response;
}

describe('http()', () => {
  it('GETs the constructed url with credentials (no Content-Type for bodyless GET)', async () => {
    const fetchMock = vi.mocked(fetch).mockResolvedValueOnce(mockJsonResponse(200, { ok: true }));
    const result = await http<{ ok: boolean }>('/api/ping');
    expect(result).toEqual({ ok: true });
    const [calledUrl, calledInit] = fetchMock.mock.calls[0]!;
    expect(calledUrl).toBe(`${API_URL}/api/ping`);
    expect(calledInit!.credentials).toBe('include');
    expect((calledInit!.headers as Record<string, string>)['Content-Type']).toBeUndefined();
  });

  it('serialises JSON bodies and sends them', async () => {
    const fetchMock = vi.mocked(fetch).mockResolvedValueOnce(mockJsonResponse(200, { id: 7 }));
    const result = await http<{ id: number }>('/api/x', { method: 'POST', body: { name: 'A' } });
    expect(result).toEqual({ id: 7 });
    const [, init] = fetchMock.mock.calls[0]!;
    expect(init!.body).toBe('{"name":"A"}');
    expect(init!.method).toBe('POST');
  });

  it('passes FormData bodies through without forcing Content-Type', async () => {
    const fetchMock = vi.mocked(fetch).mockResolvedValueOnce(mockJsonResponse(200, {}));
    const fd = new FormData();
    fd.append('a', 'b');
    await http('/api/upload', { method: 'POST', body: fd });
    const [, init] = fetchMock.mock.calls[0]!;
    expect(init!.body).toBe(fd);
    expect((init!.headers as Record<string, string>)['Content-Type']).toBeUndefined();
  });

  it('throws ApiError with status + code on non-2xx responses', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      mockJsonResponse(400, { error: { message: 'Bad request', code: 'BAD_REQ' } }),
    );
    await expect(http('/api/bad')).rejects.toMatchObject({
      name: 'ApiError',
      message: 'Bad request',
      status: 400,
      code: 'BAD_REQ',
    });
  });

  it('returns undefined for 204 No Content', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 204,
      json: () => Promise.reject(new Error('no body')),
    } as Response);
    const r = await http('/api/none');
    expect(r).toBeUndefined();
  });

  it('dispatches session-expired on 401 and clears cached user', async () => {
    // Two things this test has to get right, both of which it previously did
    // not — which is why it sat failing rather than catching anything.
    //
    // 1. handleUnauthorized() deliberately does nothing on a PUBLIC path
    //    ('/', '/login', '/reset-password'): being signed out on the login
    //    page is not an expiry worth announcing. The shared beforeEach pins
    //    pathname to '/', so the event could never fire.
    // 2. A 401 is not final. http() first tries to refresh the access token
    //    via the rotating cookie and only gives up if that also fails — so
    //    the refresh call needs a response too, and it must be a 401 (the
    //    one status tryRefreshToken treats as "genuinely gone" instead of
    //    retrying with backoff).
    Object.defineProperty(window, 'location', {
      value: { ...window.location, hostname: 'localhost', pathname: '/clients' },
      writable: true,
    });

    const handler = vi.fn();
    window.addEventListener('session-expired', handler);
    // Seeded through the same helper AuthProvider writes with. This line used
    // to read localStorage.setItem('619_user_v2', …) and the assertion below
    // used to read it back — a matched pair that agreed with each other and
    // with nothing else in the codebase, so it passed for as long as the
    // cached user was never actually being cleared.
    writeCachedUser('cached');

    vi.mocked(fetch)
      .mockResolvedValueOnce(mockJsonResponse(401, { error: { message: 'Token expired' } }))
      .mockResolvedValueOnce(mockJsonResponse(401, { error: { message: 'No refresh token' } }));

    await expect(http('/api/me')).rejects.toBeInstanceOf(ApiError);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(readCachedUser()).toBeNull();
    window.removeEventListener('session-expired', handler);
  });

  it('stays quiet about a 401 on a public page', async () => {
    // The other half of the same rule. Landing on /login without a session is
    // the normal case, not an event worth firing at the app.
    const handler = vi.fn();
    window.addEventListener('session-expired', handler);
    vi.mocked(fetch)
      .mockResolvedValueOnce(mockJsonResponse(401, { error: { message: 'Token expired' } }))
      .mockResolvedValueOnce(mockJsonResponse(401, { error: { message: 'No refresh token' } }));

    await expect(http('/api/me')).rejects.toBeInstanceOf(ApiError);
    expect(handler).not.toHaveBeenCalled();
    window.removeEventListener('session-expired', handler);
  });

  it('caches successful GET responses for the TTL window', async () => {
    vi.mocked(fetch).mockResolvedValue(mockJsonResponse(200, { v: 1 }));
    const a = await http<{ v: number }>('/api/cached', { ttl: 10_000 });
    const b = await http<{ v: number }>('/api/cached', { ttl: 10_000 });
    expect(a).toEqual({ v: 1 });
    expect(b).toEqual({ v: 1 });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('does not cache POSTs', async () => {
    vi.mocked(fetch).mockResolvedValue(mockJsonResponse(200, { ok: true }));
    await http('/api/x', { method: 'POST', body: { a: 1 } });
    await http('/api/x', { method: 'POST', body: { a: 2 } });
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});

describe('the one-owner / one-trainer 409s reach the user readably', () => {
  // The backend refuses a second trainer or a second owner with a 409 whose
  // message names the account already holding the slot, so the studio owner can
  // go and edit it. Those messages are only useful if they survive the trip.
  //
  // The two guards answer in DIFFERENT shapes, deliberately: src/routes/*
  // answer `{ error: 'message', code }` and src/modules/* answer
  // `{ error: { code, message } }`, each matching its neighbours rather than
  // imposing one convention on a file that does not use it. fetchOnce already
  // reads both — this pins that, because a regression here does not throw or
  // log, it just replaces a sentence the owner can act on with "HTTP 409".

  it('surfaces TRAINER_LIMIT from the flat shape (POST /api/trainers)', async () => {
    const message = "Asha is already this studio's trainer. A studio has one trainer — edit them instead of adding another.";
    vi.mocked(fetch).mockResolvedValueOnce(mockJsonResponse(409, {
      error: message, code: 'TRAINER_LIMIT', trainer: { id: 'tr-1', name: 'Asha' },
    }));

    await expect(http('/api/trainers')).rejects.toMatchObject({
      name: 'ApiError', status: 409, code: 'TRAINER_LIMIT', message,
    });
  });

  it('surfaces TRAINER_LIMIT from the nested shape (POST /pt-os/trainers)', async () => {
    const message = "Asha is already this studio's trainer. A studio has one trainer — edit them instead of adding another.";
    vi.mocked(fetch).mockResolvedValueOnce(mockJsonResponse(409, {
      error: { code: 'TRAINER_LIMIT', message, trainer: { id: 'tr-1', name: 'Asha' } },
    }));

    await expect(http('/api/pt-os/trainers')).rejects.toMatchObject({
      name: 'ApiError', status: 409, code: 'TRAINER_LIMIT', message,
    });
  });

  it('surfaces OWNER_EXISTS in both shapes', async () => {
    const message = 'Deepak already owns this studio. A studio has one owner.';
    for (const body of [
      { error: message, code: 'OWNER_EXISTS', owner: { id: 'u1', email: 'd@s.test' } },
      { error: { code: 'OWNER_EXISTS', message, owner: { id: 'u1', email: 'd@s.test' } } },
    ]) {
      vi.mocked(fetch).mockResolvedValueOnce(mockJsonResponse(409, body));
      await expect(http('/api/auth/create-user')).rejects.toMatchObject({
        status: 409, code: 'OWNER_EXISTS', message,
      });
    }
  });

  it('keeps the payload, so a caller can offer a link to the existing trainer', async () => {
    // The id is in the body precisely so the Add Coach screen can say "edit
    // Asha" rather than only telling the owner they cannot proceed.
    vi.mocked(fetch).mockResolvedValueOnce(mockJsonResponse(409, {
      error: 'x', code: 'TRAINER_LIMIT', trainer: { id: 'tr-1', name: 'Asha' },
    }));

    const err = await http('/api/trainers').catch((e: unknown) => e as ApiError);
    expect((err.payload as { trainer: { id: string } }).trainer.id).toBe('tr-1');
  });
});

describe('ApiError', () => {
  it('isAuth/isForbidden/isNotFound/isServer helpers', () => {
    expect(new ApiError('a', 401).isAuth).toBe(true);
    expect(new ApiError('a', 403).isForbidden).toBe(true);
    expect(new ApiError('a', 404).isNotFound).toBe(true);
    expect(new ApiError('a', 500).isServer).toBe(true);
    expect(new ApiError('a', 502).isServer).toBe(true);
  });
});
