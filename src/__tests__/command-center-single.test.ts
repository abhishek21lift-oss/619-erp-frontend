// There is ONE Command Center, and its cards say what they measure.
//
// ── What was here ──────────────────────────────────────────────────────────
//
// Three overlapping implementations of the same screen:
//
//   Phase2CommandCenterOverview.tsx        the `overview` tab, live
//   PremiumCommandCenterOverviewFixed.tsx  imported by NOBODY — a complete
//                                          second overview, same endpoints,
//                                          same donut, same module grid,
//                                          headed "Super Admin Command Center
//                                          2.0", 59 lines of dead code that a
//                                          reader had to diff against the live
//                                          one to discover was dead
//   CommandCenterRoot.tsx                  the `health` tab, live
//
// plus an api.commandCenter.risk() client for
// `/api/platform/command-center/risk` — a route the backend does not have and
// never had. Exported, typed, documented, and a 404 if anything had called it.
//
// Root and Overview are NOT duplicates and both stay: Overview is the landing
// deck across every operator surface, Root is the live infrastructure console
// with the cards, Guardian, alerts and the command panel. They answer
// different questions. The other two were duplication and a phantom.

import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { cacheLabel } from '@/components/platform/Card';

const ROOT = join(__dirname, '..', '..');
const PLATFORM = join(ROOT, 'src', 'components', 'platform');

const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');

describe('the duplicate overview is gone', () => {
  it('no longer exists on disk', () => {
    expect(existsSync(join(PLATFORM, 'PremiumCommandCenterOverviewFixed.tsx'))).toBe(false);
  });

  it('leaves exactly one overview component', () => {
    const overviews = readdirSync(PLATFORM)
      .filter((f) => /Overview\.tsx$/.test(f) && /Command/i.test(f));
    expect(overviews).toEqual(['CommandCenterOverview.tsx']);
  });

  it('is imported or rendered nowhere', () => {
    // A REFERENCE, not a mention: an import specifier or a JSX tag. Matching
    // the bare name would flag this file's own prose, and a test that has to
    // exclude itself is one rename away from excluding the thing it guards.
    const REFERENCE = /(?:from\s*['"][^'"]*(?:PremiumCommandCenterOverviewFixed|Phase2CommandCenterOverview)['"])|(?:<\/?(?:PremiumCommandCenterOverviewFixed|Phase2CommandCenterOverview)[\s/>])/;
    const hits: string[] = [];
    const walk = (dir: string) => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, e.name);
        if (e.isDirectory()) { if (e.name !== 'node_modules') walk(p); continue; }
        if (!/\.tsx?$/.test(e.name)) continue;
        if (REFERENCE.test(readFileSync(p, 'utf8'))) hits.push(p);
      }
    };
    walk(join(ROOT, 'src'));
    expect(hits).toEqual([]);
  });

  it('the reference check is not vacuous', () => {
    // The live overview IS imported and rendered, by exactly the same shapes.
    const page = read('src/app/(platform)/platform/page.tsx');
    expect(page).toMatch(/from ['"]@\/components\/platform\/CommandCenterOverview['"]/);
    expect(page).toMatch(/<CommandCenterOverview\s*\/>/);
  });
});

describe('the console is named for what it is', () => {
  const overview = read('src/components/platform/CommandCenterOverview.tsx');

  it('carries no development-phase branding', () => {
    // "Phase 2" is where the work was in the plan, not what an operator is
    // looking at. A console that shows its own build history in the header is
    // talking about the team rather than the platform.
    expect(overview).not.toMatch(/Phase\s*2/);
    expect(overview).not.toMatch(/Command Center 2\.0/);
  });

  it('does not advertise the product it was modelled on', () => {
    // The layout was borrowed from FreeLLMAPI. Saying so on a super-admin
    // console tells an operator nothing and dates the screen.
    expect(overview).not.toMatch(/FreeLLMAPI/i);
  });

  it('still says Command Center', () => {
    // Cannot pass by deleting the header.
    expect(overview).toMatch(/Command Center/);
  });
});

describe('no client points at a route the backend does not serve', () => {
  it('has dropped the phantom risk endpoint', () => {
    expect(existsSync(join(ROOT, 'src', 'lib', 'api', 'endpoints', 'commandCenter.ts'))).toBe(false);
    const index = read('src/lib/api/index.ts');
    expect(index).not.toMatch(/endpoints\/commandCenter/);
    expect(index).not.toMatch(/PlatformRisk/);
  });

  it('leaves the endpoints that DO exist alone', () => {
    // Cannot pass by deleting the api client.
    const platform = read('src/lib/api/endpoints/platform.ts');
    expect(platform).toMatch(/command-center\/snapshot/);
  });
});

describe('a cached card says how stale it is', () => {
  it('reads the age back in seconds', () => {
    expect(cacheLabel(4200)).toBe('cached 4s ago');
    expect(cacheLabel(29_000)).toBe('cached 29s ago');
  });

  it('does not round a sub-second reading to "0s ago"', () => {
    expect(cacheLabel(120)).toBe('cached <1s ago');
    expect(cacheLabel(0)).toBe('cached <1s ago');
  });

  it('falls back to the bare flag when the backend sends no age', () => {
    // An older API, or a card that was never cached.
    expect(cacheLabel(undefined)).toBe('cached');
    expect(cacheLabel(NaN)).toBe('cached');
    expect(cacheLabel(-1)).toBe('cached');
  });
});

describe('a process-local card is labelled', () => {
  const card = read('src/components/platform/Card.tsx');

  it('renders the scope badge only for process scope', () => {
    // `runtime` and `http` measure the container that answered. Behind a
    // second replica, a green tile there is a much weaker claim than the same
    // tile on `database`, and nothing on screen said so.
    expect(card).toMatch(/card\.scope === 'process'/);
    expect(card).toMatch(/this process/);
  });

  it('explains itself on hover rather than leaving two words unexplained', () => {
    expect(card).toMatch(/title="Measures the one API process/);
  });
});
