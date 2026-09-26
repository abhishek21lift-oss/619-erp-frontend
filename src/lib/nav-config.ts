// src/lib/nav-config.ts
// Single source of truth for all navigation.
// Sidebar, CommandPalette, and Breadcrumbs all consume this file.

import { isRole } from './roles';
import type { Role } from './roles';

export type { Role } from './roles';

export type NavItem = {
  href: string;
  label: string;
  icon: string;
  /**
   * Who sees the item. Untagged means the studio trainer — the studio app's
   * one role. Tag with ['member'] for the client app's own entries.
   */
  roles?: Role[];
  /**
   * Platform feature key from the Control Centre's registry. When the studio
   * has that capability switched off, the item disappears from the nav.
   * A tag on the group covers every item inside it; a tag on an item narrows
   * it further (Knowledge Base sits in the AI group but has its own key).
   * Untagged items are always shown — see isVisibleForFeature.
   */
  feature?: string;
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
  /** Feature key covering the whole group. See NavItem.feature. */
  feature?: string;
  items: NavItem[];
};

// This list is the STUDIO application's navigation, and only that.
export const NAV_GROUPS: NavGroup[] = [
  {
    id: 'attendance',
    label: 'Attendance',
    icon: 'ScanFace',
    feature: 'attendance',
    items: [
      { href: '/checkin/qr-scanner', label: 'Check In',            icon: 'ScanFace' },
      { href: '/attendance',         label: 'Attendance Records',  icon: 'ClipboardList',  roles: ['trainer'] },
    ],
  },
  {
    id: 'personal-training',
    label: 'Clients',
    icon: 'Users',
    items: [
      { href: '/pt-os/leads',            label: 'Lead',                icon: 'UserSearch' },
      { href: '/pt-os/new-client',       label: 'New Client',         icon: 'UserPlus' },
      { href: '/pt-os/clients',          label: 'All Clients',        icon: 'Users' },
      { href: '/pt-os/messages',         label: 'Member Messages',    icon: 'MessagesSquare', badge: 'messagesUnread', matchPrefix: '/pt-os/messages' },
      { href: '/pt-os/clients/birthdays', label: 'Clients Birthday',  icon: 'Cake' },
    ],
  },
  {
    id: 'trainer-management',
    label: 'Programs',
    icon: 'Dumbbell',
    feature: 'programs',
    items: [
      { href: '/pt-os/today',               label: 'Today',                icon: 'CalendarDays' },
      { href: '/pt-os/workout-plans',       label: 'Workouts',             icon: 'Dumbbell',    matchPrefix: '/pt-os/workout-plans' },
      { href: '/pt-os/workout-log',         label: 'Workout Log',          icon: 'ClipboardList', matchPrefix: '/pt-os/workout-log' },
      { href: '/pt-os/exercise-library',    label: 'Exercise Library',     icon: 'BookOpen',    feature: 'exercise_library' },
      { href: '/pt-os/diet-plans',          label: 'Diet Plans',           icon: 'Apple' },
      { href: '/training/transformations',  label: 'Transformations',      icon: 'Sparkles',    roles: ['trainer'], feature: 'progress_photos' },
    ],
  },
  {
    id: 'session-management',
    label: 'Sessions',
    icon: 'Calendar',
    items: [
      { href: '/pt-os/my-schedule',       label: 'My Schedule',          icon: 'CalendarCheck' },
      { href: '/pt-os/schedule-session',  label: 'Book Session',         icon: 'CalendarPlus' },
      { href: '/pt-os/session-balance',   label: 'Session Balance',      icon: 'Gauge' },
      { href: '/pt-os/sessions',          label: 'Session History',      icon: 'History' },
    ],
  },
  {
    id: 'progress-tracking',
    label: 'Screening',
    icon: 'ShieldCheck',
    feature: 'screening',
    items: [
      { href: '/pt-os/informed-consent',  label: 'Consent',              icon: 'FileSignature' },
      { href: '/pt-os/parq',              label: 'PAR-Q',                icon: 'ShieldCheck' },
      { href: '/pt-os/goals',             label: 'Goal Setting',         icon: 'Target' },
      { href: '/pt-os/assessment',        label: 'Fitness Testing',      icon: 'ClipboardCheck' },
      { href: '/pt-os/lifestyle-assessment', label: 'Lifestyle',         icon: 'HeartPulse' },
      { href: '/pt-os/nutrition-assessment', label: 'Nutrition Assessment', icon: 'Salad' },
      { href: '/pt-os/mobility-assessment', label: 'Mobility Assessment', icon: 'Move' },
      { href: '/pt-os/posture-assessment', label: 'Posture Assessment',   icon: 'Accessibility' },
      { href: '/pt-os/strength-tracking', label: 'Strength Tracking',   icon: 'Zap' },
      { href: '/pt-os/progress-tracking-setup', label: 'Progress Tracking Overview', icon: 'Flag' },
      { href: '/pt-os/progress-photos',   label: 'Progress Photos',     icon: 'Camera',      feature: 'progress_photos' },
      { href: '/pt-os/progress-report',   label: 'Progress Report',     icon: 'TrendingUp' },
      { href: '/pt-os/weekly-checkin',    label: 'Weekly Check-in',     icon: 'ClipboardCheck' },
    ],
  },
  {
    id: 'finance',
    label: 'Finance',
    icon: 'IndianRupee',
    feature: 'finance',
    items: [
      { href: '/sales/today',               label: "Today's Sales",        icon: 'IndianRupee',  roles: ['trainer'] },
      { href: '/finance/record-payment',    label: 'Record Payment',       icon: 'Wallet',       roles: ['trainer'] },
      { href: '/finance/collected-payments', label: 'Collected Payments',  icon: 'Banknote',     roles: ['trainer'] },
      { href: '/finance/invoices',          label: 'Invoices',             icon: 'FileText',     roles: ['trainer'] },
      { href: '/finance/dues',              label: 'Outstanding Dues',     icon: 'AlertCircle',  badge: 'duesCount', roles: ['trainer'] },
      { href: '/pt-os/balance-sheet',       label: 'Balance Sheet',        icon: 'Wallet' },
      { href: '/finance/forecast',          label: 'Revenue Forecast',     icon: 'TrendingUp',   roles: ['trainer'] },
      { href: '/finance/payment-settings',  label: 'UPI Payment Settings', icon: 'QrCode',       roles: ['trainer'] },
    ],
  },
  // Members get their own group. It is the only one they see, so it carries
  // everything a member needs rather than being a stub beside staff nav.
  {
    id: 'my-account',
    label: 'My Account',
    icon: 'UserRound',
    roles: ['member'],
    feature: 'member_portal',
    items: [
      { href: '/member/dashboard', label: 'Dashboard',   icon: 'LayoutDashboard', roles: ['member'] },
      { href: '/member/workout',   label: 'My Programme', icon: 'Dumbbell',       roles: ['member'] },
      { href: '/member/diet',      label: 'My Diet',      icon: 'Apple',          roles: ['member'] },
      { href: '/member/checkin',   label: 'Weekly Check-in', icon: 'ClipboardCheck', roles: ['member'] },
      { href: '/member/payments',  label: 'My Payments', icon: 'Receipt',         roles: ['member'] },
    ],
  },
  {
    id: 'communication',
    label: 'Communication',
    icon: 'MessageCircle',
    feature: 'communication',
    items: [
      { href: '/engagement/whatsapp',      label: 'WhatsApp / SMS',       icon: 'MessageCircle', roles: ['trainer'] },
      { href: '/engagement/notifications', label: 'Notifications',        icon: 'Bell',          roles: ['trainer'] },
      { href: '/engagement/campaigns',     label: 'Campaigns',            icon: 'Send',          roles: ['trainer'] },
      { href: '/engagement/offers',        label: 'Promotional Offers',   icon: 'Tag',           roles: ['trainer'] },
      { href: '/engagement/feedback',      label: 'Feedback',             icon: 'Star',          roles: ['trainer'] },
      { href: '/engagement/automation',    label: 'Automation Rules',     icon: 'Bot',           roles: ['trainer'] },
    ],
  },
  {
    id: 'subscription',
    label: 'Packages',
    icon: 'Package',
    feature: 'packages',
    items: [
      { href: '/subscription/packages', label: 'Session Packages', icon: 'Package', roles: ['trainer'] },
    ],
  },
  {
    id: 'ai-coach',
    label: 'AI Suite',
    icon: 'Bot',
    feature: 'ai_suite',
    items: [
      { href: '/ai-coach',              label: 'AI Coach',            icon: 'Bot' },
      { href: '/ai/workout-generator', label: 'Workout Generator',   icon: 'Dumbbell' },
      { href: '/ai/diet-generator',    label: 'Diet Generator',      icon: 'Apple' },
      { href: '/ai/progress-analysis', label: 'Progress Analyzer',   icon: 'TrendingUp' },
      { href: '/ai/business-insights', label: 'Business Insights',   icon: 'BarChart3',  roles: ['trainer'] },
      { href: '/ai-coach/knowledge',   label: 'Knowledge Base',      icon: 'BookOpen',   roles: ['trainer'], feature: 'ai_knowledge_base' },
    ],
  },
  {
    id: 'insights',
    label: 'Insights',
    icon: 'FileBarChart',
    roles: ['trainer'],
    feature: 'insights',
    items: [
      { href: '/reports',                  label: 'All Reports',         icon: 'FileBarChart',  roles: ['trainer'] },
      { href: '/insights/sessions',        label: 'Session Utilisation', icon: 'Clock',         roles: ['trainer'] },
      { href: '/insights/revenue',         label: 'Revenue Report',      icon: 'TrendingUp',    roles: ['trainer'] },
      { href: '/pt-os/reports',            label: 'PT Revenue Report',   icon: 'TrendingUp',    roles: ['trainer'] },
      { href: '/insights/renewal',         label: 'Renewal Report',      icon: 'RefreshCcw',    roles: ['trainer'] },
      { href: '/insights/traffic',         label: 'Attendance Report',   icon: 'Activity',      roles: ['trainer'] },
      { href: '/operations/leaderboard',   label: 'Member Leaderboard',  icon: 'Trophy',        roles: ['trainer'] },
      { href: '/pt-os/activity-log',       label: 'Activity Log',        icon: 'ScrollText',    roles: ['trainer'] },
    ],
  },
];

