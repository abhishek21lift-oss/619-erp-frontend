// Navigation wiring regressions found in the 2026-10-24 review.
//
// These are structural on purpose: the failures were dead links, a search
// index that ignored the signed-in role, and member nav that had drifted from
// nav-config. Each assertion names the production change that would break it.

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { NAV_GROUPS, QUICK_ACTIONS } from '@/lib/nav-config';
import { readApp, srcPath } from '@/__tests__/helpers/app-routes';

const read = (...p: string[]) => readFileSync(srcPath(...p), 'utf8');
const shell = read('components', 'AppShell.tsx');
const palette = read('components', 'CommandPalette.tsx');
const memberNav = read('components', 'member', 'MemberNav.tsx');
const search = read('components', 'search', 'GlobalSearch.tsx');

describe('client records open the canonical profile route', () => {
  it('uses /pt-os/clients/:id in the command palette', () => {
    expect(palette).not.toMatch(/href:\s*`\/clients\/\$\{/);
    expect(palette).toContain('href: `/pt-os/clients/${c.id}`');
  });

  it('uses /pt-os/clients/:id from the transformations table', () => {
    const page = readApp('training', 'transformations', 'page.tsx');
    expect(page).not.toContain('href={`/clients/${c.id}`}');
    expect(page).toContain('href={`/pt-os/clients/${c.id}`}');
  });
});

describe('the topbar page index respects the signed-in role', () => {
  it('filters pages by role as well as feature', () => {
    expect(shell).toMatch(/function buildSearchPages\([\s\S]*?role/);
    expect(shell).toMatch(/isVisibleForRole\(item, role\)/);
  });

  it('passes the user role into the index', () => {
    expect(shell).toMatch(/buildSearchPages\(features, user\?\.role\)/);
  });
});

describe('quick actions are trainer-only', () => {
  it('tags the session and check-in actions with the trainer role', () => {
    const actions = new Map(QUICK_ACTIONS.map((a) => [a.id, a]));
    expect(actions.get('qa-book-session')?.roles).toEqual(['trainer']);
    expect(actions.get('qa-checkin')?.roles).toEqual(['trainer']);
  });

  it('does not search clients for a member session', () => {
    expect(palette).toMatch(/user\?\.role !== 'trainer'/);
  });
});

describe('support is reachable from the avatar menu', () => {
  it('links /support, not only /help', () => {
    expect(shell).toContain('href="/support"');
  });
});

describe('the member bottom bar is built from nav-config', () => {
  const account = NAV_GROUPS.find((g) => g.id === 'my-account')!;

  it('keeps the six real destinations in the config', () => {
    expect(account.items.map((i) => i.href)).toEqual([
      '/member/dashboard',
      '/member/workout',
      '/member/diet',
      '/member/checkin',
      '/member/payments',
      '/member/more',
    ]);
    expect(account.items.map((i) => i.label)).toEqual([
      'Home', 'Workout', 'Diet', 'Check-in', 'Payments', 'Profile',
    ]);
  });

  it('reads that group instead of keeping a second hardcoded list', () => {
    expect(memberNav).toContain('NAV_GROUPS');
    expect(memberNav).not.toMatch(/const TABS = \[/);
  });

  it('honours the member_portal flag', () => {
    expect(memberNav).toContain('isVisibleForFeature');
  });

  it('keeps Payments lit on the checkout route', () => {
    expect(memberNav).toContain("startsWith('/member/pay/')");
  });
});

describe('search cleanup', () => {
  it('has no keywords for routes that are not in the nav', () => {
    for (const href of [
      '/pt-os/measurements',
      '/pt-os/strength-tracking',
      '/pt-os/progress-photos',
      '/settings',
    ]) {
      expect(shell).not.toContain(`'${href}':`);
    }
  });

  it('feature-gates the extra attendance dashboard page', () => {
    expect(shell).toMatch(/href: '\/checkin\/dashboard'[\s\S]{0,120}feature: 'attendance'/);
    expect(shell).toMatch(/EXTRA_SEARCH_PAGES[\s\S]{0,200}isVisibleForFeature/);
  });

  it('uses the one quick-action list from nav-config', () => {
    expect(search).toContain('QUICK_ACTIONS');
    expect(search).not.toMatch(/const QUICK_ACTIONS: QuickAction\[\]/);
  });
});
