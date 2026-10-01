import { describe, it, expect, vi } from 'vitest';

// The root layout loads its font through next/font, which only exists inside
// the Next compiler. Only the layout's `metadata` export is read here.
vi.mock('next/font/google', () => {
  const font = () => ({ className: '', variable: '' });
  return { Inter: font, JetBrains_Mono: font };
});
import fs from 'node:fs';
import path from 'node:path';
import robots, { PRIVATE_SEGMENTS } from '@/app/robots';
import sitemap, { PUBLIC_ROUTES } from '@/app/sitemap';
import { PUBLIC_SEO_ROUTES, SITE_URL, canonicalUrl } from '@/lib/seo-routes';
import { SESSIONLESS_PAGES } from '@/lib/public-paths';
import { isPublicProxyPath } from '@/proxy';
import nextConfig from '../../next.config.js';
import { metadata as rootMetadata } from '@/app/layout';
import { metadata as homeMetadata } from '@/app/(chrome)/page';
import { metadata as ptOsMetadata } from '@/app/(bare)/pt-os/page';
import { metadata as startFreeMetadata } from '@/app/(bare)/start-free/layout';

const APP = path.join(__dirname, '..', 'app');
const read = (rel: string) => fs.readFileSync(path.join(APP, rel), 'utf8');

function realSegments(): string[] {
  const out = new Set<string>();
  for (const group of ['(bare)', '(chrome)', '(platform)']) {
    const dir = path.join(APP, group);
    if (!fs.existsSync(dir)) continue;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!e.isDirectory()) continue;
      if (e.name.startsWith('(') || e.name.startsWith('[')) continue;
      out.add(`/${e.name}`);
    }
  }
  return [...out].sort();
}

describe('indexable marketing routes', () => {
  it('the sitemap lists exactly the public routes', () => {
    const urls = sitemap().map((e) => e.url.replace('https://myptstudio.com', '') || '/');
    expect(urls.sort()).toEqual([...PUBLIC_ROUTES].sort());
  });

  it('/login is not in the sitemap', () => {
    const urls = sitemap().map((e) => e.url);
    expect(urls.some((u) => u.endsWith('/login'))).toBe(false);
  });

  it('every public route exports metadata that opts in to indexing', () => {
    const optIns: Record<string, string> = {
      '/': '(chrome)/page.tsx',
      '/start-free': '(bare)/start-free/layout.tsx',
      '/pt-os': '(bare)/pt-os/page.tsx',
    };
    for (const route of PUBLIC_ROUTES) {
      const src = read(optIns[route]);
      expect(src).toMatch(/robots:\s*\{\s*index:\s*true,\s*follow:\s*true\s*\}/);
      expect(src).not.toMatch(/^\s*['"]use client['"]\s*;?\s*$/m);
      expect(src).toMatch(/export const metadata/);
    }
  });

  it('each public route declares its own canonical', () => {
    expect(read('(chrome)/page.tsx')).toMatch(/canonical:\s*'\/'/);
    expect(read('(bare)/start-free/layout.tsx')).toMatch(/canonical:\s*'\/start-free'/);
    expect(read('(bare)/pt-os/page.tsx')).toMatch(/canonical:\s*'\/pt-os'/);
  });

  it('the root layout does not declare a global canonical', () => {
    const root = read('layout.tsx');
    const alternates = root.match(/alternates:\s*\{[^}]*\}/);
    expect(alternates).toBeNull();
  });

  it('the root layout still defaults to noindex', () => {
    // `\s*` before the closing brace, like the opt-in assertion above it. It
    // was the one position in this pattern without it, so the invariant it
    // guards — the whole origin is noindex unless a route opts in — was being
    // reported as broken by `robots: { index: false, follow: false },`, which
    // is exactly the thing it wants to see. A formatting-sensitive assertion
    // on a security default is worse than no assertion: it cries wolf until
    // somebody "fixes" it by loosening what it checks.
    expect(read('layout.tsx')).toMatch(/robots:\s*\{\s*index:\s*false,\s*follow:\s*false\s*\}/);
  });
});

describe('robots.txt describes routes that exist', () => {
  const rule = robots().rules;
  const first = Array.isArray(rule) ? rule[0] : rule;
  const disallow = ([] as string[]).concat(first.disallow ?? []);

  it('allows the root and disallows authenticated routes', () => {
    expect(first.allow).toEqual([...PUBLIC_SEO_ROUTES]);
    expect(disallow.length).toBeGreaterThan(10);
  });

  it('every disallowed top-level segment is a real route', () => {
    const real = new Set(realSegments());
    const topLevel = PRIVATE_SEGMENTS.filter((s) => !s.startsWith('/api/'));
    const phantom = topLevel.filter((s) => !real.has(s));
    expect(phantom).toEqual([]);
  });

  it('no real top-level segment is left unclassified', () => {
    const publicTop = new Set(['/start-free', '/pt-os']);
    const listed = new Set(PRIVATE_SEGMENTS);
    const unclassified = realSegments().filter(
      (s) => !listed.has(s) && !publicTop.has(s) && s !== '/login',
    );
    expect(unclassified).toEqual([]);
  });

  it('keeps crawlers off the API and sign-in form', () => {
    expect(disallow).toContain('/api/');
    expect(disallow).toContain('/login');
  });

  it('does not disallow public marketing routes', () => {
    for (const route of PUBLIC_ROUTES) {
      expect(disallow).not.toContain(route);
    }
  });

  it('points at the sitemap', () => {
    expect(robots().sitemap).toBe('https://myptstudio.com/sitemap.xml');
  });
});

// ── The SEO route contract ──────────────────────────────────────────────────
//
// One list (lib/seo-routes.ts) and every crawler-facing surface held to it.
// /pt-os is the case these exist for: its page was indexable, self-canonical
// and in the sitemap while next.config.js 308-redirected it to `/`, because
// redirects are checked before the filesystem. Each surface looked right on
// its own; only reading them together showed the URL could not be reached.

type Redirect = { source: string; destination: string; permanent?: boolean; has?: unknown[] };

async function redirects(): Promise<Redirect[]> {
  const cfg = nextConfig as unknown as { redirects: () => Promise<Redirect[]> };
  return cfg.redirects();
}

/** Next's source syntax → a RegExp: `:name` is one segment, `:name*` any. */
function sourceRegex(source: string): RegExp {
  const body = source
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\/:[A-Za-z_]\w*\*/g, '(?:/.*)?')
    .replace(/:[A-Za-z_]\w*/g, '[^/]+');
  return new RegExp(`^${body}$`);
}

