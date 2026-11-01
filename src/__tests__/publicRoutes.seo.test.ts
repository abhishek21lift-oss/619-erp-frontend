import { describe, it, expect, vi } from 'vitest';

// The root layout loads its font through next/font, which only exists inside
// the Next compiler. Only the layout's `metadata` export is read here.
vi.mock('next/font/google', () => {
  const font = () => ({ className: '', variable: '' });
  return { Inter: font, JetBrains_Mono: font };
});
import fs from 'node:fs';
import path from 'node:path';
import robots, { AI_CRAWLERS, PRIVATE_PREFIXES, PRIVATE_SEGMENTS } from '@/app/robots';
import sitemap, { PUBLIC_ROUTES } from '@/app/sitemap';
import { PUBLIC_SEO_ROUTES, SITE_URL, canonicalUrl } from '@/lib/seo-routes';
import { SESSIONLESS_PAGES } from '@/lib/public-paths';
import { isPublicProxyPath } from '@/proxy';
import nextConfig from '../../next.config.js';
import { metadata as rootMetadata } from '@/app/layout';
import { metadata as homeMetadata } from '@/app/(chrome)/page';
import {
  HOME_STRUCTURED_DATA,
  buildHomeStructuredData,
  buildPlanOffers,
} from '@/lib/home-structured-data';
import type { PublicPlan } from '@/components/landing/types';
import { PT_OS_STRUCTURED_DATA } from '@/lib/pt-os-structured-data';
import { ORGANIZATION_NODE, SOFTWARE_FEATURES } from '@/lib/schema-org';
import { START_FREE_STRUCTURED_DATA } from '@/lib/start-free-structured-data';
import { PT_OS_FAQ } from '@/components/landing/pt-os-faq-content';
import { HOME_FAQ } from '@/components/landing/faq-content';
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
      expect(src).toMatch(/robots:\s*\{\s*index:\s*true,\s*follow:\s*true\b/);
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

  it('blocks the authenticated PT OS subtree without blocking /pt-os', () => {
    expect(PRIVATE_PREFIXES).toEqual(['/pt-os/']);
    expect(disallow).toContain('/pt-os/');
    // robots.txt is a prefix match: `/pt-os` does not start with `/pt-os/`.
    expect(disallow).not.toContain('/pt-os');
    expect(disallow.filter((d) => '/pt-os'.startsWith(d))).toEqual([]);
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

// ── AI crawler policy ──────────────────────────────────────────────────────
//
// One explicit group for the answer engines, with exactly the same public
// allow-list and private blocks as the `*` rule. Duplicating the policy for AI
// must not open a door the wildcard rule closes.

describe('AI crawler policy', () => {
  type Rule = { userAgent: string | string[]; allow?: string[]; disallow?: string[] };
  const rules = robots().rules as Rule[];

  it('keeps the wildcard rule first', () => {
    expect(rules[0].userAgent).toBe('*');
  });

  it('gives AI crawlers the same public allow-list as everyone else', () => {
    expect(rules).toHaveLength(2);
    expect(rules[1].userAgent).toEqual(AI_CRAWLERS);
    expect(rules[1].allow).toEqual([...PUBLIC_SEO_ROUTES]);
  });

  it('blocks the same private segments for AI crawlers', () => {
    expect(rules[1].disallow).toEqual(rules[0].disallow);
    expect(rules[1].disallow).toContain('/api/');
    expect(rules[1].disallow).toContain('/login');
    expect(rules[1].disallow).toContain('/pt-os/');
    expect(rules[1].disallow).not.toContain('/pt-os');
  });

  it('names the answer-engine crawlers the product wants to reach', () => {
    expect(AI_CRAWLERS).toEqual([
      'GPTBot', 'OAI-SearchBot', 'ChatGPT-User',
      'PerplexityBot', 'Perplexity-User',
      'ClaudeBot', 'Claude-SearchBot', 'Claude-User',
      'Google-Extended', 'Applebot-Extended', 'CCBot',
    ]);
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
    expect(m.robots).toEqual({
      index: true,
      follow: true,
      'max-snippet': -1,
      'max-image-preview': 'large',
    });
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

// ── Structured data ────────────────────────────────────────────────────────
//
// The homepage is the only page with a FAQ; the schema is checked against the
// array the accordion actually renders so the two cannot drift.

describe('homepage structured data', () => {
  type SchemaNode = Record<string, unknown> & { '@type': string };
  const graph = HOME_STRUCTURED_DATA['@graph'] as readonly SchemaNode[];
  const node = (type: string) => graph.find((n) => n['@type'] === type);

  it('describes the organization, site, product, page and FAQ', () => {
    expect(graph.map((n) => n['@type'])).toEqual([
      'Organization',
      'WebSite',
      'SoftwareApplication',
      'WebPage',
      'FAQPage',
    ]);
  });

  it('marks up every FAQ the accordion renders, verbatim', () => {
    const faq = node('FAQPage') as {
      mainEntity: { name: string; acceptedAnswer: { text: string } }[];
    };
    expect(faq.mainEntity.map((q) => q.name)).toEqual(HOME_FAQ.map((f) => f.q));
    expect(faq.mainEntity.map((q) => q.acceptedAnswer.text)).toEqual(HOME_FAQ.map((f) => f.a));
  });

  it('uses the canonical origin for every URL', () => {
    const urls = JSON.stringify(graph).match(/https?:\/\/[^"\\]+/g) ?? [];
    expect(urls.length).toBeGreaterThan(0);
    for (const url of urls) expect(url.startsWith(SITE_URL)).toBe(true);
  });
});

// ── /pt-os structured data ─────────────────────────────────────────────────
//
// Same rule as the homepage: the FAQPage must be built from the array the
// accordion renders, not a second copy.

describe('/pt-os structured data', () => {
  type SchemaNode = Record<string, unknown> & { '@type': string };
  const graph = PT_OS_STRUCTURED_DATA['@graph'] as readonly SchemaNode[];
  const node = (type: string) => graph.find((n) => n['@type'] === type);

  it('describes the organization, site, product, page, breadcrumb and FAQ', () => {
    expect(graph.map((n) => n['@type'])).toEqual([
      'Organization',
      'WebSite',
      'SoftwareApplication',
      'WebPage',
      'BreadcrumbList',
      'FAQPage',
    ]);
  });

  it('marks up every PT OS FAQ the accordion renders, verbatim', () => {
    const faq = node('FAQPage') as {
      mainEntity: { name: string; acceptedAnswer: { text: string } }[];
    };
    expect(faq.mainEntity.map((q) => q.name)).toEqual(PT_OS_FAQ.map((f) => f.q));
    expect(faq.mainEntity.map((q) => q.acceptedAnswer.text)).toEqual(PT_OS_FAQ.map((f) => f.a));
  });

  it('uses the canonical origin for every URL', () => {
    const urls = JSON.stringify(graph).match(/https?:\/\/[^"\\]+/g) ?? [];
    expect(urls.length).toBeGreaterThan(0);
    for (const url of urls) expect(url.startsWith(SITE_URL)).toBe(true);
  });

  it('breadcrumbs home to /pt-os in one step', () => {
    const crumbs = (node('BreadcrumbList') as { itemListElement: { item: string }[] }).itemListElement;
    expect(crumbs.map((c) => c.item)).toEqual([SITE_URL, canonicalUrl('/pt-os')]);
  });

  it('shares the homepage entity ids rather than inventing new ones', () => {
    const ids = (type: string) => (node(type) as Record<string, unknown>)['@id'];
    const home = HOME_STRUCTURED_DATA['@graph'] as readonly SchemaNode[];
    const homeNode = (type: string) => home.find((n) => n['@type'] === type);
    for (const type of ['Organization', 'WebSite', 'SoftwareApplication']) {
      expect(ids(type)).toBe((homeNode(type) as Record<string, unknown>)['@id']);
    }
  });

  it('ships the JSON-LD in the page the crawler receives', () => {
    expect(read('(bare)/pt-os/page.tsx')).toMatch(/PT_OS_STRUCTURED_DATA_JSON/);
    expect(read('(bare)/pt-os/page.tsx')).toMatch(/application\/ld\+json/);
  });
});

// ── Social previews ────────────────────────────────────────────────────────
//
// The app icon is 512×512; as an OG image it was cropped into a 1.91:1 card.
// Each shareable page now gets a real 1200×630 card.

describe('social preview images', () => {
  it('no route points Open Graph at the app icon', () => {
    for (const file of ['layout.tsx', '(chrome)/page.tsx', '(bare)/pt-os/page.tsx', '(bare)/start-free/layout.tsx']) {
      expect(read(file)).not.toMatch(/openGraph[\s\S]{0,400}icon-512/);
    }
  });

  it('every public route has a generated 1200×630 card', () => {
    for (const file of [
      'opengraph-image.tsx',
      '(bare)/pt-os/opengraph-image.tsx',
      '(bare)/start-free/opengraph-image.tsx',
    ]) {
      const src = read(file);
      expect(src).toMatch(/OG_SIZE/);
      expect(src).toMatch(/contentType/);
      expect(src).toMatch(/export const alt/);
    }
    expect(fs.existsSync(path.join(APP, '..', 'lib', 'og-card.tsx'))).toBe(true);
  });

  it('serves the cards without a session (the proxy never sends them to sign-in)', () => {
    expect(isPublicProxyPath('/opengraph-image')).toBe(true);
    expect(isPublicProxyPath('/pt-os/opengraph-image-79vnhd')).toBe(true);
    expect(isPublicProxyPath('/start-free/opengraph-image-abc123')).toBe(true);
    // Still not a way into the authenticated app.
    expect(isPublicProxyPath('/pt-os/clients')).toBe(false);
    expect(isPublicProxyPath('/pt-os/opengraph-image/../../clients')).toBe(false);
  });

  it('declares a large-image Twitter card', () => {
    expect(rootMetadata.twitter).toEqual({ card: 'summary_large_image' });
  });
});

// ── llms.txt ───────────────────────────────────────────────────────────────
//
// A static crawler aid. It is not a page in the SEO contract: no canonical,
// no sitemap entry, no `robots` metadata — just a file the proxy must serve
// without a session.

describe('llms.txt', () => {
  const file = path.join(__dirname, '..', '..', 'public', 'llms.txt');

  it('exists, names every public URL and states the trial and contact', () => {
    const txt = fs.readFileSync(file, 'utf8');
    for (const route of PUBLIC_SEO_ROUTES) expect(txt).toContain(canonicalUrl(route));
    expect(txt).toContain('7-day free trial');
    expect(txt).toContain('support@myptstudio.com');
  });

  it('is served without a session', () => {
    expect(isPublicProxyPath('/llms.txt')).toBe(true);
  });

  it('is not part of the indexable page contract', () => {
    expect(PUBLIC_SEO_ROUTES as readonly string[]).not.toContain('/llms.txt');
  });
});

// ── Search-engine ownership proof ──────────────────────────────────────────
//
// The property was verified with a root-level google<hex>.html file. The auth
// proxy was redirecting it to /login, so the crawler sent to re-verify the
// domain never saw the token.

describe('search-engine ownership proof', () => {
  it('allows every google verification file that exists in public/', () => {
    const pub = path.join(APP, '..', '..', 'public');
    const files = fs.readdirSync(pub).filter((f) => /^google[0-9a-f]+\.html$/i.test(f));
    expect(files.length).toBeGreaterThan(0);
    for (const f of files) expect(isPublicProxyPath(`/${f}`)).toBe(true);
  });

  it('allows BingSiteAuth.xml', () => {
    expect(isPublicProxyPath('/BingSiteAuth.xml')).toBe(true);
  });

  it('does not open arbitrary .html files', () => {
    expect(isPublicProxyPath('/checkout.html')).toBe(false);
    expect(isPublicProxyPath('/google-verify.html')).toBe(false);
    expect(isPublicProxyPath('/wireframes.html')).toBe(false);
  });
});

// ── Shared entity details ──────────────────────────────────────────────────
//
// Facts an answer engine can quote: how to reach support and what the product
// actually does. Both are shared constants so the homepage and /pt-os cannot
// drift into describing different companies or different products.

describe('shared entity details', () => {
  it('states the real support contact without inventing an address', () => {
    expect(ORGANIZATION_NODE.email).toBe('support@myptstudio.com');
    expect(ORGANIZATION_NODE.contactPoint).toEqual({
      '@type': 'ContactPoint',
      contactType: 'customer support',
      email: 'support@myptstudio.com',
    });
    expect(ORGANIZATION_NODE).not.toHaveProperty('address');
    expect(ORGANIZATION_NODE).not.toHaveProperty('sameAs');
  });

  it('lists every shipped product area once', () => {
    expect(SOFTWARE_FEATURES).toEqual([
      'Command dashboard',
      'Attendance & check-in',
      'Billing & collections',
      'Client lifecycle',
      'Programmes & templates',
      'Exercise library',
      'Progress tracking',
      'AI Coach',
      'AI insights',
      'Knowledge base',
      'WhatsApp outreach',
      'Campaigns & offers',
      'Finance & forecast',
      'Retention radar',
    ]);
  });

  it('puts the same feature list on both SoftwareApplication nodes', () => {
    type SchemaNode = Record<string, unknown> & { '@type': string };
    for (const data of [HOME_STRUCTURED_DATA, PT_OS_STRUCTURED_DATA]) {
      const graph = data['@graph'] as readonly SchemaNode[];
      const app = graph.find((n) => n['@type'] === 'SoftwareApplication');
      expect(app?.featureList).toBe(SOFTWARE_FEATURES);
    }
  });
});

// ── Homepage offers ────────────────────────────────────────────────────────
//
// Prices come from the same live plan payload the page renders. If the API
// returns nothing, the markup says nothing: an empty `offers: []` or a made-up
// price would both be worse than no offer at all.

describe('homepage offers', () => {
  const plans: PublicPlan[] = [
    {
      code: 'starter', name: 'Starter', price_inr: 999, effective_price_inr: 899,
      is_launch: false, duration_months: 1, client_limit: 30, best_for: 'Solo trainers',
    },
    {
      code: 'growth', name: 'Growth', price_inr: 0, effective_price_inr: 0,
      is_launch: true, duration_months: 12, client_limit: null, best_for: null,
    },
  ];
  type SchemaNode = Record<string, unknown> & { '@type': string };
  const softwareNode = (data: ReturnType<typeof buildHomeStructuredData>) =>
    (data['@graph'] as readonly SchemaNode[])
      .find((n) => n['@type'] === 'SoftwareApplication') as Record<string, unknown>;

  it('builds one Offer per live plan from the effective price', () => {
    expect(buildPlanOffers(plans)).toEqual([
      {
        '@type': 'Offer', name: 'Starter', price: 899, priceCurrency: 'INR',
        description: '1-month plan', url: `${SITE_URL}/#pricing`,
      },
      {
        '@type': 'Offer', name: 'Growth', price: 0, priceCurrency: 'INR',
        description: '12-month plan', url: `${SITE_URL}/#pricing`,
      },
    ]);
  });

  it('adds the offers to the SoftwareApplication node', () => {
    const node = softwareNode(buildHomeStructuredData(buildPlanOffers(plans)));
    expect(node.offers).toHaveLength(2);
  });

  it('omits offers when no plans load, rather than claiming a price', () => {
    expect(softwareNode(buildHomeStructuredData())).not.toHaveProperty('offers');
    expect(softwareNode(buildHomeStructuredData([]))).not.toHaveProperty('offers');
  });

  it('keeps the no-offers base graph for the other contract tests', () => {
    expect(HOME_STRUCTURED_DATA['@graph'].map((n) => (n as { '@type': string })['@type'])).toEqual([
      'Organization', 'WebSite', 'SoftwareApplication', 'WebPage', 'FAQPage',
    ]);
  });
});

// ── /start-free structured data ────────────────────────────────────────────

describe('/start-free structured data', () => {
  type SchemaNode = Record<string, unknown> & { '@type': string };
  const graph = START_FREE_STRUCTURED_DATA['@graph'] as readonly SchemaNode[];
  const node = (type: string) => graph.find((n) => n['@type'] === type);

  it('describes the organization, site, page and breadcrumb', () => {
    expect(graph.map((n) => n['@type'])).toEqual([
      'Organization', 'WebSite', 'WebPage', 'BreadcrumbList',
    ]);
  });

  it('crumbs home to /start-free in one step', () => {
    const crumbs = (node('BreadcrumbList') as { itemListElement: { item: string }[] }).itemListElement;
    expect(crumbs.map((c) => c.item)).toEqual([SITE_URL, canonicalUrl('/start-free')]);
  });

  it('shares the homepage entity ids', () => {
    const home = HOME_STRUCTURED_DATA['@graph'] as readonly SchemaNode[];
    for (const type of ['Organization', 'WebSite']) {
      const own = node(type) as Record<string, unknown>;
      const shared = home.find((n) => n['@type'] === type) as Record<string, unknown>;
      expect(own['@id']).toBe(shared['@id']);
    }
  });

  it('ships the JSON-LD in the layout a crawler receives', () => {
    expect(read('(bare)/start-free/layout.tsx')).toMatch(/START_FREE_STRUCTURED_DATA_JSON/);
    expect(read('(bare)/start-free/layout.tsx')).toMatch(/application\/ld\+json/);
  });
});
