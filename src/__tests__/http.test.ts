import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { http, ApiError, resetRedirectLock } from '@/lib/http';

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
    window.localStorage.setItem('619_user_v2', 'cached');

    vi.mocked(fetch)
      .mockResolvedValueOnce(mockJsonResponse(401, { error: { message: 'Token expired' } }))
      .mockResolvedValueOnce(mockJsonResponse(401, { error: { message: 'No refresh token' } }));

    await expect(http('/api/me')).rejects.toBeInstanceOf(ApiError);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(window.localStorage.getItem('619_user_v2')).toBeNull();
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

describe('ApiError', () => {
  it('isAuth/isForbidden/isNotFound/isServer helpers', () => {
    expect(new ApiError('a', 401).isAuth).toBe(true);
    expect(new ApiError('a', 403).isForbidden).toBe(true);
    expect(new ApiError('a', 404).isNotFound).toBe(true);
    expect(new ApiError('a', 500).isServer).toBe(true);
    expect(new ApiError('a', 502).isServer).toBe(true);
  });
});
