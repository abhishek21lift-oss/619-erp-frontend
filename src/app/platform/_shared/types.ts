// Shared types and tab identifiers for the platform console.
//
// Extracted verbatim from the 3,197-line platform/page.tsx (audit H-03).
import type { Organization, SubStudio } from '@/lib/api';

export const ROLE_OPTIONS = ['admin', 'manager', 'trainer', 'member'];

export type Tab = 'overview' | 'studios' | 'invitations' | 'support' | 'analytics' | 'ai' | 'finance' | 'features' | 'announcements' | 'activity' | 'audit' | 'security' | 'storage' | 'health';
// Must list every Tab: normalizeTab() falls back to 'overview' for anything not
// here, so omitting one silently breaks its ?tab= deep link from the sidebar.
export const TAB_IDS: Tab[] = ['overview', 'studios', 'invitations', 'support', 'analytics', 'ai', 'finance', 'features', 'announcements', 'activity', 'audit', 'security', 'storage', 'health'];
export type FinanceSubTab = 'dashboard' | 'billing' | 'payments' | 'invoices' | 'coupons';
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

