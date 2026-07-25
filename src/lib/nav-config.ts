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
  /** @deprecated use `roles` array instead */
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
  // Platform operator (super_admin) navigation. Shown ONLY to super_admins (see
  // isGroupVisibleForRole) and hidden from every tenant role. Studio nav groups
  // below are, conversely, hidden from super_admins — so a platform operator
  // gets a dedicated control-plane interface, not a studio dashboard.
  {
    id: 'platform',
    label: 'Platform',
    icon: 'ShieldCheck',
    roles: ['super_admin'],
    items: [
      { href: '/platform',              label: 'Command Centre', icon: 'LayoutGrid' },
      { href: '/platform?tab=studios',  label: 'Studios',        icon: 'Layers' },
      { href: '/platform?tab=billing',  label: 'Billing',        icon: 'CreditCard' },
      { href: '/platform?tab=coupons',  label: 'Coupons',        icon: 'Ticket' },
      { href: '/platform?tab=activity', label: 'Activity',       icon: 'Activity' },
    ],
  },
  {
    id: 'attendance',
    label: 'Attendance',
    icon: 'ScanFace',
    items: [
      { href: '/checkin',             label: 'Check In',            icon: 'ScanFace' },
      { href: '/checkin/enroll',     label: 'Enroll Member',       icon: 'UserCheck',      roles: ['admin', 'manager'] },
      { href: '/checkin/enroll/face', label: 'Face Enrollment',    icon: 'Camera',         roles: ['admin', 'manager'], hidden: true, matchPrefix: '/checkin/enroll/face' },
      { href: '/checkin/kiosk',      label: 'Kiosk Mode',          icon: 'Monitor',        roles: ['admin', 'manager'] },
      { href: '/attendance',         label: 'Attendance Records',  icon: 'ClipboardList',  roles: ['admin', 'manager', 'trainer'] },
      { href: '/attendance/reports', label: 'Reports & Dashboard', icon: 'BarChart3',      roles: ['admin'] },
    ],
  },
  {
    id: 'personal-training',
    label: 'Clients',
    icon: 'Users',
    items: [
      { href: '/pt-os/new-client',       label: 'New Client',         icon: 'UserPlus' },
      { href: '/pt-os/clients',          label: 'All Clients',        icon: 'Users' },
      { href: '/pt-os/balance-sheet',    label: 'Balance Sheet',      icon: 'Wallet' },
      { href: '/pt-os/goals',            label: 'Goal Setting',       icon: 'Target' },
      { href: '/pt-os/assessment',       label: 'Fitness Testing',    icon: 'ClipboardCheck' },
    ],
  },
  {
    id: 'trainer-management',
    label: 'Programs',
    icon: 'Dumbbell',
    items: [
      { href: '/pt-os/workout-plans',       label: 'Workout Plans',        icon: 'Dumbbell' },
      { href: '/pt-os/workout-log',         label: 'Workout Log',          icon: 'ClipboardList', isNew: true, matchPrefix: '/pt-os/workout-log' },
      { href: '/pt-os/exercise-library',    label: 'Exercise Library',     icon: 'BookOpen' },
      { href: '/pt-os/diet-plans',          label: 'Diet Plans',           icon: 'Apple' },
      { href: '/training/transformations',  label: 'Transformations',      icon: 'Sparkles',    roles: ['admin', 'manager'], comingSoon: true },
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
    ],
  },
  {
    id: 'progress-tracking',
    label: 'Screening',
    icon: 'ShieldCheck',
    items: [
      { href: '/pt-os/informed-consent',  label: 'Consent',              icon: 'FileSignature',  isNew: true },
      { href: '/pt-os/parq',              label: 'PAR-Q',                icon: 'ShieldCheck',    isNew: true },
      { href: '/pt-os/assessment',        label: 'Fitness Testing',      icon: 'ClipboardCheck', isNew: true },
      { href: '/pt-os/lifestyle-assessment', label: 'Lifestyle',         icon: 'HeartPulse',     isNew: true },
      { href: '/pt-os/nutrition-assessment', label: 'Nutrition Assessment', icon: 'Salad',       isNew: true },
      { href: '/pt-os/mobility-assessment', label: 'Mobility Assessment', icon: 'Move',           isNew: true },
      { href: '/pt-os/posture-assessment', label: 'Posture Assessment',   icon: 'Accessibility',  isNew: true },
      { href: '/pt-os/strength-tracking', label: 'Strength Tracking',   icon: 'Zap',             isNew: true },
      { href: '/pt-os/progress-tracking-setup', label: 'Progress Tracking Session', icon: 'Flag', isNew: true },
      { href: '/pt-os/progress-photos',   label: 'Progress Photos',     icon: 'Camera',         isNew: true },
      { href: '/pt-os/reports',           label: 'Progress Report',     icon: 'FileBarChart' },
      { href: '/pt-os/weekly-checkin',    label: 'Weekly Check-in',     icon: 'ClipboardCheck', isNew: true },
    ],
  },
  {
    id: 'finance',
    label: 'Finance',
    icon: 'IndianRupee',
    items: [
      { href: '/sales/today',               label: "Today's Sales",        icon: 'IndianRupee',  roles: ['admin', 'manager'] },
      { href: '/finance/record-payment',    label: 'Record Payment',       icon: 'Wallet',       roles: ['admin'] },
      { href: '/finance/collected-payments', label: 'Collected Payments',  icon: 'Banknote',     roles: ['admin'] },
      { href: '/finance/invoices',          label: 'Invoices',             icon: 'FileText',     roles: ['admin'] },
      { href: '/finance/dues',              label: 'Outstanding Dues',     icon: 'AlertCircle',  badge: 'duesCount', roles: ['admin'] },
      { href: '/finance/forecast',          label: 'Revenue Forecast',     icon: 'TrendingUp',   roles: ['admin'] },
    ],
  },
  {
    id: 'communication',
    label: 'Communication',
    icon: 'MessageCircle',
    items: [
      { href: '/engagement/whatsapp',      label: 'WhatsApp / SMS',       icon: 'MessageCircle', roles: ['admin'] },
      { href: '/engagement/notifications', label: 'Notifications',        icon: 'Bell',          roles: ['admin'] },
      { href: '/engagement/campaigns',     label: 'Campaigns',            icon: 'Send',          roles: ['admin'] },
      { href: '/engagement/offers',        label: 'Promotional Offers',   icon: 'Tag',           roles: ['admin'] },
      { href: '/engagement/feedback',      label: 'Feedback',             icon: 'Star',          roles: ['admin'] },
      { href: '/engagement/automation',    label: 'Automation Rules',     icon: 'Bot',           roles: ['admin'], isNew: true },
    ],
  },
  {
    id: 'subscription',
    label: 'Packages',
    icon: 'Package',
    items: [
      { href: '/subscription/packages', label: 'Session Packages', icon: 'Package', roles: ['admin'] },
    ],
  },
  {
    id: 'ai-coach',
    label: 'AI Suite',
    icon: 'Bot',
    items: [
      { href: '/ai-coach',            label: 'AI Coach',           icon: 'Bot',        isNew: true },
      { href: '/ai/workout-generator',label: 'Workout Generator',  icon: 'Dumbbell',   isNew: true },
      { href: '/ai/diet-generator',   label: 'Diet Generator',     icon: 'Apple',      isNew: true },
      { href: '/ai/progress-analysis',label: 'Progress Analyzer',  icon: 'TrendingUp', isNew: true },
      { href: '/ai/business-insights',label: 'Business Insights',  icon: 'BarChart3',  isNew: true, roles: ['admin'] },
    ],
  },
  {
    id: 'insights',
    label: 'Insights',
    icon: 'FileBarChart',
    roles: ['admin', 'manager'],
    items: [
      { href: '/reports',                  label: 'All Reports',         icon: 'FileBarChart',  roles: ['admin'] },
      { href: '/insights/sessions',        label: 'Session Utilisation', icon: 'Clock',         roles: ['admin'] },
      { href: '/insights/revenue',         label: 'Revenue Report',      icon: 'TrendingUp',    roles: ['admin'] },
      { href: '/insights/renewal',         label: 'Renewal Report',      icon: 'RefreshCcw',    roles: ['admin'] },
      { href: '/insights/traffic',         label: 'Attendance Report',   icon: 'Activity',      roles: ['admin'] },
      { href: '/operations/leaderboard',   label: 'Member Leaderboard',  icon: 'Trophy',        roles: ['admin', 'manager'] },
    ],
  },
];