const PUBLIC_METADATA = {
  '/': homeMetadata,
  '/pt-os': ptOsMetadata,
  '/start-free': startFreeMetadata,
} as const;

describe('the public SEO contract', () => {
  it('is exactly /, /pt-os and /start-free', () => {
    expect([...PUBLIC_SEO_ROUTES].sort()).toEqual(['/', '/pt-os', '/start-free']);
    expect([...PUBLIC_ROUTES].sort()).toEqual([...PUBLIC_SEO_ROUTES].sort());
  });

  it('resolves canonicals against the same origin as metadataBase', () => {
    expect(String(rootMetadata.metadataBase)).toBe(`${SITE_URL}/`);
  });

  it.each(PUBLIC_SEO_ROUTES)('%s is indexable, followable and self-canonical', (route) => {
    const m = PUBLIC_METADATA[route];
    expect(m.robots).toEqual({ index: true, follow: true });
    expect(m.alternates?.canonical).toBe(route);
    const og = m.openGraph as { url?: string } | undefined;
    if (og?.url) expect(og.url.replace(/\/$/, '')).toBe(canonicalUrl(route));
  });

  it('gives each public route its own title and description', () => {
    const resolveTitle = (m: typeof rootMetadata) =>
      (typeof m.title === 'string' ? m.title : (m.title as { default?: string } | undefined)?.default) ?? null;
    const titles = PUBLIC_SEO_ROUTES.map((r) => resolveTitle(PUBLIC_METADATA[r]) ?? resolveTitle(rootMetadata));
    const descriptions = PUBLIC_SEO_ROUTES.map((r) => PUBLIC_METADATA[r].description ?? rootMetadata.description);
    expect(new Set(titles).size).toBe(PUBLIC_SEO_ROUTES.length);
    expect(new Set(descriptions).size).toBe(PUBLIC_SEO_ROUTES.length);
    for (const d of descriptions) expect((d ?? '').length).toBeGreaterThan(50);
  });

  it('lists exactly the canonical URL of each public route in the sitemap', () => {
    const urls = sitemap().map((e) => e.url);
    expect(urls).toEqual(PUBLIC_SEO_ROUTES.map(canonicalUrl));
    expect(new Set(urls).size).toBe(urls.length);
    expect(urls.every((u) => u.startsWith(SITE_URL))).toBe(true);
  });

  it('keeps /login and /api out of the sitemap', () => {
    const paths = sitemap().map((e) => new URL(e.url).pathname);
    expect(paths.some((p) => p === '/login' || p.startsWith('/login/'))).toBe(false);
    expect(paths.some((p) => p.startsWith('/api'))).toBe(false);
  });

  it('robots.txt allows every public route and no Disallow prefix-matches one', () => {
    const rules = robots().rules;
    const first = Array.isArray(rules) ? rules[0] : rules;
    const disallow = ([] as string[]).concat(first.disallow ?? []);
    // robots.txt Disallow is a prefix match: `/pt` would block `/pt-os`.
    for (const route of PUBLIC_SEO_ROUTES) {
      if (route === '/') continue;
      expect(disallow.filter((d) => route.startsWith(d))).toEqual([]);
    }
    expect(disallow).not.toContain('/');
    expect(first.allow).toEqual([...PUBLIC_SEO_ROUTES]);
  });

  it('serves every public route without a session (the proxy never sends it to sign-in)', () => {
    for (const route of PUBLIC_SEO_ROUTES) {
      expect(SESSIONLESS_PAGES as readonly string[]).toContain(route);
      expect(isPublicProxyPath(route)).toBe(true);
    }
  });

  it('keeps authenticated pages under a public parent private', () => {
    expect(isPublicProxyPath('/pt-os/clients')).toBe(false);
    expect(isPublicProxyPath('/start-free/x')).toBe(false);
  });

  it('has a real page for every public route', () => {
    expect(fs.existsSync(path.join(APP, '(chrome)/page.tsx'))).toBe(true);
    expect(fs.existsSync(path.join(APP, '(bare)/pt-os/page.tsx'))).toBe(true);
    expect(fs.existsSync(path.join(APP, '(bare)/start-free/page.tsx'))).toBe(true);
  });
});

