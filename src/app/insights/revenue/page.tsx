'use client';

/**
 * Revenue Analytics — KPIs, bar charts and a revenue-share donut.
 *
 * Data sources (legacy /api/reports/* router — src/routes/reports.js):
 *   GET /api/reports/monthly?year=   → [{ month_num, month_name, payment_count, revenue, incentives }]
 *   GET /api/reports/trainer-summary → [{ id, name, specialization, active_clients, total_clients,
 *                                        month_revenue, total_revenue }]   (admin only)
 *   GET /api/reports/dues            → [{ id, name, balance_amount, ... }]
 *   GET /api/reports/revenue?from&to → { count, total, total_incentives }
 *
 * Every numeric column arrives as a STRING (pg returns numeric/bigint as text),
 * so everything goes through num() before arithmetic.
 *
 * ── Colour ──────────────────────────────────────────────────────────────────
 * Series colours are not hand-picked: they were run through the dataviz
 * palette validator for BOTH themes (light surface #F8FAFC, dark #0F172A).
 *
 *   Bars  #0067E0 / #D97706 — PASS on every check in light and dark.
 *   Donut #0067E0, #D97706, #059669, #0067E0, #0059CE — PASS in both, with one
 *         WARN (emerald↔amber ΔE 7.9 under protanopia) that is only legal
 *         alongside secondary encoding. That relief is present: the donut keeps
 *         its legend, 2px segment gaps and value+percent tooltips, and the
 *         ranked bars carry direct value labels.
 *
 * Ordering matters — an earlier arrangement put blue next to violet, which the
 * validator rejected outright (ΔE 12 for normal vision, under the hard floor of
 * 15). Colours follow the entity's rank position and are never cycled.
 *
 * "Other" is deliberately a neutral grey, outside the categorical scale: it is
 * an aggregate bucket, not an identity.
 */

import { useCallback, useMemo, useState } from 'react';
import { m } from 'framer-motion';
import {
  TrendingUp, Wallet, Receipt, Percent, Trophy,
  AlertCircle, RefreshCw, CalendarRange, BarChart3,
} from 'lucide-react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { KpiCard, DonutChart, PremiumBarChart, PullToRefresh, EmptyState } from '@/components/ui';
import { useAsync } from '@/lib/use-async';
import MonthlyTargetHero from '@/components/revenue/MonthlyTargetHero';
import { fmtMoney } from '@/lib/format';
import http from '@/lib/http';
import { series } from '@/lib/palette';

// ─── Types ────────────────────────────────────────────────────────────────────
type Numeric = string | number | null | undefined;

type MonthlyRow = {
  month_num: Numeric; month_name: string;
  payment_count: Numeric; revenue: Numeric; incentives: Numeric;
};
type TrainerRow = {
  id: string; name: string; specialization: string | null;
  active_clients: Numeric; total_clients: Numeric;
  month_revenue: Numeric; total_revenue: Numeric;
};
type DuesRow = { id: string; name: string; balance_amount: Numeric };
type RangeTotals = { count: Numeric; total: Numeric; total_incentives: Numeric };

// ─── Validated series colours (see file header) ───────────────────────────────
const REVENUE_COLOR = '#0067E0';
const INCENTIVE_COLOR = '#D97706';
const DONUT_SCALE = series;
const OTHER_COLOR = '#94A3B8'; // neutral aggregate, intentionally non-categorical

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const TOP_TRAINERS = 5;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const num = (v: Numeric): number => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};

