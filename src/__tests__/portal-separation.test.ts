// Keeping the two sign-in doors apart.
//
// There is one auth cookie per browser, but two portals that refuse each
// other's accounts. Everything in this file is a consequence of that: which
// door somebody is sent back to, which account a door will walk into, and
// which identity a door is allowed to remember.
//
// ── The bug that produced it ──
//
// "Client ki profile me trainer ki profile open ho rahi hai." A trainer opened
// Member Login on a device where they were already signed in. AuthProvider
// resolved /api/auth/me — the trainer, correctly, it was their session — and
// SignInScreen's redirect effect read only `user.role` and fired
// router.replace('/pt-os'). The client never saw the form. The server was not
// at fault and could not have been: it answered the session it was handed.
//
// Three smaller versions of the same confusion shipped alongside it — the
// remembered-account chip showing the trainer's email on the client's page,
// logout dropping a member on Admin Login, and the activation email's dead-end
// button pointing at a door that refuses members.
//
// ── And the session cache ──
//
// The last group asserts something duller and worse: that the key for the
// cached user is declared exactly once. auth-context.tsx wrote
// '619_user_minimal_v3' to sessionStorage while http.ts cleared
// '619_user_v2' from localStorage, so a 401 removed nothing and the previous
// person's identity was still there for the next mount to paint. That is the
// same shape as the two /client/activate bugs (see public-paths.ts): one idea,
// two copies, one of them maintained.
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { signInPathFor, SESSIONLESS_PAGES } from '@/lib/public-paths';
import { rememberKeys, portalForRole } from '@/lib/portals';
import { SESSION_USER_KEY } from '@/lib/session-cache';

const SRC = path.join(process.cwd(), 'src');
const read = (...p: string[]) => fs.readFileSync(path.join(SRC, ...p), 'utf8');

const authContextSrc = read('lib', 'auth-context.tsx');
const httpSrc = read('lib', 'http.ts');
const signInSrc = read('components', 'auth', 'SignInScreen.tsx');
const proxySrc = read('proxy.ts');
const activateSrc = read('app', 'client', 'activate', 'page.tsx');

describe('signInPathFor', () => {
  it.each([
    ['/member/dashboard', '/member-login'],
    ['/member/classes', '/member-login'],
    ['/member/payments', '/member-login'],
    ['/member', '/member-login'],
    ['/member-login', '/member-login'],
    ['/pt-os', '/login'],
    ['/clients', '/login'],
    ['/trainer/dashboard', '/login'],
    ['/', '/login'],
    ['/login', '/login'],
  ])('%s → %s', (from, expected) => {
    expect(signInPathFor(from)).toBe(expected);
  });

  it('does not treat /member-login as part of the member app', () => {
    // '/member-login'.startsWith('/member') is true. A prefix match would fold
    // the sign-in page into the app it guards — harmless here by luck, since
    // both answers are '/member-login', but the same slip on a future
    // '/members-only' page would route staff to the client door.
    expect(signInPathFor('/membership-plans')).toBe('/login');
    expect(signInPathFor('/members')).toBe('/login');
  });

  it('returns a page that is reachable without a session', () => {
    for (const from of ['/member/dashboard', '/pt-os']) {
      expect(SESSIONLESS_PAGES as readonly string[]).toContain(signInPathFor(from));
    }
  });
});

