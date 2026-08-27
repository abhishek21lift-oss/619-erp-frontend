// Which pages the edge proxy lets through without a session.
//
// This is the list that decides whether somebody arriving from an email can
// reach the page that email is about. Get it wrong and there is no error, no
// log line and no failing build — the request 307s to /login and the feature
// simply does not exist for the person it was written for.
//
// It has now gone wrong twice for the same reason. `/auth/set-password` was
// added with a comment saying "without this the invitation link 307s to /login
// and the studio can never be claimed". `/client/activate` was then built as
// the client-facing twin of that flow and not added, so every activation email
// bounced its recipient to a login screen for an account they cannot log into
// yet — and the redirect preserves only the pathname, so the ?token= was gone
// too. A comment on one entry did not generalise. A test does.
//
// ── The rule ──
//
// Any page a person can be sent a LINK to before they have an account must be
// public here. That is a small, enumerable set, and it is spelled out below
// rather than derived, because the derivation ("pages that don't use Guard")
// would quietly pass the day somebody forgets Guard on a private page.
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { isSessionlessPage } from '@/lib/public-paths';
import { isPublicProxyPath } from '@/proxy';
import path from 'node:path';
import { srcPath } from '@/__tests__/helpers/app-routes';

const SRC = path.join(process.cwd(), 'src');
const proxySrc = fs.readFileSync(path.join(SRC, 'proxy.ts'), 'utf8');

const httpSrc = fs.readFileSync(path.join(SRC, 'lib', 'http.ts'), 'utf8');

/**
 * The proxy's own decision, asked of the proxy.
 *
 * This used to scrape `const PUBLIC_PREFIXES` out of proxy.ts with a regex and
 * re-implement the matching over the strings it found. That is how this file
 * came to fail on a change it should have been indifferent to: the proxy split
 * its one list into exact `SESSIONLESS_PAGES` and prefix-matched
 * `PUBLIC_ASSET_PREFIXES`, and the regex stopped finding a name that no longer
 * existed. Worse than the false alarm is the direction it cannot catch — a
 * copied rule can drift from the real one silently, which is the whole failure
 * mode this suite exists to prevent.
 *
 * `isPublicProxyPath` is exported for this; command-center-separation.test.ts
 * already calls it.
 *
 * The query string comes off first because that is what the proxy is handed:
 * Next resolves `req.nextUrl.pathname` without one. The fixtures keep their
 * `?token=abc` deliberately — that is the URL a person actually clicks — so the
 * stripping belongs here rather than in the list.
 */
function isPublic(url: string): boolean {
  return isPublicProxyPath(url.split('?')[0]);
}

/**
 * Every page reachable from a link sent to somebody with no account, and the
 * file that serves it. Both halves are checked: a path that is public but has
 * no page is a dead entry, and a page that exists but is not public is the bug
 * this file exists to prevent.
 */
const TOKEN_ENTRY_POINTS: Array<{ url: string; page: string; who: string }> = [
  {
    url: '/client/activate?token=abc',
    page: 'app/client/activate/page.tsx',
    who: 'a client following their activation email',
  },
  {
    url: '/auth/set-password?token=abc',
    page: 'app/auth/set-password/page.tsx',
    who: 'an invited studio owner',
  },
  {
    url: '/reset-password?token=abc',
    page: 'app/reset-password/page.tsx',
    who: 'anyone who forgot their password',
  },
];

describe('the proxy lets in everyone who arrives from an email', () => {
  it.each(TOKEN_ENTRY_POINTS)('$who can reach $url', ({ url }) => {
    expect(isPublic(url)).toBe(true);
  });

  it.each(TOKEN_ENTRY_POINTS)('$url is actually served by a page', ({ page }) => {
    // Stops the list above from drifting into fiction: an entry kept public
    // for a page that was renamed or deleted is a hole, not a safety net.
    expect(fs.existsSync(srcPath(...page.split('/')))).toBe(true);
  });

  it('keeps the token, which the redirect would not', () => {
    // redirectToLogin copies only the pathname into ?redirect=. So a bounced
    // activation link is not merely inconvenient — the credential is gone and
    // the trainer has to issue a new one. Worth stating because it is why
    // this list matters more than it looks.
    expect(proxySrc).toMatch(/loginUrl\.searchParams\.set\('redirect', pathname\)/);
  });
});

