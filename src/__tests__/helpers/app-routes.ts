// Where a route's source file actually lives.
//
// The app is split into two Next.js route groups — `(chrome)` for the pages
// that get the staff shell from src/app/(chrome)/layout.tsx, `(bare)` for the
// ones that must not have it. Route groups do not appear in URLs, so
// /pt-os/clients is served from src/app/(chrome)/pt-os/clients/page.tsx.
//
// Tests that read a page's source therefore cannot join a URL onto `src/app`
// any more. They ask here instead, which keeps them indifferent to which group
// a page is in — moving a page between groups is a chrome decision, and no test
// about that page's contents should have to be edited when it happens.

import { existsSync } from 'node:fs';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const APP_DIR = join(process.cwd(), 'src', 'app');

/** The route groups, in the order a lookup tries them. */
export const ROUTE_GROUPS = ['(chrome)', '(bare)'] as const;

/**
 * Absolute path to a file under src/app, given its path WITHOUT the route
 * group — e.g. appPath('pt-os', 'clients', 'page.tsx'). Files that live
 * outside any group (layout.tsx, globals.css, api/…) resolve unchanged.
 *
 * Returns the ungrouped path when nothing exists, so callers doing an
 * existence check still get a sensible "no" rather than a throw.
 */
export function appPath(...segments: string[]): string {
  const plain = join(APP_DIR, ...segments);
  if (existsSync(plain)) return plain;
  for (const group of ROUTE_GROUPS) {
    const candidate = join(APP_DIR, group, ...segments);
    if (existsSync(candidate)) return candidate;
  }
  return plain;
}

/** appPath + readFileSync, which is what most callers actually want. */
export function readApp(...segments: string[]): string {
  return readFileSync(appPath(...segments), 'utf8');
}

/** True when the route has a page.tsx in either group. */
export function routeExists(...segments: string[]): boolean {
  return existsSync(appPath(...segments, 'page.tsx'));
}

/**
 * A path relative to src/, resolving the route group when it starts with
 * 'app'. Most of these tests already had a local `src(...)` helper of exactly
 * this shape, so adopting it is a one-line change per file.
 */
export function srcPath(...segments: string[]): string {
  if (segments[0] === 'app') return appPath(...segments.slice(1));
  return join(process.cwd(), 'src', ...segments);
}

/**
 * Strip the route group from a path under src/app, so a walk of the tree can
 * be compared against URL-shaped expectations.
 */
export function stripGroup(relative: string): string {
  return relative.replace(/(^|\/)\((chrome|bare)\)\//, '$1');
}
