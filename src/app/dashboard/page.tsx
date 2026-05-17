// frontend/src/app/dashboard/page.tsx
//
// Owner / admin / trainer dashboard. Rebuilt on the new design system
// (`@/components/ui`) with three KPI donuts (membership mix, revenue split
// for the period, conversion). The legacy classes from globals.css are kept
// untouched, so other pages still render — this page just no longer relies
// on them.

'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  Banknote,
  CalendarClock,
  CheckCircle2,
  ExternalLink,
  Plus,
  RefreshCw,
  Scan,
  TrendingUp,
  UserPlus,
  Users,
  Wallet,
  Zap,
} from 'lucide-react';

import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { useAuth } from '@/lib/auth-context';
import { fmtDate } from '@/lib/format';
import { request } from '@/lib/http';
import { useAsync } from '@/lib/use-async';
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  DonutChart,
  EmptyState,
  KpiCard,
  SkeletonKpi,
  cn,
  statusTone,
  type DonutDatum,
} from '@/components/ui';

/* ─────────────────────────  helpers  ───────────────────────── */

function fmtINR(n: number | string | null | undefined) {
  return '₹' + Number(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}
function fmtINRCompact(n: number | string | null | undefined) {
  const v = Number(n ?? 0);
  if (v >= 10_000_000) return '₹' + (v / 10_000_000).toFixed(1) + 'Cr';
  if (v >= 100_000) return '₹' + (v / 100_000).toFixed(1) + 'L';
  if (v >= 1_000) return '₹' + (v / 1_000).toFixed(1) + 'K';
  return '₹' + v.toLocaleString('en-IN');
}

/** Server-side dashboard payload (same shape today; tolerant of new fields). */
type DashSummary = {
  clients?: {
    total?: number;
    active?: number;
    expired?: number;
    frozen?: number;
    new_this_month?: number;
  };
  revenue?: {
    today?: number;
    month?: number;
    year?: number;
    total?: number;
  };
  total_dues?: number;
  expiring_soon?: number;
  attendance_today?: number;
  birthdays_today?: number;
  anniversaries_today?: number;
  pending_renewals?: number;
  active_pt_clients?: number;
  recent_payments?: Array<{
    id: string;
    amount: number;
    method?: string;
    date: string;
    receipt_no?: string;
    client_name?: string;
    trainer_name?: string;
  }>;
  monthly_chart?: Array<{ month: string; revenue: number; count: number }>;
  top_trainers?: Array<{
    id: string;
    name: string;
    specialization?: string;
    active_clients?: number;
    month_revenue?: number;
  }>;
};

type Period = 'today' | '7d' | '30d' | '90d';
const PERIOD_TABS: { id: Period; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: '7d', label: '7 days' },
  { id: '30d', label: '30 days' },
  { id: '90d', label: '90 days' },
];

/* ─────────────────────────  page  ───────────────────────── */

export default function DashboardPage() {
  return (
    <Guard>
      <DashboardContent />
    </Guard>
  );
}

/* ─── 619 antler / flame SVG (right-side decoration) ─────── */
function HeroDecoration() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 320 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="hero-decoration"
    >
      {/* outer glow rings */}
      <ellipse cx="200" cy="80" rx="120" ry="72" fill="rgba(185,28,28,0.13)" />
      <ellipse cx="200" cy="80" rx="88" ry="52" fill="rgba(185,28,28,0.10)" />
      {/* stylised antler left */}
      <path
        d="M160 130 C158 110 148 95 140 78 C135 65 130 52 134 38 C138 28 148 22 152 14"
        stroke="rgba(220,38,38,0.55)" strokeWidth="3" strokeLinecap="round"
      />
      <path d="M152 14 C146 24 138 30 128 34" stroke="rgba(220,38,38,0.40)" strokeWidth="2" strokeLinecap="round" />
      <path d="M148 42 C138 40 128 44 120 50" stroke="rgba(220,38,38,0.35)" strokeWidth="2" strokeLinecap="round" />
      <path d="M143 56 C134 52 124 54 116 60" stroke="rgba(220,38,38,0.30)" strokeWidth="2" strokeLinecap="round" />
      {/* stylised antler right */}
      <path
        d="M175 130 C178 110 190 95 198 78 C204 65 210 52 206 38 C202 28 192 22 188 14"
        stroke="rgba(220,38,38,0.55)" strokeWidth="3" strokeLinecap="round"
      />
      <path d="M188 14 C194 24 202 30 212 34" stroke="rgba(220,38,38,0.40)" strokeWidth="2" strokeLinecap="round" />
      <path d="M192 42 C202 40 212 44 220 50" stroke="rgba(220,38,38,0.35)" strokeWidth="2" strokeLinecap="round" />
      <path d="M197 56 C206 52 216 54 224 60" stroke="rgba(220,38,38,0.30)" strokeWidth="2" strokeLinecap="round" />
      {/* flame / body centre */}
      <path
        d="M167 130 C162 112 158 96 162 82 C165 70 172 62 168 52 C172 58 178 68 176 80 C180 68 184 56 182 44 C188 54 190 68 186 80 C192 70 196 60 194 50 C200 62 200 76 196 88 C202 80 208 72 206 62 C212 74 210 90 202 100 C208 96 216 92 218 84 C218 96 210 110 198 118 C196 122 192 126 190 130Z"
        fill="rgba(220,38,38,0.22)"
        stroke="rgba(220,38,38,0.45)" strokeWidth="1.2"
      />
      {/* 619 badge circle */}
      <circle cx="168" cy="100" r="22" fill="rgba(185,28,28,0.70)" stroke="rgba(220,38,38,0.60)" strokeWidth="1.5" />
      <text x="168" y="105" textAnchor="middle" fill="#fff" fontSize="13" fontWeight="800" fontFamily="system-ui,sans-serif">619</text>
    </svg>
  );
}

