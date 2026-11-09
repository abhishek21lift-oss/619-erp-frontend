import { describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  portalForPage, safeReturnPath, unifiedRedirectTarget, startFreeRedirect, postSignInPath,
} from '@/lib/portals';
import { tenantAuthHeaders, refreshSession } from '@/lib/http';

const read = (...parts: string[]) =>
  fs.readFileSync(path.join(process.cwd(), 'src', ...parts), 'utf8');

describe('page portal', () => {
  it('marks the customer door and Start Free as neutral', () => {
    expect(portalForPage('/login')).toBe('unified');
    expect(portalForPage('/start-free')).toBe('unified');
    expect(portalForPage('/member/dashboard')).toBe('member');
    expect(portalForPage('/platform')).toBe('platform');
  });
});

describe('neutral request selector', () => {
  it('omits X-Portal on the customer door and keeps it elsewhere', () => {
    window.history.pushState({}, '', '/login');
    expect(tenantAuthHeaders()).not.toHaveProperty('X-Portal');

    window.history.pushState({}, '', '/member/dashboard');
    expect(tenantAuthHeaders()['X-Portal']).toBe('member');

    window.history.pushState({}, '', '/start-free');
    expect(tenantAuthHeaders()).not.toHaveProperty('X-Portal');
  });

  it('refreshes without X-Portal on the customer door', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);
    window.history.pushState({}, '', '/login');

    await refreshSession();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers).toEqual({});
  });

  it('keeps the member selector on a member page', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);
    window.history.pushState({}, '', '/member/dashboard');

    await refreshSession();

    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers).toEqual({ 'X-Portal': 'member' });
  });
});

describe('return targets', () => {
  it('follows a same-portal deep link and refuses a cross-portal one', () => {
    expect(safeReturnPath('/member/payments', 'member')).toBe('/member/payments');
    expect(safeReturnPath('/member/payments', 'trainer')).toBeNull();
    expect(safeReturnPath('/platform', 'trainer')).toBeNull();
    expect(safeReturnPath('/login', 'member')).toBeNull();
  });

  it('auto-redirects only for a fresh sign-in or a matching redirect', () => {
    expect(unifiedRedirectTarget(null, 'trainer', false)).toBeNull();
    expect(unifiedRedirectTarget('/member/dashboard', 'trainer', false)).toBeNull();
    expect(unifiedRedirectTarget('/member/dashboard', 'member', false)).toBe('/member/dashboard');
    expect(unifiedRedirectTarget(null, 'trainer', true)).toBe('/');
    expect(unifiedRedirectTarget(null, 'member', true)).toBe('/member/dashboard');
    expect(unifiedRedirectTarget('/pt-os/clients', 'member', true)).toBe('/member/dashboard');
  });

  it('sends only member and platform sessions away from Start Free', () => {
    expect(startFreeRedirect('trainer')).toBeNull();
    expect(startFreeRedirect('member')).toBe('/member/dashboard');
    expect(startFreeRedirect('super_admin')).toBe('/platform');
    expect(startFreeRedirect(null)).toBeNull();
  });

  it('keeps the fallback behavior of safeReturnTo', () => {
    expect(postSignInPath('trainer')).toBe('/');
    expect(postSignInPath('member')).toBe('/member/dashboard');
    expect(postSignInPath('super_admin')).toBe('/platform');
  });
});

describe('route wiring', () => {
  it('renders the customer door in unified mode', () => {
    expect(read('app', '(bare)', 'login', 'page.tsx')).toMatch(/<SignInScreen[^>]*unified/);
  });

  it('turns /member-login into the customer-door redirect', () => {
    const src = read('app', '(bare)', 'member-login', 'page.tsx');
    expect(src).toMatch(/redirect\(['"]\/login\?redirect=\/member\/dashboard['"]\)/);
    expect(src).not.toMatch(/['"]use client['"]/);
  });

  it('guards Start Free with the role-aware redirect', () => {
    const src = read('app', '(bare)', 'start-free', 'page.tsx');
    expect(src).toMatch(/startFreeRedirect\(user\.role\)/);
  });

  it('submits unified from the shared screen and redirects by target', () => {
    const src = read('components', 'auth', 'SignInScreen.tsx');
    expect(src).toMatch(/unified \? 'unified' : portal/);
    expect(src).toMatch(/unifiedRedirectTarget\(/);
  });
});
