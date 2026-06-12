// src/lib/nav-config.ts
// Single source of truth for all navigation.
// Sidebar, CommandPalette, and Breadcrumbs all consume this file.

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

export const NAV_GROUPS: NavGroup[] = [
  {
    id: 'attendance',
    label: 'Attendance',
    icon: 'ScanFace',
    items: [
      { href: '/checkin',                label: 'QR / Mobile Check-In', icon: 'ScanFace' },
      { href: '/attendance',             label: 'Attendance Records',   icon: 'ClipboardList' },
      { href: '/attendance/reports',     label: 'Attendance Reports',   icon: 'BarChart3',   role: 'admin', isNew: true },
      { href: '/attendance/staff',       label: 'Staff Attendance',     icon: 'UsersRound',  roles: ['admin', 'manager'] },
    ],
  },
  {
    id: 'personal-training',
    label: 'Clients',
    icon: 'Users',
    items: [
      { href: '/pt-os/new-client',       label: 'New Client',         icon: 'UserPlus' },
      { href: '/pt-os/clients',          label: 'All Clients',        icon: 'Users' },
      { href: '/pt-os/goals',            label: 'Goal Setting',       icon: 'Target' },
      { href: '/pt-os/assessment',       label: 'Assessment',         icon: 'ClipboardCheck' },
    ],
  },
  {
    id: 'trainer-management',
    label: 'Trainers',
    icon: 'UserCog',
    items: [
      { href: '/trainers/add',              label: 'Add Trainer',          icon: 'UserPlus',    role: 'admin' },
      { href: '/trainers',                  label: 'Trainer Profiles',     icon: 'UserCog',     role: 'admin' },
      { href: '/pt-os/workout-plans',       label: 'Workout Plans',        icon: 'Dumbbell' },
      { href: '/pt-os/diet-plans',          label: 'Diet Plans',           icon: 'Apple' },
      { href: '/training/transformations',  label: 'Transformations',      icon: 'Sparkles',    roles: ['admin', 'manager'] },
      { href: '/trainers/leave',            label: 'Leave Requests',       icon: 'CalendarOff', roles: ['admin', 'manager'], badge: 'pendingLeaves' },
      { href: '/trainer/dashboard',         label: 'Trainer Dashboard',    icon: 'LayoutGrid',  role: 'trainer' },
      { href: '/trainers/[id]',             label: 'Trainer Profile',      icon: 'UserCog',     hidden: true, matchPrefix: '/trainers/' },
    ],
  },
  {
    id: 'session-management',
    label: 'Sessions',
    icon: 'Calendar',
    items: [
      { href: '/pt-os/schedule-session',  label: 'Book Session',         icon: 'CalendarPlus' },
      { href: '/pt-os/session-balance',   label: 'Session Balance',      icon: 'Gauge',         isNew: true },
      { href: '/pt-os/sessions',          label: 'Session History',      icon: 'History' },
      { href: '/insights/sessions',       label: 'Session Utilisation',  icon: 'Clock', role: 'admin' },
    ],
  },
  {
    id: 'progress-tracking',
    label: 'Progress',
    icon: 'TrendingUp',
    items: [
      { href: '/pt-os/weekly-checkin',    label: 'Weekly Check-In',     icon: 'ClipboardCheck', isNew: true },
      { href: '/pt-os/measurements',      label: 'Measurements',        icon: 'Ruler',          isNew: true },
      { href: '/pt-os/strength-tracking', label: 'Strength Tracking',   icon: 'Zap',             isNew: true },
      { href: '/pt-os/progress-photos',   label: 'Progress Photos',     icon: 'Camera',         isNew: true },
      { href: '/pt-os/reports',           label: 'Progress Report',     icon: 'FileBarChart' },
    ],
  },
  {
    id: 'finance',
    label: 'Finance',
    icon: 'IndianRupee',
    items: [
      { href: '/finance/record-payment',  label: 'Record Payment',     icon: 'Wallet', role: 'admin' },
      { href: '/finance/collected-payments', label: 'Collected Payments', icon: 'Banknote', role: 'admin' },
      { href: '/finance/invoices',        label: 'Invoices',           icon: 'FileText', role: 'admin' },
      { href: '/finance/dues',            label: 'Outstanding Dues',   icon: 'AlertCircle',  badge: 'duesCount', role: 'admin' },
      { href: '/finance/pl',              label: 'Profit & Loss',      icon: 'BarChart3',    role: 'admin' },
      { href: '/finance/collection',      label: 'Collection',         icon: 'ArrowUpRight', role: 'admin' },
      { href: '/finance/forecast',        label: 'Revenue Forecast',   icon: 'TrendingUp',   role: 'admin' },
      { href: '/pt-os/commissions',       label: 'Trainer Commissions', icon: 'Percent',     role: 'admin', isNew: true },
      { href: '/finance/trainer-revenue', label: 'Trainer Payouts',    icon: 'Award',        role: 'admin' },
    ],
  },
  {
    id: 'communication',
    label: 'Communication',
    icon: 'MessageCircle',
    items: [
      { href: '/engagement/whatsapp',      label: 'WhatsApp / SMS',       icon: 'MessageCircle', role: 'admin' },
      { href: '/engagement/notifications', label: 'Notifications',        icon: 'Bell', role: 'admin' },
      { href: '/engagement/campaigns',     label: 'Campaigns',            icon: 'Send',        role: 'admin' },
      { href: '/engagement/offers',        label: 'Promotional Offers',   icon: 'Tag',         role: 'admin' },
      { href: '/engagement/feedback',      label: 'Feedback',             icon: 'Star',        role: 'admin' },
      { href: '/engagement/automation',    label: 'Automation Rules',     icon: 'Bot',         role: 'admin', isNew: true },
    ],
  },
  {
    id: 'subscription',
    label: 'Subscription',
    icon: 'CreditCard',
    items: [
      { href: '/pt-os/plans',             label: 'Plans',                icon: 'FileText',     role: 'admin' },
      { href: '/subscription/subscriptions', label: 'Subscriptions',     icon: 'Users',        role: 'admin', isNew: true },
      { href: '/subscription/packages',    label: 'Packages',             icon: 'Package',      role: 'admin', isNew: true },
    ],
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: 'FileBarChart',
    items: [
      { href: '/reports',               label: 'All Reports',         icon: 'FileBarChart', role: 'admin' },
      { href: '/insights/revenue',      label: 'Revenue Report',      icon: 'TrendingUp',   role: 'admin' },
      { href: '/insights/renewal',      label: 'Renewal Report',      icon: 'RefreshCcw',   role: 'admin' },
      { href: '/insights/traffic',      label: 'Attendance Report',   icon: 'Activity',     role: 'admin' },
      { href: '/training/transformations', label: 'Transformations',   icon: 'Sparkles',     roles: ['admin', 'manager'] },
    ],
  },
];

