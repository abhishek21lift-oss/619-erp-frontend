import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import robots, { PRIVATE_SEGMENTS } from '@/app/robots';
import sitemap, { PUBLIC_ROUTES } from '@/app/sitemap';

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
    expect(read('layout.tsx')).toMatch(/robots:\s*\{\s*index:\s*false,\s*follow:\s*false\}/);
  });
});

describe('robots.txt describes routes that exist', () => {
  const rule = robots().rules;
  const first = Array.isArray(rule) ? rule[0] : rule;
  const disallow = ([] as string[]).concat(first.disallow ?? []);

  it('allows the root and disallows authenticated routes', () => {
    expect(first.allow).toEqual(['/', '/pt-os']);
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