/* ─── 619 shield logo (left side) ──────────────────────────── */
function LogoBadge() {
  return (
    <div className="hero-logo-wrap" aria-hidden="true">
      <svg viewBox="0 0 64 72" fill="none" xmlns="http://www.w3.org/2000/svg" className="hero-logo-svg">
        {/* shield */}
        <path
          d="M32 4 L60 16 L60 42 C60 56 44 68 32 72 C20 68 4 56 4 42 L4 16 Z"
          fill="#b91c1c" stroke="#dc2626" strokeWidth="1.5"
        />
        {/* inner shield */}
        <path
          d="M32 10 L54 20 L54 42 C54 53 42 64 32 68 C22 64 10 53 10 42 L10 20 Z"
          fill="rgba(0,0,0,0.25)"
        />
        {/* antler hint */}
        <path d="M28 36 C26 28 22 22 24 16 C26 12 30 10 32 8" stroke="rgba(255,255,255,0.70)" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M36 36 C38 28 42 22 40 16 C38 12 34 10 32 8" stroke="rgba(255,255,255,0.70)" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M26 22 C22 20 18 22 16 26" stroke="rgba(255,255,255,0.50)" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M38 22 C42 20 46 22 48 26" stroke="rgba(255,255,255,0.50)" strokeWidth="1.2" strokeLinecap="round" />
        {/* flame */}
        <path
          d="M32 62 C28 54 26 46 28 38 C30 32 34 28 32 22 C36 28 38 36 36 44 C40 38 40 30 38 24 C44 32 44 44 40 52 C44 48 48 44 46 38 C50 46 48 58 42 62 C40 66 36 68 32 68 C28 68 24 66 22 62 C16 58 14 46 18 38 C16 44 20 48 24 52 C20 44 20 32 26 24 C24 30 24 38 28 44 C26 36 28 28 32 22 C30 28 34 32 36 38 C34 30 36 22 40 18 C42 26 40 34 36 42Z"
          fill="rgba(255,100,50,0.55)" stroke="rgba(255,150,80,0.50)" strokeWidth="0.8"
        />
        {/* 619 text */}
        <text x="32" y="52" textAnchor="middle" fill="#fff" fontSize="11" fontWeight="900" fontFamily="system-ui,sans-serif">619</text>
      </svg>
    </div>
  );
}