export const SETTINGS_GROUP: NavGroup = {
  id: 'settings',
  label: 'Settings',
  icon: 'Settings',
  items: [
    { href: '/settings/profile',          label: 'My Profile',           icon: 'User' },
    { href: '/subscription',              label: 'Subscription & Billing', icon: 'CreditCard',  roles: ['admin'] },
    { href: '/settings/branches',         label: 'Branches',             icon: 'Building2',      roles: ['admin'] },
    { href: '/settings/biometric',        label: 'Biometric & Face',     icon: 'Fingerprint',    roles: ['admin'] },
    { href: '/settings/passkeys',         label: 'Passkeys & Security',  icon: 'Shield',         roles: ['admin'] },
    { href: '/settings/integrations',     label: 'Integrations',         icon: 'Zap',            roles: ['admin'], isNew: true },
    { href: '/settings/merge-duplicates', label: 'Merge Duplicates',     icon: 'Merge',          roles: ['admin'], isNew: true },
  ],
};

export const QUICK_ACTIONS = [
  { id: 'qa-record-pay',   label: 'Record payment',  icon: 'Wallet',       href: '/finance/record-payment',    roles: ['admin'] as Role[] },
  { id: 'qa-book-session', label: 'Book PT session', icon: 'CalendarPlus', href: '/pt-os/schedule-session' },
  { id: 'qa-face-checkin', label: 'Check In',         icon: 'ScanFace',     href: '/checkin' },
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
  if (item.role)           return role === item.role;
  return true;
}

export function isGroupVisibleForRole(group: NavGroup, userRole?: string): boolean {
  const role = normaliseRole(userRole);
  // Platform operators get ONLY platform-scoped groups (the control plane), not
  // studio groups — so they see a dedicated interface instead of a studio's nav.
  if (role === 'super_admin') return !!group.roles?.includes('super_admin');
  if (group.roles?.length) return !!role && (group.roles as string[]).includes(role);
  return true;
}
