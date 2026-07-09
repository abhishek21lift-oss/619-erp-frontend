'use client';

import { useMemo } from 'react';
import { normaliseRole } from '@/lib/nav-config';
import type { NavItem, NavGroup, NavSection } from '../config/types';

function roleAllowed(roles: string[] | undefined, userRole: string | undefined): boolean {
  if (!roles?.length) return true;
  if (!userRole) return false;
  return roles.includes(userRole);
}

export function filterNavItem(item: NavItem, userRole: string | undefined): boolean {
  if (item.hidden) return false;
  const role = normaliseRole(userRole);
  return roleAllowed(item.roles, role ?? undefined);
}

export function filterNavGroup(group: NavGroup, userRole: string | undefined): NavGroup | null {
  const role = normaliseRole(userRole);
  if (!roleAllowed(group.roles, role ?? undefined)) return null;
  const items = group.items.filter((item) => filterNavItem(item, userRole));
  if (!items.length) return null;
  return { ...group, items };
}

export function filterNavSection(section: NavSection, userRole: string | undefined): NavSection | null {
  const groups = section.groups
    .map((g) => filterNavGroup(g, userRole))
    .filter((g): g is NavGroup => g !== null);
  if (!groups.length) return null;
  return { ...section, groups };
}

/**
 * Returns nav sections, groups, and a single-item filter function
 * filtered to what the current user role may see.
 */
export function useNavPermissions(userRole: string | undefined) {
  const role = normaliseRole(userRole);

  const canSee = useMemo(
    () => (item: NavItem) => filterNavItem(item, role ?? undefined),
    [role],
  );

  return { role, canSee, filterNavGroup, filterNavSection };
}
