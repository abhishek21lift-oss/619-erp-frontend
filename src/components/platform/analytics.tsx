'use client';

// Platform Analytics — is the product being USED?
//
// Deliberately not a second billing dashboard. Finance already answers MRR,
// ARPU, plan mix and cash collected; showing any of that here would give an
// operator two numbers for one question and no way to tell which is right.
// This panel answers what money cannot: are studios working inside the
// product, and which ones stopped.
//
// ── Why small multiples rather than one chart ────────────────────────────
//
// The five trend metrics have wildly different scales — a handful of studios
// against hundreds of check-ins. Plotting them on one axis flattens the small
// series into the baseline; plotting them on two axes is the single most
// misleading thing a chart can do, because the crossover point is an artefact
// of the scales chosen. So each metric gets its own panel and its own scale,
// and the shared x-axis is what makes them comparable.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { m } from 'framer-motion';
import {
  Loader2, TrendingUp, AlertTriangle, Trophy, Users, Activity,
  CalendarDays, ScanFace, Building2, RefreshCw,
} from 'lucide-react';
import { api } from '@/lib/api';
import type {
  PlatformAnalytics, AnalyticsTrendPoint, AnalyticsCohort,
} from '@/lib/api';
import { Panel, SectionLabel, StatTile, Reveal } from './console';
import { EmptyState } from '@/components/ui';

/* ── Formatting ──────────────────────────────────────────────────────────── */

const nf = (n: number) => n.toLocaleString('en-IN');

function fmtWhen(d?: string | null): string {
  if (!d) return 'never';
  const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
  if (days < 1) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return months < 12 ? `${months}mo ago` : `${Math.floor(months / 12)}y ago`;
}

/* ── Sparkline ───────────────────────────────────────────────────────────── */

/**
 * One metric over the window. Its own y-scale, always anchored at zero so the
 * height of the line means the value rather than its distance from an
 * arbitrary floor.
 *
 * Hover is on by default: an HTML chart that cannot tell you which month a
 * point is has thrown away the only thing it had over a number.
 */