export const SETTINGS_GROUP: NavGroup = {
  id: 'settings',
  label: 'Settings',
  icon: 'Settings',
  items: [
    { href: '/settings/profile',          label: 'My Profile',           icon: 'User' },
    { href: '/support',                   label: 'Support',              icon: 'LifeBuoy' },
    { href: '/subscription',              label: 'Subscription & Billing', icon: 'CreditCard',  roles: ['trainer'] },
    { href: '/settings/branches',         label: 'Branches',             icon: 'Building2',      roles: ['trainer'], feature: 'branches' },
    { href: '/settings/passkeys',         label: 'Passkeys & Security',  icon: 'Shield',         roles: ['trainer'], feature: 'passkeys' },
    { href: '/settings/biometrics',       label: 'Member Passkeys',      icon: 'Shield',         roles: ['trainer'], feature: 'passkeys' },
    { href: '/settings/integrations',     label: 'Integrations',         icon: 'Zap',            roles: ['trainer'], feature: 'integrations' },
    { href: '/settings/merge-duplicates', label: 'Merge Duplicates',     icon: 'Merge',          roles: ['trainer'] },
  ],
};

export const QUICK_ACTIONS = [
  { id: 'qa-record-pay',   label: 'Record payment',  icon: 'Wallet',       href: '/finance/record-payment',    roles: ['trainer'] as Role[], feature: 'finance' },
  { id: 'qa-book-session', label: 'Book PT session', icon: 'CalendarPlus', href: '/pt-os/schedule-session' },
  { id: 'qa-checkin',      label: 'Check In',         icon: 'ScanFace',     href: '/checkin/qr-scanner', feature: 'attendance' },
];

