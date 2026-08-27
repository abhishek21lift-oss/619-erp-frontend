// Shared types and tab identifiers for the platform console.
//
// Extracted verbatim from the 3,197-line platform/page.tsx (audit H-03).
import type { Organization, SubStudio } from '@/lib/api';

/**
 * Roles offerable when adding or editing a studio's user.
 *
 * Re-exported from lib/roles rather than listed here: it was
 * ['admin','manager','trainer','member'], three of which have never had a
 * single account, and the selects printed the raw identifier as the option
 * text. One list, one set of labels.
 */
export { ASSIGNABLE_ROLES as ROLE_OPTIONS } from '@/lib/roles';

export type Tab = 'overview' | 'registrations' | 'studios' | 'users' | 'invitations' | 'support' | 'analytics' | 'ai' | 'finance' | 'features' | 'announcements' | 'activity' | 'audit' | 'security' | 'storage' | 'health';
// Must list every Tab: normalizeTab() falls back to 'overview' for anything not
// here, so omitting one silently breaks its ?tab= deep link from the sidebar.
//
// 'registrations' was missing, and had been since this file was extracted — the
// exact failure the line above predicts. ?tab=registrations resolved to
// 'overview', so every link to the registrations queue quietly opened the
// dashboard instead. Nothing errored and the tab worked perfectly once clicked,
// which is why it survived: only the deep link was broken.
//
// platform-modules.test.ts now checks this list against the Tab union rather
// than trusting the comment, because a comment saying "must list every Tab" is
// exactly as strong as the next person's attention.
export const TAB_IDS: Tab[] = ['overview', 'studios', 'registrations', 'users', 'invitations', 'support', 'analytics', 'ai', 'finance', 'features', 'announcements', 'activity', 'audit', 'security', 'storage', 'health'];

// ── Modules ─────────────────────────────────────────────────────────────────
//
// Sixteen tabs in one flat row is a list, not a control surface. Past about
// eight the row wraps, scrolls sideways on a phone, and stops being scannable —
// so finding "where do I suspend a studio" becomes a matter of reading every
// label rather than knowing where to look.
//
// The tabs are grouped into eight modules. Nothing about the tabs themselves
// changes: `tab` stays the single piece of state, every ?tab= deep link still
// resolves exactly as before, and no panel moved. The module is DERIVED from
// the active tab (moduleForTab), which is what makes this a navigation change
// rather than a routing one — there is no second state to keep in sync, and no
// way for the module and the tab to disagree.
//
// Grouping is by the question an operator arrives with, not by which API serves
// it. Registrations and Invitations sit under Studios because both are "a
// studio that does not exist yet"; Support sits under Operations because a
// ticket is usually a symptom of something in that module; Activity, Audit and
// Security are one module because they are the same question at three
// magnifications.
export type ModuleId =
  | 'overview' | 'studios' | 'users' | 'revenue'
  | 'ai' | 'operations' | 'security' | 'control';

export type PlatformModule = {
  id: ModuleId;
  label: string;
  /** Tabs in this module, in the order the sub-navigation shows them. */
  tabs: Tab[];
};

export const MODULES: PlatformModule[] = [
  { id: 'overview',   label: 'Overview',  tabs: ['overview'] },
  { id: 'studios',    label: 'Studios',   tabs: ['studios', 'registrations', 'invitations'] },
  { id: 'users',      label: 'Users',     tabs: ['users'] },
  { id: 'revenue',    label: 'Revenue',   tabs: ['finance', 'analytics'] },
  { id: 'ai',         label: 'AI',        tabs: ['ai'] },
  { id: 'operations', label: 'Operations', tabs: ['health', 'storage', 'support'] },
  { id: 'security',   label: 'Security',  tabs: ['security', 'audit', 'activity'] },
  { id: 'control',    label: 'Control',   tabs: ['features', 'announcements'] },
];

/** Human label for a tab, used by the sub-navigation. */
export const TAB_LABELS: Record<Tab, string> = {
  overview: 'Overview',
  studios: 'All Studios',
  registrations: 'Registrations',
  invitations: 'Invitations',
  users: 'Directory',
  finance: 'Finance',
  analytics: 'Analytics',
  ai: 'AI Control',
  health: 'System Health',
  storage: 'Storage',
  support: 'Support',
  security: 'Security',
  audit: 'Audit',
  activity: 'Activity',
  features: 'Feature Flags',
  announcements: 'Announcements',
};

/**
 * Which module a tab belongs to.
 *
 * Falls back to 'overview' rather than throwing: an unknown tab has already
 * been through normalizeTab() by the time anything asks, so reaching the
 * fallback means a tab was added to TAB_IDS and left out of MODULES — and a
 * console that renders the wrong module heading is a better failure than one
 * that renders nothing. moduleCoverage() below turns that into a test failure
 * so it does not stay unnoticed.
 */
export function moduleForTab(tab: Tab): ModuleId {
  return MODULES.find((m) => m.tabs.includes(tab))?.id ?? 'overview';
}

/** Every tab reachable through the module navigation. For tests. */
export function tabsInModules(): Tab[] {
  return MODULES.flatMap((m) => m.tabs);
}
// Phase 8: 'dashboard' removed. The run-rate view now lives on the home
// (NewOverviewTab), and the brief explicitly says the home is the
// platform's "RIGHT NOW" answer — duplicating the same numbers in a
// Finance sub-tab is the same anti-pattern (two surfaces disagreeing
// about the same metric) that motivated the home redesign in the first
// place. Deep links to ?tab=billing/coupons/payments/invoices still
// land on the matching sub-tab; opening Finance without a deep link
// defaults to 'billing' (the most common next step).
export type FinanceSubTab = 'billing' | 'payments' | 'invoices' | 'coupons';
export type NavOpts = { financeSubTab?: FinanceSubTab };
// Billing and Coupons used to be separate top-level tabs; both now live inside
// Finance as an in-page sub-tab. Old bookmarks/sidebar links still point at
// ?tab=billing / ?tab=coupons, so both keep working — they just land on
// Finance with the matching sub-tab pre-selected instead of a blank Overview.
// ?tab=payments is the deep link the "studio submitted a UTR" notification
// carries, so clicking the notification lands on the verification queue itself
// rather than on Finance's dashboard with the operator hunting for it.
export const FINANCE_DEEP_LINKS: Record<string, FinanceSubTab> = {
  billing: 'billing',
  coupons: 'coupons',
  payments: 'payments',
  invoices: 'invoices',
};
export function normalizeTab(raw: string | null): Tab {
  if (raw && raw in FINANCE_DEEP_LINKS) return 'finance';
  return TAB_IDS.includes(raw as Tab) ? (raw as Tab) : 'overview';
}

export type StudioRow = {
  org: Organization;
  sub: SubStudio | undefined;
  revenue: number;
  outstanding: number;
  lastLogin: string | null;
  activeClients: number;
  totalClients: number;
  sessionsThisMonth: number;
};

export type StudioFilter = 'all' | 'active' | 'suspended' | 'trial' | 'renewal_due' | 'requested';
export type StudioSort = 'name' | 'revenue' | 'clients' | 'created' | 'last_active';

