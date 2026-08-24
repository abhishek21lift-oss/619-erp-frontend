// Which pages the edge proxy lets through without a session.
// Keep this test tied to the shared public-path source of truth rather than
// parsing implementation details from proxy.ts.
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { SESSIONLESS_PAGES, isSessionlessPage } from '@/lib/public-paths';
import path from 'node:path';
import { srcPath } from '@/__tests__/helpers/app-routes';

const SRC = path.join(process.cwd(), 'src');
const proxySrc = fs.readFileSync(path.join(SRC, 'proxy.ts'), 'utf8');
const httpSrc = fs.readFileSync(path.join(SRC, 'lib', 'http.ts'), 'utf8');

function isPublic(pathname: string): boolean {
  return isSessionlessPage(pathname.split('?')[0]) || [
    '/checkin', '/_next', '/api/health', '/api/auth', '/models',
    '/favicon.ico', '/manifest.json', '/platform-manifest.json',
    '/theme-init.js', '/no-zoom.js', '/logo.png', '/619-logo.png',
    '/sitemap.xml', '/robots.txt', '/icons', '/images',
  ].some((p) => pathname === p || pathname.startsWith(p + '/') || pathname.startsWith(p + '?'));
}

const TOKEN_ENTRY_POINTS: Array<{ url: string; page: string; who: string }> = [
  { url: '/client/activate?token=abc', page: 'app/client/activate/page.tsx', who: 'a client following their activation email' },
  { url: '/auth/set-password?token=abc', page: 'app/auth/set-password/page.tsx', who: 'an invited studio owner' },
  { url: '/reset-password?token=abc', page: 'app/reset-password/page.tsx', who: 'anyone who forgot their password' },
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
    expect(proxySrc).toMatch(/SESSIONLESS_PAGES/);
  });

  it('still bounces a signed-out visitor out of the back office', () => {
    for (const p of ['/pt-os/clients', '/finance/dues', '/checkin/qr-scanner']) {
      expect(isSessionlessPage(p)).toBe(false);
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
      expect(isPublic(p)).toBe(false);
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
