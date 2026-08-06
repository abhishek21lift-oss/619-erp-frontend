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
import path from 'node:path';

const SRC = path.join(process.cwd(), 'src');
const proxySrc = fs.readFileSync(path.join(SRC, 'proxy.ts'), 'utf8');

/** PUBLIC_PREFIXES as the proxy actually declares it. */
function publicPrefixes(): string[] {
  const block = proxySrc.match(/const PUBLIC_PREFIXES:\s*string\[\]\s*=\s*\[([\s\S]*?)\n\];/);
  if (!block) throw new Error('PUBLIC_PREFIXES not found — has proxy.ts been restructured?');
  const withoutComments = block[1].replace(/\/\/[^\n]*/g, ' ');
  return Array.from(withoutComments.matchAll(/'([^']+)'/g)).map((m) => m[1]);
}

/** The proxy's own matching rule, copied so the test exercises real semantics. */
function isPublic(pathname: string): boolean {
  return publicPrefixes().some(
    (p) => pathname === p || pathname.startsWith(p + '/') || pathname.startsWith(p + '?'),
  );
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
    expect(fs.existsSync(path.join(SRC, page))).toBe(true);
  });

  it('keeps the token, which the redirect would not', () => {
    // redirectToLogin copies only the pathname into ?redirect=. So a bounced
    // activation link is not merely inconvenient — the credential is gone and
    // the trainer has to issue a new one. Worth stating because it is why
    // this list matters more than it looks.
    expect(proxySrc).toMatch(/loginUrl\.searchParams\.set\('redirect', pathname\)/);
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
    // Belt and braces: if the matcher skipped this path the PUBLIC_PREFIXES
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
