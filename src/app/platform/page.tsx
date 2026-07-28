'use client';

// Platform Super Admin command centre (multi-tenant SaaS). Hidden, role='super_admin'
// only — tenant admins cannot reach it (enforced server-side by requireSuperAdmin +
// requireSuperAdminMfa, and client-side by Guard role="super_admin"). Three tabs:
//   Overview — cross-studio KPIs (revenue, clients, sessions, last activity)
//   Studios  — manage tenants and their login accounts (edit / add / remove / reset /
//              suspend / impersonate)
//   Activity — platform-wide audit feed

import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
// `m`, not `motion` — AppShell mounts LazyMotion in strict mode.
import { m } from 'framer-motion';
import { useSearchParams } from 'next/navigation';
import {
  Building2, Plus, Loader2, ShieldAlert, Users, Dumbbell, UserCircle,
  KeyRound, Power, X, Copy, RefreshCw, ChevronDown, ImagePlus,
  LayoutDashboard, Activity, LogIn, Pencil, Trash2, UserPlus, IndianRupee, Clock, Eye,
  CreditCard, Snowflake, Crown, Gift, RotateCcw, Receipt, Ticket, Percent, Ban, CheckCircle2,
  Search, ArrowRight, TrendingUp, ChevronRight,
  MoreVertical, Download, ArrowUpDown, CheckSquare, Square, Sparkles, Wallet,
} from 'lucide-react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import StudioMark from '@/components/StudioMark';
import { Button, Badge, EmptyState } from '@/components/ui';
import { api } from '@/lib/api';
import type {
  Organization, OrganizationDetail, OrgUser,
  PlatformOverview, StudioOverview, ActivityEntry,
  SubStudio, SubKpis, SubDetail, SubPlan, SubEvent, SubscriptionMetrics, Coupon, PlanChangeQuote,
} from '@/lib/api';
import {
  AmbientField, ConsoleHeader, SegmentedTabs, Panel, StatTile, Reveal, SectionLabel,
} from '@/components/platform/console';
import SubscriptionRequestsTab from '@/components/platform/subscription-requests';
import { setImpersonation, getImpersonation } from '@/lib/http';
import { clearCachedAuthUser } from '@/lib/auth-context';
import { useToast } from '@/lib/toast';

function genPassword(len = 14): string {
  const cs = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';
  const a = new Uint32Array(len);
  crypto.getRandomValues(a);
  let s = '';
  for (let i = 0; i < len; i++) s += cs[a[i] % cs.length];
  return s;
}

const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

function fmtWhen(d?: string | null): string {
  if (!d) return 'never';
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return fmtDate(d);
}

function fmtINR(n: number | string | null | undefined): string {
  const v = Number(n ?? 0);
  if (v >= 100000) return '₹' + (v / 100000).toFixed(1) + 'L';
  if (v >= 1000) return '₹' + (v / 1000).toFixed(1) + 'K';
  return '₹' + v.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

const ROLE_OPTIONS = ['admin', 'manager', 'trainer', 'member'];

export default function PlatformAdminPage() {
  return (
    <Guard role="super_admin">
      <AppShell>
        <Suspense fallback={<div className="flex justify-center py-24"><Loader2 size={26} className="animate-spin" style={{ color: '#6366f1' }} /></div>}>
          <PlatformContent />
        </Suspense>
      </AppShell>
    </Guard>
  );
}

type Tab = 'overview' | 'studios' | 'finance' | 'activity';
const TAB_IDS: Tab[] = ['overview', 'studios', 'finance', 'activity'];
type FinanceSubTab = 'dashboard' | 'billing' | 'payments' | 'coupons';
type NavOpts = { financeSubTab?: FinanceSubTab };
// Billing and Coupons used to be separate top-level tabs; both now live inside
// Finance as an in-page sub-tab. Old bookmarks/sidebar links still point at
// ?tab=billing / ?tab=coupons, so both keep working — they just land on
// Finance with the matching sub-tab pre-selected instead of a blank Overview.
// ?tab=payments is the deep link the "studio submitted a UTR" notification
// carries, so clicking the notification lands on the verification queue itself
// rather than on Finance's dashboard with the operator hunting for it.
const FINANCE_DEEP_LINKS: Record<string, FinanceSubTab> = {
  billing: 'billing',
  coupons: 'coupons',
  payments: 'payments',
};
function normalizeTab(raw: string | null): Tab {
  if (raw && raw in FINANCE_DEEP_LINKS) return 'finance';
  return TAB_IDS.includes(raw as Tab) ? (raw as Tab) : 'overview';
}

function PlatformContent() {
  const sp = useSearchParams();
  const paramTab = sp.get('tab');

  // The command centre is a super-admin surface. While impersonating a studio,
  // the operator IS that studio's admin (the backend rejects super-admin calls),
  // so bounce to the studio view — exit impersonation to return here.
  useEffect(() => {
    if (getImpersonation()) window.location.replace('/');
  }, []);
  const [tab, setTab] = useState<Tab>(() => normalizeTab(paramTab));
  const [financeSubTab, setFinanceSubTab] = useState<FinanceSubTab>(
    () => (paramTab && FINANCE_DEEP_LINKS[paramTab]) || 'dashboard',
  );
  const [commandOpen, setCommandOpen] = useState(false);

  // Keep the active tab in sync with the ?tab= query so the sidebar / bottom-nav
  // deep-links land on the right section.
  useEffect(() => {
    if (paramTab) {
      setTab(normalizeTab(paramTab));
      const sub = FINANCE_DEEP_LINKS[paramTab];
      if (sub) setFinanceSubTab(sub);
    }
  }, [paramTab]);

  // Cmd+K / Ctrl+K opens the global command bar from anywhere on the page.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandOpen((s) => !s);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={15} /> },
    { id: 'studios', label: 'Studios', icon: <Building2 size={15} /> },
    { id: 'finance', label: 'Finance', icon: <CreditCard size={15} /> },
    { id: 'activity', label: 'Activity', icon: <Activity size={15} /> },
  ];

  const onNavigate = (t: Tab, opts?: NavOpts) => {
    if (opts?.financeSubTab) setFinanceSubTab(opts.financeSubTab);
    setTab(t);
    setCommandOpen(false);
  };

  return (
    <>
      <AmbientField />
      {/* zIndex keeps content above the ambient field without creating a
          stacking context that would trap the app's dropdowns. */}
      {/* Bottom padding clears the fixed MobileBottomNav (h-16) plus the home
          indicator — without it the last row of every tab sat underneath the
          nav bar and could not be reached. Matches the dashboard's pattern. */}
      <div
        className="relative mx-auto w-full max-w-5xl pt-6 pb-[calc(5rem+env(safe-area-inset-bottom,0px))] sm:pt-8 lg:pb-10"
        style={{ zIndex: 1 }}
      >
        <ConsoleHeader
          icon={<Building2 size={20} />}
          title="Command Centre"
          subtitle="Manage every studio, admin, and account across the platform"
          actions={
            <button
              onClick={() => setCommandOpen(true)}
              className="flex items-center gap-2 rounded-[11px] px-3 py-2 text-[12px] font-[650] transition-colors"
              style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
            >
              <Search size={13} />
              <span className="hidden sm:inline">Search studios, coupons…</span>
              <kbd className="rounded-[5px] px-1.5 py-0.5 text-[10px] font-[700]" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>⌘K</kbd>
            </button>
          }
        />

        <Reveal delay={0.06}>
          <div className="mb-6">
            <SegmentedTabs tabs={TABS} value={tab} onChange={setTab} />
          </div>
        </Reveal>

        {/* Keyed so switching tabs replays the stagger — it reads as the panel
            being assembled rather than content silently swapping underneath. */}
        <div key={tab}>
          {tab === 'overview' && <OverviewTab onNavigate={onNavigate} />}
          {tab === 'studios' && <StudiosTab />}
          {tab === 'finance' && <FinanceTab subTab={financeSubTab} onSubTabChange={setFinanceSubTab} />}
          {tab === 'activity' && <ActivityTab />}
        </div>
      </div>

      <CommandBar open={commandOpen} onClose={() => setCommandOpen(false)} onNavigate={onNavigate} />
    </>
  );
}

// ── Global command bar (Cmd+K) ──────────────────────────────────────────────
// Scope is deliberately real: jump to any section, or search the two entity
// lists this backend can actually answer for (studios, coupons) with a single
// call each. There is no unified cross-entity search endpoint (users/
// payments/logs each need their own query with their own filters), so those
// stay in their own tabs rather than pretending to be searchable from here.
const NAV_TARGETS: { tab: Tab; label: string; icon: React.ReactNode; opts?: NavOpts }[] = [
  { tab: 'overview', label: 'Go to Overview', icon: <LayoutDashboard size={14} /> },
  { tab: 'studios', label: 'Go to Studios', icon: <Building2 size={14} /> },
  { tab: 'finance', label: 'Go to Finance · Dashboard', icon: <CreditCard size={14} />, opts: { financeSubTab: 'dashboard' } },
  { tab: 'finance', label: 'Go to Finance · Billing', icon: <CreditCard size={14} />, opts: { financeSubTab: 'billing' } },
  { tab: 'finance', label: 'Go to Finance · Coupons', icon: <Ticket size={14} />, opts: { financeSubTab: 'coupons' } },
  { tab: 'activity', label: 'Go to Activity', icon: <Activity size={14} /> },
];

