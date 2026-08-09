// The platform console stays split, and page.tsx stays a shell.
//
// Audit finding H-03, frontend half. src/app/platform/page.tsx was 3,197 lines
// and 33 components in one module. It is now a ~150-line shell over
// _shared/, _tabs/ and _modals/.
//
// Splitting a file once is easy to undo by accident — the next feature goes
// into whichever file is already open, and after a few of those the page is
// back to three thousand lines without anyone deciding that. These assertions
// are what make that a build failure instead of a slow drift.
//
// Deliberately structural rather than behavioural: `npx tsc --noEmit` already
// proves every reference across the new module boundaries resolves, which is
// the strong check for a pure move in TypeScript. What tsc cannot notice is the
// file growing back, or a module nobody imports.

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { appPath } from '@/__tests__/helpers/app-routes';

const DIR = appPath('platform');
const PAGE = path.join(DIR, 'page.tsx');

/** Every .ts/.tsx file under the platform route, repo-relative. */
function tree(dir: string, acc: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) tree(p, acc);
    else if (/\.tsx?$/.test(e.name)) acc.push(p);
  }
  return acc;
}

const files = tree(DIR);
const rel = (p: string) => path.relative(DIR, p);
const lineCount = (p: string) => fs.readFileSync(p, 'utf8').split('\n').length;

describe('platform console — the H-03 split', () => {
  it('found the split files, so this cannot pass vacuously', () => {
    expect(files.length).toBeGreaterThan(8);
    expect(files.map(rel)).toContain('page.tsx');
  });

  it('keeps page.tsx a shell', () => {
    // It holds the default export, the tab state and the tab switch — nothing
    // more. 3,197 lines became roughly 150; 250 leaves room to add a tab
    // without inviting a component back in.
    expect(lineCount(PAGE)).toBeLessThan(250);
  });

  it('defines only the page and its tab shell in page.tsx', () => {
    // The specific regression this catches: a new panel or modal written
    // inline in page.tsx because that is where the tab switch lives.
    const src = fs.readFileSync(PAGE, 'utf8');
    const declared = [...src.matchAll(/^(?:export default )?function (\w+)/gm)].map((m) => m[1]);
    expect(declared.sort()).toEqual(['PlatformAdminPage', 'PlatformContent']);
  });

  it('keeps every split file small enough to read', () => {
    // The point of H-03 was reviewability. StudiosTab is the largest at ~900
    // lines and is itself a candidate for a further split; 1,000 is the line
    // at which that stops being optional.
    const oversized = files
      .map((f) => ({ f: rel(f), n: lineCount(f) }))
      .filter((x) => x.n > 1000)
      .map((x) => `${x.f} (${x.n} lines)`);
    expect(oversized).toEqual([]);
  });

  it('imports every module it ships — no orphans', () => {
    // A file nobody imports is dead weight that still reads as live code, and
    // is easy to leave behind during a rename. Next.js will not warn: nothing
    // under a `_`-prefixed folder is a route, so an unreferenced file is
    // simply never bundled.
    //
    // Convention files are the exception and must be excluded. Next.js loads
    // page/layout/error/loading/not-found/template/default by filename, so they
    // are entry points that nothing imports — by design. Without this exclusion
    // adding src/app/platform/error.tsx (audit H-02) reported it as an orphan,
    // which is how this list came to be written down.
    const CONVENTION = new Set([
      'page', 'layout', 'error', 'global-error', 'loading',
      'not-found', 'template', 'default',
    ]);
    const corpus = files.map((f) => fs.readFileSync(f, 'utf8')).join('\n');
    const orphans = files
      .map(rel)
      .filter((f) => !CONVENTION.has(path.basename(f).replace(/\.tsx?$/, '')))
      .filter((f) => {
        const base = path.basename(f.replace(/\.tsx?$/, ''));
        // Match './_tabs/StudiosTab' or '../_shared/ui' style specifiers.
        return !new RegExp(`from '[^']*${base}'`).test(corpus);
      });
    expect(orphans).toEqual([]);
  });

  it('puts colocated modules in underscore folders, so none become routes', () => {
    // Next.js App Router turns any folder under app/ into a URL segment unless
    // it is a private folder (_name). A directory renamed from _tabs to tabs
    // would silently publish /platform/tabs.
    const dirs = new Set(files.map((f) => rel(f).split(path.sep)[0]).filter((d) => d.endsWith('.tsx') === false));
    for (const d of dirs) expect(d.startsWith('_')).toBe(true);
  });

  it('declares the client boundary on every module with a component', () => {
    // These are client components using hooks; a missing 'use client' makes
    // Next.js treat the module as a server component and fail at build time on
    // useState. Cheap to lose when a file is created by copying a .ts helper.
    for (const f of files) {
      const src = fs.readFileSync(f, 'utf8');
      const hasHooks = /\buse(State|Effect|Memo|Callback|Ref)\s*\(/.test(src);
      if (hasHooks) expect(src.startsWith("'use client';"), `${rel(f)} uses hooks`).toBe(true);
    }
  });
});