function Sparkline({ points, label, icon, total }: {
  points: { label: string; value: number }[];
  label: string;
  icon: React.ReactNode;
  total: number;
}) {
  const [hover, setHover] = useState<number | null>(null);

  const W = 100;
  const H = 30;
  const max = Math.max(1, ...points.map((p) => p.value));
  const step = points.length > 1 ? W / (points.length - 1) : W;

  const xy = points.map((p, i) => ({
    x: points.length > 1 ? i * step : W / 2,
    y: H - (p.value / max) * (H - 3) - 1.5,
  }));

  const line = xy.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
  const area = xy.length
    ? `${line} L${xy[xy.length - 1].x.toFixed(2)},${H} L${xy[0].x.toFixed(2)},${H} Z`
    : '';

  const active = hover !== null ? points[hover] : null;

  return (
    <Panel className="h-full">
      <div className="mb-1.5 flex items-center gap-2">
        <span style={{ color: 'var(--text-muted)' }}>{icon}</span>
        <span
          className="text-[10px] font-[750] uppercase"
          style={{ color: 'var(--text-muted)', letterSpacing: '0.13em' }}
        >
          {label}
        </span>
      </div>

      {/* The headline reads the hovered month when there is one, the window
          total otherwise — so the number and the mark never disagree. */}
      <p
        className="tabular-nums text-[20px]"
        style={{ color: 'var(--text-primary)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1 }}
      >
        {nf(active ? active.value : total)}
      </p>
      <p className="mb-2 h-[14px] text-[10.5px]" style={{ color: 'var(--text-disabled)' }}>
        {active ? active.label : `across ${points.length} months`}
      </p>

      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none"
          className="h-[38px] w-full overflow-visible"
          role="img" aria-label={`${label}: ${nf(total)} across ${points.length} months`}
          onMouseLeave={() => setHover(null)}
        >
          <path d={area} fill="color-mix(in srgb, var(--brand) 14%, transparent)" />
          {/* vectorEffect keeps the stroke 2px after the non-uniform scale that
              preserveAspectRatio="none" applies — without it the line thins to
              a hairline on a wide panel. */}
          <path
            d={line} fill="none" stroke="var(--brand)" strokeWidth={2}
            strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"
          />
          {hover !== null && (
            <circle
              cx={xy[hover].x} cy={xy[hover].y} r={3}
              fill="var(--brand)" stroke="var(--bg-elevated)" strokeWidth={2}
              vectorEffect="non-scaling-stroke"
            />
          )}
          {/* Invisible hit bands, one per month. Far bigger than the marks —
              a 2px line is not a pointer target. */}
          {points.map((p, i) => (
            <rect
              key={p.label}
              x={i * step - step / 2} y={0} width={step} height={H}
              fill="transparent" onMouseEnter={() => setHover(i)}
            />
          ))}
        </svg>
      </div>
    </Panel>
  );
}

/* ── Retention cohorts ───────────────────────────────────────────────────── */

/**
 * Rows are signup months, columns are months since. A single hue, light to
 * dark — this is a magnitude scale, and a rainbow here would invent
 * categories that do not exist.
 */
function CohortGrid({ cohorts }: { cohorts: AnalyticsCohort[] }) {
  const width = useMemo(() => {
    let max = 0;
    for (const c of cohorts) {
      for (const k of Object.keys(c.retention)) max = Math.max(max, Number(k));
    }
    return max + 1;
  }, [cohorts]);

  if (!cohorts.length) {
    return (
      <Panel>
        <EmptyState icon={<CalendarDays size={20} />} title="No cohorts yet"
          description="Retention appears once studios have been on the platform for a full month." />
      </Panel>
    );
  }

  return (
    <Panel padded={false}>
      {/* The grid can outgrow a phone, so it scrolls inside its own box
          rather than pushing the page sideways. */}
      <div className="overflow-x-auto p-3.5 sm:p-5">
        <table className="w-full border-separate" style={{ borderSpacing: '3px' }}>
          <thead>
            <tr>
              <th className="text-left text-[10px] font-[750] uppercase"
                style={{ color: 'var(--text-muted)', letterSpacing: '0.12em' }}>
                Joined
              </th>
              <th className="px-1 text-right text-[10px] font-[750] uppercase"
                style={{ color: 'var(--text-muted)', letterSpacing: '0.12em' }}>
                Size
              </th>
              {Array.from({ length: width }, (_, i) => (
                <th key={i} className="min-w-[38px] text-center text-[10px] font-[700] tabular-nums"
                  style={{ color: 'var(--text-disabled)' }}>
                  M{i}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cohorts.map((c) => (
              <tr key={c.label}>
                <td className="whitespace-nowrap pr-2 text-[11.5px] font-[650]"
                  style={{ color: 'var(--text-primary)' }}>
                  {c.label}
                </td>
                <td className="px-1 text-right text-[11.5px] tabular-nums" style={{ color: 'var(--text-muted)' }}>
                  {c.size}
                </td>
                {Array.from({ length: width }, (_, i) => {
                  const n = c.retention[String(i)] ?? 0;
                  const pct = c.size > 0 ? n / c.size : 0;
                  const empty = n === 0;
                  return (
                    <td key={i} className="p-0">
                      <div
                        className="flex h-[30px] items-center justify-center rounded-[6px] text-[11px] font-[700] tabular-nums"
                        title={`${c.label} · month ${i}: ${n} of ${c.size} studios active`}
                        style={{
                          background: empty
                            ? 'var(--bg-subtle)'
                            : `color-mix(in srgb, var(--brand) ${Math.round(14 + pct * 72)}%, transparent)`,
                          // Above roughly half saturation the brand fill is
                          // dark enough that body ink stops passing contrast.
                          color: empty ? 'var(--text-disabled)' : pct > 0.55 ? '#fff' : 'var(--text-primary)',
                        }}
                      >
                        {empty ? '·' : `${Math.round(pct * 100)}%`}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

/* ── Feature adoption ────────────────────────────────────────────────────── */

const ADOPTION_LABEL: Record<string, string> = {
  sessions: 'Sessions booked',
  clients: 'Clients onboarded',
  attendance: 'Attendance marked',
  ai_suite: 'AI Suite used',
};

function AdoptionBars({ rows, live }: {
  rows: PlatformAnalytics['adoption']; live: number;
}) {
  return (
    <Panel>
      <div className="flex flex-col gap-3.5">
        {rows.map((r) => (
          <div key={r.key}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3">
              <span className="text-[12px] font-[650]" style={{ color: 'var(--text-primary)' }}>
                {ADOPTION_LABEL[r.key] ?? r.key}
              </span>
              <span className="shrink-0 text-[11px] tabular-nums" style={{ color: 'var(--text-muted)' }}>
                {r.studios} of {live} · {r.pct}%
              </span>
            </div>
            <div className="h-[7px] w-full overflow-hidden rounded-full" style={{ background: 'var(--bg-subtle)' }}>
              <m.div
                className="h-full rounded-full"
                style={{ background: 'var(--brand)' }}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, r.pct)}%` }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

/* ── Panel ───────────────────────────────────────────────────────────────── */

const WINDOWS = [6, 12, 24];

export default function AnalyticsPanel() {
  const [data, setData] = useState<PlatformAnalytics | null>(null);
  const [months, setMonths] = useState(12);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback((m: number) => {
    setLoading(true);
    setError(null);
    api.superAdmin.analytics(m)
      .then((r) => setData(r.data))
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load analytics'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(months); }, [load, months]);

  const totals = useMemo(() => {
    const t = data?.trend ?? [];
    const sum = (k: keyof AnalyticsTrendPoint) => t.reduce((a, p) => a + Number(p[k] ?? 0), 0);
    return {
      sessions: sum('sessions'),
      clients: sum('clients_added'),
      checkIns: sum('check_ins'),
      joined: sum('studios_joined'),
      // Not a sum: a studio active in three months would be counted three
      // times. The latest month is the honest "right now" figure.
      activeNow: t.length ? Number(t[t.length - 1].active_studios) : 0,
    };
  }, [data]);

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center gap-2.5 py-16">
        <Loader2 size={22} className="animate-spin" style={{ color: 'var(--brand)' }} />
        <p className="text-[12.5px]" style={{ color: 'var(--text-muted)' }}>Crunching platform usage…</p>
      </div>
    );
  }

  if (error) {
    return (
      <Panel>
        <EmptyState icon={<AlertTriangle size={20} />} title="Could not load analytics" description={error} />
      </Panel>
    );
  }
  if (!data) return null;

  const live = data.studios.live;
  const engagedPct = live > 0 ? Math.round((totals.activeNow / live) * 100) : 0;

  return (
    <div className="flex flex-col gap-6">
      {/* ── Window picker ── */}
      <div className="flex items-center justify-between gap-3">
        <SectionLabel hint={`${data.studios.live} live · ${data.studios.total} total`}>
          Product usage
        </SectionLabel>
        <div className="flex items-center gap-1.5">
          {WINDOWS.map((w) => (
            <button
              key={w}
              onClick={() => setMonths(w)}
              className="rounded-[8px] px-2.5 py-1 text-[11px] font-[700] transition-colors"
              style={{
                background: months === w ? 'var(--brand)' : 'var(--bg-subtle)',
                color: months === w ? '#fff' : 'var(--text-muted)',
                border: '1px solid var(--border)',
              }}
            >
              {w}m
            </button>
          ))}
          <button
            onClick={() => load(months)} aria-label="Refresh analytics"
            className="rounded-[8px] p-1.5 transition-colors"
            style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : undefined} />
          </button>
        </div>
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Active studios" value={totals.activeNow} icon={<Activity size={15} />} tone="brand"
          sub={`${engagedPct}% of ${live} live studios worked this month`} delay={0}
        />
        <StatTile
          label="At risk" value={data.at_risk.length} icon={<AlertTriangle size={15} />}
          tone={data.at_risk.length > 0 ? 'caution' : 'positive'}
          sub="Paying, but nothing done in 30 days" delay={0.04}
        />
        <StatTile
          label="Clients added" value={nf(totals.clients)} icon={<Users size={15} />} tone="positive"
          sub={`Across the last ${data.months} months`} delay={0.08}
        />
        <StatTile
          label="Studios joined" value={nf(totals.joined)} icon={<Building2 size={15} />} tone="brand"
          sub={`Across the last ${data.months} months`} delay={0.12}
        />
      </div>

      {/* ── Trend, as small multiples ── */}
      <div>
        <SectionLabel hint="Each panel has its own scale">Engagement trend</SectionLabel>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {([
            { key: 'active_studios', label: 'Active studios', icon: <Activity size={13} />, total: totals.activeNow },
            { key: 'clients_added', label: 'Clients added', icon: <Users size={13} />, total: totals.clients },
            { key: 'check_ins', label: 'Check-ins', icon: <ScanFace size={13} />, total: totals.checkIns },
            { key: 'sessions', label: 'Sessions', icon: <CalendarDays size={13} />, total: totals.sessions },
          ] as const).map((s, i) => (
            <Reveal key={s.key} delay={0.04 * i}>
              <Sparkline
                label={s.label} icon={s.icon} total={s.total}
                points={data.trend.map((p) => ({ label: p.label, value: Number(p[s.key] ?? 0) }))}
              />
            </Reveal>
          ))}
        </div>
      </div>

      {/* ── Adoption ── */}
      <div>
        <SectionLabel hint="Studios that used it in the last 30 days">Feature adoption</SectionLabel>
        <Reveal><AdoptionBars rows={data.adoption} live={live} /></Reveal>
      </div>

      {/* ── Cohorts ── */}
      <div>
        <SectionLabel hint="Share of each signup cohort still doing real work">
          Retention by cohort
        </SectionLabel>
        <Reveal><CohortGrid cohorts={data.cohorts} /></Reveal>
      </div>

      {/* ── At risk ── */}
      <div>
        <SectionLabel hint="Paying, but no sessions, clients or check-ins in 30 days">
          Needs attention
        </SectionLabel>
        <Reveal>
          <Panel padded={false}>
            {data.at_risk.length === 0 ? (
              <div className="p-5">
                <EmptyState icon={<TrendingUp size={20} />} title="Every paying studio is active"
                  description="No subscribed studio has gone quiet in the last 30 days." />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-left">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      {['Studio', 'Plan', 'Active clients', 'Last login'].map((h) => (
                        <th key={h} className="px-4 py-2.5 text-[10px] font-[750] uppercase"
                          style={{ color: 'var(--text-muted)', letterSpacing: '0.12em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.at_risk.map((s) => (
                      <tr key={s.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td className="px-4 py-3 text-[12.5px] font-[650]" style={{ color: 'var(--text-primary)' }}>
                          {s.name}
                        </td>
                        <td className="px-4 py-3 text-[12px]" style={{ color: 'var(--text-muted)' }}>
                          {s.plan_code ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-[12px] tabular-nums" style={{ color: 'var(--text-muted)' }}>
                          {s.active_clients}
                        </td>
                        <td className="px-4 py-3 text-[12px]" style={{ color: 'var(--text-muted)' }}>
                          {fmtWhen(s.last_login)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </Reveal>
      </div>

      {/* ── Leaderboard ── */}
      <div>
        <SectionLabel hint="Last 30 days">Most active studios</SectionLabel>
        <Reveal>
          <Panel padded={false}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['', 'Studio', 'Sessions', 'Check-ins', 'Active clients'].map((h, i) => (
                      <th key={i} className="px-4 py-2.5 text-[10px] font-[750] uppercase"
                        style={{ color: 'var(--text-muted)', letterSpacing: '0.12em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.leaderboard.map((s, i) => (
                    <tr key={s.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td className="w-8 px-4 py-3">
                        {i < 3
                          ? <Trophy size={13} style={{ color: ['#f59e0b', '#94a3b8', '#b45309'][i] }} />
                          : <span className="text-[11px] tabular-nums" style={{ color: 'var(--text-disabled)' }}>{i + 1}</span>}
                      </td>
                      <td className="px-4 py-3 text-[12.5px] font-[650]" style={{ color: 'var(--text-primary)' }}>
                        {s.name}
                      </td>
                      <td className="px-4 py-3 text-[12px] tabular-nums" style={{ color: 'var(--text-muted)' }}>
                        {nf(s.sessions_30d)}
                      </td>
                      <td className="px-4 py-3 text-[12px] tabular-nums" style={{ color: 'var(--text-muted)' }}>
                        {nf(s.check_ins_30d)}
                      </td>
                      <td className="px-4 py-3 text-[12px] tabular-nums" style={{ color: 'var(--text-muted)' }}>
                        {nf(s.active_clients)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </Reveal>
      </div>
    </div>
  );
}
