// src/lib/nav-config.ts
// Single source of truth for navigation. Sidebar, breadcrumbs and the
// command palette all consume this. IA principle: groups organised by
// job-to-be-done, with a top-level Dashboard.

export type NavItem = {
  href: string;
  label: string;
  icon: string;
  /** Restrict to a specific role. Omitted = visible to all signed-in users. */
  role?: 'admin' | 'trainer' | 'member';
  /** Hide from sidebar but keep in breadcrumb registry (e.g. detail pages). */
  hidden?: boolean;
  /** Match this href as parent for /<path>/<id>-style routes. */
  matchPrefix?: string;
};

export type NavGroup = {
  id: string;
  label: string;
  icon: string;
  items: NavItem[];
};

/**
 * The single Dashboard link is rendered ABOVE the groups (no "Home" header).
 * Sidebar.tsx renders this first, then the groups below.
 */
export const DASHBOARD_ITEM: NavItem = {
  href: '/dashboard',
  label: 'Dashboard',
  icon: '▦',
};

export const NAV_GROUPS: NavGroup[] = [
  {
    id: 'sales',
    label: 'Sales',
    icon: '◇',
    items: [
      { href: '/sales/leads', label: 'Lead Inbox', icon: '↘', role: 'admin' },
      { href: '/sales/enquiry', label: 'Add Enquiry', icon: '+' },
      { href: '/sales/funnel', label: 'Conversion Funnel', icon: '▼', role: 'admin' },
      { href: '/sales/sources', label: 'Lead Sources', icon: '◎', role: 'admin' },
    ],
  },
  {
    id: 'members',
    label: 'Members',
    icon: '◉',
    items: [
      { href: '/clients', label: 'All Members', icon: '◉' },
      { href: '/members/active', label: 'Active', icon: '✓' },
      { href: '/members/expiring', label: 'Expiring Soon', icon: '⚠' },
      { href: '/members/lapsed', label: 'Lapsed', icon: '◐' },
      { href: '/members/birthdays', label: 'Birthdays', icon: '✦' },
      { href: '/clients/new', label: 'Add Member', icon: '+' },
      { href: '/clients/[id]', label: 'Member Profile', icon: '◉', hidden: true, matchPrefix: '/clients/' },
    ],
  },
  {
    id: 'training',
    label: 'Training',
    icon: '⚒',
    items: [
      { href: '/trainers', label: 'Coaches', icon: '⚒', role: 'admin' },
      { href: '/trainer/dashboard', label: 'Coach Dashboard', icon: '▤', role: 'trainer' },
      { href: '/training/transformations', label: 'Transformations', icon: '↑', role: 'admin' },
      { href: '/trainers/[id]', label: 'Coach Profile', icon: '⚒', hidden: true, matchPrefix: '/trainers/' },
    ],
  },
  {
    id: 'operations',
    label: 'Attendance',
    icon: '⚙',
    items: [
      { href: '/attendance', label: 'Member Attendance', icon: '◧' },
      { href: '/attendance/staff', label: 'Staff Attendance', icon: '✦', role: 'admin' },
      { href: '/operations/leaderboard', label: 'Check-in Leaderboard', icon: '★' },
    ],
  },
  {
    id: 'memberships',
    label: 'Memberships',
    icon: 'M',
    items: [
      { href: '/memberships/subscriptions', label: 'Subscriptions', icon: 'S' },
    ],
  },
  {
    id: 'finance',
    label: 'Finance',
    icon: '₹',
    items: [
      { href: '/payments', label: 'Payments', icon: '◈' },
      { href: '/finance/dues', label: 'Outstanding Dues', icon: '◔' },
      { href: '/finance/collection', label: 'Collection', icon: '↗', role: 'admin' },
      { href: '/finance/pl', label: 'Profit & Loss', icon: '⊞', role: 'admin' },
      { href: '/finance/forecast', label: 'Revenue Forecast', icon: '◌', role: 'admin' },
      { href: '/finance/trainer-revenue', label: 'Trainer Revenue', icon: '🎯', role: 'admin' },
    ],
  },
  {
    id: 'insights',
    label: 'Insights',
    icon: '↗',
    items: [
      { href: '/reports', label: 'All Reports', icon: '↗' },
      { href: '/insights/traffic', label: 'Footfall Traffic', icon: '⇋', role: 'admin' },
      { href: '/insights/renewal', label: 'Renewal Analysis', icon: '↻', role: 'admin' },
      { href: '/insights/sessions', label: 'Session Utilisation', icon: '◔' },
    ],
  },
];

export const SETTINGS_ITEM: NavItem = {
  href: '/settings',
  label: 'Settings',
  icon: '⚙',
};

export function allNavItems(): Array<NavItem & { groupId: string; groupLabel: string }> {
  const out: Array<NavItem & { groupId: string; groupLabel: string }> = [];
  // Dashboard first (no group header)
  out.push({ ...DASHBOARD_ITEM, groupId: 'dashboard', groupLabel: 'Dashboard' });
  for (const g of NAV_GROUPS) {
    for (const it of g.items) {
      out.push({ ...it, groupId: g.id, groupLabel: g.label });
    }
  }
  out.push({ ...SETTINGS_ITEM, groupId: 'settings', groupLabel: 'Settings' });
  return out;
}

export function findItemByPath(
  pathname: string,
): (NavItem & { groupId: string; groupLabel: string }) | null {
  const items = allNavItems();
  const cleanPath = pathname.split('?')[0];
  const exact = items.find((i) => i.href.split('?')[0] === cleanPath);
  if (exact) return exact;
  const prefix = items.find((i) => i.matchPrefix && cleanPath.startsWith(i.matchPrefix));
  if (prefix) return prefix;
  const groupRoot = items.find(
    (i) => !i.matchPrefix && cleanPath.startsWith(i.href.split('?')[0] + '/'),
  );
  return groupRoot || null;
}

export const QUICK_ACTIONS = [
  { id: 'qa-add-member', label: 'Add new member', icon: '+', href: '/clients/new', role: 'admin' as const },
  { id: 'qa-record-pay', label: 'Record a payment', icon: '◈', href: '/payments?new=1' },
  { id: 'qa-mark-att', label: 'Mark attendance', icon: '◧', href: '/attendance' },
  { id: 'qa-add-trainer', label: 'Add coach', icon: '⚒', href: '/trainers?new=1', role: 'admin' as const },
];