describe('redirects do not contradict the SEO contract', () => {
  it('no public route is the source of a redirect', async () => {
    const rs = await redirects();
    for (const route of PUBLIC_SEO_ROUTES) {
      const hits = rs.filter((r) => sourceRegex(r.source).test(route)).map((r) => r.source);
      expect({ route, hits }).toEqual({ route, hits: [] });
    }
  });

  it('/pt-os does not redirect to /', async () => {
    const rs = await redirects();
    expect(rs.find((r) => r.source === '/pt-os')).toBeUndefined();
  });

  it('a redirect that lands on a public route does so in one hop', async () => {
    const rs = await redirects();
    for (const r of rs) {
      const dest = r.destination.split('?')[0];
      if (!(PUBLIC_SEO_ROUTES as readonly string[]).includes(dest)) continue;
      // The destination must not itself be redirected.
      expect(rs.filter((x) => sourceRegex(x.source).test(dest))).toEqual([]);
    }
  });

  it('no redirect forms a chain or a loop', async () => {
    const rs = await redirects();
    for (const r of rs) {
      if (r.has) continue; // conditional on the query string; destinations are fully parameterised
      const dest = r.destination.split('?')[0];
      if (dest.includes(':')) continue;
      const next = rs.filter((x) => !x.has && sourceRegex(x.source).test(dest));
      expect({ from: r.source, to: dest, next: next.map((x) => x.source) }).toEqual({ from: r.source, to: dest, next: [] });
    }
  });

  it('no static redirect source shadows a real page', async () => {
    // Redirects run before the filesystem, so a source with a page.tsx makes
    // that page unreachable — which is what happened to /pt-os.
    const rs = await redirects();
    const pageFor = (p: string) =>
      ['(bare)', '(chrome)', '(platform)'].some((g) => fs.existsSync(path.join(APP, g, p, 'page.tsx')));
    const shadowing = rs
      .filter((r) => !r.source.includes(':'))
      .filter((r) => pageFor(r.source.replace(/^\//, '')))
      .map((r) => r.source);
    expect(shadowing).toEqual([]);
  });
});
