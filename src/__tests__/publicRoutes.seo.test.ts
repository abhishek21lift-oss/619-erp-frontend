import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import robots, { PRIVATE_SEGMENTS } from '@/app/robots';
import sitemap, { PUBLIC_ROUTES } from '@/app/sitemap';

// Indexing is decided in four places that must agree.
//
// ── The bug this exists to stop ────────────────────────────────────────────
//
// They did not agree. robots.txt said `allow: '/'`, sitemap.xml advertised the
// homepage at priority 1.0, and src/app/layout.tsx emitted
// `noindex, nofollow` on every route on the origin. The meta tag wins, so the
// marketing site invited crawlers in, handed them a list of pages it wanted
// ranked, and then told them to index none of it. Nothing errored. No test
// failed. The site was simply absent from search.
//
// It is the same shape as the (chrome) landing-page bug documented in
// ChromeGate: a global rule applied correctly to 122 routes and wrongly to the
// two that are the entire public face of the product, and the failure was
// silent because "page not in Google" has no stack trace.
//
// ── The posture being pinned ───────────────────────────────────────────────
//
// Default-deny. The root layout is noindex for everything; a route opts in by
// exporting its own `metadata`. This file asserts that the opt-ins, the
// sitemap and robots.txt describe the same two routes, and that no route
// classified as private has quietly become indexable.

const APP = path.join(__dirname, '..', 'app');

/** Reads a source file relative to src/app. */
const read = (rel: string) => fs.readFileSync(path.join(APP, rel), 'utf8');

/** Top-level URL segments that really exist, read from the route tree. */
function realSegments(): string[] {
  const out = new Set<string>();
  for (const group of ['(bare)', '(chrome)', '(platform)']) {
    const dir = path.join(APP, group);
    if (!fs.existsSync(dir)) continue;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      // Route groups do not appear in URLs; dynamic catch-alls are not a
      // segment anyone can be told to avoid.
      if (!e.isDirectory()) continue;
      if (e.name.startsWith('(') || e.name.startsWith('[')) continue;
      out.add(`/${e.name}`);
    }
  }
  return [...out].sort();
}

describe('the site has exactly two indexable routes', () => {
  it('the sitemap lists the public routes and nothing else', () => {
    const urls = sitemap().map((e) => e.url.replace('https://myptstudio.com', '') || '/');
    expect(urls.sort()).toEqual([...PUBLIC_ROUTES].sort());
  });

  it('/login is not in the sitemap', () => {
    // It was, at priority 0.8, while simultaneously carrying noindex. A
    // sitemap is a list of URLs the site wants indexed; a sign-in form is not
    // one of them.
    const urls = sitemap().map((e) => e.url);
    expect(urls.some((u) => u.endsWith('/login'))).toBe(false);
  });

  it('every public route exports metadata that opts back in to indexing', () => {
    // The root default is noindex. Without an explicit opt-in in a SERVER
    // component, a public page inherits it and disappears from search — which
    // is exactly what had happened to `/`.
    const optIns: Record<string, string> = {
      '/': '(chrome)/page.tsx',
      '/start-free': '(bare)/start-free/layout.tsx',
    };
    for (const route of PUBLIC_ROUTES) {
      const src = read(optIns[route]);
      expect(src).toMatch(/robots:\s*\{\s*index:\s*true,\s*follow:\s*true\s*\}/);
      // A client component cannot export metadata: Next silently ignores it,
      // so the page keeps the root's noindex while LOOKING correct — the file
      // still has an `export const metadata` block sitting right there.
      //
      // Checked as "contains the directive anywhere", not "starts with it". A
      // directive prologue may follow comments, and both of these files open
      // with a long comment — so a first-line check passes while `'use
      // client'` sits on line 34 doing its damage. A mutation caught that:
      // inserting the directive above the imports reproduced the original bug
      // and the first draft of this test called it fine.
      expect(src).not.toMatch(/^\s*['"]use client['"]\s*;?\s*$/m);
      expect(src).toMatch(/export const metadata/);
    }
  });

  it('each public route declares its own canonical', () => {
    expect(read('(chrome)/page.tsx')).toMatch(/canonical:\s*'\/'/);
    expect(read('(bare)/start-free/layout.tsx')).toMatch(/canonical:\s*'\/start-free'/);
  });

  it('the root layout does not declare a global canonical', () => {
    // `alternates: { canonical: '/' }` at the root made all 124 URLs claim to
    // be the homepage. Harmless only while everything was noindex.
    const root = read('layout.tsx');
    const alternates = root.match(/alternates:\s*\{[^}]*\}/);
    expect(alternates).toBeNull();
  });

  it('the root layout still defaults to noindex', () => {
    expect(read('layout.tsx')).toMatch(/robots:\s*\{\s*index:\s*false,\s*follow:\s*false\s*\}/);
  });
});

describe('robots.txt describes routes that exist', () => {
  const rule = robots().rules;
  const first = Array.isArray(rule) ? rule[0] : rule;
  const disallow = ([] as string[]).concat(first.disallow ?? []);

  it('disallows something and allows the root', () => {
    expect(first.allow).toBe('/');
    expect(disallow.length).toBeGreaterThan(10);
  });

  it('every disallowed segment is a real route', () => {
    // The old list carried /members (the route is /member) and /clients (the
    // route is /pt-os/clients) — a third of it protected nothing.
    const real = new Set(realSegments());
    const phantom = PRIVATE_SEGMENTS.filter((s) => !real.has(s));
    expect(phantom).toEqual([]);
  });

  it('no real top-level segment is left unclassified', () => {
    // The point of the test: a new authenticated area is crawlable until
    // somebody lists it, and nothing else would notice.
    const publicTop = new Set(['/start-free']);
    const listed = new Set(PRIVATE_SEGMENTS);
    const unclassified = realSegments().filter(
      (s) => !listed.has(s) && !publicTop.has(s) && s !== '/login',
    );
    expect(unclassified).toEqual([]);
  });

  it('keeps crawlers off the API and the sign-in form', () => {
    expect(disallow).toContain('/api/');
    expect(disallow).toContain('/login');
  });

  it('does not disallow the routes it wants indexed', () => {
    for (const route of PUBLIC_ROUTES) {
      if (route === '/') continue;
      expect(disallow).not.toContain(route);
    }
  });

  it('points at the sitemap', () => {
    expect(robots().sitemap).toBe('https://myptstudio.com/sitemap.xml');
  });
});