describe('nobody is sent to the wrong door', () => {
  it('auth-context routes sign-out through signInPathFor, not a literal', () => {
    // logout(), the idle timeout and the session-expired listener all used
    // router.replace('/login'), so every one of them dropped a client on the
    // page that refuses client accounts.
    expect(authContextSrc).toMatch(/signInPathFor\(/);
    expect(authContextSrc).not.toMatch(/router\.replace\('\/login'\)/);
  });

  it('the edge proxy redirects an expired member session to Member Login', () => {
    expect(proxySrc).toMatch(/signInPathFor\(/);
    expect(proxySrc).not.toMatch(/loginUrl\.pathname = '\/login'/);
  });

  it('the activation page never points a client at Admin Login', () => {
    // This page is only ever opened by a client, from an email. Every way out
    // of it — the countdown, the button, the dead-link fallback — has to be
    // the member door.
    expect(activateSrc).not.toMatch(/['"]\/login['"]/);
    expect(activateSrc).toMatch(/['"]\/member-login['"]/);
  });
});

describe('a sign-in page will not walk into the other portal', () => {
  it('SignInScreen guards its redirect effect on the session matching the portal', () => {
    // The reported bug in one line: the effect below used to run for any
    // authenticated user, whichever door it was rendered behind.
    expect(signInSrc).toMatch(/const foreignSession =/);
    expect(signInSrc).toMatch(/if \(loading \|\| !user \|\| foreignSession\) return;/);
  });

  it('classifies every role into exactly one portal', () => {
    // The server's users_role_check permits exactly these. `member` is the
    // only client role; everything else is studio staff, so a new staff role
    // added tomorrow lands on the staff side by default rather than being
    // silently treated as a client.
    for (const role of ['super_admin', 'admin', 'manager', 'trainer', 'reception', 'receptionist', 'staff']) {
      expect(portalForRole(role), role).toBe('staff');
    }
    expect(portalForRole('member')).toBe('member');
    expect(portalForRole(null)).toBe('staff');
    expect(portalForRole(undefined)).toBe('staff');
  });

  it('reads the session portal from the role, not from the page', () => {
    expect(signInSrc).toMatch(/sessionPortal[^\n]*portalForRole\(user\.role\)/);
  });

  it('offers a way out instead of silently signing the other person out', () => {
    // Clearing somebody's session because a second person opened a login page
    // would be its own bug. The panel names the session and makes leaving it a
    // tap.
    expect(signInSrc).toMatch(/if \(foreignSession && user\)/);
    expect(signInSrc).toMatch(/Sign out and continue/);
  });
});

describe('the remembered account is scoped to its portal', () => {
  it('member and staff share no key at all', () => {
    // Called, not read. An earlier version of this test matched the source for
    // `portal === 'member'` and passed against `portal === 'member' ? '' : ''`
    // — the exact bug, with the shape of the fix.
    const staff = rememberKeys('staff');
    const member = rememberKeys('member');
    const staffKeys = Object.values(staff);
    const memberKeys = Object.values(member);
    expect(new Set([...staffKeys, ...memberKeys]).size).toBe(staffKeys.length + memberKeys.length);
    for (const k of Object.keys(staff) as Array<keyof typeof staff>) {
      expect(member[k], k).not.toBe(staff[k]);
    }
  });

  it('leaves the existing staff keys alone', () => {
    // Changing these would sign every trainer out of their remembered account
    // for no reason — the bug was only ever on the member side.
    expect(rememberKeys('staff')).toEqual({
      email: 'myptstudio.lastEmail',
      org: 'myptstudio.lastOrg',
      remember: 'myptstudio.remember',
    });
  });

  it('no bare localStorage key survives in SignInScreen', () => {
    // A single leftover `localStorage.getItem('myptstudio.lastEmail')` would
    // put the trainer's email back on the client's page, and it would look
    // exactly like the code that is now correct.
    expect(signInSrc).not.toMatch(/['"]myptstudio\.(lastEmail|lastOrg|remember)['"]/);
  });
});

describe('the cached user has exactly one key', () => {
  it('is declared in session-cache.ts and nowhere else', () => {
    expect(SESSION_USER_KEY).toBe('619_user_minimal_v3');
    for (const [name, src] of [['auth-context.tsx', authContextSrc], ['http.ts', httpSrc]] as const) {
      expect(src, `${name} re-declares the session key`).not.toMatch(/const SESSION_USER_KEY\s*=/);
    }
  });

  it('http.ts clears the cache through the shared helper', () => {
    // Not `localStorage.removeItem(...)`. The cache lives in sessionStorage,
    // and http.ts reaching for the wrong store is the whole original defect.
    expect(httpSrc).toMatch(/clearCachedUser\(\)/);
    expect(httpSrc).not.toMatch(/localStorage\.removeItem/);
  });

  it('auth-context.tsx goes through the shared helpers too', () => {
    expect(authContextSrc).toMatch(/from '\.\/session-cache'/);
    expect(authContextSrc).not.toMatch(/sessionStorage\.(get|set|remove)Item/);
  });
});

describe('clearCachedUser actually clears what writeCachedUser wrote', () => {
  it('round-trips through the same storage', async () => {
    const { writeCachedUser, readCachedUser, clearCachedUser } = await import('@/lib/session-cache');
    writeCachedUser('{"id":"usr-1","role":"admin"}');
    expect(readCachedUser()).toBe('{"id":"usr-1","role":"admin"}');
    clearCachedUser();
    expect(readCachedUser()).toBeNull();
    // And the store it used is the one the comment promises — a future edit
    // moving it to localStorage would survive the round trip above.
    expect(window.sessionStorage.getItem(SESSION_USER_KEY)).toBeNull();
  });
});
