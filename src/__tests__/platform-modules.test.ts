// The Command Center's information architecture.
//
// Sixteen tabs in one flat row is a list, not a control surface: past about
// eight it wraps, scrolls sideways on a phone, and finding "where do I suspend
// a studio" becomes a matter of reading every label. The tabs are grouped into
// eight modules.
//
// The grouping is navigation only. `tab` is still the single piece of state and
// the module is derived from it, which is what keeps every ?tab= deep link
// working — the notification that links to ?tab=payments, the sidebar entries,
// an operator's bookmark. These tests pin that property, because the failure
// mode is silent: a tab left out of MODULES is still routable by URL and simply
// cannot be clicked to.

import { describe, expect, it } from 'vitest';
import {
  MODULES, TAB_IDS, TAB_LABELS, FINANCE_DEEP_LINKS,
  moduleForTab, normalizeTab, tabsInModules,
} from '@/app/(platform)/platform/_shared/types';
import type { Tab } from '@/app/(platform)/platform/_shared/types';

describe('every tab is reachable by clicking', () => {
  it('places each tab in a module', () => {
    // The silent failure: a tab in TAB_IDS but in no module is still reachable
    // by URL and unreachable by navigation, so it looks like a dead feature
    // rather than a wiring mistake.
    const covered = new Set(tabsInModules());
    const orphans = TAB_IDS.filter((t) => !covered.has(t));
    expect(orphans).toEqual([]);
  });

  it('places each tab in exactly one module', () => {
    // Two modules claiming one tab makes the highlight flicker between them
    // depending on which is found first.
    const seen = new Map<Tab, string[]>();
    for (const m of MODULES) {
      for (const t of m.tabs) seen.set(t, [...(seen.get(t) ?? []), m.id]);
    }
    const duplicated = [...seen.entries()].filter(([, mods]) => mods.length > 1);
    expect(duplicated).toEqual([]);
  });

  it('lists no tab that does not exist', () => {
    const known = new Set<string>(TAB_IDS);
    expect(tabsInModules().filter((t) => !known.has(t))).toEqual([]);
  });

  it('gives every tab a label for the sub-navigation', () => {
    const unlabelled = TAB_IDS.filter((t) => !TAB_LABELS[t]);
    expect(unlabelled).toEqual([]);
  });

  it('keeps the module row short enough to read', () => {
    // The entire reason for the grouping. If this grows past ~8 the row wraps
    // and the problem is back.
    expect(MODULES.length).toBeLessThanOrEqual(8);
    expect(MODULES.length).toBeGreaterThan(1);
  });
});

describe('the module is derived from the tab, never stored', () => {
  it('resolves each tab to the module that contains it', () => {
    for (const m of MODULES) {
      for (const t of m.tabs) {
        expect([t, moduleForTab(t)]).toEqual([t, m.id]);
      }
    }
  });

  it('lands somewhere renderable for a tab nobody assigned', () => {
    // Defensive, and covered by the coverage test above — but a console that
    // renders the wrong heading beats one that renders nothing.
    expect(moduleForTab('nonsense' as Tab)).toBe('overview');
  });

  it('gives every module a first tab to open on', () => {
    // Clicking a module selects its first tab. An empty module would select
    // undefined and leave the console blank.
    for (const m of MODULES) {
      expect([m.id, m.tabs.length > 0]).toEqual([m.id, true]);
    }
  });
});

describe('existing deep links still resolve', () => {
  // The regression that would hurt most: notifications, sidebar entries and
  // bookmarks all carry ?tab=. Regrouping the navigation must not change what
  // any of them opens.
  it.each([
    ['overview', 'overview'],
    ['studios', 'studios'],
    ['registrations', 'registrations'],
    ['invitations', 'invitations'],
    ['analytics', 'analytics'],
    ['ai', 'ai'],
    ['features', 'features'],
    ['announcements', 'announcements'],
    ['activity', 'activity'],
    ['audit', 'audit'],
    ['security', 'security'],
    ['storage', 'storage'],
    ['health', 'health'],
    ['support', 'support'],
  ])('?tab=%s still opens %s', (param, expected) => {
    expect(normalizeTab(param)).toBe(expected);
  });

  it('still folds the finance deep links onto Finance', () => {
    // ?tab=payments is what the "studio submitted a UTR" notification carries.
    for (const param of Object.keys(FINANCE_DEEP_LINKS)) {
      expect([param, normalizeTab(param)]).toEqual([param, 'finance']);
    }
  });

  it('still falls back to Overview for anything unknown', () => {
    expect(normalizeTab('made-up')).toBe('overview');
    expect(normalizeTab(null)).toBe('overview');
  });

  it('resolves every deep link to a tab that a module can show', () => {
    // Ties the two halves together: a link resolving to a tab no module
    // contains would open a page whose navigation highlights nothing.
    const covered = new Set(tabsInModules());
    for (const param of [...TAB_IDS, ...Object.keys(FINANCE_DEEP_LINKS)]) {
      const resolved = normalizeTab(param);
      expect([param, covered.has(resolved)]).toEqual([param, true]);
    }
  });
});

describe('the Users module', () => {
  it('exists — it is the one module the console did not have', () => {
    expect(MODULES.map((m) => m.id)).toContain('users');
    expect(TAB_IDS).toContain('users');
  });

  it('is reachable by deep link like every other tab', () => {
    expect(normalizeTab('users')).toBe('users');
    expect(moduleForTab('users')).toBe('users');
  });
});