/** Compact INR for axis ticks and dense tiles — full precision lives in tooltips. */
function fmtCompact(v: number): string {
  const a = Math.abs(v);
  if (a >= 1e7) return '₹' + (v / 1e7).toFixed(2).replace(/\.00$/, '') + 'Cr';
  if (a >= 1e5) return '₹' + (v / 1e5).toFixed(2).replace(/\.00$/, '') + 'L';
  if (a >= 1e3) return '₹' + (v / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
  return fmtMoney(v);
}

const isoToday = () => new Date().toISOString().slice(0, 10);
const isoYearStart = (y: number) => `${y}-01-01`;

// ─── Layout primitives ────────────────────────────────────────────────────────
function Panel({
  title, subtitle, icon, action, children, className = '',
}: {
  title: string; subtitle?: string; icon?: React.ReactNode;
  action?: React.ReactNode; children: React.ReactNode; className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border overflow-hidden ${className}`}
      style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-xs)' }}
    >
      <header
        className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5 border-b"
        style={{ borderColor: 'var(--border)' }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {icon && (
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px]"
              style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}
            >
              {icon}
            </span>
          )}
          <div className="min-w-0">
            <h2 className="text-[13.5px] font-bold truncate" style={{ color: 'var(--text-primary)' }}>{title}</h2>
            {subtitle && (
              <p className="text-[11px] mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>
            )}
          </div>
        </div>
        {action}
      </header>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

/** Legend for multi-series charts. PremiumBarChart renders no legend of its own,
 *  and identity must never rest on colour alone. */
function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5 m-0 p-0 list-none">
      {items.map((s) => (
        <li key={s.label} className="flex items-center gap-1.5">
          <span aria-hidden className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: s.color }} />
          <span className="text-[11px] font-semibold" style={{ color: 'var(--text-secondary)' }}>{s.label}</span>
        </li>
      ))}
    </ul>
  );
}

function ChartSkeleton({ height }: { height: number }) {
  return (
    <div
      className="w-full animate-pulse rounded-xl"
      style={{ height, background: 'var(--bg-subtle)' }}
      role="status"
      aria-label="Loading chart"
    />
  );
}

function LoadError({ what, onRetry }: { what: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 py-8 text-center">
      <AlertCircle size={22} style={{ color: 'var(--danger, #ef4444)' }} />
      <p className="text-[12.5px] font-semibold" style={{ color: 'var(--text-primary)' }}>
        Could not load {what}
      </p>
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-1.5 rounded-full px-3.5 h-8 text-[11.5px] font-semibold transition active:scale-95"
        style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}
      >
        <RefreshCw size={12} /> Retry
      </button>
    </div>
  );
}

/** Ranked horizontal bars. Chosen over a vertical chart because trainer names
 *  are long, and because a direct value on every row doubles as the secondary
 *  encoding the palette's CVD warning requires. */
function RankedBars({
  rows, max,
}: {
  rows: { id: string; name: string; value: number; color: string }[];
  max: number;
}) {
  return (
    <ol className="space-y-3 m-0 p-0 list-none">
      {rows.map((r, i) => (
        <li key={r.id}>
          <div className="flex items-baseline justify-between gap-3 mb-1.5">
            <span className="text-[12px] font-semibold truncate min-w-0" style={{ color: 'var(--text-primary)' }}>
              <span className="tabular-nums mr-1.5" style={{ color: 'var(--text-disabled)' }}>{i + 1}.</span>
              {r.name}
            </span>
            <span className="text-[12px] font-bold tabular-nums shrink-0" style={{ color: 'var(--text-primary)' }}>
              {fmtMoney(r.value)}
            </span>
          </div>
          <div className="h-2 w-full rounded-full overflow-hidden" style={{ background: 'var(--bg-subtle)' }}>
            <m.div
              className="h-full rounded-full"
              style={{ background: r.color }}
              initial={{ width: 0 }}
              animate={{ width: `${max > 0 ? Math.max((r.value / max) * 100, 1.5) : 0}%` }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: i * 0.05 }}
            />
          </div>
        </li>
      ))}
    </ol>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function InsightsRevenuePage() {
  return (
    <Guard role="admin">
      <RevenueAnalytics />
    </Guard>
  );
}

function RevenueAnalytics() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [from, setFrom] = useState(isoYearStart(currentYear));
  const [to, setTo] = useState(isoToday());

  const monthly = useAsync<MonthlyRow[]>(
    (signal) => http<MonthlyRow[]>(`/api/reports/monthly?year=${year}`, { signal }),
    [year],
  );
  const trainers = useAsync<TrainerRow[]>(
    (signal) => http<TrainerRow[]>('/api/reports/trainer-summary', { signal }),
    [],
  );
  const dues = useAsync<DuesRow[]>(
    (signal) => http<DuesRow[]>('/api/reports/dues', { signal }),
    [],
  );
  // The only source that honours the date pickers — which is why they exist.
  const range = useAsync<RangeTotals>(
    (signal) => http<RangeTotals>(`/api/reports/revenue?from=${from}&to=${to}`, { signal }),
    [from, to],
  );

  // Destructured so the exhaustive-deps rule can see these are the stable
  // refetch callbacks (useAsync memoises them with an empty dep array) rather
  // than fresh properties off a changing object.
  const { refetch: refetchMonthly } = monthly;
  const { refetch: refetchTrainers } = trainers;
  const { refetch: refetchDues } = dues;
  const { refetch: refetchRange } = range;

  const refreshAll = useCallback(async () => {
    await Promise.allSettled([refetchMonthly(), refetchTrainers(), refetchDues(), refetchRange()]);
  }, [refetchMonthly, refetchTrainers, refetchDues, refetchRange]);

  // ── Derived: months padded to a full year so the axis is stable ────────────
  const months = useMemo(() => {
    const rows = monthly.data ?? [];
    return MONTHS.map((label, i) => {
      const hit = rows.find((r) => num(r.month_num) === i + 1);
      return {
        month: label,
        revenue: hit ? num(hit.revenue) : 0,
        incentives: hit ? num(hit.incentives) : 0,
        payments: hit ? num(hit.payment_count) : 0,
      };
    });
  }, [monthly.data]);

  const yearRevenue = months.reduce((s, r) => s + r.revenue, 0);
  const yearIncentives = months.reduce((s, r) => s + r.incentives, 0);
  const yearPayments = months.reduce((s, r) => s + r.payments, 0);

  const thisMonthIdx = year === currentYear ? new Date().getMonth() : 11;
  const thisMonth = months[thisMonthIdx]?.revenue ?? 0;
  const prevMonth = thisMonthIdx > 0 ? months[thisMonthIdx - 1].revenue : 0;
  const momDelta = prevMonth > 0 ? ((thisMonth - prevMonth) / prevMonth) * 100 : undefined;

  const pendingTotal = (dues.data ?? []).reduce((s, d) => s + num(d.balance_amount), 0);

  // ── Derived: trainer share, top N + Other ─────────────────────────────────
  const trainerRanked = useMemo(() => {
    return [...(trainers.data ?? [])]
      .map((t) => ({ id: t.id, name: t.name, value: num(t.total_revenue) }))
      .filter((t) => t.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [trainers.data]);

  const donutData = useMemo(() => {
    const top = trainerRanked.slice(0, TOP_TRAINERS).map((t, i) => ({
      name: t.name, value: t.value, color: DONUT_SCALE[i],
    }));
    const rest = trainerRanked.slice(TOP_TRAINERS).reduce((s, t) => s + t.value, 0);
    // A 6th+ entity never gets an invented hue — it folds into one neutral bucket.
    return rest > 0
      ? [...top, { name: `Other (${trainerRanked.length - TOP_TRAINERS})`, value: rest, color: OTHER_COLOR }]
      : top;
  }, [trainerRanked]);

  const barRows = useMemo(
    () => trainerRanked.slice(0, 8).map((t, i) => ({
      ...t, color: i < TOP_TRAINERS ? DONUT_SCALE[i] : OTHER_COLOR,
    })),
    [trainerRanked],
  );
  const barMax = barRows[0]?.value ?? 0;

  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <AppShell>
      <PullToRefresh onRefresh={refreshAll}>
        <div className="mx-auto w-full max-w-7xl py-5 pb-24 lg:pb-10 space-y-4">

          {/* ── Title ───────────────────────────────────────────────────── */}
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <span
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
                style={{ background: 'var(--bg-subtle)', color: REVENUE_COLOR }}
              >
                <TrendingUp size={20} />
              </span>
              <div className="min-w-0">
                <h1 className="text-[19px] sm:text-[22px] font-extrabold tracking-tight truncate"
                  style={{ color: 'var(--text-primary)' }}>
                  Revenue Analytics
                </h1>
                <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  Collected revenue, incentives and trainer contribution
                </p>
              </div>
            </div>
            <button
              onClick={refreshAll}
              className="inline-flex items-center gap-1.5 rounded-full h-9 px-3.5 text-[12px] font-semibold transition active:scale-95"
              style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}
            >
              <RefreshCw size={13} className={monthly.loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </header>

          {/* ── Monthly target ──────────────────────────────────────────
              First, and deliberately so: it is the only element on this page
              that states an intention rather than reporting a fact, and it is
              what a studio owner opens this page to check. */}
          <MonthlyTargetHero onTargetSet={refreshAll} />

          {/* ── Filters: one row, above every chart ─────────────────────── */}
          <div
            className="flex flex-wrap items-end gap-3 rounded-2xl border p-3 sm:p-4"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
          >
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                Year
              </span>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="h-9 rounded-lg px-2.5 text-[13px] font-semibold outline-none border"
                style={{ background: 'var(--bg-subtle)', color: 'var(--text-primary)', borderColor: 'var(--border)' }}
              >
                {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </label>

            <div
              className="hidden sm:block self-stretch w-px mx-1"
              style={{ background: 'var(--border)' }}
              aria-hidden
            />

            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                Range from
              </span>
              <input
                type="date" value={from} max={to}
                onChange={(e) => setFrom(e.target.value)}
                className="h-9 rounded-lg px-2.5 text-[13px] font-semibold outline-none border"
                style={{ background: 'var(--bg-subtle)', color: 'var(--text-primary)', borderColor: 'var(--border)' }}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                to
              </span>
              <input
                type="date" value={to} min={from} max={isoToday()}
                onChange={(e) => setTo(e.target.value)}
                className="h-9 rounded-lg px-2.5 text-[13px] font-semibold outline-none border"
                style={{ background: 'var(--bg-subtle)', color: 'var(--text-primary)', borderColor: 'var(--border)' }}
              />
            </label>
            <p className="text-[11px] basis-full sm:basis-auto sm:ml-auto sm:self-center"
              style={{ color: 'var(--text-disabled)' }}>
              Year drives the monthly chart · range drives the range KPI
            </p>
          </div>

          {/* ── KPI row ─────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <KpiCard
              label={`${year} Revenue`}
              value={fmtCompact(yearRevenue)}
              hint={`${yearPayments.toLocaleString('en-IN')} payments`}
              icon={<Wallet size={16} />}
              accent="blue"
              loading={monthly.loading && !monthly.data}
            />
            <KpiCard
              label="This Month"
              value={fmtCompact(thisMonth)}
              delta={momDelta}
              hint="vs previous month"
              icon={<TrendingUp size={16} />}
              accent="emerald"
              loading={monthly.loading && !monthly.data}
            />
            <KpiCard
              label="Incentives Paid"
              value={fmtCompact(yearIncentives)}
              hint={yearRevenue > 0 ? `${((yearIncentives / yearRevenue) * 100).toFixed(0)}% of revenue` : undefined}
              icon={<Percent size={16} />}
              accent="amber"
              loading={monthly.loading && !monthly.data}
            />
            <KpiCard
              label="Pending Collections"
              value={fmtCompact(pendingTotal)}
              hint={`${(dues.data ?? []).length} client${(dues.data ?? []).length === 1 ? '' : 's'}`}
              icon={<Receipt size={16} />}
              accent="coral"
              href="/finance/dues"
              loading={dues.loading && !dues.data}
            />
            <KpiCard
              label="Selected Range"
              value={fmtCompact(num(range.data?.total))}
              hint={`${num(range.data?.count).toLocaleString('en-IN')} payments`}
              icon={<CalendarRange size={16} />}
              accent="cyan"
              loading={range.loading && !range.data}
              className="col-span-2 lg:col-span-1"
            />
          </div>

          {/* ── Monthly bar chart (2 series → legend required) ──────────── */}
          <Panel
            title={`Monthly Revenue — ${year}`}
            subtitle={`${fmtMoney(yearRevenue)} collected across ${yearPayments.toLocaleString('en-IN')} payments`}
            icon={<BarChart3 size={15} />}
            action={<Legend items={[
              { label: 'Revenue', color: REVENUE_COLOR },
              { label: 'Incentives', color: INCENTIVE_COLOR },
            ]} />}
          >
            {monthly.loading && !monthly.data ? (
              <ChartSkeleton height={260} />
            ) : monthly.error ? (
              <LoadError what="monthly revenue" onRetry={monthly.refetch} />
            ) : yearRevenue === 0 && yearIncentives === 0 ? (
              <EmptyState
                icon={<BarChart3 size={22} />}
                title={`No revenue recorded in ${year}`}
                description="Payments collected in this year will appear here."
              />
            ) : (
              <PremiumBarChart
                data={months as unknown as Record<string, unknown>[]}
                xKey="month"
                bars={[
                  { key: 'revenue', label: 'Revenue', color: REVENUE_COLOR },
                  { key: 'incentives', label: 'Incentives', color: INCENTIVE_COLOR },
                ]}
                height={260}
                formatValue={fmtCompact}
              />
            )}
          </Panel>

          {/* ── Donut + ranked bars ─────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Panel
              title="Revenue Share"
              subtitle={trainerRanked.length > 0 ? `${trainerRanked.length} contributing trainers` : undefined}
              icon={<Trophy size={15} />}
            >
              {trainers.loading && !trainers.data ? (
                <ChartSkeleton height={240} />
              ) : trainers.error ? (
                <LoadError what="trainer revenue" onRetry={trainers.refetch} />
              ) : donutData.length === 0 ? (
                <EmptyState
                  icon={<Trophy size={22} />}
                  title="No trainer revenue yet"
                  description="Revenue attributed to trainers will break down here."
                />
              ) : (
                <DonutChart
                  data={donutData}
                  centerLabel="Total"
                  centerValue={fmtCompact(donutData.reduce((s, d) => s + d.value, 0))}
                  valueFormatter={fmtMoney}
                  height={260}
                />
              )}
            </Panel>

            <Panel
              title="Revenue by Trainer"
              subtitle="All-time collected, highest first"
              icon={<BarChart3 size={15} />}
            >
              {trainers.loading && !trainers.data ? (
                <ChartSkeleton height={240} />
              ) : trainers.error ? (
                <LoadError what="trainer revenue" onRetry={trainers.refetch} />
              ) : barRows.length === 0 ? (
                <EmptyState
                  icon={<BarChart3 size={22} />}
                  title="No trainer revenue yet"
                  description="Once payments are attributed to trainers they rank here."
                />
              ) : (
                <RankedBars rows={barRows} max={barMax} />
              )}
            </Panel>
          </div>

          {/* ── Table view — the accessible equivalent of the charts above ─ */}
          <Panel
            title="Monthly Breakdown"
            subtitle="Same figures as the chart, in tabular form"
            icon={<Receipt size={15} />}
          >
            <div className="overflow-x-auto -mx-4 sm:-mx-5 px-4 sm:px-5">
              <table className="w-full border-collapse text-[12.5px]" style={{ minWidth: 480 }}>
                <caption className="sr-only">
                  Monthly collected revenue, incentives and payment counts for {year}
                </caption>
                <thead>
                  <tr style={{ color: 'var(--text-muted)' }}>
                    {['Month', 'Payments', 'Revenue', 'Incentives', 'Net'].map((h, i) => (
                      <th
                        key={h} scope="col"
                        className={`py-2 px-2 font-bold text-[10px] uppercase tracking-wider ${i === 0 ? 'text-left' : 'text-right'}`}
                        style={{ borderBottom: '1px solid var(--border)' }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {months.map((r) => {
                    const empty = r.revenue === 0 && r.incentives === 0;
                    return (
                      <tr key={r.month} style={{ opacity: empty ? 0.45 : 1 }}>
                        <th scope="row" className="py-2 px-2 text-left font-semibold"
                          style={{ color: 'var(--text-primary)', borderBottom: '1px solid var(--border)' }}>
                          {r.month}
                        </th>
                        <td className="py-2 px-2 text-right tabular-nums"
                          style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>
                          {r.payments || '—'}
                        </td>
                        <td className="py-2 px-2 text-right tabular-nums font-semibold"
                          style={{ color: 'var(--text-primary)', borderBottom: '1px solid var(--border)' }}>
                          {empty ? '—' : fmtMoney(r.revenue)}
                        </td>
                        <td className="py-2 px-2 text-right tabular-nums"
                          style={{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)' }}>
                          {r.incentives ? fmtMoney(r.incentives) : '—'}
                        </td>
                        <td className="py-2 px-2 text-right tabular-nums font-semibold"
                          style={{ color: 'var(--text-primary)', borderBottom: '1px solid var(--border)' }}>
                          {empty ? '—' : fmtMoney(r.revenue - r.incentives)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ color: 'var(--text-primary)' }}>
                    <th scope="row" className="py-2.5 px-2 text-left font-extrabold">Total</th>
                    <td className="py-2.5 px-2 text-right tabular-nums font-bold">{yearPayments || '—'}</td>
                    <td className="py-2.5 px-2 text-right tabular-nums font-extrabold">{fmtMoney(yearRevenue)}</td>
                    <td className="py-2.5 px-2 text-right tabular-nums font-bold">{fmtMoney(yearIncentives)}</td>
                    <td className="py-2.5 px-2 text-right tabular-nums font-extrabold">
                      {fmtMoney(yearRevenue - yearIncentives)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Panel>
        </div>
      </PullToRefresh>
    </AppShell>
  );
}
