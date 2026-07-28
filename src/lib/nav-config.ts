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

export const NAV_GROUPS: NavGroup[] = [
  // Platform operator (super_admin) navigation. Shown ONLY to super_admins (see
  // isGroupVisibleForRole) and hidden from every tenant role. Studio nav groups
  // below are, conversely, hidden from super_admins — so a platform operator
  // gets a dedicated control-plane interface, not a studio dashboard.
  {
    id: 'platform',
    label: 'Control Centre',
    icon: 'ShieldCheck',
    roles: ['super_admin'],
    items: [
      { href: '/platform',              label: 'Command Centre', icon: 'LayoutGrid' },
      { href: '/platform?tab=studios',  label: 'Studios',        icon: 'Layers' },
      { href: '/platform?tab=finance',  label: 'Finance',        icon: 'CreditCard' },
      { href: '/platform?tab=ai',       label: 'AI Control',     icon: 'Bot' },
      { href: '/platform?tab=features', label: 'Features',       icon: 'ToggleRight' },
      { href: '/platform?tab=announcements', label: 'Announcements', icon: 'Megaphone' },
      { href: '/platform?tab=activity', label: 'Activity',       icon: 'Activity' },
      { href: '/platform?tab=audit',    label: 'Audit Centre',   icon: 'ScrollText' },
      { href: '/platform?tab=security', label: 'Security',       icon: 'ShieldAlert' },
      { href: '/platform?tab=health',   label: 'System Health',  icon: 'HeartPulse' },
    ],
  },
  {
    id: 'attendance',
    label: 'Attendance',
    icon: 'ScanFace',
    feature: 'attendance',
    items: [
      { href: '/checkin/qr-scanner', label: 'Check In',            icon: 'ScanFace' },
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
      { href: '/pt-os/leads',            label: 'Lead',                icon: 'UserSearch' },
      { href: '/pt-os/new-client',       label: 'New Client',         icon: 'UserPlus' },
      { href: '/pt-os/clients',          label: 'All Clients',        icon: 'Users' },
      { href: '/pt-os/clients/birthdays', label: 'Clients Birthday',  icon: 'Cake' },
    ],
  },
  {
    id: 'trainer-management',
    label: 'Programs',
    icon: 'Dumbbell',
    feature: 'programs',
    items: [
      { href: '/pt-os/workout-plans',       label: 'Workout Plans',        icon: 'Dumbbell' },
      { href: '/pt-os/workout-log',         label: 'Workout Log',          icon: 'ClipboardList', matchPrefix: '/pt-os/workout-log' },
      { href: '/pt-os/exercise-library',    label: 'Exercise Library',     icon: 'BookOpen',    feature: 'exercise_library' },
      { href: '/pt-os/diet-plans',          label: 'Diet Plans',           icon: 'Apple' },
      { href: '/training/transformations',  label: 'Transformations',      icon: 'Sparkles',    roles: ['admin', 'manager'], feature: 'progress_photos', comingSoon: true },
      { href: '/trainers/[id]',             label: 'Trainer Profile',      icon: 'UserCog',     hidden: true, matchPrefix: '/trainers/' },
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
      { href: '/pt-os/progress-tracking-setup', label: 'Progress Tracking Session', icon: 'Flag' },
      { href: '/pt-os/progress-photos',   label: 'Progress Photos',     icon: 'Camera',      feature: 'progress_photos' },
      { href: '/pt-os/reports',           label: 'Progress Report',     icon: 'FileBarChart' },
      { href: '/pt-os/weekly-checkin',    label: 'Weekly Check-in',     icon: 'ClipboardCheck' },
    ],
  },
  {
    id: 'finance',
    label: 'Finance',
    icon: 'IndianRupee',
    feature: 'finance',
    items: [
      { href: '/sales/today',               label: "Today's Sales",        icon: 'IndianRupee',  roles: ['admin', 'manager'] },
      { href: '/finance/record-payment',    label: 'Record Payment',       icon: 'Wallet',       roles: ['admin'] },
      { href: '/finance/collected-payments', label: 'Collected Payments',  icon: 'Banknote',     roles: ['admin'] },
      { href: '/finance/invoices',          label: 'Invoices',             icon: 'FileText',     roles: ['admin'] },
      { href: '/finance/dues',              label: 'Outstanding Dues',     icon: 'AlertCircle',  badge: 'duesCount', roles: ['admin'] },
      { href: '/pt-os/balance-sheet',       label: 'Balance Sheet',        icon: 'Wallet' },
      { href: '/finance/forecast',          label: 'Revenue Forecast',     icon: 'TrendingUp',   roles: ['admin'] },
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
      { href: '/member/classes',   label: 'My Classes',  icon: 'Calendar',        roles: ['member'] },
      { href: '/member/payments',  label: 'My Payments', icon: 'Receipt',         roles: ['member'] },
    ],
  },
  {
    id: 'communication',
    label: 'Communication',
    icon: 'MessageCircle',
    feature: 'communication',
    items: [
      { href: '/engagement/whatsapp',      label: 'WhatsApp / SMS',       icon: 'MessageCircle', roles: ['admin'] },
      { href: '/engagement/notifications', label: 'Notifications',        icon: 'Bell',          roles: ['admin'] },
      { href: '/engagement/campaigns',     label: 'Campaigns',            icon: 'Send',          roles: ['admin'] },
      { href: '/engagement/offers',        label: 'Promotional Offers',   icon: 'Tag',           roles: ['admin'] },
      { href: '/engagement/feedback',      label: 'Feedback',             icon: 'Star',          roles: ['admin'] },
      { href: '/engagement/automation',    label: 'Automation Rules',     icon: 'Bot',           roles: ['admin'] },
    ],
  },
  {
    id: 'subscription',
    label: 'Packages',
    icon: 'Package',
    feature: 'packages',
    items: [
      { href: '/subscription/packages', label: 'Session Packages', icon: 'Package', roles: ['admin'] },
    ],
  },
  {
    id: 'ai-coach',
    label: 'AI Suite',
    icon: 'Bot',
    feature: 'ai_suite',
    items: [
      { href: '/ai-coach',            label: 'AI Coach',           icon: 'Bot' },
      { href: '/ai/workout-generator',label: 'Workout Generator',  icon: 'Dumbbell' },
      { href: '/ai/diet-generator',   label: 'Diet Generator',     icon: 'Apple' },
      { href: '/ai/progress-analysis',label: 'Progress Analyzer',  icon: 'TrendingUp' },
      { href: '/ai/business-insights',label: 'Business Insights',  icon: 'BarChart3',  roles: ['admin'] },
      { href: '/ai-coach/knowledge',  label: 'Knowledge Base',     icon: 'BookOpen',   roles: ['admin', 'manager'], feature: 'ai_knowledge_base' },
    ],
  },
  {
    id: 'insights',
    label: 'Insights',
    icon: 'FileBarChart',
    roles: ['admin', 'manager'],
    feature: 'insights',
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
    { href: '/settings/branches',         label: 'Branches',             icon: 'Building2',      roles: ['admin'], feature: 'branches' },
    { href: '/settings/passkeys',         label: 'Passkeys & Security',  icon: 'Shield',         roles: ['admin'], feature: 'passkeys' },
    { href: '/settings/integrations',     label: 'Integrations',         icon: 'Zap',            roles: ['admin'], feature: 'integrations' },
    { href: '/settings/merge-duplicates', label: 'Merge Duplicates',     icon: 'Merge',          roles: ['admin'] },
  ],
};

