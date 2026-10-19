'use client';
/**
 * Member — Progress.
 *
 * Weight over time and the studio's body measurements. Two sources feed
 * /api/me/measurements: what the trainer measured at the studio, and the
 * weight the member gave in each weekly check-in. Only trainer rows carry
 * body sizes, and a trainer row may carry sizes with no weight — so the
 * chart takes rows WITH a weight, and the measurements table rows WITH a size.
 *
 * Nothing is estimated or interpolated: a member with one reading sees one
 * reading, and a member with none is told how to get their first.
 */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Activity, CalendarClock, Camera, ChevronRight, ClipboardCheck, LineChart, Ruler,
  TrendingDown, TrendingUp,
} from 'lucide-react';
import Guard from '@/components/Guard';
import MemberShell from '@/components/member/MemberShell';
import {
  Card, EmptyState, LoadError, MC, PageSkeleton, PageTitle, Section, Stat, longDate,
} from '@/components/member/MemberUI';
import WeightChart, { type WeightPoint } from '@/components/member/WeightChart';
import { api } from '@/lib/api';
import type { MeMeasurement, ProgressComparison, ProgressRetestOverview } from '@/lib/api';

export default function MemberProgressPage() {
  return (
    <Guard role="member">
      <MemberShell>
        <ProgressBody />
      </MemberShell>
    </Guard>
  );
}

const BODY: { key: keyof MeMeasurement; label: string; unit: string }[] = [
  { key: 'waist_cm', label: 'Waist', unit: 'cm' },
  { key: 'chest_cm', label: 'Chest', unit: 'cm' },
  { key: 'hip_cm', label: 'Hips', unit: 'cm' },
  { key: 'arms_cm', label: 'Arms', unit: 'cm' },
  { key: 'thighs_cm', label: 'Thighs', unit: 'cm' },
  { key: 'shoulders_cm', label: 'Shoulders', unit: 'cm' },
  { key: 'body_fat_pct', label: 'Body fat', unit: '%' },
];

const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const fmt = (n: number) => String(Math.round(n * 10) / 10);
const day = (v: string) => String(v).slice(0, 10);

function ProgressBody() {
  const [rows, setRows] = useState<MeMeasurement[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    api.me.measurements().then((r) => setRows(r.data)).catch(() => setFailed(true));
  }, []);

  const weights = useMemo<WeightPoint[]>(() => {
    if (!rows) return [];
    // One point per day; a studio measurement beats a check-in on the same day.
    const byDay = new Map<string, WeightPoint>();
    for (const r of rows) {
      const kg = num(r.weight_kg);
      if (kg === null || !r.measured_at) continue;
      const d = day(r.measured_at);
      const source = r.source === 'trainer' ? 'trainer' : 'checkin';
      const prev = byDay.get(d);
      if (!prev || (prev.source === 'checkin' && source === 'trainer')) byDay.set(d, { date: d, kg, source });
    }
    return [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date));
  }, [rows]);

  const body = useMemo(() => (rows ?? [])
    .filter((r) => BODY.some((b) => num(r[b.key]) !== null))
    .sort((a, b) => day(a.measured_at).localeCompare(day(b.measured_at))), [rows]);

  const title = <PageTitle accent="progress" icon={<LineChart size={20} />} title="Progress" sub="Weight and body measurements" />;
  if (failed) return <>{title}<LoadError what="progress" /></>;
  if (!rows) return <PageSkeleton />;

  const first = weights[0];
  const latest = weights[weights.length - 1];
  const delta = latest && first && weights.length > 1 ? latest.kg - first.kg : null;
  const hasReadings = weights.length > 0 || body.length > 0;

  return (
    <>
      {title}

      <AssessmentProgress />

      {!hasReadings && (
        <>
          <EmptyState icon={<Ruler size={18} />} title="No readings yet"
            body="Add your weight to this week's check-in, or ask your trainer to take your measurements — your progress starts here." />
          <Link href="/member/checkin"
            className="mt-3 flex h-12 w-full items-center justify-center rounded-[13px] text-[14px] font-[750] text-white"
            style={{ background: MC.primary }}>
            Add this week's weight
          </Link>
        </>
      )}

      {weights.length > 0 && (
        <>
          <div className="mb-4 grid grid-cols-3 gap-2">
            <Stat label="Now" value={`${fmt(latest.kg)} kg`} />
            <Stat label="Start" value={`${fmt(first.kg)} kg`} />
            <Stat label="Change"
              value={delta === null ? '—' : `${delta > 0 ? '+' : delta < 0 ? '−' : ''}${fmt(Math.abs(delta))} kg`} />
          </div>

          <Section title="Weight"
            aside={delta !== null && delta !== 0 ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-[700]" style={{ color: MC.muted }}>
                {delta < 0 ? <TrendingDown size={12} aria-hidden /> : <TrendingUp size={12} aria-hidden />}
                since {longDate(first.date)}
              </span>
            ) : null}>
            <Card className="px-2 pb-1 pt-3">
              {weights.length > 1 ? <WeightChart points={weights} /> : (
                <p className="px-3 pb-3 text-[12.5px]" style={{ color: MC.muted }}>
                  One reading so far ({fmt(latest.kg)} kg on {longDate(latest.date)}). The trend appears with your next one.
                </p>
              )}
            </Card>
          </Section>

          <Section title="Weight log">
            <Card>
              {[...weights].reverse().slice(0, 12).map((p, i, arr) => (
                <div key={p.date} className="flex items-center justify-between gap-3 px-4 py-2.5"
                  style={i === arr.length - 1 ? undefined : { borderBottom: '1px solid var(--border)' }}>
                  <span className="text-[12.5px] font-[650]" style={{ color: MC.ink }}>{longDate(p.date)}</span>
                  <span className="flex items-center gap-2">
                    <span className="text-[11px]" style={{ color: MC.muted }}>
                      {p.source === 'trainer' ? 'Studio' : 'Check-in'}
                    </span>
                    <span className="w-[64px] text-right text-[13px] font-[780] tabular-nums" style={{ color: MC.ink }}>
                      {fmt(p.kg)} kg
                    </span>
                  </span>
                </div>
              ))}
            </Card>
          </Section>
        </>
      )}

      <BodyMeasurements rows={body} />
      <PhotosLink />
    </>
  );
}

