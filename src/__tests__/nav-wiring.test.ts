// Navigation wiring regressions found in the 2026-10-24 review, plus the
// 2026-11-10 wiring pass: the Settings group was configured but never
// rendered, the attendance dashboard lived only in a second search list, the
// command palette duplicated GlobalSearch, and both sidebar variants polled
// the same badges.
//
// These are structural on purpose: each assertion names the production change
// that would break it.

import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { NAV_GROUPS, QUICK_ACTIONS, SETTINGS_GROUP } from '@/lib/nav-config';
import { readApp, srcPath } from '@/__tests__/helpers/app-routes';

const read = (...p: string[]) => readFileSync(srcPath(...p), 'utf8');
const shell = read('components', 'AppShell.tsx');
const sidebar = read('components', 'sidebar', 'Sidebar.tsx');
const memberNav = read('components', 'member', 'MemberNav.tsx');
const search = read('components', 'search', 'GlobalSearch.tsx');
const layout = read('app', 'layout.tsx');

describe('client records open the canonical profile route', () => {
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
});

describe('support is reachable from the sidebar settings group', () => {
  it('keeps /support in SETTINGS_GROUP', () => {
    expect(SETTINGS_GROUP.items.map((i) => i.href)).toContain('/support');
  });
});

describe('the account opens from the topbar avatar', () => {
  it('moves My Profile out of the sidebar Settings group', () => {
    expect(SETTINGS_GROUP.items.map((i) => i.href)).not.toContain('/settings/profile');
  });

  it('renders the profile menu beside the bell', () => {
    const profileMenu = read('components', 'TopbarProfileMenu.tsx');
    expect(shell).toContain('TopbarProfileMenu');
    expect(profileMenu).toContain('/settings/profile');
    expect(profileMenu).toContain('/settings/profile?tab=preferences');
    expect(profileMenu).toContain('Log out');
  });
});

describe('the sidebar renders every configured group', () => {
  it('renders the Settings group alongside the studio groups', () => {
    expect(sidebar).toMatch(/NAV_GROUPS,\s*SETTINGS_GROUP/);
    expect(sidebar).toContain('SETTINGS_GROUP');
  });

  it('does not poll the badge counts from both sidebar variants at once', () => {
    expect(sidebar).toMatch(/poll\?: boolean/);
    expect(sidebar).toMatch(/if \(!isTrainer \|\| !poll\) return;/);
    expect(sidebar).toMatch(/poll=\{isMobile \? mobileOpen : isDesktop\}/);
  });
});

describe('one search owner', () => {
  it('does not mount the retired command palette', () => {
    expect(layout).not.toContain('CommandPalette');
    expect(existsSync(srcPath('components', 'CommandPalette.tsx'))).toBe(false);
  });

  it('indexes the attendance dashboard from nav-config, not a second list', () => {
    const item = NAV_GROUPS.flatMap((g) => g.items).find((i) => i.href === '/checkin/dashboard');
    expect(item?.feature).toBe('attendance');
    expect(shell).not.toContain('EXTRA_SEARCH_PAGES');
  });
});

describe('the member bottom bar is built from nav-config', () => {
  const account = NAV_GROUPS.find((g) => g.id === 'my-account')!;

  it('keeps the seven real destinations in the config', () => {
    expect(account.items.map((i) => i.href)).toEqual([
      '/member/dashboard',
      '/member/workout',
      '/member/diet',
      '/member/checkin',
      '/member/book',
      '/member/payments',
      '/member/more',
    ]);
    expect(account.items.map((i) => i.label)).toEqual([
      'Home', 'Workout', 'Diet', 'Check-in', 'Book', 'Payments', 'Profile',
    ]);
  });

  it('reads that group instead of keeping a second hardcoded list', () => {
    expect(memberNav).toContain('NAV_GROUPS');
    expect(memberNav).not.toMatch(/const TABS = \[/);
  });

  it('has an icon in the member map for every configured tab', () => {
    // The bar falls back to Home for an unknown name, so a missing entry
    // silently shows the wrong icon — Book and Payments both did.
    const start = memberNav.indexOf('const MEMBER_ICONS');
    const block = memberNav.slice(start, memberNav.indexOf('};', start));
    for (const icon of account.items.map((i) => i.icon)) {
      expect(new RegExp(`\\b${icon}\\b\\s*[:,]`).test(block), `MEMBER_ICONS is missing ${icon}`).toBe(true);
    }
  });

  it('honours the member_portal flag', () => {
    expect(memberNav).toContain('isVisibleForFeature');
  });

  it('keeps Payments lit on the checkout route', () => {
    expect(memberNav).toContain("startsWith('/member/pay/')");
  });

  it('is labelled for assistive technology', () => {
    expect(memberNav).toContain('aria-label="Member navigation"');
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

  it('uses the one quick-action list from nav-config', () => {
    expect(search).toContain('QUICK_ACTIONS');
    expect(search).not.toMatch(/const QUICK_ACTIONS: QuickAction\[\]/);
  });
});
