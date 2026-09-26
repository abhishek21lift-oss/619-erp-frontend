import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isPublicProxyPath } from '@/proxy';

const PUBLIC = join(process.cwd(), 'public');
const read = (f: string) => readFileSync(join(PUBLIC, f), 'utf8');

describe('the member app is installable on its own', () => {
  const manifest = JSON.parse(read('member-manifest.json'));

  it('opens the member portal, not the studio app', () => {
    expect(manifest.start_url).toBe('/member/dashboard');
    // An id distinct from the studio's (which has none) and the console's.
    expect(manifest.id).toBe('/member');
    expect(JSON.parse(read('platform-manifest.json')).id).not.toBe(manifest.id);
  });

  it('points only at icons and shortcuts that exist', () => {
    for (const icon of manifest.icons) expect(existsSync(join(PUBLIC, icon.src))).toBe(true);
    for (const s of manifest.shortcuts) expect(s.url).toMatch(/^\/member\//);
  });

  it('is what the member layouts declare', () => {
    for (const f of ['src/app/(bare)/member/layout.tsx', 'src/app/(bare)/member-login/layout.tsx']) {
      expect(readFileSync(join(process.cwd(), f), 'utf8')).toContain("manifest: '/member-manifest.json'");
    }
  });
});

describe('the offline fallback', () => {
  it('serves the worker, the offline page and the manifest with no session', () => {
    for (const p of ['/sw.js', '/offline.html', '/member-manifest.json']) expect(isPublicProxyPath(p)).toBe(true);
  });

  it('the worker caches the offline page and never an API response or a page', () => {
    const sw = read('sw.js');
    expect(sw).toContain("const OFFLINE_URL = '/offline.html'");
    // Navigations, and the offline page's own precached assets; nothing else.
    expect(sw).toMatch(/req\.mode !== 'navigate'/);
    expect(sw).toMatch(/PRECACHE\.includes\(url\.pathname\)/);
    expect(sw).not.toMatch(/cache\.put\(/);
    expect(sw).not.toMatch(/['"`]\/api/);
  });
});