function CommandBar({ open, onClose, onNavigate }: { open: boolean; onClose: () => void; onNavigate: (tab: Tab, opts?: NavOpts) => void }) {
  const [query, setQuery] = useState('');
  const [studios, setStudios] = useState<StudioOverview[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const loadedRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    // Loaded once per page visit, not on every open — these lists change
    // slowly and re-fetching on every ⌘K press would make the palette feel
    // laggy for no benefit.
    if (!loadedRef.current) {
      loadedRef.current = true;
      api.superAdmin.overview().then((r) => setStudios(r.data.studios ?? [])).catch(() => {});
      api.superAdmin.listCoupons().then((r) => setCoupons(r.data ?? [])).catch(() => {});
    }
    const t = setTimeout(() => inputRef.current?.focus(), 30);
    return () => clearTimeout(t);
  }, [open]);

  const q = query.trim().toLowerCase();
  const navResults = q ? NAV_TARGETS.filter((n) => n.label.toLowerCase().includes(q)) : NAV_TARGETS;
  const studioResults = q ? studios.filter((s) => s.name.toLowerCase().includes(q)).slice(0, 6) : [];
  const couponResults = q ? coupons.filter((c) => c.code.toLowerCase().includes(q)).slice(0, 6) : [];

  // One flat, ordered list so Up/Down/Enter can move through every visible
  // row regardless of which section it's in.
  type Row =
    | { kind: 'nav'; item: typeof NAV_TARGETS[number] }
    | { kind: 'studio'; item: StudioOverview }
    | { kind: 'coupon'; item: Coupon };
  const rows: Row[] = [
    ...navResults.map((item): Row => ({ kind: 'nav', item })),
    ...studioResults.map((item): Row => ({ kind: 'studio', item })),
    ...couponResults.map((item): Row => ({ kind: 'coupon', item })),
  ];
  const [active, setActive] = useState(0);
  useEffect(() => { setActive(0); }, [query]);

  const activate = (row: Row) => {
    if (row.kind === 'nav') onNavigate(row.item.tab, row.item.opts);
    else if (row.kind === 'studio') onNavigate('studios');
    else onNavigate('finance', { financeSubTab: 'coupons' });
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { onClose(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(i + 1, rows.length - 1)); return; }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); return; }
    if (e.key === 'Enter') { e.preventDefault(); const row = rows[active]; if (row) activate(row); }
  };

  if (!open) return null;

  const rowCls = 'flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-left transition-colors';
  const rowStyle = (i: number): React.CSSProperties =>
    i === active ? { background: 'var(--bg-hover)' } : {};

  let rowIndex = -1;

  return (
    <div
      className="fixed inset-0 z-[9500] flex items-start justify-center px-4 pt-[12vh]"
      style={{ background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(3px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-[18px]"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 24px 60px rgba(15,23,42,0.35)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 border-b px-4 py-3" style={{ borderColor: 'var(--border)' }}>
          <Search size={15} style={{ color: 'var(--text-muted)' }} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search studios, coupons, or jump to a section…"
            className="flex-1 bg-transparent text-[14px] outline-none"
            style={{ color: 'var(--text-primary)' }}
          />
          <kbd className="rounded-[5px] px-1.5 py-0.5 text-[10px] font-[700]" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>Esc</kbd>
        </div>

        <div className="max-h-[60vh] overflow-y-auto overscroll-contain p-2">
          {navResults.length > 0 && (
            <div className="mb-1">
              <p className="px-3 py-1.5 text-[10px] font-[750] uppercase tracking-wider" style={{ color: 'var(--text-disabled)' }}>Jump to</p>
              {navResults.map((n) => {
                rowIndex++;
                const i = rowIndex;
                return (
                  <button key={n.label} className={rowCls} style={rowStyle(i)} onMouseEnter={() => setActive(i)} onClick={() => activate({ kind: 'nav', item: n })}>
                    <span style={{ color: 'var(--text-muted)' }}>{n.icon}</span>
                    <span className="text-[13px] font-[600]" style={{ color: 'var(--text-primary)' }}>{n.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {studioResults.length > 0 && (
            <div className="mb-1">
              <p className="px-3 py-1.5 text-[10px] font-[750] uppercase tracking-wider" style={{ color: 'var(--text-disabled)' }}>Studios</p>
              {studioResults.map((s) => {
                rowIndex++;
                const i = rowIndex;
                return (
                  <button key={s.id} className={rowCls} style={rowStyle(i)} onMouseEnter={() => setActive(i)} onClick={() => activate({ kind: 'studio', item: s })}>
                    <StudioMark name={s.name} logoUrl={s.logo_url} size={22} />
                    <span className="text-[13px] font-[600]" style={{ color: 'var(--text-primary)' }}>{s.name}</span>
                    <Badge tone={s.status === 'suspended' ? 'danger' : 'success'}>{s.status}</Badge>
                  </button>
                );
              })}
            </div>
          )}

          {couponResults.length > 0 && (
            <div className="mb-1">
              <p className="px-3 py-1.5 text-[10px] font-[750] uppercase tracking-wider" style={{ color: 'var(--text-disabled)' }}>Coupons</p>
              {couponResults.map((c) => {
                rowIndex++;
                const i = rowIndex;
                return (
                  <button key={c.id} className={rowCls} style={rowStyle(i)} onMouseEnter={() => setActive(i)} onClick={() => activate({ kind: 'coupon', item: c })}>
                    <Ticket size={14} style={{ color: 'var(--text-muted)' }} />
                    <span className="text-[13px] font-[700] tabular-nums" style={{ color: 'var(--text-primary)' }}>{c.code}</span>
                    <span className="truncate text-[11.5px]" style={{ color: 'var(--text-muted)' }}>{c.description || (c.discount_type === 'percent' ? `${c.discount_value}% off` : `₹${c.discount_value} off`)}</span>
                  </button>
                );
              })}
            </div>
          )}

          {q && rows.length === 0 && (
            <p className="py-8 text-center text-[12.5px]" style={{ color: 'var(--text-muted)' }}>No matches for &quot;{query}&quot;.</p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────── FINANCE */
// Billing (per-studio subscriptions/payments) and Coupons used to be separate
// top-level tabs; Dashboard is new. None of Billing's or Coupons' internals
// changed here — this nests all three under one Finance section with an
// in-page sub-switch, with the aggregate KPIs that used to live at the top
// of Billing moved into Dashboard (Billing is now purely the per-studio
// action list, which is what an operator actually works from day to day).
function FinanceTab({ subTab, onSubTabChange }: { subTab: FinanceSubTab; onSubTabChange: (t: FinanceSubTab) => void }) {
  return (
    <div>
      <div className="mb-5 max-w-[500px]">
        <SegmentedTabs
          tabs={[
            { id: 'dashboard' as const, label: 'Dashboard', icon: <TrendingUp size={13} /> },
            { id: 'billing' as const, label: 'Billing', icon: <CreditCard size={13} /> },
            { id: 'payments' as const, label: 'Payments', icon: <Wallet size={13} /> },
            { id: 'coupons' as const, label: 'Coupons', icon: <Ticket size={13} /> },
          ]}
          value={subTab}
          onChange={onSubTabChange}
        />
      </div>
      <div key={subTab}>
        {subTab === 'dashboard' && <FinanceDashboardTab onNavigate={onSubTabChange} />}
        {subTab === 'billing' && <BillingTab />}
        {subTab === 'payments' && <SubscriptionRequestsTab />}
        {subTab === 'coupons' && <CouponsTab />}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────── BILLING */
const SUB_STATE: Record<string, { label: string; tone: 'success' | 'danger' | 'warning' | 'neutral' }> = {
  active: { label: 'Active', tone: 'success' },
  trial: { label: 'Trial', tone: 'warning' },
  trial_expired: { label: 'Trial expired', tone: 'danger' },
  expired: { label: 'Expired', tone: 'danger' },
  frozen: { label: 'Frozen', tone: 'danger' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
  suspended: { label: 'Suspended', tone: 'danger' },
};

// ── Finance Dashboard ─────────────────────────────────────────────────────────
// The run-rate view: MRR/ARR/ARPU/outstanding, the revenue trend + plan
// distribution + lifecycle breakdown already built for the old Billing tab
// (SaasMetrics, untouched), and a renewals/expiring list derived from the
// same subscriptions() call every other Finance surface uses. No LTV, no
// churn-rate percentage: this backend has no cohort/retention tracking to
// compute either honestly, and a made-up formula presented as a real metric
// is worse than not having the tile. The Lifecycle panel inside SaasMetrics
// already tells the churn story as real counts (frozen/lapsed/cancelled)
// instead of a single number that would need caveats to be true.
function FinanceDashboardTab({ onNavigate }: { onNavigate: (t: FinanceSubTab) => void }) {
  const [kpis, setKpis] = useState<SubKpis | null>(null);
  const [studios, setStudios] = useState<SubStudio[]>([]);
  const [totals, setTotals] = useState<PlatformOverview['totals'] | null>(null);
  const [metrics, setMetrics] = useState<SubscriptionMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setLoading(true); setError('');
    Promise.all([api.superAdmin.subscriptions(), api.superAdmin.overview()])
      .then(([subs, ov]) => {
        setKpis(subs.data.kpis ?? null);
        setStudios(subs.data.studios ?? []);
        setTotals(ov.data.totals);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load finance data'))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { api.superAdmin.subscriptionMetrics().then((r) => setMetrics(r.data)).catch(() => setMetrics(null)); }, []);

  if (loading) return <Center><Loader2 size={26} className="animate-spin" style={{ color: '#6366f1' }} /></Center>;
  if (error) return <ErrorState error={error} onRetry={load} />;

  const renewalsDue = studios
    .filter((s) => s.renewal_due || s.requested_at)
    .sort((a, b) => (a.period_days_left ?? 99) - (b.period_days_left ?? 99));

  const kpiCards = [
    { label: 'MRR', value: metrics ? fmtINR(metrics.mrr_inr) : '—', sub: metrics ? `${fmtINR(metrics.arr_inr)} ARR` : 'loading…', tone: 'positive' as const, icon: <TrendingUp size={15} /> },
    { label: 'ARPU', value: metrics ? fmtINR(metrics.arpu_inr) : '—', sub: metrics ? `${metrics.paying_studios} paying studios` : 'loading…', tone: 'brand' as const, icon: <IndianRupee size={15} /> },
    { label: 'Outstanding', value: totals ? fmtINR(totals.outstanding) : '—', sub: 'across all studios', tone: 'critical' as const, icon: <Receipt size={15} /> },
    { label: 'Founders', value: kpis && metrics ? `${kpis.founders}/${metrics.founders.limit}` : '—', sub: kpis ? `${kpis.founder_slots_remaining} slots left` : '', tone: 'caution' as const, icon: <Crown size={15} /> },
  ];

  return (
    <div className="space-y-5">
      <div>
        <SectionLabel>Run-rate</SectionLabel>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {kpiCards.map((k, i) => (
            <StatTile key={k.label} label={k.label} value={k.value} sub={k.sub}
              icon={k.icon} tone={k.tone} delay={i * 0.04} />
          ))}
        </div>
      </div>

      {metrics && <SaasMetrics data={metrics} />}

      <div>
        <SectionLabel hint={
          <button onClick={() => onNavigate('billing')} className="flex items-center gap-1 font-[650]" style={{ color: 'var(--brand)' }}>
            Manage in Billing <ArrowRight size={11} />
          </button>
        }>
          Renewals &amp; requests
        </SectionLabel>
        <Reveal delay={0.2}>
          <Panel padded={false} className="overflow-hidden">
            {renewalsDue.length === 0 ? (
              <p className="py-8 text-center text-[12.5px]" style={{ color: 'var(--text-muted)' }}>Nothing due right now.</p>
            ) : (
              renewalsDue.slice(0, 10).map((s, i) => (
                <button key={s.id} onClick={() => onNavigate('billing')}
                  className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-[12.5px] transition-colors hover:bg-black/[0.03]"
                  style={{ borderTop: i ? '1px solid var(--border)' : 'none' }}>
                  <span className="min-w-0 truncate" style={{ color: 'var(--text-secondary)' }}>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 650 }}>{s.name}</span> · {s.plan_name || 'No plan'}
                  </span>
                  <span className="flex flex-shrink-0 items-center gap-2">
                    {s.requested_at && <Badge tone="warning">requested</Badge>}
                    {s.period_days_left != null && <span className="tabular-nums" style={{ color: 'var(--text-muted)' }}>{s.period_days_left}d left</span>}
                  </span>
                </button>
              ))
            )}
          </Panel>
        </Reveal>
      </div>
    </div>
  );
}

function BillingTab() {
  const { toast } = useToast();
  const [studios, setStudios] = useState<SubStudio[]>([]);
  const [plans, setPlans] = useState<SubPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [payTarget, setPayTarget] = useState<SubStudio | null>(null);
  const [detailTarget, setDetailTarget] = useState<SubStudio | null>(null);

  const load = useCallback(() => {
    setLoading(true); setError('');
    api.superAdmin.subscriptions()
      .then((r) => { setStudios(r.data.studios ?? []); })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load subscriptions'))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { api.subscription.plans().then((r) => setPlans(r.data.plans ?? [])).catch(() => {}); }, []);

  const quickFreeze = async (s: SubStudio, freeze: boolean) => {
    if (freeze && !window.confirm(`Freeze ${s.name}? Their team is signed out of protected features until they pay. No data is deleted.`)) return;
    try {
      if (freeze) await api.superAdmin.freezeSubscription(s.id);
      else await api.superAdmin.reactivateSubscription(s.id);
      toast.success(freeze ? 'Studio frozen.' : 'Studio reactivated.');
      load();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Update failed'); }
  };

  if (loading) return <Center><Loader2 size={26} className="animate-spin" style={{ color: '#6366f1' }} /></Center>;
  if (error) return <ErrorState error={error} onRetry={load} />;

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        {studios.map((s) => {
          const st = SUB_STATE[s.effective_state] || { label: s.effective_state, tone: 'neutral' as const };
          const frozen = !s.allowed;
          const expiry = s.effective_state === 'trial' ? s.trial_ends_at : s.current_period_end;
          const daysLeft = s.effective_state === 'trial' ? s.trial_days_left : s.period_days_left;
          return (
            <div key={s.id} className="rounded-[18px] p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div className="flex flex-wrap items-center gap-3">
                <StudioMark name={s.name} logoUrl={s.logo_url} size={40} />
                <div className="min-w-0 flex-1">
                  {/* Wraps rather than truncating: the studio name and its
                      status badges are the row's identity, and on a phone the
                      name was being cut to "Abhishek PT …". */}
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <p className="text-[14.5px] font-[750] leading-tight" style={{ color: 'var(--text-primary)' }}>{s.name}</p>
                    <Badge tone={st.tone}>{st.label}</Badge>
                    {s.is_founder && (
                      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-[750]"
                        style={{ background: 'rgba(245,158,11,0.12)', color: '#b45309' }}>
                        <Crown size={10} /> Founder #{s.founder_number}
                      </span>
                    )}
                    {s.renewal_due && <Badge tone="neutral">renewal due</Badge>}
                    {s.requested_at && (
                      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-[750]"
                        style={{ background: 'rgba(245,158,11,0.14)', color: '#b45309' }}>
                        ● {s.requested_plan_name
                          ? s.requested_direction === 'downgrade' ? `Switch to ${s.requested_plan_name} requested`
                            : s.requested_direction === 'renewal' ? `Renewal (${s.requested_plan_name}) requested`
                            : s.requested_direction === 'upgrade' ? `Upgrade to ${s.requested_plan_name} requested`
                            : `Activate ${s.requested_plan_name} requested`
                          : 'Activation requested'}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[11.5px] leading-snug" style={{ color: 'var(--text-muted)' }}>
                    {s.plan_name || 'No plan'}
                    {expiry ? ` · ${daysLeft != null ? `${daysLeft}d left · ` : ''}ends ${fmtDate(expiry)}` : ' · no expiry'}
                    {' · '}{s.client_count}{s.client_limit != null ? `/${s.client_limit}` : ''} clients
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button onClick={() => setPayTarget(s)}
                    className="flex h-9 items-center gap-1.5 rounded-[10px] px-3 text-[12px] font-[700] text-white transition hover:opacity-90"
                    style={{ background: 'linear-gradient(135deg,#059669,#10b981)' }}>
                    <IndianRupee size={13} /> Record Payment
                  </button>
                  {frozen
                    ? <IconBtn title="Reactivate (comp)" onClick={() => quickFreeze(s, false)} tone="success"><RotateCcw size={12} /> Reactivate</IconBtn>
                    : <IconBtn title="Freeze" onClick={() => quickFreeze(s, true)} tone="danger"><Snowflake size={12} /> Freeze</IconBtn>}
                  <IconBtn title="Details & history" onClick={() => setDetailTarget(s)}><Receipt size={12} /> Details</IconBtn>
                </div>
              </div>
            </div>
          );
        })}
        {studios.length === 0 && <EmptyState icon={<CreditCard size={20} />} title="No studios" description="Studios will appear here once created." />}
      </div>

      {payTarget && <RecordPaymentModal studio={payTarget} plans={plans} onClose={() => setPayTarget(null)} onDone={() => { setPayTarget(null); load(); }} />}
      {detailTarget && <SubDetailModal studio={detailTarget} onClose={() => setDetailTarget(null)} onChanged={load} />}
    </div>
  );
}

// ── Record Payment (activate / renew) modal ──────────────────────────────────────
function RecordPaymentModal({ studio, plans, onClose, onDone }: { studio: SubStudio; plans: SubPlan[]; onClose: () => void; onDone: () => void }) {
  const { toast } = useToast();
  const [planCode, setPlanCode] = useState(studio.plan_code || (plans[0]?.code ?? 'starter'));
  const selected = plans.find((p) => p.code === planCode);
  const defaultAmount = studio.is_founder && studio.locked_price_inr != null ? studio.locked_price_inr : (selected?.effective_price_inr ?? selected?.price_inr ?? 0);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('upi');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { setAmount(String(defaultAmount || '')); }, [defaultAmount]);

  const submit = async () => {
    setSaving(true);
    try {
      await api.superAdmin.activateSubscription(studio.id, {
        plan_code: planCode,
        amount_inr: amount ? Number(amount) : undefined,
        method, reference: reference.trim() || undefined, notes: notes.trim() || undefined,
      });
      toast.success('Payment recorded — subscription activated.');
      onDone();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Activation failed'); setSaving(false); }
  };

  return (
    <Modal title={`Record payment · ${studio.name}`} onClose={onClose}>
      <div className="space-y-4">
        <Field label="Plan">
          <select className={inputCls} style={inputStyle} value={planCode} onChange={(e) => setPlanCode(e.target.value)}>
            {plans.map((p) => (
              <option key={p.code} value={p.code}>
                {p.name} — ₹{(p.effective_price_inr ?? p.price_inr).toLocaleString('en-IN')}{p.is_launch ? ' (launch)' : ''} / {p.duration_months}mo
                {p.client_limit != null ? ` · ${p.client_limit} clients` : ' · unlimited'}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Amount received (₹)">
          <input className={inputCls} style={inputStyle} type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
          {studio.is_founder && <p className="mt-1 text-[11px]" style={{ color: '#b45309' }}>Founder — lifetime-locked price ₹{studio.locked_price_inr?.toLocaleString('en-IN')}.</p>}
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Method">
            <select className={inputCls} style={inputStyle} value={method} onChange={(e) => setMethod(e.target.value)}>
              {['upi', 'bank', 'cash', 'razorpay', 'comp'].map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </Field>
          <Field label="Reference / UTR">
            <input className={inputCls} style={inputStyle} value={reference} onChange={(e) => setReference(e.target.value)} placeholder="optional" />
          </Field>
        </div>
        <Field label="Notes">
          <input className={inputCls} style={inputStyle} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="optional" />
        </Field>
        {!studio.is_founder && <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>If founder slots remain, this studio becomes a Founder Member with this price locked for life.</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button loading={saving} disabled={saving} onClick={submit} style={{ background: 'linear-gradient(135deg,#059669,#10b981)', color: '#fff' }}>Activate</Button>
        </div>
      </div>
    </Modal>
  );
}

// ── Execute a studio's requested plan change ──────────────────────────────────────
// Distinct from RecordPaymentModal on purpose: this calls changePlan(), which
// credits the unused value of the current period and restarts it from now —
// matching the priced quote the studio already confirmed. RecordPaymentModal's
// activateSubscription() stacks the new period on top of whatever time is
// left instead, which would double-grant days on top of a prorated charge.
function ExecuteChangeModal({ studio, planCode, onClose, onDone }: { studio: SubStudio; planCode: string; onClose: () => void; onDone: () => void }) {
  const { toast } = useToast();
  const [quote, setQuote] = useState<PlanChangeQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('upi');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.superAdmin.changeQuote(studio.id, planCode)
      .then((r) => { if (!cancelled) { setQuote(r.data); setAmount(String(r.data.amount_due_inr || '')); } })
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Could not price this change'))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studio.id, planCode]);

  const submit = async () => {
    setSaving(true);
    try {
      await api.superAdmin.changePlan(studio.id, {
        plan_code: planCode,
        amount_inr: amount ? Number(amount) : undefined,
        method, reference: reference.trim() || undefined, notes: notes.trim() || undefined,
      });
      toast.success(`Switched ${studio.name} to ${quote?.new_plan.name || planCode}.`);
      onDone();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Could not execute this change'); setSaving(false); }
  };

  return (
    <Modal title={`Execute plan change · ${studio.name}`} onClose={onClose}>
      {loading || !quote ? (
        <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin" style={{ color: '#6366f1' }} /></div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-[12px] p-3 text-[12px]" style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}>
            <div className="flex justify-between"><span>{quote.current_plan?.name || 'No plan'} → {quote.new_plan.name}</span><b style={{ textTransform: 'capitalize' }}>{quote.direction}</b></div>
            <div className="flex justify-between"><span>{quote.new_plan.name} plan</span><span>{fmtINR(quote.new_plan_price_inr)}</span></div>
            {quote.proration_credit_inr > 0 && (
              <div className="flex justify-between" style={{ color: '#10b981' }}><span>Unused time credited</span><span>−{fmtINR(quote.proration_credit_inr)}</span></div>
            )}
            <div className="flex justify-between" style={{ color: 'var(--text-primary)' }}><span>Quoted amount due</span><b>{fmtINR(quote.amount_due_inr)}</b></div>
          </div>
          {quote.warning && (
            <p className="rounded-[10px] p-2.5 text-[11.5px]" style={{ background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.28)', color: '#b45309' }}>{quote.warning}</p>
          )}
          <Field label="Amount received (₹)">
            <input className={inputCls} style={inputStyle} type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Method">
              <select className={inputCls} style={inputStyle} value={method} onChange={(e) => setMethod(e.target.value)}>
                {['upi', 'bank', 'cash', 'razorpay', 'comp'].map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </Field>
            <Field label="Reference / UTR">
              <input className={inputCls} style={inputStyle} value={reference} onChange={(e) => setReference(e.target.value)} placeholder="optional" />
            </Field>
          </div>
          <Field label="Notes">
            <input className={inputCls} style={inputStyle} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="optional" />
          </Field>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button loading={saving} disabled={saving} onClick={submit} style={{ background: 'linear-gradient(135deg,#F59E0B,#D97706)', color: '#fff' }}>Confirm change</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

// ── Subscription detail + history + overrides modal ──────────────────────────────
function SubDetailModal({ studio, onClose, onChanged }: { studio: SubStudio; onClose: () => void; onChanged: () => void }) {
  const { toast } = useToast();
  const [detail, setDetail] = useState<SubDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [newExpiry, setNewExpiry] = useState('');
  const [showExecute, setShowExecute] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api.superAdmin.getSubscription(studio.id).then((r) => setDetail(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, [studio.id]);
  useEffect(() => { load(); }, [load]);

  const act = async (fn: () => Promise<unknown>, ok: string) => {
    try { await fn(); toast.success(ok); load(); onChanged(); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Action failed'); }
  };

  const o = detail?.organization;
  const onTrial = o?.subscription_status === 'trial';

  return (
    <Modal title={`Billing · ${studio.name}`} onClose={onClose}>
      {loading || !o ? (
        <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin" style={{ color: '#6366f1' }} /></div>
      ) : (
        <div className="space-y-4 max-h-[70vh] overflow-y-auto overscroll-contain">
          <div className="rounded-[12px] p-3 text-[12px]" style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}>
            <div className="flex justify-between"><span>Status</span><b>{(SUB_STATE[o.effective_state]?.label) || o.effective_state}</b></div>
            <div className="flex justify-between"><span>Plan</span><b>{o.plan_name || '—'}</b></div>
            <div className="flex justify-between"><span>{onTrial ? 'Trial ends' : 'Renews'}</span><b>{fmtDate(onTrial ? o.trial_ends_at : o.current_period_end)}</b></div>
            {o.is_founder && <div className="flex justify-between" style={{ color: '#b45309' }}><span>Founder</span><b>#{o.founder_number} · ₹{o.locked_price_inr?.toLocaleString('en-IN')} locked</b></div>}
          </div>

          {/* Pending request — the studio asked for this via "Request this upgrade" /
              "Request activation". Execute here, NOT via Record Payment: that tool
              stacks the new period on top of remaining time, while this credits the
              unused time back (matching the quote the studio already saw). */}
          {studio.requested_at && studio.requested_plan_code && (
            <div className="rounded-[12px] p-3 text-[12px]" style={{ background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.28)' }}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span style={{ color: '#b45309' }}>
                  <b>{studio.requested_plan_name}</b> requested {fmtWhen(studio.requested_at)}
                  {studio.requested_direction ? ` (${studio.requested_direction})` : ''}
                </span>
                <Button onClick={() => setShowExecute(true)} style={{ background: 'linear-gradient(135deg,#F59E0B,#D97706)', color: '#fff' }}>
                  Review &amp; execute
                </Button>
              </div>
            </div>
          )}

          {/* Quick overrides */}
          <div className="flex flex-wrap gap-2">
            {!o.is_founder && <IconBtn title="Grant founder" onClick={() => act(() => api.superAdmin.grantFounder(studio.id), 'Founder granted.')} tone="success"><Gift size={12} /> Grant founder</IconBtn>}
            {o.subscription_status !== 'cancelled' && <IconBtn title="Cancel subscription" onClick={() => { if (window.confirm('Cancel this subscription? The studio will be blocked until they subscribe again.')) act(() => api.superAdmin.cancelSubscription(studio.id), 'Subscription cancelled.'); }} tone="danger"><X size={12} /> Cancel</IconBtn>}
          </div>
          <div className="flex items-end gap-2">
            <Field label={onTrial ? 'Extend trial to' : 'Change renewal date'}>
              <input className={inputCls} style={inputStyle} type="date" value={newExpiry} onChange={(e) => setNewExpiry(e.target.value)} />
            </Field>
            <Button variant="outline" disabled={!newExpiry} onClick={() => act(
              () => api.superAdmin.changeExpiry(studio.id, onTrial ? { trial_ends_at: newExpiry } : { current_period_end: newExpiry }),
              'Expiry updated.')}>Apply</Button>
          </div>

          {/* Invoices */}
          <div>
            <p className="mb-1.5 text-[11px] font-[700] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Invoices</p>
            {detail.invoices.length === 0 && <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>None yet.</p>}
            {detail.invoices.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between py-1.5 text-[12px]" style={{ borderTop: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{inv.invoice_number} · {fmtDate(inv.issued_at)}</span>
                <span className="tabular-nums font-[650]" style={{ color: inv.status === 'refunded' ? '#94a3b8' : 'var(--text-primary)', textDecoration: inv.status === 'refunded' ? 'line-through' : 'none' }}>{fmtINR(inv.amount_inr)}</span>
              </div>
            ))}
          </div>

          {/* Payments (with refund) */}
          <div>
            <p className="mb-1.5 text-[11px] font-[700] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Payments</p>
            {detail.payments.length === 0 && <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>None yet.</p>}
            {detail.payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-2 py-1.5 text-[12px]" style={{ borderTop: '1px solid var(--border)' }}>
                <span className="min-w-0 truncate" style={{ color: 'var(--text-secondary)' }}>{fmtDate(p.created_at)} · {p.method || '—'} · {fmtINR(p.amount_inr)}{p.status === 'refunded' ? ' (refunded)' : ''}</span>
                {p.status === 'paid' && <button onClick={() => { if (window.confirm('Refund this payment?')) act(() => api.superAdmin.refundPayment(p.id), 'Payment refunded.'); }} className="flex-shrink-0 text-[11px] font-[650]" style={{ color: '#dc2626' }}>Refund</button>}
              </div>
            ))}
          </div>

          {/* Event history — every request, activation, change and reminder,
              oldest requests included, so "what did this studio ask for" is
              never just a notification the operator has to remember. */}
          <div>
            <p className="mb-1.5 text-[11px] font-[700] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>History</p>
            {detail.events.length === 0 && <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>None yet.</p>}
            {detail.events.map((e) => (
              <div key={e.id} className="flex items-center justify-between gap-2 py-1.5 text-[12px]" style={{ borderTop: '1px solid var(--border)' }}>
                <span className="min-w-0 truncate" style={{ color: 'var(--text-secondary)' }}>{eventLabel(e)}</span>
                <span className="flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{fmtWhen(e.created_at)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {showExecute && studio.requested_plan_code && (
        <ExecuteChangeModal
          studio={studio}
          planCode={studio.requested_plan_code}
          onClose={() => setShowExecute(false)}
          onDone={() => { setShowExecute(false); onChanged(); onClose(); }}
        />
      )}
    </Modal>
  );
}

// Friendly label for a raw subscription_events row — falls back to the bare
// event name for anything not called out below (e.g. new event types added
// later), so history is never a blank line.
function eventLabel(e: SubEvent): string {
  const d = (e.data || {}) as Record<string, unknown>;
  switch (e.event) {
    case 'activation_requested': return `Activation requested${d.plan_code ? ` (${d.plan_code})` : ''}`;
    case 'change_requested': return `Plan change requested — ${d.direction || 'change'} to ${d.plan_code}${d.amount_due_inr != null ? ` · ${fmtINR(d.amount_due_inr as number)} due` : ''}`;
    case 'activated': return `Activated ${d.plan_code} · ${fmtINR(d.amount_inr as number)}`;
    case 'plan_changed': return `Plan changed ${d.from || '—'} → ${d.to} · ${fmtINR(d.charged_inr as number)}`;
    case 'downgrade_scheduled': return `Downgrade to ${d.to} scheduled for ${fmtDate(d.effective_at as string)}`;
    case 'downgrade_applied': return `Downgrade applied ${d.from || '—'} → ${d.to}`;
    case 'downgrade_cancelled': return 'Scheduled downgrade cancelled';
    case 'founder_granted': return `Founder #${d.founder_number} granted`;
    case 'frozen': return `Frozen${d.reason ? ` (${d.reason})` : ''}`;
    case 'reactivated': return 'Reactivated';
    case 'cancelled': return 'Subscription cancelled';
    case 'expired': return `Expired${d.reason ? ` (${d.reason})` : ''}`;
    case 'expiry_changed': return 'Expiry date changed';
    case 'refunded': return `Refunded ${fmtINR(d.amount_inr as number)}`;
    case 'reminder_sent': return `Reminder sent (${d.kind} · ${d.days}d)`;
    case 'trial_started': return `Trial started (${d.days}d)`;
    default: return e.event;
  }
}

// Generic "action.string" / "action_string" -> "Action string" fallback for
// anything not called out in ACTION_LABELS below — so the timeline is never a
// blank row when a new action type ships before this map is updated.
function prettifyAction(action: string): string {
  const s = action.replace(/[._]/g, ' ').trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}
const ACTION_LABELS: Record<string, string> = {
  organization_created: 'Studio created',
  organization_suspended: 'Studio suspended',
  organization_reactivated: 'Studio reactivated',
  subscription_activated: 'Subscription activated',
  subscription_plan_changed: 'Plan changed',
  user_created: 'Account created',
  user_deactivated: 'Account deactivated',
  password_reset: 'Password reset',
};
function activityLabel(a: ActivityEntry): string {
  return ACTION_LABELS[a.action] || prettifyAction(a.action);
}

const SIGNAL_DOT: Record<'critical' | 'caution' | 'positive' | 'neutral', string> = {
  critical: '#EF4444', caution: '#F59E0B', positive: '#10B981', neutral: 'var(--text-disabled)',
};

/* ─────────────────────────────────────────────────────── OVERVIEW */
function OverviewTab({ onNavigate }: { onNavigate: (tab: Tab, opts?: NavOpts) => void }) {
  const [data, setData] = useState<PlatformOverview | null>(null);
  const [subKpis, setSubKpis] = useState<SubKpis | null>(null);
  const [subStudios, setSubStudios] = useState<SubStudio[]>([]);
  const [metrics, setMetrics] = useState<SubscriptionMetrics | null>(null);
  const [recent, setRecent] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setLoading(true); setError('');
    Promise.all([api.superAdmin.overview(), api.superAdmin.subscriptions()])
      .then(([ov, subs]) => {
        setData(ov.data);
        setSubKpis(subs.data.kpis ?? null);
        setSubStudios(subs.data.studios ?? []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load overview'))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);
  // Bonus panels — each loads independently so a failure in one (e.g. the
  // metrics query) never blanks out the KPIs the operator actually needs.
  useEffect(() => { api.superAdmin.subscriptionMetrics().then((r) => setMetrics(r.data)).catch(() => setMetrics(null)); }, []);
  useEffect(() => { api.superAdmin.listActivity({ limit: 20 }).then((r) => setRecent(r.data)).catch(() => setRecent([])); }, []);

  if (loading) return <Center><Loader2 size={26} className="animate-spin" style={{ color: '#6366f1' }} /></Center>;
  if (error) return <ErrorState error={error} onRetry={load} />;
  if (!data) return null;

  const t = data.totals;
  const revTrend = metrics?.revenue_trend ?? [];
  const lastMonth = revTrend[revTrend.length - 1];
  const prevMonth = revTrend[revTrend.length - 2];
  const revDeltaPct = lastMonth && prevMonth && prevMonth.revenue_inr > 0
    ? Math.round(((lastMonth.revenue_inr - prevMonth.revenue_inr) / prevMonth.revenue_inr) * 100)
    : null;

  const renewalsDue = subStudios.filter((s) => s.renewal_due).length;
  const pendingRequests = subStudios.filter((s) => s.requested_at).length;
  const todayActivity = recent.filter((a) => new Date(a.created_at).toDateString() === new Date().toDateString());

  const kpis = [
    { label: 'Total Studios', value: String(t.studios), sub: `${t.active_studios} active · ${t.suspended_studios} suspended`, tone: 'brand' as const, icon: <Building2 size={15} /> },
    { label: 'Active Clients', value: String(t.active_clients), sub: `${t.total_clients} total`, tone: 'caution' as const, icon: <Users size={15} /> },
    { label: 'MRR', value: metrics ? fmtINR(metrics.mrr_inr) : '—', sub: metrics ? `${fmtINR(metrics.arr_inr)} ARR` : 'loading…', tone: 'positive' as const, icon: <TrendingUp size={15} /> },
    { label: 'ARPU', value: metrics ? fmtINR(metrics.arpu_inr) : '—', sub: metrics ? `${metrics.paying_studios} paying studios` : 'loading…', tone: 'neutral' as const, icon: <IndianRupee size={15} /> },
  ];
  const health = [
    { label: 'Outstanding', value: fmtINR(t.outstanding), sub: 'across all studios', tone: 'critical' as const, icon: <Receipt size={15} /> },
    { label: 'Renewals due', value: String(renewalsDue), sub: 'within 7 days', tone: 'caution' as const, icon: <Clock size={15} /> },
    { label: 'Frozen', value: subKpis ? String(subKpis.frozen) : '—', sub: 'need payment', tone: 'critical' as const, icon: <Snowflake size={15} /> },
    { label: 'Founders', value: subKpis ? `${subKpis.founders}${metrics ? `/${metrics.founders.limit}` : ''}` : '—', sub: subKpis ? `${subKpis.founder_slots_remaining} slots left` : '', tone: 'brand' as const, icon: <Crown size={15} /> },
  ];

  // Real, derived signals from the numbers already on this page — not an LLM
  // call (there's no AI-insights backend yet), just surfaced as sentences
  // instead of left for the operator to notice by scanning every tile.
  const signals: { text: string; tone: keyof typeof SIGNAL_DOT; onClick?: () => void }[] = [];
  if (pendingRequests > 0) signals.push({ text: `${pendingRequests} studio${pendingRequests === 1 ? '' : 's'} waiting on a plan request`, tone: 'caution', onClick: () => onNavigate('finance', { financeSubTab: 'billing' }) });
  if (renewalsDue > 0) signals.push({ text: `${renewalsDue} renewal${renewalsDue === 1 ? '' : 's'} due within 7 days`, tone: 'caution', onClick: () => onNavigate('finance', { financeSubTab: 'billing' }) });
  if (subKpis && subKpis.frozen > 0) signals.push({ text: `${subKpis.frozen} studio${subKpis.frozen === 1 ? '' : 's'} frozen, waiting on payment`, tone: 'critical', onClick: () => onNavigate('finance', { financeSubTab: 'billing' }) });
  if (revDeltaPct != null) signals.push({ text: `Revenue collected ${revDeltaPct >= 0 ? 'up' : 'down'} ${Math.abs(revDeltaPct)}% vs last month`, tone: revDeltaPct >= 0 ? 'positive' : 'critical' });
  if (Number(t.outstanding) > 0) signals.push({ text: `${fmtINR(t.outstanding)} outstanding across all studios`, tone: 'neutral', onClick: () => onNavigate('finance', { financeSubTab: 'dashboard' }) });

  return (
    <div className="space-y-6">
      <div>
        <SectionLabel>Platform</SectionLabel>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {kpis.map((k, i) => (
            <StatTile key={k.label} label={k.label} value={k.value} sub={k.sub}
              icon={k.icon} tone={k.tone} delay={i * 0.04} />
          ))}
        </div>
      </div>

      <div>
        <SectionLabel>Health</SectionLabel>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {health.map((k, i) => (
            <StatTile key={k.label} label={k.label} value={k.value} sub={k.sub}
              icon={k.icon} tone={k.tone} delay={0.16 + i * 0.04} />
          ))}
        </div>
      </div>

      {signals.length > 0 && (
        <div>
          <SectionLabel>Needs attention</SectionLabel>
          <Reveal delay={0.3}>
            <Panel padded={false} className="overflow-hidden">
              {signals.map((s, i) => (
                <button
                  key={i} onClick={s.onClick} disabled={!s.onClick}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors disabled:cursor-default"
                  style={{ borderTop: i ? '1px solid var(--border)' : 'none' }}
                  onMouseEnter={(e) => { if (s.onClick) e.currentTarget.style.background = 'var(--bg-hover)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: SIGNAL_DOT[s.tone] }} />
                  <span className="flex-1 text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>{s.text}</span>
                  {s.onClick && <ChevronRight size={14} style={{ color: 'var(--text-disabled)' }} />}
                </button>
              ))}
            </Panel>
          </Reveal>
        </div>
      )}

      <div>
        <SectionLabel hint={
          <button onClick={() => onNavigate('activity')} className="flex items-center gap-1 font-[650]" style={{ color: 'var(--brand)' }}>
            View all <ArrowRight size={11} />
          </button>
        }>
          Today&apos;s activity
        </SectionLabel>
        <Reveal delay={0.34}>
          <Panel padded={false} className="overflow-hidden">
            {todayActivity.length === 0 ? (
              <p className="py-8 text-center text-[12.5px]" style={{ color: 'var(--text-muted)' }}>Nothing yet today.</p>
            ) : (
              todayActivity.slice(0, 8).map((a, i) => (
                <div key={a.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-[12.5px]"
                  style={{ borderTop: i ? '1px solid var(--border)' : 'none' }}>
                  <span className="min-w-0 truncate" style={{ color: 'var(--text-secondary)' }}>
                    {activityLabel(a)}
                    {a.organization_name && <span style={{ color: 'var(--text-muted)' }}> · {a.organization_name}</span>}
                  </span>
                  <span className="flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{fmtWhen(a.created_at)}</span>
                </div>
              ))
            )}
          </Panel>
        </Reveal>
      </div>

      <div>
        <SectionLabel hint={
          <button onClick={() => onNavigate('studios')} className="flex items-center gap-1 font-[650]" style={{ color: 'var(--brand)' }}>
            Manage <ArrowRight size={11} />
          </button>
        }>
          Studios
        </SectionLabel>

        {data.studios.length === 0 ? (
          <Panel><p className="py-8 text-center text-[12.5px]" style={{ color: 'var(--text-muted)' }}>No studios yet.</p></Panel>
        ) : (
          <>
            {/* Phones get cards, not a table. The six-column table overflowed
                its container on a 390pt screen — the Sessions and Status
                columns were simply cut off with no scroll affordance. */}
            <div className="space-y-2.5 lg:hidden">
              {data.studios.map((s: StudioOverview, i: number) => (
                <Reveal key={s.id} delay={0.04 + i * 0.03}>
                  <Panel>
                    <div className="flex items-start gap-3">
                      <StudioMark name={s.name} logoUrl={s.logo_url} size={34} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          {/* Wraps rather than truncating — a studio name is
                              the row's identity and must stay readable. */}
                          <span className="text-[13px] font-[720] leading-tight" style={{ color: 'var(--text-primary)' }}>
                            {s.name}
                          </span>
                          <Badge tone={s.status === 'suspended' ? 'danger' : 'success'}>{s.status}</Badge>
                        </div>
                        <p className="mt-0.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                          {fmtWhen(s.last_login)}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 border-t pt-3" style={{ borderColor: 'var(--border)' }}>
                      {[
                        { k: 'Revenue', v: fmtINR(s.revenue) },
                        { k: 'Clients', v: `${s.active_clients}/${s.total_clients}` },
                        { k: 'Sessions', v: String(s.sessions_this_month) },
                      ].map((c) => (
                        <div key={c.k}>
                          <p className="text-[9px] font-[750] uppercase" style={{ color: 'var(--text-muted)', letterSpacing: '0.1em' }}>{c.k}</p>
                          <p className="mt-0.5 text-[13.5px] font-[780] tabular-nums" style={{ color: 'var(--text-primary)' }}>{c.v}</p>
                        </div>
                      ))}
                    </div>
                  </Panel>
                </Reveal>
              ))}
            </div>

            {/* Desktop keeps the dense table — it is the better tool when the
                width is actually there. */}
            <Reveal delay={0.06} className="hidden lg:block">
              <Panel padded={false} className="overflow-hidden">
                <table className="w-full text-left text-[12.5px]">
                  <thead>
                    <tr style={{ color: 'var(--text-muted)' }}>
                      <th className="px-4 py-3 font-[700]">Studio</th>
                      <th className="px-3 py-3 text-right font-[700]">Revenue</th>
                      <th className="px-3 py-3 text-right font-[700]">Clients</th>
                      <th className="px-3 py-3 text-right font-[700]">Sessions</th>
                      <th className="px-3 py-3 font-[700]">Last active</th>
                      <th className="px-4 py-3 font-[700]">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.studios.map((s: StudioOverview) => (
                      <tr key={s.id} className="border-t" style={{ borderColor: 'var(--border)' }}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <StudioMark name={s.name} logoUrl={s.logo_url} size={28} />
                            <span className="font-[680]" style={{ color: 'var(--text-primary)' }}>{s.name}</span>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums font-[680]" style={{ color: 'var(--text-primary)' }}>{fmtINR(s.revenue)}</td>
                        <td className="px-3 py-3 text-right tabular-nums" style={{ color: 'var(--text-secondary)' }}>{s.active_clients}<span style={{ color: 'var(--text-disabled)' }}>/{s.total_clients}</span></td>
                        <td className="px-3 py-3 text-right tabular-nums" style={{ color: 'var(--text-secondary)' }}>{s.sessions_this_month}</td>
                        <td className="px-3 py-3" style={{ color: 'var(--text-muted)' }}>{fmtWhen(s.last_login)}</td>
                        <td className="px-4 py-3"><Badge tone={s.status === 'suspended' ? 'danger' : 'success'}>{s.status}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Panel>
            </Reveal>
          </>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────── STUDIOS */
// One row = three existing endpoints merged by org id: listOrgs (accounts,
// coach/client counts), subscriptions (plan, renewal/request state),
// overview (revenue, outstanding, last login, active vs total clients).
// Nothing here is fetched or computed just for this view — it's the same
// data already shown on Overview and Finance, just joined per studio.
type StudioRow = {
  org: Organization;
  sub: SubStudio | undefined;
  revenue: number;
  outstanding: number;
  lastLogin: string | null;
  activeClients: number;
  totalClients: number;
  sessionsThisMonth: number;
};

type StudioFilter = 'all' | 'active' | 'suspended' | 'trial' | 'renewal_due' | 'requested';
type StudioSort = 'name' | 'revenue' | 'clients' | 'created' | 'last_active';

function exportStudiosCsv(rows: StudioRow[]): void {
  const headers = ['Name', 'Slug', 'Status', 'Plan', 'Revenue', 'Active Clients', 'Total Clients', 'Coaches', 'Accounts', 'Last Active', 'Created'];
  const escape = (v: unknown) => {
    const s = String(v ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [
    headers.join(','),
    ...rows.map((r) => [
      r.org.name, r.org.slug, r.org.status, r.sub?.plan_name || '', r.revenue,
      r.activeClients, r.totalClients, r.org.trainer_count ?? 0, r.org.user_count ?? 0,
      r.lastLogin ? fmtDate(r.lastLogin) : '', fmtDate(r.org.created_at),
    ].map(escape).join(',')),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `studios-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function StudiosTab() {
  const { toast } = useToast();
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [subStudios, setSubStudios] = useState<SubStudio[]>([]);
  const [overviewStudios, setOverviewStudios] = useState<StudioOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<OrgUser | null>(null);
  const [editTarget, setEditTarget] = useState<OrgUser | null>(null);
  const [addTarget, setAddTarget] = useState<Organization | null>(null);

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<StudioFilter>('all');
  const [sortBy, setSortBy] = useState<StudioSort>('name');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  const load = useCallback(() => {
    setLoading(true); setError('');
    Promise.all([api.superAdmin.listOrgs(), api.superAdmin.subscriptions(), api.superAdmin.overview()])
      .then(([o, s, ov]) => {
        setOrgs(o.data ?? []);
        setSubStudios(s.data.studios ?? []);
        setOverviewStudios(ov.data.studios ?? []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load studios'))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const rows = useMemo<StudioRow[]>(() => {
    const subById = new Map(subStudios.map((s) => [s.id, s]));
    const ovById = new Map(overviewStudios.map((s) => [s.id, s]));
    return orgs.map((org) => {
      const sub = subById.get(org.id);
      const ov = ovById.get(org.id);
      return {
        org, sub,
        revenue: Number(ov?.revenue ?? 0),
        outstanding: Number(ov?.outstanding ?? 0),
        lastLogin: ov?.last_login ?? null,
        activeClients: ov?.active_clients ?? org.client_count ?? 0,
        totalClients: ov?.total_clients ?? org.client_count ?? 0,
        sessionsThisMonth: ov?.sessions_this_month ?? 0,
      };
    });
  }, [orgs, subStudios, overviewStudios]);

  const filtered = useMemo(() => {
    let list = rows;
    const q = query.trim().toLowerCase();
    if (q) list = list.filter((r) => r.org.name.toLowerCase().includes(q) || r.org.slug.toLowerCase().includes(q));
    if (filter === 'active') list = list.filter((r) => r.org.status === 'active');
    if (filter === 'suspended') list = list.filter((r) => r.org.status === 'suspended');
    if (filter === 'trial') list = list.filter((r) => r.sub?.effective_state === 'trial');
    if (filter === 'renewal_due') list = list.filter((r) => r.sub?.renewal_due);
    if (filter === 'requested') list = list.filter((r) => !!r.sub?.requested_at);

    const sorted = [...list];
    if (sortBy === 'revenue') sorted.sort((a, b) => b.revenue - a.revenue);
    else if (sortBy === 'clients') sorted.sort((a, b) => b.activeClients - a.activeClients);
    else if (sortBy === 'created') sorted.sort((a, b) => new Date(b.org.created_at).getTime() - new Date(a.org.created_at).getTime());
    else if (sortBy === 'last_active') sorted.sort((a, b) => new Date(b.lastLogin || 0).getTime() - new Date(a.lastLogin || 0).getTime());
    else sorted.sort((a, b) => a.org.name.localeCompare(b.org.name));
    return sorted;
  }, [rows, query, filter, sortBy]);

  const toggleStatus = async (o: Organization) => {
    const next = o.status === 'active' ? 'suspended' : 'active';
    if (next === 'suspended' && !window.confirm(`Suspend "${o.name}"? All its logins will be signed out and blocked.`)) return;
    try {
      await api.superAdmin.updateOrg(o.id, { status: next });
      toast.success(next === 'suspended' ? 'Studio suspended.' : 'Studio reactivated.');
      load();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Update failed'); }
  };

  const toggleSelect = (id: string) => setSelected((s) => {
    const n = new Set(s);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });
  const selectAllFiltered = () => setSelected(new Set(filtered.map((r) => r.org.id)));
  const clearSelection = () => setSelected(new Set());

  const bulkSetStatus = async (status: 'active' | 'suspended') => {
    if (status === 'suspended' && !window.confirm(`Suspend ${selected.size} studio${selected.size === 1 ? '' : 's'}? All their logins will be signed out and blocked.`)) return;
    setBulkBusy(true);
    let ok = 0, fail = 0;
    for (const id of selected) {
      try { await api.superAdmin.updateOrg(id, { status }); ok++; } catch { fail++; }
    }
    setBulkBusy(false);
    if (fail) toast.warning(`${ok} updated, ${fail} failed.`); else toast.success(`${ok} studio${ok === 1 ? '' : 's'} ${status === 'suspended' ? 'suspended' : 'reactivated'}.`);
    clearSelection();
    load();
  };

  const bulkExport = () => {
    const list = selected.size ? filtered.filter((r) => selected.has(r.org.id)) : filtered;
    exportStudiosCsv(list);
    toast.success(`Exported ${list.length} studio${list.length === 1 ? '' : 's'}.`);
  };

  const FILTERS: { id: StudioFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'active', label: 'Active' },
    { id: 'suspended', label: 'Suspended' },
    { id: 'trial', label: 'On trial' },
    { id: 'renewal_due', label: 'Renewal due' },
    { id: 'requested', label: 'Requested' },
  ];
  const SORTS: { id: StudioSort; label: string }[] = [
    { id: 'name', label: 'Name' },
    { id: 'revenue', label: 'Revenue' },
    { id: 'clients', label: 'Clients' },
    { id: 'created', label: 'Newest' },
    { id: 'last_active', label: 'Last active' },
  ];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <div className="relative min-w-[160px] flex-1">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-disabled)' }} />
          <input
            value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Search studios…"
            className="h-9 w-full rounded-[10px] pl-8 pr-3 text-[12.5px] outline-none"
            style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          />
        </div>
        <div className="relative">
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as StudioSort)}
            className="h-9 appearance-none rounded-[10px] py-1.5 pl-8 pr-8 text-[12px] font-[650] outline-none"
            style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
            {SORTS.map((s) => <option key={s.id} value={s.id}>Sort · {s.label}</option>)}
          </select>
          <ArrowUpDown size={12} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-disabled)' }} />
          <ChevronDown size={12} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-disabled)' }} />
        </div>
        <Button iconLeft={<Plus size={14} />} onClick={() => setCreateOpen(true)}
          style={{ background: 'linear-gradient(135deg,#0f172a,#334155)', color: '#fff' }}>New Studio</Button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        {FILTERS.map((f) => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className="rounded-full px-3 py-1.5 text-[11.5px] font-[650] transition-colors"
            style={filter === f.id
              ? { background: 'var(--brand)', color: '#fff' }
              : { background: 'var(--bg-subtle)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Bulk action bar — only takes up space once something is selected. */}
      {selected.size > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2.5 rounded-[14px] px-4 py-2.5"
          style={{ background: 'var(--brand-soft)', border: '1px solid var(--brand)' }}>
          <span className="text-[12.5px] font-[700]" style={{ color: 'var(--text-primary)' }}>{selected.size} selected</span>
          <button onClick={() => bulkSetStatus('active')} disabled={bulkBusy}
            className="flex items-center gap-1.5 rounded-[8px] px-2.5 py-1.5 text-[11.5px] font-[700] transition hover:opacity-80 disabled:opacity-50"
            style={{ background: 'rgba(16,185,129,0.12)', color: '#059669' }}>
            <Power size={12} /> Activate
          </button>
          <button onClick={() => bulkSetStatus('suspended')} disabled={bulkBusy}
            className="flex items-center gap-1.5 rounded-[8px] px-2.5 py-1.5 text-[11.5px] font-[700] transition hover:opacity-80 disabled:opacity-50"
            style={{ background: 'rgba(239,68,68,0.10)', color: '#dc2626' }}>
            <Power size={12} /> Suspend
          </button>
          <button onClick={bulkExport} disabled={bulkBusy}
            className="flex items-center gap-1.5 rounded-[8px] px-2.5 py-1.5 text-[11.5px] font-[700] transition hover:opacity-80 disabled:opacity-50"
            style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
            <Download size={12} /> Export
          </button>
          {bulkBusy && <Loader2 size={13} className="animate-spin" style={{ color: 'var(--text-muted)' }} />}
          <button onClick={clearSelection} className="ml-auto text-[11.5px] font-[650]" style={{ color: 'var(--text-muted)' }}>Clear</button>
        </div>
      )}

      {loading && <Center><Loader2 size={26} className="animate-spin" style={{ color: '#6366f1' }} /></Center>}
      {error && !loading && <ErrorState error={error} onRetry={load} />}
      {!loading && !error && filtered.length === 0 && (
        <EmptyState icon={<Building2 size={20} />}
          title={rows.length === 0 ? 'No studios yet' : 'No studios match'}
          description={rows.length === 0 ? 'Create the first tenant workspace to onboard a trainer.' : 'Try a different search term or filter.'} />
      )}
      {!loading && !error && filtered.length > 0 && (
        <>
          <button onClick={() => (selected.size === filtered.length ? clearSelection() : selectAllFiltered())}
            className="mb-2.5 flex items-center gap-1.5 text-[11.5px] font-[650]" style={{ color: 'var(--text-muted)' }}>
            {selected.size === filtered.length ? <CheckSquare size={13} /> : <Square size={13} />}
            Select all {filtered.length}
          </button>
          <div className="space-y-3">
            {filtered.map((row) => (
              <OrgCard key={row.org.id} row={row}
                selected={selected.has(row.org.id)}
                onToggleSelect={() => toggleSelect(row.org.id)}
                onToggleStatus={() => toggleStatus(row.org)}
                onResetPassword={setResetTarget}
                onEditUser={setEditTarget}
                onAddUser={() => setAddTarget(row.org)}
                onChanged={load} />
            ))}
          </div>
        </>
      )}

      {createOpen && <CreateOrgModal onClose={() => setCreateOpen(false)} onCreated={() => { setCreateOpen(false); load(); }} />}
      {resetTarget && <ResetPasswordModal user={resetTarget} onClose={() => setResetTarget(null)} />}
      {editTarget && <EditUserModal user={editTarget} onClose={() => setEditTarget(null)} onSaved={() => { setEditTarget(null); load(); }} />}
      {addTarget && <AddUserModal org={addTarget} onClose={() => setAddTarget(null)} onAdded={() => { setAddTarget(null); load(); }} />}
    </div>
  );
}

// Small "⋯" menu — Suspend/Activate and Support Access live here per the
// spec's "More menu" grouping. Archive / Delete / Transfer ownership / Reset
// usage / Export-this-studio are NOT here: there is no backend support for
// any of them (no archived state, no org-delete endpoint, no ownership
// transfer, no per-studio usage reset), and fabricating buttons for actions
// that silently do nothing — or worse, half-work — is worse than omitting
// them. Bulk/CSV export of what's already loaded is real and lives in the
// bulk action bar instead.
function MoreMenu({ suspended, onToggleStatus, onSupportAccess, supportBusy }: {
  suspended: boolean; onToggleStatus: () => void; onSupportAccess: () => void; supportBusy: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((s) => !s)} title="More"
        className="flex h-9 w-9 items-center justify-center rounded-[10px] transition hover:bg-black/5"
        style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
        <MoreVertical size={15} />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-20 mt-1.5 w-52 overflow-hidden rounded-[12px] py-1.5"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', boxShadow: '0 12px 32px rgba(15,23,42,0.18)' }}>
          <button onClick={() => { setOpen(false); onSupportAccess(); }} disabled={supportBusy}
            className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-[12.5px] font-[600] transition hover:bg-black/5 disabled:opacity-50"
            style={{ color: 'var(--text-secondary)' }}>
            {supportBusy ? <Loader2 size={13} className="animate-spin" /> : <LogIn size={13} />} Support access
          </button>
          <button onClick={() => { setOpen(false); onToggleStatus(); }}
            className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-[12.5px] font-[600] transition hover:bg-black/5"
            style={{ color: suspended ? '#059669' : '#dc2626' }}>
            <Power size={13} /> {suspended ? 'Activate' : 'Suspend'}
          </button>
        </div>
      )}
    </div>
  );
}

// Plan-tier accent — gives each card a colored identity strip at a glance,
// keyed by plan_code (stable) rather than plan_name (a display string).
const PLAN_ACCENT: Record<string, string> = {
  starter: 'linear-gradient(90deg,#64748b,#475569)',
  growth: 'linear-gradient(90deg,#3b82f6,#2563eb)',
  professional: 'linear-gradient(90deg,#8b5cf6,#7c3aed)',
  elite: 'linear-gradient(90deg,#f59e0b,#d97706)',
};
const NO_PLAN_ACCENT = 'linear-gradient(90deg,var(--border),var(--border))';

// A compact, colorful stat chip — icon in a tinted circle, value + label
// stacked beside it. Four of these replace the old plain icon+text list,
// which had no visual weight and (combined with not having its own row)
// was wrapping one item per line on a phone.
function MiniStat({ icon, value, label, color }: { icon: React.ReactNode; value: React.ReactNode; label: string; color: string }) {
  return (
    <div className="flex items-center gap-2 rounded-[12px] px-2.5 py-2" style={{ background: `${color}12` }}>
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px]" style={{ background: `${color}22`, color }}>
        {icon}
      </span>
      <div className="min-w-0">
        <p className="truncate text-[12.5px] font-[800] tabular-nums" style={{ color: 'var(--text-primary)' }}>{value}</p>
        <p className="truncate text-[9px] font-[750] uppercase" style={{ color: 'var(--text-muted)', letterSpacing: '0.06em' }}>{label}</p>
      </div>
    </div>
  );
}

// ── Organization card (expandable to manage its users) ──────────────────────────
function OrgCard({ row, selected, onToggleSelect, onToggleStatus, onResetPassword, onEditUser, onAddUser, onChanged }: {
  row: StudioRow;
  selected: boolean;
  onToggleSelect: () => void;
  onToggleStatus: () => void;
  onResetPassword: (u: OrgUser) => void;
  onEditUser: (u: OrgUser) => void;
  onAddUser: () => void;
  onChanged: () => void;
}) {
  const { toast } = useToast();
  const org = row.org;
  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState<OrganizationDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [impLoading, setImpLoading] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const onLogoPick = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (fileRef.current) fileRef.current.value = '';
    if (!file) return;
    setUploading(true);
    try {
      await api.superAdmin.uploadOrgLogo(org.id, file);
      toast.success('Logo updated.');
      onChanged();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Logo upload failed'); }
    finally { setUploading(false); }
  };

  const loadDetail = useCallback(() => {
    setLoadingDetail(true);
    api.superAdmin.getOrg(org.id)
      .then((r) => setDetail(r.data))
      .catch(() => {})
      .finally(() => setLoadingDetail(false));
  }, [org.id]);

  const toggleExpand = () => {
    const next = !expanded;
    setExpanded(next);
    if (next && !detail) loadDetail();
  };

  const toggleUser = async (u: OrgUser) => {
    try {
      await api.superAdmin.setUserActive(u.id, !u.is_active);
      toast.success(u.is_active ? 'Account deactivated.' : 'Account activated.');
      loadDetail(); onChanged();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Update failed'); }
  };

  const deleteUser = async (u: OrgUser) => {
    if (!window.confirm(`Remove ${u.name} (${u.email})? They will be signed out and can no longer log in.`)) return;
    try {
      await api.superAdmin.deleteUser(u.id);
      toast.success('Account removed.');
      loadDetail(); onChanged();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Delete failed'); }
  };

  const impersonate = async (mode: 'read_only' | 'full', userId?: string) => {
    if (mode === 'full' && !window.confirm(
      `Enter ${org.name} with FULL ACCESS?\n\nYou will be able to make changes to this studio's live data as its admin. Every change is recorded against you in the activity log.`
    )) return;
    const key = `${mode}:${userId || 'primary'}`;
    setImpLoading(key);
    try {
      const r = await api.superAdmin.impersonate(org.id, { userId, mode });
      const d = r.data;
      setImpersonation({
        token: d.token, readonly: d.readonly,
        adminId: d.admin.id, adminName: d.admin.name,
        orgId: d.organization.id, orgName: d.organization.name, orgLogo: d.organization.logo_url,
      });
      // Drop the cached super-admin identity so the reload re-resolves as the
      // studio admin (studio nav + studio home), not the platform UI.
      clearCachedAuthUser();
      window.location.href = '/';
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not start impersonation');
      setImpLoading('');
    }
  };

  const suspended = org.status === 'suspended';
  const planAccent = row.sub?.plan_code ? (PLAN_ACCENT[row.sub.plan_code] || NO_PLAN_ACCENT) : NO_PLAN_ACCENT;

  return (
    // No overflow-hidden on the card itself: the More menu's dropdown is
    // absolutely positioned inside it, and a clipped ancestor was cutting
    // the dropdown off at the card's edge instead of letting it float above
    // the next card. The top strip and the expanded panel round their own
    // corners instead of relying on the parent to clip them square.
    <div className="relative rounded-[18px]"
      style={{
        background: 'var(--bg-card)',
        border: selected ? '1.5px solid var(--brand)' : '1px solid var(--border)',
        boxShadow: selected ? '0 0 0 4px var(--brand-soft)' : 'none',
      }}>
      {/* Plan-tier accent strip — the card's identity at a glance, before
          reading a single word. Neutral hairline when there's no plan yet. */}
      <div className="h-[3px] w-full rounded-t-[17px]" style={{ background: planAccent }} />

      <div className="p-4">
        {/* Identity row — ONLY the checkbox, logo, and name/slug live here.
            The old layout crammed all three action buttons onto this same
            row too; on a phone that starved the name of width and forced
            it down to "A..", with every badge and stat wrapping one per
            line below. Actions now get their own full-width row. */}
        <div className="flex items-start gap-3">
          <button onClick={onToggleSelect} title="Select" className="mt-2.5 flex-shrink-0" style={{ color: selected ? 'var(--brand)' : 'var(--text-disabled)' }}>
            {selected ? <CheckSquare size={16} /> : <Square size={16} />}
          </button>
          <div className="relative flex-shrink-0">
            <StudioMark name={org.name} logoUrl={org.logo_url} size={44} />
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={onLogoPick} />
            <button onClick={() => fileRef.current?.click()} disabled={uploading} title="Upload / change logo"
              className="absolute -bottom-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full transition hover:opacity-80"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
              {uploading ? <Loader2 size={11} className="animate-spin" /> : <ImagePlus size={11} />}
            </button>
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <p className="truncate text-[15px] font-[800] tracking-[-0.01em]" style={{ color: 'var(--text-primary)' }}>{org.name}</p>
            <p className="truncate text-[11px]" style={{ color: 'var(--text-muted)' }}>
              /{org.slug} · created {fmtDate(org.created_at)} · active {fmtWhen(row.lastLogin)}
            </p>
          </div>
        </div>

        {/* Badges — own row, full card width, wraps freely now. */}
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <Badge tone={suspended ? 'danger' : 'success'} dot>{org.status}</Badge>
          {row.sub?.plan_name && <Badge tone="purple">{row.sub.plan_name}</Badge>}
          {row.sub?.effective_state === 'trial' && <Badge tone="info">trial</Badge>}
          {row.sub?.renewal_due && <Badge tone="warning">renewal due</Badge>}
          {row.sub?.requested_at && <Badge tone="warning">requested</Badge>}
        </div>

        {/* Stats — a real 2x2 grid on a phone (4-across from sm), each a
            colored icon chip rather than plain muted text. */}
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <MiniStat icon={<IndianRupee size={14} />} value={fmtINR(row.revenue)} label="Revenue" color="#10b981" />
          <MiniStat icon={<Users size={14} />} value={`${row.activeClients}/${row.totalClients}`} label="Clients" color="#3b82f6" />
          <MiniStat icon={<Dumbbell size={14} />} value={org.trainer_count ?? 0} label="Coaches" color="#8b5cf6" />
          <MiniStat icon={<UserCircle size={14} />} value={org.user_count ?? 0} label="Accounts" color="#f59e0b" />
        </div>

        {/* Actions — dedicated row, never shares space with the name again. */}
        <div className="mt-3 flex items-center gap-2">
          <button onClick={toggleExpand} title="Open studio — manage accounts"
            className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-[10px] px-3 text-[12px] font-[700] transition hover:opacity-80"
            style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
            Open <ChevronDown size={14} style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </button>
          <button onClick={() => impersonate('read_only')} disabled={suspended || impLoading === 'read_only:primary'} title="View this studio as its admin (read-only)"
            className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-[10px] px-3 text-[12px] font-[700] transition hover:opacity-80 disabled:opacity-40"
            style={{ background: 'rgba(99,102,241,0.10)', color: '#4f46e5', border: '1px solid rgba(99,102,241,0.25)' }}>
            {impLoading === 'read_only:primary' ? <Loader2 size={13} className="animate-spin" /> : <Eye size={13} />} View as
          </button>
          <MoreMenu
            suspended={suspended}
            onToggleStatus={onToggleStatus}
            onSupportAccess={() => impersonate('full')}
            supportBusy={impLoading === 'full:primary'}
          />
        </div>
      </div>

      {expanded && (
        <div className="border-t rounded-b-[17px] px-4 py-3" style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)' }}>
          {loadingDetail && <div className="flex justify-center py-4"><Loader2 size={18} className="animate-spin" style={{ color: '#6366f1' }} /></div>}
          {detail && detail.users.length === 0 && <p className="py-2 text-[12px]" style={{ color: 'var(--text-muted)' }}>No login accounts.</p>}
          {detail && detail.users.map((u) => (
            <div key={u.id} className="flex flex-wrap items-center gap-2 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-[650]" style={{ color: 'var(--text-primary)' }}>
                  {u.name} <span className="font-[500]" style={{ color: 'var(--text-muted)' }}>· {u.role}</span>
                </p>
                <p className="truncate text-[11.5px]" style={{ color: 'var(--text-muted)' }}>{u.email} · last login {fmtWhen(u.last_login)}</p>
              </div>
              {!u.is_active && <Badge tone="danger">disabled</Badge>}
              {u.is_active && (
                <>
                  <IconBtn title="View as (read-only)" onClick={() => impersonate('read_only', u.id)} busy={impLoading === `read_only:${u.id}`}>
                    <Eye size={12} /> View
                  </IconBtn>
                  <IconBtn title="Act as (full access — changes are live, recorded against you)" onClick={() => impersonate('full', u.id)} busy={impLoading === `full:${u.id}`} tone="danger">
                    <LogIn size={12} /> Act as
                  </IconBtn>
                </>
              )}
              <IconBtn title="Edit" onClick={() => onEditUser(u)}><Pencil size={12} /> Edit</IconBtn>
              <IconBtn title="Reset password" onClick={() => onResetPassword(u)}><KeyRound size={12} /> Reset</IconBtn>
              <IconBtn title={u.is_active ? 'Deactivate' : 'Activate'} onClick={() => toggleUser(u)}
                tone={u.is_active ? 'danger' : 'success'}><Power size={12} /> {u.is_active ? 'Off' : 'On'}</IconBtn>
              <IconBtn title="Remove account" onClick={() => deleteUser(u)} tone="danger"><Trash2 size={12} /></IconBtn>
            </div>
          ))}
          {detail && (
            <button onClick={onAddUser}
              className="mt-2 flex items-center gap-1.5 rounded-[9px] px-2.5 py-1.5 text-[11.5px] font-[700] transition hover:bg-black/5"
              style={{ border: '1px dashed var(--border)', color: 'var(--text-secondary)' }}>
              <UserPlus size={12} /> Add account
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function IconBtn({ children, title, onClick, tone, busy }: {
  children: React.ReactNode; title: string; onClick: () => void; tone?: 'danger' | 'success'; busy?: boolean;
}) {
  const color = tone === 'danger' ? '#dc2626' : tone === 'success' ? '#059669' : 'var(--text-secondary)';
  const border = tone === 'danger' ? 'rgba(239,68,68,0.20)' : tone === 'success' ? 'rgba(16,185,129,0.25)' : 'var(--border)';
  return (
    <button onClick={onClick} title={title} disabled={busy}
      className="flex h-8 items-center gap-1.5 rounded-[9px] px-2.5 text-[11.5px] font-[650] transition hover:opacity-80 disabled:opacity-50"
      style={{ border: `1px solid ${border}`, color }}>
      {busy ? <Loader2 size={12} className="animate-spin" /> : children}
    </button>
  );
}

/* ─────────────────────────────────────────────────────── ACTIVITY */
const ACTIVITY_TONE: Record<string, string> = {
  user_impersonated: '#6366f1', user_deactivated: '#ef4444', user_deleted: '#ef4444',
  org_updated: '#f59e0b', org_created: '#10b981', user_created: '#10b981',
  user_activated: '#10b981', user_password_reset: '#f59e0b', user_updated: '#f59e0b',
};

function ActivityTab() {
  const [rows, setRows] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [orgFilter, setOrgFilter] = useState('');

  useEffect(() => { api.superAdmin.listOrgs().then((r) => setOrgs(r.data ?? [])).catch(() => {}); }, []);

  const load = useCallback(() => {
    setLoading(true); setError('');
    api.superAdmin.listActivity({ org_id: orgFilter || undefined, limit: 80 })
      .then((r) => setRows(r.data ?? []))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load activity'))
      .finally(() => setLoading(false));
  }, [orgFilter]);
  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <select value={orgFilter} onChange={(e) => setOrgFilter(e.target.value)}
          className="rounded-[10px] px-3 py-2 text-[12.5px] outline-none"
          style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
          <option value="">All studios</option>
          {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
        <button onClick={load} className="flex h-9 w-9 items-center justify-center rounded-[10px] transition hover:bg-black/5"
          style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }} title="Refresh"><RefreshCw size={14} /></button>
      </div>

      {loading && <Center><Loader2 size={26} className="animate-spin" style={{ color: '#6366f1' }} /></Center>}
      {error && !loading && <ErrorState error={error} onRetry={load} />}
      {!loading && !error && rows.length === 0 && (
        <EmptyState icon={<Activity size={20} />} title="No activity" description="Nothing has been logged for this filter yet." />
      )}
      {!loading && !error && rows.length > 0 && (
        <div className="overflow-hidden rounded-[16px]" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          {rows.map((a, i) => (
            <div key={String(a.id)} className="flex items-center gap-3 px-4 py-2.5" style={i ? { borderTop: '1px solid var(--border)' } : undefined}>
              <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: ACTIVITY_TONE[a.action] || '#94a3b8' }} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12.5px] font-[650]" style={{ color: 'var(--text-primary)' }}>
                  <span className="font-[750]">{a.action.replace(/[._]/g, ' ')}</span>
                  {a.entity_type ? <span style={{ color: 'var(--text-muted)' }}> · {a.entity_type}</span> : null}
                </p>
                <p className="truncate text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  {a.user_name || 'system'}{a.organization_name ? ` · ${a.organization_name}` : ''}
                </p>
              </div>
              <span className="flex-shrink-0 text-[11px] tabular-nums" style={{ color: 'var(--text-disabled)' }}>{fmtWhen(a.created_at)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────── SHARED UI */
// ── Coupons ───────────────────────────────────────────────────────────────────
// Operator surface for the discount catalogue. A redeemed coupon can be
// deactivated but never deleted — it is part of the billing record — so the UI
// offers Deactivate for used coupons and Delete only for unused ones.
// Quick-start presets for the create-coupon form below. Each just seeds the
// SAME form with sensible defaults for a common promo shape — there is no
// separate "template" concept on the backend (coupons don't have a category
// column), so this is pure UX sugar around the one real creation endpoint,
// not a new feature pretending to exist. "Founder" pricing is deliberately
// NOT a template here: it's a distinct locked-price status on the org itself
// (Studios > Support access / Grant founder), not a discount coupon, and
// listing it here would conflate two different systems.
type CouponTemplate = {
  key: string; label: string; icon: React.ReactNode;
  initial: { description: string; discountType: 'percent' | 'fixed'; discountValue: string; maxPerOrg: string; validUntil?: string };
};
function couponTemplates(): CouponTemplate[] {
  const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  return [
    { key: 'launch', label: 'Launch offer', icon: <Sparkles size={13} />, initial: { description: 'Launch discount', discountType: 'percent', discountValue: '20', maxPerOrg: '1' } },
    { key: 'referral', label: 'Referral', icon: <Gift size={13} />, initial: { description: 'Referral reward', discountType: 'fixed', discountValue: '500', maxPerOrg: '1' } },
    { key: 'seasonal', label: 'Seasonal', icon: <Percent size={13} />, initial: { description: 'Seasonal promotion', discountType: 'percent', discountValue: '15', maxPerOrg: '1', validUntil: in30Days } },
  ];
}

function CouponsTab() {
  const { toast } = useToast();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [plans, setPlans] = useState<SubPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [template, setTemplate] = useState<CouponTemplate | null>(null);
  const [busy, setBusy] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [redemptions, setRedemptions] = useState<Record<string, { id: string; organization_name: string | null; gross_amount_inr: number; discount_inr: number; net_amount_inr: number; redeemed_at: string }[]>>({});

  const load = useCallback(() => {
    setLoading(true); setError('');
    api.superAdmin.listCoupons()
      .then((r) => setCoupons(r.data ?? []))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load coupons'))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { api.subscription.plans().then((r) => setPlans(r.data.plans ?? [])).catch(() => {}); }, []);

  const toggleActive = async (c: Coupon) => {
    setBusy(c.id);
    try {
      await api.superAdmin.updateCoupon(c.id, { is_active: !c.is_active });
      toast.success(c.is_active ? `${c.code} deactivated.` : `${c.code} reactivated.`);
      load();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Update failed'); }
    finally { setBusy(''); }
  };

  const remove = async (c: Coupon) => {
    if (!window.confirm(`Delete ${c.code}? This is only possible because it has never been redeemed.`)) return;
    setBusy(c.id);
    try {
      await api.superAdmin.deleteCoupon(c.id);
      toast.success(`${c.code} deleted.`);
      load();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Delete failed'); }
    finally { setBusy(''); }
  };

  const openRedemptions = async (c: Coupon) => {
    if (expanded === c.id) { setExpanded(null); return; }
    setExpanded(c.id);
    if (redemptions[c.id]) return;
    try {
      const r = await api.superAdmin.couponRedemptions(c.id);
      setRedemptions((prev) => ({ ...prev, [c.id]: r.data ?? [] }));
    } catch { /* the row still renders without its history */ }
  };

  if (loading) return <Center><Loader2 size={26} className="animate-spin" style={{ color: '#6366f1' }} /></Center>;
  if (error) return <ErrorState error={error} onRetry={load} />;

  // Coupon analytics — aggregated from the same rows already loaded for the
  // list below (times_redeemed / total_discount_inr come pre-computed from
  // the redemption ledger server-side), not a separate call.
  const activeCoupons = coupons.filter((c) => c.is_active).length;
  const totalRedemptions = coupons.reduce((s, c) => s + c.times_redeemed, 0);
  const totalDiscountGiven = coupons.reduce((s, c) => s + c.total_discount_inr, 0);
  const topCoupon = [...coupons].sort((a, b) => b.times_redeemed - a.times_redeemed)[0];

  const openTemplate = (t: CouponTemplate | null) => { setTemplate(t); setShowForm(true); };
  const closeForm = () => { setShowForm(false); setTemplate(null); };

  return (
    <div className="space-y-4">
      {coupons.length > 0 && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile label="Active coupons" value={String(activeCoupons)} sub={`${coupons.length} total`} tone="brand" icon={<Ticket size={15} />} />
          <StatTile label="Redemptions" value={String(totalRedemptions)} sub="all time" tone="positive" icon={<CheckCircle2 size={15} />} />
          <StatTile label="Discount given" value={fmtINR(totalDiscountGiven)} sub="all time" tone="caution" icon={<Percent size={15} />} />
          <StatTile label="Top coupon" value={topCoupon && topCoupon.times_redeemed > 0 ? topCoupon.code : '—'}
            sub={topCoupon && topCoupon.times_redeemed > 0 ? `${topCoupon.times_redeemed} uses` : 'none redeemed yet'} tone="neutral" icon={<Sparkles size={15} />} />
        </div>
      )}

      {/* Wraps on narrow screens — the action previously sat on the same row as
          a long paragraph and was clipped to "New coup…" on a phone. */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1" style={{ minWidth: 220 }}>
          <p className="text-[13px] font-[780]" style={{ color: 'var(--text-primary)' }}>Discount coupons</p>
          <p className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
            Applied at activation. Redemption counts come from the ledger, so they always reconcile with payments.
          </p>
        </div>
        {showForm ? (
          <Button className="w-full shrink-0 sm:w-auto" onClick={closeForm} iconLeft={<X size={14} />}>Close</Button>
        ) : (
          <Button className="w-full shrink-0 sm:w-auto" onClick={() => openTemplate(null)} iconLeft={<Plus size={14} />}>New coupon</Button>
        )}
      </div>

      {!showForm && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-[650]" style={{ color: 'var(--text-muted)' }}>Quick start:</span>
          {couponTemplates().map((t) => (
            <button key={t.key} onClick={() => openTemplate(t)}
              className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11.5px] font-[650] transition-colors"
              style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      )}

      {showForm && (
        <CouponForm
          key={template?.key ?? 'blank'}
          plans={plans}
          initial={template?.initial}
          onCreated={() => { closeForm(); load(); }}
        />
      )}

      {coupons.length === 0 ? (
        <EmptyState icon={<Ticket size={22} />} title="No coupons yet"
          description="Create one to offer a launch discount or win back a lapsed studio." />
      ) : (
        <div className="space-y-3">
          {coupons.map((c) => {
            const used = c.times_redeemed > 0;
            const exhausted = c.max_redemptions != null && c.times_redeemed >= c.max_redemptions;
            const expired = c.valid_until ? new Date(c.valid_until) < new Date() : false;
            const live = c.is_active && !exhausted && !expired;
            return (
              <div key={c.id} className="rounded-[16px] p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-[11px]"
                    style={{ background: live ? 'rgba(16,185,129,0.12)' : 'var(--bg-subtle)', color: live ? '#10b981' : 'var(--text-muted)' }}>
                    {c.discount_type === 'percent' ? <Percent size={15} /> : <Ticket size={15} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[13px] font-[820]" style={{ color: 'var(--text-primary)' }}>{c.code}</span>
                      <Badge tone={live ? 'success' : 'neutral'}>
                        {!c.is_active ? 'Inactive' : exhausted ? 'Fully redeemed' : expired ? 'Expired' : 'Live'}
                      </Badge>
                      <span className="text-[11.5px] font-[650]" style={{ color: 'var(--text-secondary)' }}>
                        {c.discount_type === 'percent' ? `${c.discount_value}% off` : `${fmtINR(c.discount_value)} off`}
                        {c.max_discount_inr != null ? ` (max ${fmtINR(c.max_discount_inr)})` : ''}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
                      {c.description ? `${c.description} · ` : ''}
                      {c.times_redeemed}
                      {c.max_redemptions != null ? `/${c.max_redemptions}` : ''} redeemed
                      {c.total_discount_inr > 0 ? ` · ${fmtINR(c.total_discount_inr)} given away` : ''}
                      {c.applies_to_plans?.length ? ` · ${c.applies_to_plans.join(', ')} only` : ''}
                      {c.valid_until ? ` · until ${fmtDate(c.valid_until)}` : ''}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {used && (
                      <IconBtn title="Redemptions" onClick={() => openRedemptions(c)}>
                        <Receipt size={12} /> {expanded === c.id ? 'Hide' : 'History'}
                      </IconBtn>
                    )}
                    <IconBtn title={c.is_active ? 'Deactivate' : 'Reactivate'} onClick={() => toggleActive(c)}
                      busy={busy === c.id} tone={c.is_active ? 'danger' : 'success'}>
                      {c.is_active ? <><Ban size={12} /> Deactivate</> : <><CheckCircle2 size={12} /> Reactivate</>}
                    </IconBtn>
                    {/* Deleting a redeemed coupon would tear a hole in the
                        billing record, so the option is only offered when it
                        has never been used — the API rejects it regardless. */}
                    {!used && (
                      <IconBtn title="Delete" onClick={() => remove(c)} busy={busy === c.id} tone="danger">
                        <Trash2 size={12} /> Delete
                      </IconBtn>
                    )}
                  </div>
                </div>

                {expanded === c.id && (
                  <div className="mt-3 border-t pt-3" style={{ borderColor: 'var(--border)' }}>
                    {!redemptions[c.id] ? (
                      <p className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>Loading…</p>
                    ) : redemptions[c.id].length === 0 ? (
                      <p className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>No redemptions recorded.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {redemptions[c.id].map((r) => (
                          <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 text-[11.5px]">
                            <span style={{ color: 'var(--text-secondary)' }}>
                              {r.organization_name || 'Unknown studio'} · {fmtDate(r.redeemed_at)}
                            </span>
                            <span className="tabular-nums" style={{ color: 'var(--text-muted)' }}>
                              {fmtINR(r.gross_amount_inr)} − {fmtINR(r.discount_inr)} = <strong style={{ color: 'var(--text-primary)' }}>{fmtINR(r.net_amount_inr)}</strong>
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CouponForm({ plans, initial, onCreated }: {
  plans: SubPlan[];
  /** Seeds the form once, from one of the quick-start templates above — the
   *  operator can still edit every field before creating. */
  initial?: { description: string; discountType: 'percent' | 'fixed'; discountValue: string; maxPerOrg: string; validUntil?: string };
  onCreated: () => void;
}) {
  const { toast } = useToast();
  const [code, setCode] = useState('');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>(initial?.discountType ?? 'percent');
  const [discountValue, setDiscountValue] = useState(initial?.discountValue ?? '');
  const [maxDiscount, setMaxDiscount] = useState('');
  const [maxRedemptions, setMaxRedemptions] = useState('');
  const [maxPerOrg, setMaxPerOrg] = useState(initial?.maxPerOrg ?? '1');
  const [validUntil, setValidUntil] = useState(initial?.validUntil ?? '');
  const [appliesTo, setAppliesTo] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const value = Number(discountValue);
  const percentOutOfRange = discountType === 'percent' && (value > 100 || value <= 0);

  const submit = async () => {
    if (!code.trim() || !Number.isFinite(value) || value <= 0) {
      toast.error('A code and a discount above zero are required.');
      return;
    }
    if (percentOutOfRange) { toast.error('A percentage discount must be between 1 and 100.'); return; }
    setSaving(true);
    try {
      await api.superAdmin.createCoupon({
        code: code.trim().toUpperCase(),
        description: description.trim() || undefined,
        discount_type: discountType,
        discount_value: value,
        max_discount_inr: discountType === 'percent' && maxDiscount ? Number(maxDiscount) : null,
        max_redemptions: maxRedemptions ? Number(maxRedemptions) : null,
        max_per_org: maxPerOrg ? Number(maxPerOrg) : 1,
        valid_until: validUntil || null,
        applies_to_plans: appliesTo.length ? appliesTo : null,
      });
      toast.success('Coupon created.');
      onCreated();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not create coupon');
    } finally { setSaving(false); }
  };

  const field = {
    background: 'var(--bg-subtle)', border: '1px solid var(--border)',
    color: 'var(--text-primary)',
  } as const;

  return (
    <div className="rounded-[16px] p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-[10.5px] font-[700] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Code</span>
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="LAUNCH20"
            className="h-9 rounded-[10px] px-2.5 text-[12.5px] font-[700] uppercase outline-none" style={field} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10.5px] font-[700] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Description</span>
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Launch promotion"
            className="h-9 rounded-[10px] px-2.5 text-[12.5px] outline-none" style={field} />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[10.5px] font-[700] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Type</span>
          <select value={discountType} onChange={(e) => setDiscountType(e.target.value as 'percent' | 'fixed')}
            className="h-9 rounded-[10px] px-2 text-[12.5px] font-[650] outline-none" style={field}>
            <option value="percent">Percentage off</option>
            <option value="fixed">Fixed rupees off</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10.5px] font-[700] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            {discountType === 'percent' ? 'Percent (1–100)' : 'Rupees off'}
          </span>
          <input value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} inputMode="numeric"
            placeholder={discountType === 'percent' ? '20' : '500'}
            className="h-9 rounded-[10px] px-2.5 text-[12.5px] font-[650] tabular-nums outline-none"
            style={{ ...field, borderColor: percentOutOfRange && discountValue ? '#ef4444' : 'var(--border)' }} />
        </label>

        {discountType === 'percent' && (
          <label className="flex flex-col gap-1">
            <span className="text-[10.5px] font-[700] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Max discount (₹, optional)</span>
            <input value={maxDiscount} onChange={(e) => setMaxDiscount(e.target.value)} inputMode="numeric" placeholder="2000"
              className="h-9 rounded-[10px] px-2.5 text-[12.5px] tabular-nums outline-none" style={field} />
          </label>
        )}
        <label className="flex flex-col gap-1">
          <span className="text-[10.5px] font-[700] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Total uses (blank = unlimited)</span>
          <input value={maxRedemptions} onChange={(e) => setMaxRedemptions(e.target.value)} inputMode="numeric" placeholder="20"
            className="h-9 rounded-[10px] px-2.5 text-[12.5px] tabular-nums outline-none" style={field} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10.5px] font-[700] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Uses per studio</span>
          <input value={maxPerOrg} onChange={(e) => setMaxPerOrg(e.target.value)} inputMode="numeric"
            className="h-9 rounded-[10px] px-2.5 text-[12.5px] tabular-nums outline-none" style={field} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10.5px] font-[700] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Valid until (optional)</span>
          <input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)}
            className="h-9 rounded-[10px] px-2.5 text-[12.5px] outline-none" style={field} />
        </label>
      </div>

      <div className="mt-3">
        <span className="text-[10.5px] font-[700] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          Limit to plans (none selected = all plans)
        </span>
        <div className="mt-1.5 flex flex-wrap gap-2">
          {plans.map((p) => {
            const on = appliesTo.includes(p.code);
            return (
              <button key={p.code} type="button"
                onClick={() => setAppliesTo((prev) => on ? prev.filter((x) => x !== p.code) : [...prev, p.code])}
                className="rounded-full px-3 py-1.5 text-[11.5px] font-[650] transition"
                style={on
                  ? { background: 'rgba(99,102,241,0.15)', color: '#6366f1', border: '1px solid rgba(99,102,241,0.4)' }
                  : { background: 'var(--bg-subtle)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                {p.name}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <Button onClick={submit} loading={saving} disabled={saving}>Create coupon</Button>
      </div>
    </div>
  );
}

// ── SaaS run-rate metrics ─────────────────────────────────────────────────────
// MRR/ARR are a RUN-RATE (recurring price normalised to one month), not cash
// collected — the revenue trend below is the cash side. Labelling both clearly
// matters: conflating them is the classic SaaS reporting mistake.
function SaasMetrics({ data }: { data: SubscriptionMetrics }) {
  const maxRevenue = Math.max(1, ...data.revenue_trend.map((r) => r.revenue_inr));
  const planned = data.plan_distribution.filter((p) => p.studios > 0);
  const totalPlanned = planned.reduce((s, p) => s + p.studios, 0);

  const tiles = [
    { label: 'MRR', value: fmtINR(data.mrr_inr), sub: 'recurring run-rate', tone: 'positive' as const },
    { label: 'ARR', value: fmtINR(data.arr_inr), sub: 'MRR × 12', tone: 'brand' as const },
    { label: 'ARPU', value: fmtINR(data.arpu_inr), sub: `${data.paying_studios} paying`, tone: 'neutral' as const },
    {
      label: 'Trial → paid',
      value: data.trial_conversion.rate_pct == null ? '—' : `${data.trial_conversion.rate_pct}%`,
      sub: data.trial_conversion.started > 0
        ? `${data.trial_conversion.converted} of ${data.trial_conversion.started} trials`
        : 'no trials yet',
      tone: 'caution' as const,
    },
  ];

  return (
    <div className="space-y-5">
      <div>
        <SectionLabel hint="run-rate, not cash">Recurring</SectionLabel>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {tiles.map((t, i) => (
            <StatTile key={t.label} label={t.label} value={t.value} sub={t.sub} tone={t.tone} delay={i * 0.04} />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Cash collected — distinct from the run-rate above. */}
        <Reveal delay={0.08}>
          <Panel className="h-full">
            <p className="text-[12.5px] font-[760]" style={{ color: 'var(--text-primary)' }}>Revenue collected</p>
            <p className="mb-3.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>Cash in, last 12 months</p>
            {data.revenue_trend.length === 0 ? (
              <p className="py-8 text-center text-[12px]" style={{ color: 'var(--text-muted)' }}>No payments recorded yet</p>
            ) : (
              <div className="flex items-end gap-1.5" style={{ height: 124 }}>
                {data.revenue_trend.map((r, i) => (
                  <div key={r.month} className="group flex flex-1 flex-col items-center gap-1.5"
                    title={`${r.label}: ${fmtINR(r.revenue_inr)} (${r.payments} payments)`}>
                    <m.div
                      className="w-full rounded-t-[4px]"
                      style={{
                        background: 'linear-gradient(180deg, #34D399 0%, #10B981 100%)',
                        transformOrigin: 'bottom',
                      }}
                      initial={{ height: 2 }}
                      animate={{ height: `${Math.max((r.revenue_inr / maxRevenue) * 96, 2)}px` }}
                      transition={{ duration: 0.5, delay: 0.12 + i * 0.03, ease: [0.16, 1, 0.3, 1] }}
                    />
                    <span className="text-[8.5px] tabular-nums" style={{ color: 'var(--text-muted)' }}>{r.label.slice(0, 3)}</span>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </Reveal>

        {/* Where the run-rate actually comes from. */}
        <Reveal delay={0.12}>
          <Panel className="h-full">
            <p className="text-[12.5px] font-[760]" style={{ color: 'var(--text-primary)' }}>Plan distribution</p>
            <p className="mb-3.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>Paying studios by plan</p>
            {planned.length === 0 ? (
              <p className="py-8 text-center text-[12px]" style={{ color: 'var(--text-muted)' }}>No studios on a paid plan yet</p>
            ) : (
              <div className="space-y-3">
                {planned.map((p, i) => (
                  <div key={p.code}>
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-[12px] font-[680]" style={{ color: 'var(--text-primary)' }}>{p.name}</span>
                      <span className="text-[11.5px] tabular-nums" style={{ color: 'var(--text-muted)' }}>
                        {p.studios} · {fmtINR(p.mrr_inr)}/mo
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full" style={{ background: 'var(--bg-subtle)' }}>
                      <m.div className="h-full rounded-full"
                        style={{ background: 'linear-gradient(90deg, var(--brand), #8B5CF6)' }}
                        initial={{ width: 0 }}
                        animate={{ width: `${totalPlanned > 0 ? (p.studios / totalPlanned) * 100 : 0}%` }}
                        transition={{ duration: 0.55, delay: 0.16 + i * 0.05, ease: [0.16, 1, 0.3, 1] }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </Reveal>
      </div>

      {/* Lifecycle spread — timestamp-aware, so a lapsed row the worker has not
          swept yet still reports as lapsed rather than active. */}
      <Reveal delay={0.16}>
      <Panel>
        <p className="mb-3 text-[12.5px] font-[760]" style={{ color: 'var(--text-primary)' }}>Lifecycle</p>
        <div className="flex flex-wrap gap-2">
          {([
            ['Active', data.states.active, '#10b981'],
            ['On trial', data.states.on_trial, '#f59e0b'],
            ['Trial lapsed', data.states.trial_lapsed, '#f97316'],
            ['Lapsed', data.states.lapsed, '#ef4444'],
            ['Frozen', data.states.frozen, '#ef4444'],
            ['Expired', data.states.expired, '#94a3b8'],
            ['Cancelled', data.states.cancelled, '#94a3b8'],
            ['Suspended', data.states.suspended, '#7c3aed'],
          ] as const).filter(([, n]) => n > 0).map(([label, n, colour]) => (
            <span key={label} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11.5px] font-[650]"
              style={{ background: `${colour}18`, color: colour }}>
              {label} <strong className="tabular-nums">{n}</strong>
            </span>
          ))}
          <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11.5px] font-[650]"
            style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
            Founders <strong className="tabular-nums">{data.founders.granted}/{data.founders.limit}</strong>
          </span>
        </div>
      </Panel>
      </Reveal>
    </div>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <div className="flex justify-center py-20">{children}</div>;
}
function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <ShieldAlert size={28} style={{ color: '#ef4444' }} />
      <p className="max-w-[420px] text-[14px] font-[600] text-slate-600">{error}</p>
      {/two-factor|2fa/i.test(error)
        ? <Button onClick={() => { window.location.href = '/settings/profile'; }}>Set up two-factor authentication</Button>
        : <Button variant="outline" iconLeft={<RefreshCw size={14} />} onClick={onRetry}>Retry</Button>}
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[9000] flex items-center justify-center p-4"
      style={{ background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(3px)' }} onClick={onClose}>
      <div className="w-full max-w-md rounded-[20px] p-6" onClick={(e) => e.stopPropagation()}
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 24px 60px rgba(15,23,42,0.30)' }}>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-[16px] font-[800]" style={{ color: 'var(--text-primary)' }}>{title}</h2>
          <button onClick={onClose} className="text-slate-400 transition hover:text-slate-600"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-[11px] font-[700] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{label}</p>
      {children}
    </div>
  );
}

const inputCls = 'w-full rounded-[11px] px-3 py-2.5 text-[13.5px] outline-none';
const inputStyle: React.CSSProperties = { background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-primary)' };

function PasswordField({ value, onChange, onGenerate }: { value: string; onChange: (v: string) => void; onGenerate: () => void }) {
  const { toast } = useToast();
  return (
    <div className="flex gap-2">
      <input className={inputCls} style={inputStyle} value={value} placeholder="Min 8 characters" onChange={(e) => onChange(e.target.value)} />
      <button onClick={onGenerate} title="Generate"
        className="flex h-[42px] w-[42px] flex-shrink-0 items-center justify-center rounded-[11px] transition hover:bg-black/5"
        style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}><RefreshCw size={15} /></button>
      <button onClick={() => { if (value) { navigator.clipboard?.writeText(value); toast.success('Copied'); } }} title="Copy"
        className="flex h-[42px] w-[42px] flex-shrink-0 items-center justify-center rounded-[11px] transition hover:bg-black/5"
        style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}><Copy size={15} /></button>
    </div>
  );
}

// ── Create Organization modal ───────────────────────────────────────────────────
function CreateOrgModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ name: '', trainer_name: '', email: '', password: '' });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!form.name.trim() || !form.email.trim() || form.password.length < 8) {
      toast.error('Name, a valid email, and an 8+ character password are required.'); return;
    }
    setSaving(true);
    try {
      await api.superAdmin.createOrg({
        name: form.name.trim(),
        trainer_name: form.trainer_name.trim() || undefined,
        email: form.email.trim(), password: form.password,
      });
      toast.success('Studio created.'); onCreated();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Create failed'); setSaving(false); }
  };

  return (
    <Modal title="New Studio" onClose={onClose}>
      <div className="space-y-4">
        <Field label="Studio name">
          <input className={inputCls} style={inputStyle} value={form.name} placeholder="e.g. Riya's Fitness Studio"
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        </Field>
        <Field label="Owner / trainer name">
          <input className={inputCls} style={inputStyle} value={form.trainer_name} placeholder="Defaults to studio name"
            onChange={(e) => setForm((f) => ({ ...f, trainer_name: e.target.value }))} />
        </Field>
        <Field label="Login email">
          <input className={inputCls} style={inputStyle} type="email" value={form.email} placeholder="trainer@example.com"
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
        </Field>
        <Field label="Temporary password">
          <PasswordField value={form.password} onChange={(v) => setForm((f) => ({ ...f, password: v }))} onGenerate={() => setForm((f) => ({ ...f, password: genPassword() }))} />
          <p className="mt-1.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>Share with the owner; they change it after first login.</p>
        </Field>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button loading={saving} disabled={saving} onClick={submit} style={{ background: 'linear-gradient(135deg,#0f172a,#334155)', color: '#fff' }}>Create</Button>
        </div>
      </div>
    </Modal>
  );
}

// ── Add User modal ──────────────────────────────────────────────────────────────
function AddUserModal({ org, onClose, onAdded }: { org: Organization; onClose: () => void; onAdded: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'admin' });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!form.name.trim() || !form.email.trim() || form.password.length < 8) {
      toast.error('Name, a valid email, and an 8+ character password are required.'); return;
    }
    setSaving(true);
    try {
      await api.superAdmin.addUser(org.id, { name: form.name.trim(), email: form.email.trim(), password: form.password, role: form.role });
      toast.success('Account added.'); onAdded();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Add failed'); setSaving(false); }
  };

  return (
    <Modal title={`Add account · ${org.name}`} onClose={onClose}>
      <div className="space-y-4">
        <Field label="Name">
          <input className={inputCls} style={inputStyle} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        </Field>
        <Field label="Login email">
          <input className={inputCls} style={inputStyle} type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
        </Field>
        <Field label="Role">
          <select className={inputCls} style={inputStyle} value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
            {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </Field>
        <Field label="Temporary password">
          <PasswordField value={form.password} onChange={(v) => setForm((f) => ({ ...f, password: v }))} onGenerate={() => setForm((f) => ({ ...f, password: genPassword() }))} />
        </Field>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button loading={saving} disabled={saving} onClick={submit} style={{ background: 'linear-gradient(135deg,#0f172a,#334155)', color: '#fff' }}>Add</Button>
        </div>
      </div>
    </Modal>
  );
}

// ── Edit User modal ─────────────────────────────────────────────────────────────
function EditUserModal({ user, onClose, onSaved }: { user: OrgUser; onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ name: user.name, email: user.email, role: user.role });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!form.name.trim() || !form.email.trim()) { toast.error('Name and email are required.'); return; }
    setSaving(true);
    try {
      await api.superAdmin.updateUser(user.id, { name: form.name.trim(), email: form.email.trim(), role: form.role });
      toast.success('Account updated.'); onSaved();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Update failed'); setSaving(false); }
  };

  return (
    <Modal title="Edit account" onClose={onClose}>
      <div className="space-y-4">
        <Field label="Name">
          <input className={inputCls} style={inputStyle} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        </Field>
        <Field label="Email">
          <input className={inputCls} style={inputStyle} type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
        </Field>
        <Field label="Role">
          <select className={inputCls} style={inputStyle} value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
            {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <p className="mt-1.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>Changing the role signs the account out so it re-authenticates with its new powers.</p>
        </Field>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button loading={saving} disabled={saving} onClick={submit} style={{ background: 'linear-gradient(135deg,#0f172a,#334155)', color: '#fff' }}>Save</Button>
        </div>
      </div>
    </Modal>
  );
}

// ── Reset Password modal ─────────────────────────────────────────────────────────
function ResetPasswordModal({ user, onClose }: { user: OrgUser; onClose: () => void }) {
  const { toast } = useToast();
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (password.length < 8) { toast.error('Password must be at least 8 characters.'); return; }
    setSaving(true);
    try {
      await api.superAdmin.resetPassword(user.id, password);
      toast.success('Password reset. Existing sessions revoked.'); onClose();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Reset failed'); setSaving(false); }
  };

  return (
    <Modal title="Reset Password" onClose={onClose}>
      <p className="mb-4 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
        New password for <strong>{user.name}</strong> ({user.email}). This signs them out everywhere.
      </p>
      <Field label="New password">
        <PasswordField value={password} onChange={setPassword} onGenerate={() => setPassword(genPassword())} />
      </Field>
      <div className="flex justify-end gap-2 pt-5">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button loading={saving} disabled={saving} onClick={submit} style={{ background: 'linear-gradient(135deg,#0f172a,#334155)', color: '#fff' }}>Reset</Button>
      </div>
    </Modal>
  );
}