/** The re-test countdown and the seven-domain change, in the member's words. */
function AssessmentProgress() {
  const [retest, setRetest] = useState<ProgressRetestOverview | null>(null);
  const [comparison, setComparison] = useState<ProgressComparison | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState({ retest: false, comparison: false });

  useEffect(() => {
    let live = true;
    Promise.allSettled([api.me.retest(), api.me.comparison()]).then(([r, c]) => {
      if (!live) return;
      if (r.status === 'fulfilled') setRetest(r.value.data);
      if (c.status === 'fulfilled') setComparison(c.value.data);
      setFailed({ retest: r.status === 'rejected', comparison: c.status === 'rejected' });
      setLoading(false);
    });
    return () => { live = false; };
  }, []);

  if (loading) {
    return (
      <Section title="Fitness assessment">
        <Card className="flex items-center gap-2 p-4 text-[12px]">
          <Activity size={16} className="animate-pulse" /> Loading your next test…
        </Card>
      </Section>
    );
  }

  if (failed.retest && failed.comparison) {
    return (
      <>
        <Section title="Fitness assessment">
          <LoadError what="assessment progress" />
        </Section>
        <JournalLink />
      </>
    );
  }

  const state = retest?.state.state;
  const days = retest?.state.days_until;
  const schedule = retest?.schedule;
  const summary = comparison?.summary;

  return (
    <>
      <Section title="Fitness assessment"
        aside={<Link href="/member/coach" className="text-[11.5px] font-[720]" style={{ color: MC.primary }}>Ask your trainer</Link>}>
        <Card className="overflow-hidden p-0">
          <div className="p-4" style={{ background: 'linear-gradient(135deg, rgba(0,103,224,0.09), rgba(16,185,129,0.07))' }}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10.5px] font-[760] uppercase tracking-[0.08em]" style={{ color: MC.muted }}>Next re-test</p>
                <p className="mt-1 text-[22px] font-[840] tracking-[-0.03em] tabular-nums" style={{ color: MC.ink }}>
                  {failed.retest ? 'Unavailable' : schedule ? longDate(schedule.scheduled_date) : 'Not scheduled'}
                </p>
                <p className="mt-0.5 text-[12px]" style={{ color: MC.muted }}>
                  {failed.retest
                    ? 'We could not load your next test. Refresh the page to try again.'
                    : state === 'missing_baseline'
                    ? 'Your first seven-step assessment is the baseline for everything that follows.'
                    : days == null || !schedule
                      ? retest?.prompt || 'Your trainer will schedule the next one from your latest result.'
                      : days === 0
                        ? 'Due today'
                        : days > 0
                          ? `In ${days} day${days === 1 ? '' : 's'}`
                          : `${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} past due`}
                </p>
              </div>
              <span className="grid h-10 w-10 place-items-center rounded-[12px] bg-white/60"
                style={{ color: MC.primary }}>
                <CalendarClock size={19} />
              </span>
            </div>
          </div>
          {comparison && summary && (
            <div className="border-t px-4 py-3" style={{ borderColor: 'var(--border)' }}>
              <p className="text-[11px] font-[720]" style={{ color: MC.muted }}>
                Since your {longDate(comparison.baseline?.assessment_date as string | undefined) ?? 'baseline'} test
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className="rounded-full px-2.5 py-1 text-[10.5px] font-[740]"
                  style={{ background: 'rgba(16,185,129,0.10)', color: '#047857' }}>{summary.improved ?? 0} improved</span>
                <span className="rounded-full px-2.5 py-1 text-[10.5px] font-[740]"
                  style={{ background: 'rgba(239,68,68,0.09)', color: '#b91c1c' }}>{summary.declined ?? 0} declined</span>
                <span className="rounded-full px-2.5 py-1 text-[10.5px] font-[740]"
                  style={{ background: 'var(--bg-subtle)', color: MC.muted }}>{summary.unchanged ?? 0} unchanged</span>
                {(summary.incomparable ?? 0) > 0 && (
                  <span className="rounded-full px-2.5 py-1 text-[10.5px] font-[740]"
                    style={{ background: 'rgba(245,158,11,0.10)', color: '#92400e' }}>{summary.incomparable} not comparable</span>
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                {comparison.domains.map((d) => {
                  const improved = d.metrics.filter((m) => m.outcome === 'improved').length;
                  const declined = d.metrics.filter((m) => m.outcome === 'declined').length;
                  return (
                    <span key={d.key} className="text-[10.5px]" style={{ color: MC.muted }}>
                      {d.label}: {!d.comparable ? 'protocol changed' : `${improved} up, ${declined} down`}
                    </span>
                  );
                })}
              </div>
              <p className="mt-2 text-[10.5px]" style={{ color: MC.muted }}>
                A missing or changed test is shown as “not comparable”, never as a zero.
              </p>
            </div>
          )}
          {failed.comparison && (
            <p className="border-t px-4 py-3 text-[11.5px]" style={{ borderColor: 'var(--border)', color: MC.muted }}>
              The comparison could not be loaded right now. Your next test is still shown above.
            </p>
          )}
        </Card>
      </Section>

      <JournalLink />
    </>
  );
}

/** The journal is its own feature: a failed assessment call must not hide it. */
function JournalLink() {
  return (
    <Link href="/member/habits" className="mb-4 flex items-center gap-3 rounded-[16px] p-4 transition-colors hover:bg-[var(--bg-subtle)]"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px]"
        style={{ background: 'var(--bg-subtle)', color: MC.primary }}>
        <ClipboardCheck size={18} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-[750]" style={{ color: MC.ink }}>Daily journal</span>
        <span className="block text-[12px]" style={{ color: MC.muted }}>Sleep, steps, water and recovery</span>
      </span>
      <ChevronRight size={16} aria-hidden style={{ color: MC.muted }} />
    </Link>
  );
}

