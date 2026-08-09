// Feature-flag nav hiding.
//
// The property that matters most here is NOT "a disabled feature is hidden" —
// it is "everything else stays visible". This filter runs over every nav item
// on every render for every studio; a bug that fails closed silently deletes
// pages a paying studio has always had, with no error to notice. So most of
// these tests assert the boring direction.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import {
  NAV_GROUPS,
  SETTINGS_GROUP,
  QUICK_ACTIONS,
  allNavItems,
  isVisibleForFeature,
  isGroupVisibleForFeature,
  isVisibleForRole,
} from '@/lib/nav-config';

describe('isVisibleForFeature — fails open', () => {
  it('shows an untagged item whatever the flags say', () => {
    expect(isVisibleForFeature({}, { anything: false })).toBe(true);
  });

  it('shows a tagged item when the flags have not loaded yet', () => {
    // undefined map = the first render, before /api/features answers.
    expect(isVisibleForFeature({ feature: 'finance' }, undefined)).toBe(true);
  });

  it('shows a tagged item when the map is empty', () => {
    // An empty map is what a platform operator gets (no tenant) and what a
    // failed fetch leaves behind.
    expect(isVisibleForFeature({ feature: 'finance' }, {})).toBe(true);
  });

  it('shows a key the server has never heard of', () => {
    expect(isVisibleForFeature({ feature: 'typo_here' }, { finance: true })).toBe(true);
  });

  it('hides ONLY on an explicit false', () => {
    expect(isVisibleForFeature({ feature: 'finance' }, { finance: false })).toBe(false);
    expect(isVisibleForFeature({ feature: 'finance' }, { finance: true })).toBe(true);
  });
});

describe('group filtering', () => {
  const group = (id: string) => NAV_GROUPS.find((g) => g.id === id)!;

  it('hides a whole group when its feature is off', () => {
    expect(isGroupVisibleForFeature(group('finance'), { finance: false })).toBe(false);
  });

  it('leaves the untagged groups alone — core product is never switchable', () => {
    // Clients and Sessions are is_core in the registry: decide() forces them
    // on, so tagging them would imply a control that does not exist.
    for (const id of ['personal-training', 'session-management', 'platform']) {
      expect(group(id).feature).toBeUndefined();
      expect(isGroupVisibleForFeature(group(id), { finance: false })).toBe(true);
    }
  });

  it('turning one feature off touches nothing else', () => {
    const survivors = NAV_GROUPS.filter((g) => isGroupVisibleForFeature(g, { finance: false }));
    expect(survivors).toHaveLength(NAV_GROUPS.length - 1);
    expect(survivors.some((g) => g.id === 'finance')).toBe(false);
  });
});

describe('item tags narrow inside a group', () => {
  it('hides Knowledge Base without hiding the rest of the AI Suite', () => {
    const ai = NAV_GROUPS.find((g) => g.id === 'ai-coach')!;
    const flags = { ai_suite: true, ai_knowledge_base: false };
    expect(isGroupVisibleForFeature(ai, flags)).toBe(true);
    const visible = ai.items.filter((i) => isVisibleForFeature(i, flags));
    expect(visible.map((i) => i.href)).not.toContain('/ai-coach/knowledge');
    expect(visible.map((i) => i.href)).toContain('/ai-coach');
  });

  it('hides the whole AI group when ai_suite is off', () => {
    const ai = NAV_GROUPS.find((g) => g.id === 'ai-coach')!;
    expect(isGroupVisibleForFeature(ai, { ai_suite: false })).toBe(false);
  });
});

