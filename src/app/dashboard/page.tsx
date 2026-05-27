// frontend/src/app/dashboard/page.tsx
'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  Banknote,
  CalendarCheck,
  CreditCard,
  ExternalLink,
  TrendingUp,
  UserPlus,
  Users,
} from 'lucide-react';

import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import QuickActionsRail from '@/components/QuickActionsRail';
import ClientMetricsCards from '@/components/ClientMetricsCards';
import { DashboardHeader } from '@/components/premium/DashboardHeader';
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
  EmptyState,
  KpiCard,
  SkeletonKpi,
  cn,
  statusTone,
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

type DashSummary = {
  clients?: {
    total?: number;
    active?: number;
    expired?: number;
    frozen?: number;
    new_this_month?: number;
    new_today?: number;
  };
  revenue?: {
    today?: number;
    month?: number;
    year?: number;
    total?: number;
    collected?: number;
    collected_count?: number;
    collected_count_today?: number;
  };
  total_dues?: number;
  pending_invoices_count?: number;
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

const RANGE_TO_PERIOD: Record<string, Period> = {
  'Today':   'today',
  '7 days':  '7d',
  '30 days': '30d',
  '90 days': '90d',
};

/* ─────────────────────────  page  ───────────────────────── */

export default function DashboardPage() {
  return (
    <Guard>
      <DashboardContent />
    </Guard>
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

  const d = summary.data ?? {};
  const inactive = (d.clients?.expired ?? 0) + (d.clients?.frozen ?? 0);

  return (
    <AppShell>
      {/*
        AppShell provides px-4 sm:px-6 lg:px-8 and max-w-[1800px] mx-auto
        This wrapper has zero extra padding — no double padding issues.
      */}

      {/* ── Premium Dashboard Header ───────────────────────────── */}
      <div className="mb-6">
        <DashboardHeader
          onRangeChange={(range) => {
            const p = RANGE_TO_PERIOD[range];
            if (p) setPeriod(p);
          }}
          onRefresh={summary.refetch}
        />
      </div>

      {/* Errors */}
      {summary.error && (
        <div role="alert"
          className="mb-6 flex items-center justify-between gap-3 rounded-2xl border border-[rgba(220,38,38,0.1)] bg-[rgba(220,38,38,0.04)] px-5 py-3 text-sm text-[#dc2626]">
          <span>
            Couldn&rsquo;t load dashboard:{' '}
            <strong className="font-medium">{summary.error.message}</strong>
          </span>
          <Button size="sm" variant="outline" onClick={summary.refetch}>Retry</Button>
        </div>
      )}

      {/* KPIs */}
      <section aria-label="Key metrics"
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 lg:gap-4">
        {summary.loading && !summary.data
          ? Array.from({ length: 5 }).map((_, i) => <SkeletonKpi key={i} />)
          : <KpiRow d={d} />}
      </section>

      {/* ── Quick Actions Rail ──────────────────────────────────── */}
      <QuickActionsRail />

      {/* ── Client Metrics Cards ──────────────────────── */}
      <section aria-label="Client analytics" className="mt-6">
        <ClientMetricsCards
          total={d.clients?.total ?? 0}
          active={d.clients?.active ?? 0}
          inactive={inactive}
          newThisMonth={d.clients?.new_this_month ?? 0}
          loading={summary.loading && !summary.data}
        />
      </section>

      {/* Recent payments */}
      <section className="mt-6 min-w-0">
        <Card>
          <CardHeader>
            <CardTitle>Recent payments</CardTitle>
            <Link href="/payments"
              className="inline-flex items-center gap-1 text-xs font-medium text-[#dc2626] hover:underline">
              View all <ExternalLink className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardBody className="p-0">
            <RecentPayments
              rows={d.recent_payments ?? []}
              loading={summary.loading && !summary.data}
            />
          </CardBody>
        </Card>
      </section>

      {isAdmin && (
        <section className="mt-6 grid grid-cols-1 gap-4 min-w-0">
          <TopTrainersCard rows={d.top_trainers ?? []} />
        </section>
      )}
    </AppShell>
  );
}

/* ─────────────────────────  KPI row  ───────────────────────── */

function KpiRow({ d }: { d: DashSummary }) {
  const todayRevenue   = d.revenue?.today ?? 0;
  const monthRevenue   = d.revenue?.month ?? 0;
  const collectedAmount = d.revenue?.collected ?? monthRevenue;
  const collectedCountToday = d.revenue?.collected_count_today ?? d.revenue?.collected_count ?? 0;
  const pendingAmount  = d.total_dues ?? 0;
  const pendingInvoices = d.pending_invoices_count ?? (d.clients?.expired ?? 0);
  const newClientsToday = d.clients?.new_today ?? 0;
  const newClientsMonth = d.clients?.new_this_month ?? 0;
  const renewalsCount  = (d.expiring_soon ?? 0) + (d.pending_renewals ?? 0);

  return (
    <>
      <KpiCard accent="emerald"
        label="Today's revenue" value={fmtINRCompact(todayRevenue)}
        hint={`Month-to-date ${fmtINRCompact(monthRevenue)}`}
        icon={<TrendingUp className="h-5 w-5" />} href="/finance/collection" />

      <KpiCard accent="rose"
        label="Collected payments" value={fmtINRCompact(collectedAmount)}
        hint={`${collectedCountToday.toLocaleString('en-IN')} payments today`}
        icon={<CreditCard className="h-5 w-5" />} href="/payments" />

      <KpiCard accent="sky"
        label="Pending payments" value={fmtINRCompact(pendingAmount)}
        hint={`${pendingInvoices.toLocaleString('en-IN')} unpaid invoices`}
        icon={<AlertCircle className="h-5 w-5" />} href="/finance/dues" deltaIs="bad" />

      <KpiCard accent="violet"
        label="New clients" value={newClientsToday.toLocaleString('en-IN')}
        hint={`${newClientsMonth.toLocaleString('en-IN')} joined this month`}
        icon={<UserPlus className="h-5 w-5" />} href="/clients/new" />

      <KpiCard accent="amber"
        label="Renewals" value={renewalsCount.toLocaleString('en-IN')}
        hint="Next 7 days"
        icon={<CalendarCheck className="h-5 w-5" />} href="/clients" />
    </>
  );
}

/* ─────────────────────────  pieces  ───────────────────────── */

function RecentPayments({
  rows, loading,
}: {
  rows: NonNullable<DashSummary['recent_payments']>;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="px-5 py-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="grid grid-cols-4 gap-2 border-b border-[var(--border)] py-3 last:border-b-0">
            {[1,2,3,4].map((j) => (
              <div key={j} className="h-3 animate-pulse rounded bg-[rgba(255,255,255,0.06)]" />
            ))}
          </div>
        ))}
      </div>
    );
  }
  if (rows.length === 0) {
    return (
      <EmptyState icon={<Banknote className="h-5 w-5" />}
        title="No payments yet"
        description="Once you record a payment it'll appear here." />
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="bg-[var(--bg-subtle)] text-xs uppercase tracking-wider text-[var(--text-muted)]">
          <tr>
            <th className="px-5 py-3 font-medium">Member</th>
            <th className="px-5 py-3 font-medium">Amount</th>
            <th className="px-5 py-3 font-medium">Method</th>
            <th className="hidden px-5 py-3 font-medium md:table-cell">Coach</th>
            <th className="px-5 py-3 font-medium">Date</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.id} className="border-t border-[var(--border)] transition hover:bg-[rgba(255,255,255,0.03)]">
              <td className="px-5 py-3 font-medium text-[var(--text-primary)]">{p.client_name || '—'}</td>
              <td className="px-5 py-3 font-semibold tabular-nums text-[#15803d]">{fmtINR(p.amount)}</td>
              <td className="px-5 py-3">
                <Badge tone={statusTone(p.method)} dot>{(p.method ?? 'CASH').toUpperCase()}</Badge>
              </td>
              <td className="hidden px-5 py-3 text-[var(--text-secondary)] md:table-cell">{p.trainer_name || '—'}</td>
              <td className="px-5 py-3 text-[var(--text-muted)]">{fmtDate(p.date)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TopTrainersCard({ rows }: { rows: NonNullable<DashSummary['top_trainers']> }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top trainers — month revenue</CardTitle>
        <Link href="/finance/trainer-revenue"
          className="inline-flex items-center gap-1 text-xs font-medium text-[#dc2626] hover:underline">
          Full report <ExternalLink className="h-3 w-3" />
        </Link>
      </CardHeader>
      <CardBody className="p-0">
        {rows.length === 0 ? (
          <EmptyState icon={<Users className="h-5 w-5" />}
            title="No trainer revenue yet"
            description="Once trainers start logging clients & PT renewals, the leaderboard appears here." />
        ) : (
          <ul role="list" className="divide-y divide-[var(--border)]">
            {rows.map((t, i) => (
              <li key={t.id} className="flex items-center justify-between gap-4 px-5 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[rgba(220,38,38,0.08)] text-sm font-semibold text-[#dc2626]">
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-[var(--text-primary)]">{t.name}</p>
                    {t.specialization && (
                      <p className="truncate text-xs text-[var(--text-muted)]">{t.specialization}</p>
                    )}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold tabular-nums text-[#15803d]">
                    {fmtINRCompact(t.month_revenue ?? 0)}
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">{t.active_clients ?? 0} active</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