/** Photos tell the part of the story a tape measure cannot. */
function PhotosLink() {
  return (
    <Link href="/member/photos" className="mb-2 flex items-center gap-3 rounded-[16px] p-4 transition-colors hover:bg-[var(--bg-subtle)]"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px]"
        style={{ background: 'var(--bg-subtle)', color: MC.primary }}>
        <Camera size={18} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-[750]" style={{ color: MC.ink }}>Progress photos</span>
        <span className="block text-[12px]" style={{ color: MC.muted }}>Before and after, side by side</span>
      </span>
      <ChevronRight size={16} aria-hidden style={{ color: MC.muted }} />
    </Link>
  );
}

function BodyMeasurements({ rows }: { rows: MeMeasurement[] }) {
  if (rows.length === 0) {
    return (
      <Section title="Body measurements">
        <EmptyState icon={<Ruler size={18} />} title="Not measured yet"
          body="Waist, chest, hips and the rest appear here after your trainer measures you at the studio." />
      </Section>
    );
  }
  const latest = rows[rows.length - 1];
  const first = rows[0];
  const cols = BODY.filter((b) => rows.some((r) => num(r[b.key]) !== null));

  return (
    <>
      <Section title="Body measurements" aside={
        <span className="text-[11px] font-[650]" style={{ color: MC.muted }}>Latest {longDate(latest.measured_at)}</span>
      }>
        <div className="grid grid-cols-3 gap-2">
          {cols.map((b) => {
            const now = num(latest[b.key]);
            const was = num(first[b.key]);
            const change = rows.length > 1 && now !== null && was !== null ? now - was : null;
            return (
              <div key={b.key}>
                <Stat label={b.label} value={now === null ? '—' : `${fmt(now)} ${b.unit}`} />
                {change !== null && change !== 0 && (
                  <p className="mt-1 px-1 text-[10.5px] font-[650] tabular-nums" style={{ color: MC.muted }}>
                    {change > 0 ? '+' : '−'}{fmt(Math.abs(change))} {b.unit} since start
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </Section>

      {rows.length > 1 && (
        <Section title="Measurement history">
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px] text-[12px]">
                <caption className="sr-only">Body measurements by date</caption>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th scope="col" className="px-3 py-2 text-left font-[700]" style={{ color: MC.muted }}>Date</th>
                    {cols.map((b) => (
                      <th key={b.key} scope="col" className="px-2 py-2 text-right font-[700]" style={{ color: MC.muted }}>
                        {b.label} <span className="font-[500]">({b.unit})</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...rows].reverse().map((r, i, arr) => (
                    <tr key={`${r.measured_at}-${i}`} style={i === arr.length - 1 ? undefined : { borderBottom: '1px solid var(--border)' }}>
                      <th scope="row" className="whitespace-nowrap px-3 py-2 text-left font-[650]" style={{ color: MC.ink }}>
                        {longDate(r.measured_at)}
                      </th>
                      {cols.map((b) => {
                        const v = num(r[b.key]);
                        return (
                          <td key={b.key} className="px-2 py-2 text-right tabular-nums font-[650]" style={{ color: MC.ink }}>
                            {v === null ? '—' : fmt(v)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </Section>
      )}
    </>
  );
}
