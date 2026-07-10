// src/lib/nav-config.ts
// Solo Trainer OS navigation source of truth.

import { normaliseRole } from './roles';
import type { Role } from './roles';

export { ROLES, normaliseRole, hasRole, isAdminOrManager } from './roles';
export type { Role } from './roles';

export type NavItem = {
  href: string;
  label: string;
  icon: string;
  role?: Role;
  roles?: Role[];
  hidden?: boolean;
  matchPrefix?: string;
  badge?: string;
  isNew?: boolean;
  comingSoon?: boolean;
  children?: NavItem[];
};

export type NavGroup = {
  id: string;
  label: string;
  icon: string;
  roles?: Role[];
  items: NavItem[];
};

export type QuickAction = {
  id: string;
  label: string;
  icon: string;
  href: string;
  roles?: Role[];
};

export const NAV_GROUPS: NavGroup[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: 'LayoutDashboard',
    items: [
      { href: '/', label: 'Dashboard', icon: 'LayoutDashboard' },
      { href: '/schedule', label: "Today's Sessions", icon: 'CalendarCheck' },
      { href: '/payments', label: 'Dues Pending', icon: 'Wallet' },
      { href: '/payments', label: 'Packages Expiring Soon', icon: 'Package' },
    ],
  },
  {
    id: 'clients',
    label: 'Clients',
    icon: 'Users',
    items: [
      { href: '/clients', label: 'Client List', icon: 'Users' },
      { href: '/clients/new', label: 'Add Client', icon: 'UserPlus' },
      { href: '/clients', label: 'Filter: Active / Paused / Churned', icon: 'Filter' },
      { href: '/clients', label: 'Search by Name / Phone', icon: 'Search' },
      { href: '/clients/[id]', label: 'Client Profile', icon: 'User', hidden: true, matchPrefix: '/clients/' },
    ],
  },
  {
    id: 'schedule',
    label: 'Schedule',
    icon: 'Calendar',
    items: [
      { href: '/schedule', label: 'Calendar: Day / Week', icon: 'Calendar' },
      { href: '/schedule/book', label: 'Book Session', icon: 'CalendarPlus' },
      { href: '/schedule', label: 'Mark Attendance', icon: 'ClipboardCheck' },
    ],
  },
  {
    id: 'programs',
    label: 'Programs',
    icon: 'Dumbbell',
    items: [
      { href: '/programs', label: 'Exercise Library', icon: 'BookOpen' },
      { href: '/programs/builder', label: 'Program Builder', icon: 'Dumbbell' },
      { href: '/programs', label: 'Saved Templates', icon: 'FileText' },
    ],
  },
  {
    id: 'payments',
    label: 'Payments',
    icon: 'IndianRupee',
    items: [
      { href: '/payments', label: 'All Transactions', icon: 'List' },
      { href: '/payments', label: 'Dues List', icon: 'AlertCircle' },
      { href: '/payments/new', label: 'Record Payment', icon: 'Receipt' },
      { href: '/payments', label: 'Renew Expired Package', icon: 'RefreshCw' },
    ],
  },
];

export const SETTINGS_GROUP: NavGroup = {
  id: 'settings',
  label: 'Settings',
  icon: 'Settings',
  items: [
    { href: '/settings', label: 'My Profile', icon: 'User' },
    { href: '/settings', label: 'Package Types + Pricing', icon: 'Package' },
    { href: '/settings', label: 'Backup / Export All Data CSV', icon: 'DatabaseBackup' },
    { href: '/settings', label: 'Import Clients CSV', icon: 'Upload' },
    { href: '/settings', label: 'Change Password', icon: 'KeyRound' },
  ],
};

export const QUICK_ACTIONS: QuickAction[] = [
  { id: 'qa-new-client', label: 'New Client', icon: 'UserPlus', href: '/clients/new' },
  { id: 'qa-log-session', label: 'Log Session', icon: 'CalendarCheck', href: '/schedule/book' },
  { id: 'qa-record-payment', label: 'Record Payment', icon: 'Receipt', href: '/payments/new' },
];

export function allNavItems(): Array<NavItem & { groupId: string; groupLabel: string }> {
  const out: Array<NavItem & { groupId: string; groupLabel: string }> = [];
  for (const group of NAV_GROUPS) {
    for (const item of group.items) {
      out.push({ ...item, groupId: group.id, groupLabel: group.label });
      if (item.children) {
        for (const child of item.children) out.push({ ...child, groupId: group.id, groupLabel: group.label });
      }
    }
  }
  for (const item of SETTINGS_GROUP.items) out.push({ ...item, groupId: SETTINGS_GROUP.id, groupLabel: SETTINGS_GROUP.label });
  return out;
}

export function findItemByPath(pathname: string): (NavItem & { groupId: string; groupLabel: string }) | null {
  const all = allNavItems();
  const path = pathname.split('?')[0];
  const exact = all.find((item) => item.href.split('?')[0] === path);
  if (exact) return exact;
  const prefix = all.find((item) => item.matchPrefix && path.startsWith(item.matchPrefix));
  if (prefix) return prefix;
  return all.find((item) => !item.matchPrefix && path.startsWith(item.href.split('?')[0] + '/')) ?? null;
}

export function isVisibleForRole(item: NavItem, userRole?: string): boolean {
  if (item.hidden) return false;
  const role = normaliseRole(userRole);
  if (item.roles?.length) return !!role && (item.roles as string[]).includes(role);
  if (item.role) return role === item.role;
  return true;
}

export function isGroupVisibleForRole(group: NavGroup, userRole?: string): boolean {
  const role = normaliseRole(userRole);
  if (group.roles?.length) return !!role && (group.roles as string[]).includes(role);
  return true;
}
