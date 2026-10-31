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

// The three things a trainer needs at the start of a shift. They used to sit
// in three different accordions (Today under Programs, Schedule under Sessions,
// Check In under Attendance), so the sidebar now renders them as direct links
// above the groups. See PINNED_ITEMS handling in Sidebar.tsx.
export const PINNED_ITEMS: NavItem[] = [
  { href: '/pt-os/today',           label: 'Today',        icon: 'CalendarDays' },
  { href: '/pt-os/my-schedule',     label: 'My Schedule',  icon: 'CalendarCheck' },
  { href: '/checkin/qr-scanner',    label: 'Check In',     icon: 'ScanFace', feature: 'attendance' },
];

// This list is the STUDIO application's navigation, and only that.
//
// Groups are ordered by the trainer's day, and SECTION_LABELS in Sidebar.tsx
// groups them into four headings. Per-client forms (PAR-Q, consent, the
// assessment suite) are deliberately absent: they live in the client record's
// Documents tab, where the client is already chosen.
export const NAV_GROUPS: NavGroup[] = [
  {
    id: 'clients',
    label: 'Clients',
    icon: 'Users',
    items: [
      { href: '/pt-os/clients',           label: 'All Clients',         icon: 'Users' },
      { href: '/pt-os/clients/at-risk',   label: 'At-risk Clients',     icon: 'AlertTriangle' },
      { href: '/pt-os/form-checks',       label: 'Form Checks',         icon: 'Video' },
      { href: '/pt-os/leads',             label: 'Leads',               icon: 'UserSearch' },
      { href: '/pt-os/messages',          label: 'Member Messages',     icon: 'MessagesSquare', badge: 'messagesUnread', matchPrefix: '/pt-os/messages' },
      { href: '/pt-os/clients/birthdays', label: 'Clients Birthday',    icon: 'Cake' },
    ],
  },
  {
    id: 'sessions',
    label: 'Sessions',
    icon: 'Calendar',
    items: [
      { href: '/pt-os/schedule-session',  label: 'Book Session',        icon: 'CalendarPlus' },
      { href: '/pt-os/availability',      label: 'Availability',        icon: 'CalendarClock' },
      { href: '/pt-os/session-balance',   label: 'Session Balance',     icon: 'Gauge' },
      { href: '/pt-os/sessions',          label: 'Session History',     icon: 'History' },
      { href: '/attendance',              label: 'Attendance Records',  icon: 'ClipboardList', feature: 'attendance', roles: ['trainer'] },
    ],
  },
  {
    id: 'programs',
    label: 'Programs',
    icon: 'Dumbbell',
    feature: 'programs',
    items: [
      { href: '/pt-os/workout-plans',       label: 'Workouts',             icon: 'Dumbbell',    matchPrefix: '/pt-os/workout-plans' },
      { href: '/pt-os/workout-log',         label: 'Workout Log',          icon: 'ClipboardList', matchPrefix: '/pt-os/workout-log' },
      { href: '/pt-os/diet-plans',          label: 'Diet Plans',           icon: 'Apple' },
      { href: '/pt-os/macrocycle',          label: 'Macrocycle',           icon: 'Layers' },
      { href: '/pt-os/exercise-library',    label: 'Exercise Library',     icon: 'BookOpen',    feature: 'exercise_library' },
      { href: '/pt-os/cardio-calculator',   label: 'Cardio & FITT',        icon: 'HeartPulse' },
      // One photo destination for the studio. The per-client gallery is the
      // Photos tab inside the client record.
      { href: '/training/transformations',  label: 'Photos & Transformations', icon: 'Sparkles', roles: ['trainer'], feature: 'progress_photos' },
    ],
  },
  {
    id: 'progress',
    label: 'Progress',
    icon: 'LineChart',
    feature: 'screening',
    items: [
      { href: '/pt-os/progress',           label: 'Progress Hub',        icon: 'LineChart' },
      { href: '/pt-os/progress-report',    label: 'Progress Report',     icon: 'TrendingUp' },
      { href: '/pt-os/weekly-checkin',     label: 'Weekly Check-in',     icon: 'ClipboardCheck' },
    ],
  },
  {
    id: 'finance',
    label: 'Finance',
    icon: 'IndianRupee',
    feature: 'finance',
    items: [
      { href: '/finance/record-payment',    label: 'Record Payment',       icon: 'Wallet',       roles: ['trainer'] },
      // The queue where a member's UPI transfer is matched to the bank
      // statement and approved. It had no sidebar entry: the only ways in were
      // a link on the UPI settings page and one in the renewal-offer sheet.
      { href: '/finance/verify-payments',   label: 'Verify UPI Payments',  icon: 'BadgeCheck',   badge: 'upiPending', roles: ['trainer'] },
      // Today's Sales folded in here: Collected Payments has a Today period.
      { href: '/finance/collected-payments', label: 'Collected Payments',  icon: 'Banknote',     roles: ['trainer'] },
      { href: '/finance/invoices',          label: 'Invoices',             icon: 'FileText',     roles: ['trainer'] },
      { href: '/finance/dues',              label: 'Outstanding Dues',     icon: 'AlertCircle',  badge: 'duesCount', roles: ['trainer'] },
      // Packages was its own one-link accordion. The item keeps the packages
      // key so switching that capability off still hides the catalogue.
      { href: '/subscription/packages',     label: 'Session Packages',     icon: 'Package',      roles: ['trainer'], feature: 'packages' },
      { href: '/pt-os/balance-sheet',       label: 'Balance Sheet',        icon: 'Wallet' },
      { href: '/finance/forecast',          label: 'Revenue Forecast',     icon: 'TrendingUp',   roles: ['trainer'] },
      // UPI Payment Settings lives in My Profile → UPI Payments now.
    ],
  },
  {
    id: 'insights',
    label: 'Reports',
    icon: 'FileBarChart',
    roles: ['trainer'],
    feature: 'insights',
    items: [
      // One revenue page: All Reports and PT Revenue Report were thinner
      // copies of it. Session Utilisation's weekday chart is on the
      // Attendance Report, which reads the same endpoint.
      { href: '/insights/revenue',         label: 'Revenue Report',      icon: 'TrendingUp',    roles: ['trainer'] },
      { href: '/insights/renewal',         label: 'Renewal Report',      icon: 'RefreshCcw',    roles: ['trainer'] },
      { href: '/insights/traffic',         label: 'Attendance Report',   icon: 'Activity',      roles: ['trainer'] },
      { href: '/operations/leaderboard',   label: 'Member Leaderboard',  icon: 'Trophy',        roles: ['trainer'] },
      { href: '/pt-os/activity-log',       label: 'Activity Log',        icon: 'ScrollText',    roles: ['trainer'] },
    ],
  },
  {
    id: 'communication',
    label: 'Communication',
    icon: 'MessageCircle',
    feature: 'communication',
    items: [
      { href: '/engagement/whatsapp',      label: 'WhatsApp',             icon: 'MessageCircle', roles: ['trainer'] },
      { href: '/engagement/notifications', label: 'Notifications',        icon: 'Bell',          roles: ['trainer'] },
      { href: '/engagement/campaigns',     label: 'Campaigns',            icon: 'Send',          roles: ['trainer'] },
      { href: '/engagement/offers',        label: 'Promotional Offers',   icon: 'Tag',           roles: ['trainer'] },
      { href: '/engagement/feedback',      label: 'Feedback',             icon: 'Star',          roles: ['trainer'] },
      { href: '/engagement/automation',    label: 'Automation Rules',     icon: 'Bot',           roles: ['trainer'] },
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
      { href: '/member/dashboard', label: 'Home',      icon: 'LayoutDashboard', roles: ['member'] },
      { href: '/member/workout',   label: 'Workout',   icon: 'Dumbbell',        roles: ['member'] },
      { href: '/member/diet',      label: 'Diet',      icon: 'Apple',           roles: ['member'] },
      { href: '/member/checkin',   label: 'Check-in',  icon: 'ClipboardCheck',  roles: ['member'] },
      { href: '/member/book',      label: 'Book',      icon: 'CalendarPlus',    roles: ['member'] },
      { href: '/member/payments',  label: 'Payments',  icon: 'Receipt',         roles: ['member'] },
      { href: '/member/more',      label: 'Profile',   icon: 'UserRound',       roles: ['member'] },
    ],
  },
  {
    id: 'ai-coach',
    label: 'AI Suite',
    icon: 'Bot',
    feature: 'ai_suite',
    items: [
      { href: '/ai-coach',              label: 'AI Coach',            icon: 'Bot' },
      // The AI generator is the primary programme tool. The rule-based
      // /pt-os/workout-generator route still exists but is not in the nav.
      { href: '/ai/workout-generator', label: 'AI Workout Generator', icon: 'Dumbbell' },
      { href: '/ai/diet-generator',    label: 'AI Diet Generator',    icon: 'Apple' },
      { href: '/ai/progress-analysis', label: 'AI Progress Analysis', icon: 'TrendingUp' },
      { href: '/ai/business-insights', label: 'Business Insights',    icon: 'BarChart3',  roles: ['trainer'] },
      { href: '/ai-coach/knowledge',   label: 'Knowledge Base',       icon: 'BookOpen',   roles: ['trainer'], feature: 'ai_knowledge_base' },
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
    { href: '/settings/passkeys',         label: 'Passkeys & Security',  icon: 'Shield',         roles: ['trainer'], feature: 'passkeys' },
    { href: '/settings/biometrics',       label: 'Member Passkey Setup', icon: 'Shield',         roles: ['trainer'], feature: 'passkeys' },
    { href: '/settings/integrations',     label: 'Integrations',         icon: 'Zap',            roles: ['trainer'], feature: 'integrations' },
  ],
};

export const QUICK_ACTIONS = [
  { id: 'qa-record-pay',   label: 'Record payment',  hint: 'Log money received',  icon: 'Wallet',       href: '/finance/record-payment',    roles: ['trainer'] as Role[], feature: 'finance', keywords: 'new create add payment collect money cash received invoice bill' },
  { id: 'qa-book-session', label: 'Book PT session', hint: 'Book a PT session',   icon: 'CalendarPlus', href: '/pt-os/schedule-session',    roles: ['trainer'] as Role[], keywords: 'new create add session booking schedule appointment slot' },
  { id: 'qa-checkin',      label: 'Check In',        hint: 'Scan the attendance QR', icon: 'ScanFace',  href: '/checkin/qr-scanner', feature: 'attendance', roles: ['trainer'] as Role[], keywords: 'checkin check in attendance qr scan walk-in' },
  { id: 'qa-new-client',   label: 'New client',      hint: 'Enrol someone new',   icon: 'UserPlus',     href: '/pt-os/new-client',            roles: ['trainer'] as Role[], keywords: 'new create add client member enrol enroll signup join' },
];

export function allNavItems(): Array<NavItem & { groupId: string; groupLabel: string }> {
  const out: Array<NavItem & { groupId: string; groupLabel: string }> = [];
  for (const it of PINNED_ITEMS) out.push({ ...it, groupId: 'workspace', groupLabel: 'Workspace' });
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