export const QUICK_ACTIONS = [
  { id: 'qa-record-pay',   label: 'Record payment',  icon: 'Wallet',       href: '/finance/record-payment',    roles: ['admin'] as Role[], feature: 'finance' },
  { id: 'qa-book-session', label: 'Book PT session', icon: 'CalendarPlus', href: '/pt-os/schedule-session' },
  { id: 'qa-checkin',      label: 'Check In',         icon: 'ScanFace',     href: '/checkin/qr-scanner', feature: 'attendance' },
];

export function allNavItems(): Array<NavItem & { groupId: string; groupLabel: string }> {
  const out: Array<NavItem & { groupId: string; groupLabel: string }> = [];
  for (const g of NAV_GROUPS) {
    // Flattening loses the group, so the group's feature tag is inherited onto
    // each copy here. Without this the Command Palette would keep offering
    // items from a group the studio has switched off — the sidebar filters the
    // group itself, but the palette only ever sees these flattened items.
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

export function isVisibleForRole(item: NavItem, userRole?: string): boolean {
  if (item.hidden) return false;
  const role = normaliseRole(userRole);
  if (item.roles?.length) return !!role && (item.roles as string[]).includes(role);
  if (item.role)           return role === item.role;
  return true;
}

/**
 * Feature-flag visibility, applied ALONGSIDE the role filter — never instead
 * of it. Both must pass.
 *
 * Fails open on purpose: an untagged item, an unknown key, or an empty map
 * (the operator's session, or the moment before the flags land) all pass. Only
 * an explicit `false` from the server hides anything. This mirrors the server's
 * requireFeature() so the two can never disagree in the dangerous direction —
 * the worst case here is a visible item that 403s, not a studio that quietly
 * loses pages it pays for.
 *
 * This is presentation only. The capability itself is enforced by the API.
 */
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
  const role = normaliseRole(userRole);
  // Platform operators get ONLY platform-scoped groups (the control plane), not
  // studio groups — so they see a dedicated interface instead of a studio's nav.
  if (role === 'super_admin') return !!group.roles?.includes('super_admin');
  if (group.roles?.length) return !!role && (group.roles as string[]).includes(role);
  return true;
}