describe('allNavItems inherits the group tag', () => {
  // The Command Palette only ever sees flattened items — it never looks at a
  // group — so without inheritance a disabled group would stay fully
  // searchable and every result would 403.
  it('carries the group feature onto items that have none of their own', () => {
    const invoices = allNavItems().find((i) => i.href === '/finance/invoices')!;
    expect(invoices.feature).toBe('finance');
    expect(isVisibleForFeature(invoices, { finance: false })).toBe(false);
  });

  it('does not overwrite an item that carries its own tag', () => {
    const kb = allNavItems().find((i) => i.href === '/ai-coach/knowledge')!;
    expect(kb.feature).toBe('ai_knowledge_base');
  });

  it('leaves items in untagged groups untagged', () => {
    const clients = allNavItems().find((i) => i.href === '/pt-os/clients')!;
    expect(clients.feature).toBeUndefined();
  });
});

describe('the tags match the platform registry', () => {
  // Keys seeded by backend migration 123_feature_manager.sql. A tag that is
  // not in this list can never be switched off, so it would be dead config
  // that silently does nothing.
  const REGISTRY = new Set([
    'clients', 'sessions', 'attendance', 'programs', 'exercise_library',
    'screening', 'progress_photos', 'finance', 'packages', 'insights',
    'communication', 'member_portal', 'ai_suite', 'ai_knowledge_base',
    'branches', 'integrations', 'passkeys',
  ]);

  it('uses no key the registry does not define', () => {
    const used = new Set<string>();
    for (const g of [...NAV_GROUPS, SETTINGS_GROUP]) {
      if (g.feature) used.add(g.feature);
      for (const i of g.items) if (i.feature) used.add(i.feature);
    }
    for (const a of QUICK_ACTIONS) if (a.feature) used.add(a.feature);
    expect([...used].filter((k) => !REGISTRY.has(k))).toEqual([]);
    expect(used.size).toBeGreaterThan(10);
  });

  it('uses no key the registry does not define in the mobile bottom bar', () => {
    // MobileBottomNav keeps its own hardcoded five tabs rather than reading
    // NAV_GROUPS, so its tags can drift out of the registry independently. A
    // typo there fails open — the tab just never hides — which means the
    // operator's toggle silently does nothing and no error is raised.
    const src = readFileSync(join(process.cwd(), 'src/components/MobileBottomNav.tsx'), 'utf8');
    const tags = [...src.matchAll(/feature: '([a-z_]+)'/g)].map((m) => m[1]);
    expect(tags.length).toBeGreaterThan(0);
    expect(tags.filter((k) => !REGISTRY.has(k))).toEqual([]);
  });

  it('never tags a core feature', () => {
    const all = [...allNavItems().map((i) => i.feature), ...NAV_GROUPS.map((g) => g.feature)];
    expect(all).not.toContain('clients');
    expect(all).not.toContain('sessions');
  });
});

describe('role and feature are independent gates', () => {
  /**
   * An item carrying BOTH gates: admin-only, and inside a feature-tagged
   * group (allNavItems inherits the group's tag onto each item).
   *
   * The fixture's own properties are asserted rather than assumed. These two
   * tests are about the general principle, not about one route, but they
   * previously reached for /attendance/reports and broke when it was dropped
   * from the nav — as a bare `.find(...)!` returning undefined, which fails
   * on a confusing property access rather than saying what actually changed.
   */
  function twoGateItem() {
    const item = allNavItems().find((i) => i.href === '/finance/record-payment');
    expect(item, 'fixture /finance/record-payment is no longer in the nav').toBeDefined();
    expect(item!.roles, 'fixture must stay admin-only for these gates to differ').toEqual(['admin']);
    expect(item!.feature, 'fixture must stay inside a feature-tagged group').toBe('finance');
    return item!;
  }

  it('a feature flag cannot grant an item the role check denies', () => {
    const item = twoGateItem();
    expect(isVisibleForFeature(item, { finance: true })).toBe(true);
    expect(isVisibleForRole(item, 'trainer')).toBe(false);
  });

  it('a role cannot grant an item the feature check denies', () => {
    const item = twoGateItem();
    expect(isVisibleForRole(item, 'admin')).toBe(true);
    expect(isVisibleForFeature(item, { finance: false })).toBe(false);
  });
});
