// Which pages get the staff shell, and where the shell comes from.
//
// The shell used to be rendered by each page: `<Guard><AppShell>…` at the top
// of 97 page.tsx files, plus ModuleWorkspace for another eight. React cannot
// reconcile two different page subtrees, so every client-side navigation
// destroyed the whole shell and built a new one — the bottom nav's layoutId
// pill re-initialising, notifications refetching, the lot.
//
// It now comes from src/app/(chrome)/layout.tsx and is mounted once. Route
// groups do not appear in URLs, so "does this page have chrome" is answered by
// which folder it lives in, at build time. Two things have to stay true for
// that to keep working, and neither shows up in a build or a type check:
//
//   1. No page re-mounts the shell itself, which would nest a second copy of
//      the entire application inside the first.
//   2. The (bare) list stays the (bare) list. Under a group that defaults to
//      chrome, a page put in the wrong folder does not fail — it silently
//      grows a sidebar. /login growing one is not a build error.
//
// The list below is the pre-refactor state, verified page by page against the
// old `<AppShell>` usage, so it reproduces the shipped behaviour by
// construction rather than by assertion.

import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { APP_DIR, ROUTE_GROUPS } from '@/__tests__/helpers/app-routes';

/** Every page.tsx in a group, as the route path it serves. */
function routesIn(group: string): string[] {
  const root = join(APP_DIR, group);
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name === 'page.tsx') out.push(relative(root, dir).replace(/\\/g, '/'));
    }
  };
  walk(root);
  return out.sort();
}

const code = (s: string) => s
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

/** The routes that had no AppShell before the refactor, and must keep none. */
const BARE = [
  '[...slug]',                   // the catch-all — notFound()
  'admin/dashboard',             // redirect to /dashboard
  'attendance/reports',          // redirect
  'auth/set-password',           // token in the URL, no session
  'client/activate',             // ditto
  'forgot-password',
  'login',
  'member-login',
  'member/classes',              // the member portal has its own shell
  'member/dashboard',
  'member/payments',
  'pt-os',                       // redirect to /pt-os/clients
  'pt-os/pdf-viewer',            // full-screen viewer
  'reset-password',
  'start-free',                  // public
  'subscription',                // renders AppShell itself — see below
  'subscription/checkout/[id]',
];

describe('the route groups', () => {
  it('put exactly the pre-refactor unshelled pages under (bare)', () => {
    expect(routesIn('(bare)')).toEqual([...BARE].sort());
  });

  it('put everything else under (chrome)', () => {
    // Sanity that the split is not lopsided in the other direction — a bug
    // that moved most pages to (bare) would still satisfy the test above only
    // if it also rewrote the list, but this catches the reverse mistake.
    expect(routesIn('(chrome)').length).toBeGreaterThan(90);
    expect(routesIn('(chrome)')).toContain('');          // the main dashboard
    expect(routesIn('(chrome)')).toContain('pt-os/clients');
    expect(routesIn('(chrome)')).toContain('finance/dues');
    // The [tab] workspaces read as unshelled in their own page.tsx — the shell
    // came from ModuleWorkspace. They belong here, and used to be the easiest
    // thing in this refactor to get wrong.
    expect(routesIn('(chrome)')).toContain('finance/[tab]');
    expect(routesIn('(chrome)')).toContain('appointments');
  });

  it('serves each route from exactly one group', () => {
    const chrome = new Set(routesIn('(chrome)'));
    const clash = routesIn('(bare)').filter((r) => chrome.has(r));
    expect(clash).toEqual([]);
  });
});

describe('the shell is mounted once', () => {
  const layout = readFileSync(join(APP_DIR, '(chrome)', 'layout.tsx'), 'utf8');

  it('comes from the (chrome) layout, inside a Guard', () => {
    expect(existsSync(join(APP_DIR, '(chrome)', 'layout.tsx'))).toBe(true);
    expect(code(layout)).toMatch(/<Guard>\s*<AppShell>\{children\}<\/AppShell>\s*<\/Guard>/);
  });

  it('is not re-mounted by any page under (chrome)', () => {
    // This is the one that matters. A page that keeps its own <AppShell> now
    // renders the entire application — sidebar, top bar, bottom nav — a second
    // time, nested inside the first.
    const offenders = routesIn('(chrome)').filter((r) =>
      code(readFileSync(join(APP_DIR, '(chrome)', r, 'page.tsx'), 'utf8')).includes('AppShell'));
    expect(offenders).toEqual([]);
  });

  it('is mounted by exactly two things outside that layout', () => {
    // RouteError, because src/app/error.tsx sits ABOVE the (chrome) layout and
    // has to rebuild the chrome itself; and /subscription, which renders a
    // standalone lockout for a frozen studio and so cannot inherit a shell it
    // is unable to opt out of.
    const seen = new Set<string>();
    const walk = (dir: string) => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, e.name);
        if (e.isDirectory()) { if (e.name !== 'node_modules') walk(p); continue; }
        if (!/\.tsx?$/.test(e.name)) continue;
        const rel = relative(process.cwd(), p).replace(/\\/g, '/');
        if (rel.startsWith('src/__tests__/')) continue;
        if (/from '@\/components\/AppShell'/.test(readFileSync(p, 'utf8'))) seen.add(rel);
      }
    };
    walk(join(process.cwd(), 'src'));
    expect([...seen].sort()).toEqual([
      'src/app/(bare)/subscription/page.tsx',
      'src/app/(chrome)/layout.tsx',
      'src/components/RouteError.tsx',
    ]);
  });
});

describe('the segment error boundaries', () => {
  it('never re-render the shell inside (chrome), where the layout already has', () => {
    const shelled: string[] = [];
    for (const group of ROUTE_GROUPS) {
      if (group !== '(chrome)') continue;
      const root = join(APP_DIR, group);
      for (const e of readdirSync(root, { withFileTypes: true })) {
        const f = join(root, e.name, 'error.tsx');
        if (!e.isDirectory() || !existsSync(f)) continue;
        if (/shell=\{true\}|shell\s*\/?>/.test(code(readFileSync(f, 'utf8')))) shelled.push(e.name);
      }
    }
    expect(shelled).toEqual([]);
  });
});