describe('the 401 handler lets them stay', () => {
  // The second half of the same bug, and the reason the first fix was not
  // enough. Getting past the proxy only means the page RENDERS. AuthProvider
  // then calls /api/auth/me on mount, a visitor with no session correctly
  // gets a 401, and http.ts dispatches `session-expired` for any path it does
  // not recognise — which router.replace()s to /login. Reported as "it opens
  // for half a second and then the sign-in screen comes back".

  it.each(TOKEN_ENTRY_POINTS)('$who is not bounced by a 401 on $url', ({ url }) => {
    // Exact match here, unlike the proxy: http compares window.location.pathname.
    expect(isSessionlessPage(url.split('?')[0])).toBe(true);
  });

  it('reads the shared list rather than keeping its own copy', () => {
    // The root cause was two hand-maintained lists. If http.ts re-declares
    // its own, this fails — because the next person to add a token link will
    // update one of them and ship this bug a third time.
    const code = httpSrc.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');
    expect(code).toMatch(/PUBLIC_CLIENT_PATHS[^=]*=\s*SESSIONLESS_PAGES/);
    expect(code).not.toMatch(/PUBLIC_CLIENT_PATHS[^=]*=\s*\[/);
  });

  it('and so does the proxy', () => {
    // Asserted as "imports the shared list", not as a particular syntax. This
    // read `/\.\.\.SESSIONLESS_PAGES/` and so failed when the proxy stopped
    // spreading the list into a prefix array and started matching it exactly —
    // a change that strengthened the very rule this test guards. What matters
    // is that there is one list, not how the proxy consumes it.
    expect(proxySrc).toMatch(/import\s*\{[^}]*\bSESSIONLESS_PAGES\b[^}]*\}\s*from\s*'@\/lib\/public-paths'/);
    // And that it has not grown a second copy alongside the import.
    expect(proxySrc).not.toMatch(/const\s+SESSIONLESS_PAGES\s*[:=]/);
  });

  it('still bounces a signed-out visitor out of the back office', () => {
    // The guard against over-correcting: a 401 deep in the app must still end
    // at the sign-in screen.
    for (const p of ['/pt-os/clients', '/finance/dues', '/checkin/qr-scanner']) {
      expect([p, isSessionlessPage(p)]).toEqual([p, false]);
    }
  });
});

describe('being public is not accidentally contagious', () => {
  it('does not open the whole /client segment', () => {
    // Only the activation page is public. A signed-in client's own data will
    // live under this segment later and must stay gated — prefix matching
    // means '/client' here would have opened all of it.
    expect(isPublic('/client/dashboard')).toBe(false);
    expect(isPublic('/client')).toBe(false);
  });

  it('still gates the back office', () => {
    for (const p of ['/pt-os/clients', '/finance/dues', '/trainers', '/platform', '/settings']) {
      expect([p, isPublic(p)]).toEqual([p, false]);
    }
  });

  it('does not open all of /auth', () => {
    expect(isPublic('/auth/set-password')).toBe(true);
    expect(isPublic('/authorised-users')).toBe(false);
  });
});

describe('the matcher actually runs on these paths', () => {
  it('does not exempt /client/activate', () => {
    // Belt and braces: if the matcher skipped this path the SESSIONLESS_PAGES
    // entry would be decorative, and a future tightening of the matcher would
    // reintroduce the bug with the entry still sitting there looking correct.
    const m = proxySrc.match(/matcher:\s*\[\s*'([^']+)'/);
    expect(m).toBeTruthy();
    // Anchored, because Next matches the matcher against the WHOLE pathname.
    // Unanchored, `.test()` finds a match at any offset: '/api/client-...'
    // passes by matching from the second slash onwards, where the negative
    // lookahead for `api` no longer applies. That made the first version of
    // this assertion report the opposite of the truth.
    const re = new RegExp(`^${m![1].replace(/\\\\/g, '\\')}$`);
    expect(re.test('/client/activate')).toBe(true);
    expect(re.test('/api/client-activation/abc')).toBe(false);
  });
});