function DashboardContent() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [period, setPeriod] = React.useState<Period>('30d');

  const summary = useAsync<DashSummary>(
    (signal) =>
      request<DashSummary>(`/api/dashboard/summary?period=${period}`, {
        signal,
        cacheMs: 30_000,
      }),
    [period],
  );

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-7xl px-4 pb-8 sm:px-6">

        {/* ── Hero banner ───────────────────────────────────────────── */}
        <header className="dashboard-hero619">
          {/* left: logo + text */}
          <div className="hero619-left">
            <LogoBadge />
            <div className="hero619-text">
              <p className="hero619-eyebrow">Welcome Back</p>
              <h1 className="hero619-title">619 FITNESS STUDIO</h1>
              <p className="hero619-sub">
                {periodCopy(period)} · refreshes every 30 s while open
              </p>
            </div>
          </div>

          {/* right: period tabs + refresh */}
          <div className="hero619-right">
            <PeriodPicker value={period} onChange={setPeriod} />
            <Button
              size="sm"
              variant="outline"
              iconLeft={<RefreshCw className="h-3.5 w-3.5" />}
              onClick={summary.refetch}
              loading={summary.loading && summary.hasResolved}
            >
              Refresh
            </Button>
          </div>

          {/* decorative antler/flame graphic */}
          <HeroDecoration />
        </header>

        {/* Errors */}
        {summary.error && (
          <div
            role="alert"
            className="mt-6 flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            <span>
              Couldn&rsquo;t load dashboard:{' '}
              <strong className="font-medium">{summary.error.message}</strong>
            </span>
            <Button size="sm" variant="outline" onClick={summary.refetch}>
              Retry
            </Button>
          </div>
        )}

        {/* KPIs */}
        <section
          aria-label="Key metrics"
          className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5 lg:gap-4"
        >
          {summary.loading && !summary.data ? (
            Array.from({ length: 5 }).map((_, i) => <SkeletonKpi key={i} />)
          ) : (
            <KpiRow d={summary.data ?? {}} />
          )}
        </section>

        {/* Charts row */}
        <section
          aria-label="Donut breakdowns"
          className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3"
        >
          <Card className="premium-surface">
            <CardHeader>
              <CardTitle>Membership mix</CardTitle>
              <Badge tone="neutral">All time</Badge>
            </CardHeader>
            <CardBody>
              <DonutChart
                data={membershipMix(summary.data)}
                centerValue={correctedMembershipTotal(summary.data)}
                centerLabel="Members"
                valueFormatter={(v) => v.toLocaleString('en-IN')}
              />
            </CardBody>
          </Card>

          <Card className="premium-surface">
            <CardHeader>
              <CardTitle>Revenue snapshot</CardTitle>
              <Badge tone="brand">{labelForPeriod(period)}</Badge>
            </CardHeader>
            <CardBody>
              <DonutChart
                data={revenueMix(summary.data)}
                centerValue={fmtINRCompact(
                  (summary.data?.revenue?.month ?? 0) +
                    (summary.data?.total_dues ?? 0),
                )}
                centerLabel="Booked"
                valueFormatter={(v) => fmtINR(v)}
              />
            </CardBody>
          </Card>

          <Card className="premium-surface">
            <CardHeader>
              <CardTitle>Renewal pipeline</CardTitle>
              <Badge tone="warning">Next 30 days</Badge>
            </CardHeader>
            <CardBody>
              <DonutChart
                data={renewalPipeline(summary.data)}
                centerValue={correctedRenewalTotal(summary.data)}
                centerLabel="At risk"
                valueFormatter={(v) => v.toLocaleString('en-IN')}
              />
            </CardBody>
          </Card>
        </section>

        {/* Quick actions + recent payments */}
        <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Quick actions</CardTitle>
            </CardHeader>
            <CardBody className="grid grid-cols-2 gap-2">
              <QuickAction
                href="/sales/enquiry"
                icon={<Plus className="h-4 w-4" />}
                label="Add enquiry"
              />
              <QuickAction
                href="/payments?new=1"
                icon={<Zap className="h-4 w-4" />}
                label="Quick billing"
              />
              <QuickAction
                href="/checkin"
                icon={<Scan className="h-4 w-4" />}
                label="Face check-in"
              />
              <QuickAction
                href="/clients/new"
                icon={<UserPlus className="h-4 w-4" />}
                label="New member"
              />
              <QuickAction
                href="/finance/dues"
                icon={<Wallet className="h-4 w-4" />}
                label="Dues report"
              />
              <QuickAction
                href="/members/expiring"
                icon={<CalendarClock className="h-4 w-4" />}
                label="Renewals"
              />
            </CardBody>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Recent payments</CardTitle>
              <Link
                href="/payments"
                className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 hover:underline"
              >
                View all <ExternalLink className="h-3 w-3" />
              </Link>
            </CardHeader>
            <CardBody className="p-0">
              <RecentPayments
                rows={summary.data?.recent_payments ?? []}
                loading={summary.loading && !summary.data}
              />
            </CardBody>
          </Card>
        </section>

        {isAdmin && (
          <section className="mt-6 grid grid-cols-1 gap-4">
            <TopTrainersCard rows={summary.data?.top_trainers ?? []} />
          </section>
        )}
      </div>
    </AppShell>
  );
}

/* ─────────────────────────  KPI row  ───────────────────────── */