export function allNavItems(): Array<NavItem & { groupId: string; groupLabel: string }> {
  const out: Array<NavItem & { groupId: string; groupLabel: string }> = [];
  for (const g of NAV_GROUPS) {
    const inherit = (it: NavItem): NavItem => ({ ...it, feature: it.feature ?? g.feature });
    for (const it of g.items) {
      out.push({ ...inherit(it), groupId: g.id, groupLabel: g.label });
      if (it.children) {
        for (const child of it.children) {
          out.push({ ...inherit(child), groupId: g.id, groupLabel: g.label });
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

// Visibility is exact. An untagged item or group belongs to the studio app,
// which is the trainer's; a member sees only what is tagged for members; the
// platform operator has no studio navigation at all (their console is its own
// portal); and an unknown role sees nothing. There are no role aliases and no
// role that stands in for another.
export function isVisibleForRole(item: NavItem, userRole?: string): boolean {
  if (item.hidden || !isRole(userRole)) return false;
  if (item.roles?.length) return item.roles.includes(userRole);
  return userRole === 'trainer';
}

export function isVisibleForFeature(
  item: Pick<NavItem, 'feature'>,
  features?: Record<string, boolean>
): boolean {
  if (!item.feature || !features) return true;
  return features[item.feature] !== false;
}

export function isGroupVisibleForFeature(group: NavGroup, features?: Record<string, boolean>): boolean {
  return isVisibleForFeature(group, features);
}

export function isGroupVisibleForRole(group: NavGroup, userRole?: string): boolean {
  if (!isRole(userRole)) return false;
  if (group.roles?.length) return group.roles.includes(userRole);
  return userRole === 'trainer';
}