export const SETTINGS_GROUP: NavGroup = {
  id: 'settings',
  label: 'Settings',
  icon: 'Settings',
  items: [
    { href: '/settings',                 label: 'General',              icon: 'Settings' },
    { href: '/settings/studio',          label: 'Studio Settings',      icon: 'Building2',      role: 'admin', isNew: true },
    { href: '/settings/profile',         label: 'My Profile',           icon: 'User',           isNew: true },
    { href: '/settings/branches',        label: 'Branches',             icon: 'Building2',      role: 'admin' },
    { href: '/settings/biometric',       label: 'Biometric & Face',     icon: 'Fingerprint',    role: 'admin' },
    { href: '/settings/billing',         label: 'GST / Invoice',        icon: 'Receipt',        role: 'admin' },
    { href: '/settings/branding',        label: 'Branding',             icon: 'Palette',        role: 'admin' },
    { href: '/settings/integrations',    label: 'Integrations',         icon: 'Zap',            role: 'admin', isNew: true },
    { href: '/settings/import-database', label: 'Import Database',      icon: 'DatabaseBackup', role: 'admin' },
  ],
};

export const QUICK_ACTIONS = [

  { id: 'qa-record-pay',   label: 'Record payment',        icon: 'Wallet',        href: '/finance/record-payment' },
  { id: 'qa-book-session', label: 'Book PT session',       icon: 'CalendarPlus',  href: '/pt-os/schedule-session' },
  { id: 'qa-face-checkin', label: 'QR / Face check-in',    icon: 'ScanFace',      href: '/checkin' },
  { id: 'qa-add-coach',    label: 'Add trainer',            icon: 'UserCog',       href: '/trainers/add', role: 'admin' as Role },
];

export function allNavItems(): Array<NavItem & { groupId: string; groupLabel: string }> {
  const out: Array<NavItem & { groupId: string; groupLabel: string }> = [];
  for (const g of NAV_GROUPS) {
    for (const it of g.items) {
      out.push({ ...it, groupId: g.id, groupLabel: g.label });
      if (it.children) {
        for (const child of it.children) {
          out.push({ ...child, groupId: g.id, groupLabel: g.label });
        }
      }
    }
  }
  for (const it of SETTINGS_GROUP.items) out.push({ ...it, groupId: SETTINGS_GROUP.id, groupLabel: SETTINGS_GROUP.label });
  return out;
}

export function findItemByPath(pathname: string): (NavItem & { groupId: string; groupLabel: string }) | null {
  const all  = allNavItems();
  const path = pathname.split('?')[0];
  const exact = all.find((i) => i.href.split('?')[0] === path);
  if (exact) return exact;
  const prefix = all.find((i) => i.matchPrefix && path.startsWith(i.matchPrefix));
  if (prefix) return prefix;
  return all.find((i) => !i.matchPrefix && path.startsWith(i.href.split('?')[0] + '/')) ?? null;
}

export function isVisibleForRole(item: NavItem, userRole?: string): boolean {
  if (item.hidden) return false;
  const role = normaliseRole(userRole);
  if (item.roles?.length) return !!role && (item.roles as string[]).includes(role);
  if (item.role)          return role === item.role;
  return true;
}

export function isGroupVisibleForRole(group: NavGroup, userRole?: string): boolean {
  const role = normaliseRole(userRole);
  if (group.roles?.length) return !!role && (group.roles as string[]).includes(role);
  return true;
}