function KpiRow({ d }: { d: DashSummary }) {
  const dueColor = (d.total_dues ?? 0) > 0 ? 'amber' : 'emerald';
  const trainerCount = d.top_trainers?.length ?? 0;
  const rawActiveMembers = d.clients?.active ?? 0;
  const rawTotalMembers = d.clients?.total ?? 0;
  const rawNewThisMonth = d.clients?.new_this_month ?? 0;
  const correctedActiveMembers = rawTotalMembers === 0 && trainerCount > 0 ? 0 : Math.max(0, rawActiveMembers - trainerCount);
  const correctedTotalMembers = rawTotalMembers === trainerCount ? 0 : Math.max(0, rawTotalMembers - trainerCount);
  const correctedNewThisMonth = rawTotalMembers === 0 && trainerCount > 0 ? 0 : Math.max(0, rawNewThisMonth - trainerCount);
  return (
    <>
      <KpiCard className="kpi-premium"
        accent="emerald"
        label="Today's revenue"
        value={fmtINRCompact(d.revenue?.today ?? 0)}
        hint={`Month-to-date ${fmtINRCompact(d.revenue?.month ?? 0)}`}
        icon={<TrendingUp className="h-5 w-5" />}
        href="/payments"
      />
      <KpiCard className="kpi-premium"
        accent="rose"
        label="Active members"
        value={(d.clients?.active ?? 0).toLocaleString('en-IN')}
        hint={`${d.clients?.new_this_month ?? 0} new this month`}
        icon={<Users className="h-5 w-5" />}
        href="/members/active"
      />
      <KpiCard className="kpi-premium"
        accent="sky"
        label="Today's check-ins"
        value={(d.attendance_today ?? 0).toLocaleString('en-IN')}
        hint="Members + walk-ins"
        icon={<CheckCircle2 className="h-5 w-5" />}
        href="/attendance"
      />
      <KpiCard className="kpi-premium"
        accent="violet"
        label="Renewals due"
        value={(d.expiring_soon ?? 0).toLocaleString('en-IN')}
        hint="Next 7 days"
        icon={<RefreshCw className="h-5 w-5" />}
        href="/members/expiring"
      />
      <KpiCard className="kpi-premium"
        accent={dueColor}
        label="Pending dues"
        value={fmtINRCompact(d.total_dues ?? 0)}
        hint={`${d.clients?.expired ?? 0} lapsed members`}
        icon={<Banknote className="h-5 w-5" />}
        href="/finance/dues"
        deltaIs="bad"
      />
    </>
  );
}

/* ─────────────────────────  charts  ───────────────────────── */

function membershipMix(d?: DashSummary | null): DonutDatum[] {
  if (!d) return [];
  const c = d.clients ?? {};
  return [
    { name: 'Active', value: c.active ?? 0, color: '#10b981' },
    { name: 'Expired', value: c.expired ?? 0, color: '#ef4444' },
    { name: 'Frozen', value: c.frozen ?? 0, color: '#f59e0b' },
  ];
}

function revenueMix(d?: DashSummary | null): DonutDatum[] {
  if (!d) return [];
  const month = d.revenue?.month ?? 0;
  const dues = d.total_dues ?? 0;
  return [
    { name: 'Collected', value: month, color: '#10b981' },
    { name: 'Outstanding', value: dues, color: '#f59e0b' },
  ];
}

function renewalPipeline(d?: DashSummary | null): DonutDatum[] {
  if (!d) return [];
  return [
    { name: 'Expiring 7d', value: d.expiring_soon ?? 0, color: '#f59e0b' },
    { name: 'Pending', value: d.pending_renewals ?? 0, color: '#ef4444' },
    { name: 'Active PT', value: d.active_pt_clients ?? 0, color: '#10b981' },
  ];
}

/* ─────────────────────────  pieces  ───────────────────────── */

