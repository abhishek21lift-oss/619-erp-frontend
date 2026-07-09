// Adapter layer — transforms legacy nav-config data into typed NavItem/NavGroup shapes.
// Never import nav-config directly in components; import from here instead.

import { NAV_GROUPS, SETTINGS_GROUP, type NavGroup as LegacyGroup } from '@/lib/nav-config';
import type { NavItem, NavGroup } from './types';

function adaptItem(legacy: LegacyGroup['items'][number]): NavItem {
  const item: NavItem = {
    href:  legacy.href,
    label: legacy.label,
    icon:  legacy.icon,
  };
  if (legacy.roles?.length)   item.roles       = [...legacy.roles];
  if (legacy.role)            item.role        = legacy.role;
  if (legacy.hidden)          item.hidden      = true;
  if (legacy.matchPrefix)     item.matchPrefix = legacy.matchPrefix;
  if (legacy.badge)           item.badge       = legacy.badge;
  if (legacy.isNew)           item.isNew       = true;
  if (legacy.comingSoon)      item.comingSoon  = true;
  if (legacy.children?.length) item.children  = legacy.children.map(adaptItem);
  return item;
}

function adaptGroup(legacy: LegacyGroup): NavGroup {
  return {
    id:    legacy.id,
    label: legacy.label,
    icon:  legacy.icon,
    roles: legacy.roles ? [...legacy.roles] : undefined,
    items: legacy.items.map(adaptItem),
  };
}

export const ADAPTED_NAV_GROUPS: NavGroup[] = NAV_GROUPS.map(adaptGroup);
export const ADAPTED_SETTINGS_GROUP: NavGroup = adaptGroup(SETTINGS_GROUP);

/** Flat list of all nav items from all groups (including settings). */
export function allAdaptedNavItems(): Array<NavItem & { groupId: string; groupLabel: string }> {
  const out: Array<NavItem & { groupId: string; groupLabel: string }> = [];

  for (const g of ADAPTED_NAV_GROUPS) {
    for (const item of g.items) {
      out.push({ ...item, groupId: g.id, groupLabel: g.label });
      if (item.children) {
        for (const child of item.children) {
          out.push({ ...child, groupId: g.id, groupLabel: g.label });
        }
      }
    }
  }

  for (const item of ADAPTED_SETTINGS_GROUP.items) {
    out.push({ ...item, groupId: ADAPTED_SETTINGS_GROUP.id, groupLabel: ADAPTED_SETTINGS_GROUP.label });
  }

  return out;
}
