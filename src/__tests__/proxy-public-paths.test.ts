// Which pages the edge proxy lets through without a session.
//
// This is the list that decides whether somebody arriving from an email can
// reach the page that email is about. Get it wrong and there is no error, no
// log line and no failing build — the request 307s to /login and the feature
// simply does not exist for the person it was written for.
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { SESSIONLESS_PAGES, isSessionlessPage } from '@/lib/public-paths';
import path from 'node:path';
import { srcPath } from '@/__tests__/helpers/app-routes';

const SRC = path.join(process.cwd(), 'src');
const proxySrc = fs.readFileSync(path.join(SRC, 'proxy.ts'), 'utf8');
const httpSrc = fs.readFileSync(path.join(SRC, 'lib', 'http.ts'), 'utf8');

/** PUBLIC_ASSET_PREFIXES are the proxy-local prefixes; SESSIONLESS_PAGES is shared. */
function publicAssetPrefixes(): string[] {
  const block = proxySrc.match(/const PUBLIC_ASSET_PREFIXES:\s*string\[\]\s*=\s*\[([\s\S]*?)\n\];/);
  if (!block) throw new Error('PUBLIC_ASSET_PREFIXES not found — has proxy.ts been restructured?');
  const withoutComments = block[1].replace(/\/\/[^\n]*/g, ' ');
  return Array.from(withoutComments.matchAll(/'([^']+)'/g)).map((m) => m[1]);
}

/** The proxy's effective public-prefix set, including the shared sessionless pages. */
function isPublic(pathname: string): boolean {
  const all = [...SESSIONLESS_PAGES, ...publicAssetPrefixes()];
  return all.some(
    (p) => pathname === p || pathname.startsWith(p + '/') || pathname.startsWith(p + '?'),
  );
}

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
    expect(fs.existsSync(srcPath(...page.split('/')))).toBe(true);
  });

  it('keeps the token, which the redirect would not', () => {
    expect(proxySrc).toMatch(/loginUrl\.searchParams\.set\('redirect', pathname\)/);
  });
});

describe('the 401 handler lets them stay', () => {
  it.each(TOKEN_ENTRY_POINTS)('$who is not bounced by a 401 on $url', ({ url }) => {
    expect(isSessionlessPage(url.split('?')[0])).toBe(true);
  });

  it('reads the shared list rather than keeping its own copy', () => {
    const code = httpSrc.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');
    expect(code).toMatch(/PUBLIC_CLIENT_PATHS[^=]*=\s*SESSIONLESS_PAGES/);
    expect(code).not.toMatch(/PUBLIC_CLIENT_PATHS[^=]*=\s*\[/);
  });

  it('and so does the proxy', () => {
    expect(proxySrc).toMatch(/PUBLIC_PREFIXES[^=]*=\s*\[\.\.\.SESSIONLESS_PAGES/);
  });

  it('still bounces a signed-out visitor out of the back office', () => {
    for (const p of ['/pt-os/clients', '/finance/dues', '/checkin/qr-scanner']) {
      expect([p, isSessionlessPage(p)]).toEqual([p, false]);
    }
  });
});

describe('being public is not accidentally contagious', () => {
  it('does not open the whole /client segment', () => {
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
    const m = proxySrc.match(/matcher:\s*\[\s*'([^']+)'/);
    expect(m).toBeTruthy();
    const re = new RegExp(`^${m![1].replace(/\\\\/g, '\\')}$`);
    expect(re.test('/client/activate')).toBe(true);
    expect(re.test('/api/client-activation/abc')).toBe(false);
  });
});