function PeriodPicker({
  value,
  onChange,
}: {
  value: Period;
  onChange: (p: Period) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Time range"
      className="hero619-period-picker"
    >
      {PERIOD_TABS.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={value === t.id}
          onClick={() => onChange(t.id)}
          className={cn(
            'hero619-period-btn',
            value === t.id ? 'hero619-period-btn--active' : '',
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

function QuickAction({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="group inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-rose-200 hover:text-rose-700"
    >
      <span className="grid h-7 w-7 place-items-center rounded-md bg-rose-50 text-rose-600 transition group-hover:bg-rose-100">
        {icon}
      </span>
      <span className="truncate">{label}</span>
      <ArrowUpRight className="ml-auto h-3 w-3 text-slate-400 group-hover:text-rose-600" />
    </Link>
  );
}

function RecentPayments({
  rows,
  loading,
}: {
  rows: NonNullable<DashSummary['recent_payments']>;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="px-5 py-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="grid grid-cols-4 gap-2 border-b border-slate-100 py-3 last:border-b-0"
          >
            <div className="h-3 animate-pulse rounded bg-slate-200/70" />
            <div className="h-3 animate-pulse rounded bg-slate-200/70" />
            <div className="h-3 animate-pulse rounded bg-slate-200/70" />
            <div className="h-3 animate-pulse rounded bg-slate-200/70" />
          </div>
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<Banknote className="h-5 w-5" />}
        title="No payments yet"
        description="Once you record a payment it'll appear here."
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
          <tr>
            <th className="px-5 py-3 font-medium">Member</th>
            <th className="px-5 py-3 font-medium">Amount</th>
            <th className="px-5 py-3 font-medium">Method</th>
            <th className="hidden px-5 py-3 font-medium md:table-cell">Coach</th>
            <th className="px-5 py-3 font-medium">Date</th>
          </tr>
        </thead>
        <tbody>
          {(rows ?? []).map((p) => (
            <tr
              key={p.id}
              className="border-t border-slate-100 transition hover:bg-slate-50/60"
            >
              <td className="px-5 py-3 font-medium text-slate-900">
                {p.client_name || '—'}
              </td>
              <td className="px-5 py-3 font-semibold tabular-nums text-emerald-700">
                {fmtINR(p.amount)}
              </td>
              <td className="px-5 py-3">
                <Badge tone={statusTone(p.method)} dot>
                  {(p.method ?? 'CASH').toUpperCase()}
                </Badge>
              </td>
              <td className="hidden px-5 py-3 text-slate-600 md:table-cell">
                {p.trainer_name || '—'}
              </td>
              <td className="px-5 py-3 text-slate-500">{fmtDate(p.date)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TopTrainersCard({
  rows,
}: {
  rows: NonNullable<DashSummary['top_trainers']>;
}) {
  return (
    <Card className="premium-surface">
      <CardHeader>
        <CardTitle>Top trainers — month revenue</CardTitle>
        <Link
          href="/finance/trainer-revenue"
          className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 hover:underline"
        >
          Full report <ExternalLink className="h-3 w-3" />
        </Link>
      </CardHeader>
      <CardBody className="p-0">
        {rows.length === 0 ? (
          <EmptyState
            icon={<Users className="h-5 w-5" />}
            title="No trainer revenue yet"
            description="Once trainers start logging clients & PT renewals, the leaderboard appears here."
          />
        ) : (
          <ul role="list" className="divide-y divide-slate-100">
            {(rows ?? []).map((t, i) => (
              <li
                key={t.id}
                className="flex items-center justify-between gap-4 px-5 py-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-rose-50 text-sm font-semibold text-rose-700">
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900">
                      {t.name}
                    </p>
                    {t.specialization && (
                      <p className="truncate text-xs text-slate-500">
                        {t.specialization}
                      </p>
                    )}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold tabular-nums text-emerald-700">
                    {fmtINRCompact(t.month_revenue ?? 0)}
                  </p>
                  <p className="text-xs text-slate-500">
                    {t.active_clients ?? 0} active
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}

/* ─────────────────────────  copy helpers  ───────────────────────── */

function periodCopy(p: Period) {
  switch (p) {
    case 'today':
      return "Today's snapshot";
    case '7d':
      return 'Rolling 7 days';
    case '30d':
      return 'Rolling 30 days';
    case '90d':
      return 'Rolling 90 days';
  }
}
function labelForPeriod(p: Period) {
  return p === 'today' ? 'Today' : `Last ${p.replace('d', '')}d`;
}


function correctedMembershipTotal(d?: DashSummary | null) {
  const trainerCount = d?.top_trainers?.length ?? 0;
  const totalMembers = d?.clients?.total ?? 0;
  if (totalMembers === 0 && trainerCount > 0) return '0';
  return Math.max(0, totalMembers - trainerCount).toLocaleString('en-IN');
}

function correctedRenewalTotal(d?: DashSummary | null) {
  const trainerCount = d?.top_trainers?.length ?? 0;
  const totalMembers = d?.clients?.total ?? 0;
  if (totalMembers === 0 && trainerCount > 0) return '0';
  const total = (d?.pending_renewals ?? 0) + (d?.active_pt_clients ?? 0);
  return total.toLocaleString('en-IN');
}
