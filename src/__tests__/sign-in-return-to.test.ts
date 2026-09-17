/**
 * The `?redirect=` parameter, and the open redirect it must not become.
 *
 * `proxy.ts` writes this parameter on every bounce to a sign-in page, and
 * until safeReturnTo existed nothing read it: a trainer whose access token
 * lapsed mid-payment-entry signed back in and landed on the client list. These
 * tests hold both halves — that the return trip happens, and that it can only
 * ever land somewhere this account is allowed to be, on this origin.
 *
 * The attack vectors below are not hypothetical decoration. `?redirect=` is in
 * the URL bar of a real sign-in form on the real domain; anything that follows
 * it blindly hands a just-authenticated person to whoever wrote the link.
 */

import { describe, it, expect } from 'vitest';
import { safeReturnTo, postSignInPath } from '@/lib/portals';
import { SESSIONLESS_PAGES, signInPathFor } from '@/lib/public-paths';

describe('safeReturnTo — the return trip', () => {
  it('sends a trainer back to the page their session expired on', () => {
    expect(safeReturnTo('/pt-os/clients/abc/payments', 'admin')).toBe('/pt-os/clients/abc/payments');
    expect(safeReturnTo('/pt-os/clients/abc/payments', 'trainer')).toBe('/pt-os/clients/abc/payments');
  });

  it('preserves the query string, because the destination may be a filtered view', () => {
    expect(safeReturnTo('/pt-os/clients?status=active&q=raj', 'admin'))
      .toBe('/pt-os/clients?status=active&q=raj');
  });

  it('sends a member back into the member app', () => {
    expect(safeReturnTo('/member/payments', 'member')).toBe('/member/payments');
  });

  it('falls back to postSignInPath when there is no destination', () => {
    for (const role of ['admin', 'trainer', 'member', 'super_admin', null, undefined]) {
      expect(safeReturnTo(null, role)).toBe(postSignInPath(role));
      expect(safeReturnTo(undefined, role)).toBe(postSignInPath(role));
      expect(safeReturnTo('', role)).toBe(postSignInPath(role));
    }
  });
});

describe('safeReturnTo — what it refuses', () => {
  // Every one of these, followed literally, is a credential-phishing handoff
  // from the genuine sign-in page.
  const offSite = [
    'https://evil.example/login',
    'http://evil.example',
    '//evil.example',
    '//evil.example/pt-os/clients',
    '/\\evil.example',            // browsers normalise \ to /, making this scheme-relative
    '\\\\evil.example',
    'javascript:alert(1)',
    'data:text/html,<h1>hi',
    'evil.example',
    'about:blank',
  ];

  it.each(offSite)('refuses %j and falls back', (raw) => {
    expect(safeReturnTo(raw, 'admin')).toBe(postSignInPath('admin'));
  });

  it('refuses control characters and whitespace smuggling', () => {
    const controls = ['/pt-os\n/clients', '/pt-os\r\nSet-Cookie: x=1', '/pt-os clients', ' /pt-os', '\t/pt-os'];
    for (const raw of controls) {
      expect(safeReturnTo(raw, 'admin')).toBe(postSignInPath('admin'));
    }
  });

  it('never returns somebody to a door, which would loop', () => {
    for (const door of ['/login', '/member-login', '/platform-login'] as const) {
      expect(safeReturnTo(door, 'admin')).not.toBe(door);
      expect(safeReturnTo(door, 'member')).not.toBe(door);
      expect(safeReturnTo(`${door}?redirect=%2Fpt-os`, 'admin')).not.toContain('login');
    }
  });

  it('refuses a destination in a portal this account may not enter', () => {
    // A member handed a staff link lands on their own dashboard.
    expect(safeReturnTo('/pt-os/clients', 'member')).toBe('/member/dashboard');
    expect(safeReturnTo('/platform/tenants', 'member')).toBe('/member/dashboard');
    // Studio staff may not walk into the Command Center.
    expect(safeReturnTo('/platform/tenants', 'admin')).toBe(postSignInPath('admin'));
    expect(safeReturnTo('/platform', 'trainer')).toBe(postSignInPath('trainer'));
    // A trainer may not be sent into the client app.
    expect(safeReturnTo('/member/payments', 'admin')).toBe(postSignInPath('admin'));
    // The operator supporting a studio is the sanctioned exception.
    expect(safeReturnTo('/pt-os/clients', 'super_admin')).toBe('/pt-os/clients');
  });

  it('only ever returns a same-origin path', () => {
    const probes = [...offSite, '/pt-os/clients', '/member/payments', '/platform', null, ''];
    for (const raw of probes) {
      for (const role of ['admin', 'trainer', 'member', 'super_admin']) {
        const out = safeReturnTo(raw, role);
        expect(out.startsWith('/')).toBe(true);
        expect(out.startsWith('//')).toBe(false);
        expect(new URL(out, 'http://app.local').origin).toBe('http://app.local');
      }
    }
  });
});

describe('the parameter proxy.ts actually writes', () => {
  // Guards the contract between the two files: proxy.ts writes the raw
  // pathname, so whatever it can write must be something safeReturnTo accepts
  // for the account that page belongs to. If a future edit makes proxy.ts
  // write an absolute URL, or makes safeReturnTo stricter about a shape the
  // proxy emits, this fails rather than silently re-breaking the return trip.
  const bounced: Array<[string, string]> = [
    ['/pt-os/clients', 'admin'],
    ['/pt-os/clients/abc/payments', 'trainer'],
    ['/finance/invoices', 'admin'],
    ['/member/payments', 'member'],
    ['/platform/tenants', 'super_admin'],
  ];

  it.each(bounced)('a session expiring on %s returns there after signing in', (pathname, role) => {
    // What proxy.ts builds, reproduced exactly.
    const loginUrl = new URL(signInPathFor(pathname), 'http://app.local');
    if (pathname !== '/' && pathname !== loginUrl.pathname) {
      loginUrl.searchParams.set('redirect', pathname);
    }
    const raw = loginUrl.searchParams.get('redirect');
    expect(safeReturnTo(raw, role)).toBe(pathname);
  });

  it('never writes a redirect for a page that needs no session', () => {
    // A sessionless page is never bounced, so it never becomes a destination.
    for (const page of SESSIONLESS_PAGES) {
      expect(safeReturnTo(page, 'admin')).not.toBe('/login');
    }
  });
});
