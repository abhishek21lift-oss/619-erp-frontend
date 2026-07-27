// These tests were written against an older AuthProvider and had drifted so
// far that all seven failed on every run. Three things had changed underneath
// them:
//
//   1. Session validation moved from api.auth.me() to a direct
//      http('/api/auth/me') call, and the module now also imports
//      refreshSession from '@/lib/http' — the old mocks supplied neither, so
//      the suite died at import with "No 'http' export is defined".
//   2. The cached user moved from localStorage to sessionStorage, under a new
//      key ('619_user_minimal_v3').
//   3. That cache is now deliberately MINIMAL — id, name, role and org only.
//      Email and other PII stay in memory, so a cache-hydrated user has
//      email: ''. Any test asserting an email after hydration is asserting the
//      opposite of the privacy behaviour.
//
// The probe below reads `name` rather than `email` for exactly that reason.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act, waitFor, screen } from '@testing-library/react';
import { useAuth, AuthProvider } from '@/lib/auth-context';
import type { ReactNode } from 'react';

const CACHE_KEY = '619_user_minimal_v3';

const mocks = vi.hoisted(() => ({
  mockHttp: vi.fn(),
  mockLoginApi: vi.fn(),
  mockLogoutApi: vi.fn(),
  mockRouterReplace: vi.fn(),
  mockResetLock: vi.fn(),
  mockRefreshSession: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  api: { auth: { login: mocks.mockLoginApi, logout: mocks.mockLogoutApi } },
  http: mocks.mockHttp,
}));

vi.mock('@/lib/http', () => ({
  resetRedirectLock: () => mocks.mockResetLock(),
  refreshSession: () => mocks.mockRefreshSession(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mocks.mockRouterReplace }),
}));

const CACHED = { id: 'u1', name: 'Cached Coach', role: 'admin', organization_name: 'Studio' };
const FRESH = { id: 'u2', name: 'Fresh Coach', email: 'fresh@x.com', role: 'admin' };

beforeEach(() => {
  Object.values(mocks).forEach((m) => m.mockReset());
  mocks.mockRefreshSession.mockResolvedValue(true);
  mocks.mockLogoutApi.mockResolvedValue(undefined);
  sessionStorage.clear();
  localStorage.clear();
});

function Probe() {
  const ctx = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(ctx.loading)}</span>
      <span data-testid="user">{ctx.user ? ctx.user.name : 'none'}</span>
    </div>
  );
}

function CaptureApi() {
  const api = useAuth();
  (CaptureApi as unknown as { api: typeof api }).api = api;
  return null;
}
const captured = () => (CaptureApi as unknown as { api: ReturnType<typeof useAuth> }).api;

const wrap = (node: ReactNode) => render(<AuthProvider>{node}</AuthProvider>);

describe('AuthProvider', () => {
  it('starts loading and resolves to no user when /me returns nothing', async () => {
    mocks.mockHttp.mockResolvedValue({});
    wrap(<Probe />);
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));
    expect(screen.getByTestId('user').textContent).toBe('none');
  });

  it('hydrates from the session cache before /me resolves', async () => {
    // The point of the cache: no blank flash on a hard refresh.
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(CACHED));
    let resolveMe!: (v: unknown) => void;
    mocks.mockHttp.mockReturnValue(new Promise((res) => { resolveMe = res; }));

    wrap(<Probe />);
    expect(screen.getByTestId('user').textContent).toBe('Cached Coach');

    await act(async () => { resolveMe({ user: { ...CACHED, email: 'cached@x.com' } }); });
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));
    expect(screen.getByTestId('user').textContent).toBe('Cached Coach');
  });

  it('never persists email to the cache', async () => {
    // Guards the privacy decision, which is otherwise invisible: the full user
    // stays in memory and only non-sensitive fields are written to storage.
    mocks.mockHttp.mockResolvedValue({ user: FRESH });
    wrap(<Probe />);
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));

    const raw = sessionStorage.getItem(CACHE_KEY);
    expect(raw).toBeTruthy();
    expect(raw).not.toContain('fresh@x.com');
    expect(JSON.parse(raw!)).not.toHaveProperty('email');
  });

  it('clears the cached user on a 401 from /me', async () => {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(CACHED));
    mocks.mockHttp.mockRejectedValue({ status: 401, message: 'no' });
    wrap(<Probe />);
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));
    expect(screen.getByTestId('user').textContent).toBe('none');
    expect(sessionStorage.getItem(CACHE_KEY)).toBeNull();
  });

  it('keeps the cached user on a 5xx from /me', async () => {
    // A cold-starting free-tier backend must not look like a logout.
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(CACHED));
    mocks.mockHttp.mockRejectedValue({ status: 503, message: 'down' });
    wrap(<Probe />);
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));
    expect(screen.getByTestId('user').textContent).toBe('Cached Coach');
  });

  it('keeps the cached user on a network failure with no status', async () => {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(CACHED));
    mocks.mockHttp.mockRejectedValue(new Error('Failed to fetch'));
    wrap(<Probe />);
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));
    expect(screen.getByTestId('user').textContent).toBe('Cached Coach');
  });

  it('login() sets the user, clears loading and resets the redirect lock', async () => {
    mocks.mockHttp.mockResolvedValue({});
    mocks.mockLoginApi.mockResolvedValue({ user: FRESH });
    wrap(<CaptureApi />);
    await waitFor(() => expect(captured().loading).toBe(false));

    await act(async () => { await captured().login('fresh@x.com', 'pw'); });

    expect(captured().user?.email).toBe('fresh@x.com');
    expect(captured().loading).toBe(false);
    expect(mocks.mockResetLock).toHaveBeenCalled();
  });

  it('logout() clears the user, the cache, and routes to /login', async () => {
    mocks.mockHttp.mockResolvedValue({ user: FRESH });
    wrap(<CaptureApi />);
    await waitFor(() => expect(captured().loading).toBe(false));
    expect(sessionStorage.getItem(CACHE_KEY)).toBeTruthy();

    await act(async () => { captured().logout(); });

    expect(captured().user).toBeNull();
    expect(sessionStorage.getItem(CACHE_KEY)).toBeNull();
    expect(mocks.mockRouterReplace).toHaveBeenCalledWith('/login');
  });

  it('handles a session-expired event by clearing state and routing to /login', async () => {
    mocks.mockHttp.mockResolvedValue({ user: FRESH });
    wrap(<CaptureApi />);
    await waitFor(() => expect(captured().user?.email).toBe('fresh@x.com'));

    await act(async () => { window.dispatchEvent(new CustomEvent('session-expired')); });

    await waitFor(() => expect(captured().user).toBeNull());
    expect(sessionStorage.getItem(CACHE_KEY)).toBeNull();
    expect(mocks.mockRouterReplace).toHaveBeenCalledWith('/login');
  });

  it('survives a corrupt cache entry instead of crashing the app', async () => {
    // sessionStorage is user-writable. A malformed value must not take the
    // whole provider down on boot.
    sessionStorage.setItem(CACHE_KEY, '{not json');
    mocks.mockHttp.mockResolvedValue({});
    wrap(<Probe />);
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));
    expect(screen.getByTestId('user').textContent).toBe('none');
  });
});
