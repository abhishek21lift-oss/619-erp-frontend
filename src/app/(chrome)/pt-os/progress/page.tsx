'use client';
/**
 * Trainer — Progress hub (Module 5).
 *
 * Seven sections, one client at a time, all sharing the data the existing
 * progress module already records. The comparison is the seven-step fitness
 * assessment; nothing here creates a parallel assessment system.
 *
 * Every number is the server's. Missing values stay "—"; a metric whose test
 * protocol changed is shown but its delta is withheld, because comparing a
 * Cooper run with a step test would be a fabricated improvement.
 */

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Activity, AlertCircle, AlertTriangle, CalendarClock, CheckCircle2, ClipboardList,
  Flag, HeartPulse, LineChart, ListChecks, Loader2, Ruler, Sparkles, Target, TrendingUp,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Guard from '@/components/Guard';
import ClientPicker from '@/components/pt-os/shared/ClientPicker';
import {
  Button, Card, EmptyState, PageContainer, PageHero, PremiumAreaChart, Skeleton,
} from '@/components/ui';
import { blue, emerald, gray } from '@/lib/palette';
import { DateFieldControl, SelectField, TextAreaField, useStandaloneField } from '@/components/ui/form';
import { api } from '@/lib/api';
import type {
  ProgressComparison, ProgressComparisonDomain, ProgressComparisonMetric, ProgressDashboard,
  ProgressHabitLog, ProgressHabitPreferences, ProgressInsight, ProgressInsightReview,
  ProgressRetestOverview, ProgressRetestSettings,
} from '@/lib/api';
import { errorMessage } from '@/lib/forms/errors';

type SectionKey = 'overview' | 'history' | 'comparison' | 'calendar' | 'journal' | 'analytics' | 'insights';

const SECTIONS: { key: SectionKey; label: string; icon: LucideIcon }[] = [
  { key: 'overview', label: 'Overview', icon: Flag },
  { key: 'history', label: 'Assessment History', icon: ClipboardList },
  { key: 'comparison', label: 'Seven-Domain Comparison', icon: TrendingUp },
  { key: 'calendar', label: 'Re-Testing Calendar', icon: CalendarClock },
  { key: 'journal', label: 'Daily Journal', icon: Ruler },
  { key: 'analytics', label: 'Habit Analytics', icon: Activity },
  { key: 'insights', label: 'Insights & Alerts', icon: Sparkles },
];

export default function TrainerProgressPage() {
  return (
    <Guard>
      <Suspense fallback={<LoadingShell />}>
        <ProgressHubSwitch />
      </Suspense>
    </Guard>
  );
}

function ProgressHubSwitch() {
  const sp = useSearchParams();
  const clientId = sp.get('client_id') || '';
  if (!clientId) {
    return (
      <ClientPicker
        title="Progress Hub"
        subtitle="Pick a client to review re-testing, habits and seven-domain change"
        icon={<LineChart size={20} color="#fff" />}
        basePath="/pt-os/progress"
      />
    );
  }
  return <ProgressHub key={clientId} clientId={clientId} />;
}

interface HubData {
  overview: ProgressRetestOverview;
  dashboard: ProgressDashboard;
  assessments: Record<string, unknown>[];
  logs: ProgressHabitLog[];
  preferences: ProgressHabitPreferences;
  reviews: ProgressInsightReview[];
  settings: ProgressRetestSettings;
}

function ProgressHub({ clientId }: { clientId: string }) {
  const router = useRouter();
  const [data, setData] = useState<HubData | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState('');
  const [days, setDays] = useState(30);
  const [tab, setTab] = useState<SectionKey>('overview');

  const load = useCallback(async () => {
    setLoading(true);
    setFailed('');
    try {
      const [overview, dashboard, assessments, preferences, reviews, settings] = await Promise.all([
        api.progress.retest.get(clientId),
        api.progress.habits.dashboard(clientId, { days }),
        api.progress.assessments.list({ client_id: clientId }),
        api.progress.habits.preferences(clientId),
        api.progress.habits.reviews(clientId),
        api.progress.retest.settings(),
      ]);
      const logs = await api.progress.habits.list(clientId, dashboard.data.period.start_date, dashboard.data.period.end_date);
      setData({
        overview: overview.data,
        dashboard: dashboard.data,
        assessments: assessments.data as Record<string, unknown>[],
        logs: logs.data,
        preferences: preferences.data,
        reviews: reviews.data,
        settings: settings.data,
      });
    } catch (err) {
      setFailed(errorMessage(err, 'Could not load this client’s progress.'));
    } finally {
      setLoading(false);
    }
  }, [clientId, days]);

  useEffect(() => { void load(); }, [load]);

  if (loading && !data) return <LoadingShell />;
  if (failed && !data) {
    return (
      <PageContainer>
        <PageHero title="Progress Hub" subtitle="Seven-section review" icon={<LineChart size={20} />}
          actions={<Button variant="secondary" onClick={() => router.push('/pt-os/progress')}>Change client</Button>} />
        <EmptyState icon={<AlertCircle size={20} />} title="Could not load progress" description={failed}
          action={<Button variant="outline" onClick={() => void load()}>Try again</Button>} />
      </PageContainer>
    );
  }
  if (!data) return null;

  return (
    <PageContainer>
      <PageHero
        title="Progress Hub"
        subtitle={`${data.dashboard.period.start_date} to ${data.dashboard.period.end_date} · studio time ${data.dashboard.timezone}`}
        icon={<LineChart size={20} />}
        actions={(
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => router.push('/pt-os/progress')}>Change client</Button>
            <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
              {loading ? <Loader2 size={14} className="animate-spin" /> : 'Refresh'}
            </Button>
          </div>
        )}
      >
        <div className="flex flex-wrap gap-2">
          {data.overview.state.state === 'missing_baseline' && (
            <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-[700] text-white/80">
              No baseline — start with the seven-step assessment
            </span>
          )}
          {data.dashboard.habits.data_quality.missing_days > 0 && (
            <span className="rounded-full bg-amber-300/15 px-3 py-1 text-[11px] font-[700] text-amber-100">
              {data.dashboard.habits.data_quality.missing_days} unlogged days
            </span>
          )}
          <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-[700] text-white/70">
            {data.dashboard.assessment.count} assessment{data.dashboard.assessment.count === 1 ? '' : 's'} on file
          </span>
        </div>
      </PageHero>

      {failed && (
        <div className="flex items-center gap-2 rounded-[14px] px-4 py-3 text-[12.5px]"
          style={{ background: 'color-mix(in srgb, var(--danger) 8%, transparent)', color: 'var(--danger-text)' }}>
          <AlertCircle size={15} /> {failed} — showing the last loaded data.
        </div>
      )}

      <div className="sticky top-0 z-20 -mx-1 overflow-x-auto px-1 py-2"
        style={{ background: 'color-mix(in srgb, var(--bg-canvas) 86%, transparent)', backdropFilter: 'blur(16px)' }}>
        <div className="flex min-w-max gap-1.5" role="tablist" aria-label="Progress sections">
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            const active = tab === s.key;
            return (
              <button key={s.key} role="tab" aria-selected={active}
                onClick={() => setTab(s.key)}
                className="flex shrink-0 items-center gap-1.5 rounded-[10px] px-3 py-2 text-[12px] font-[720] transition-all"
                style={active ? {
                  background: `linear-gradient(135deg,${blue[500]},${blue[700]})`, color: '#fff',
                  boxShadow: '0 6px 18px rgba(0,103,224,0.28)',
                } : { background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
                <Icon size={14} /> {s.label}
              </button>
            );
          })}
        </div>
      </div>

      {tab === 'overview' && <OverviewSection data={data} days={days} setDays={setDays} />}
      {tab === 'history' && <HistorySection data={data} />}
      {tab === 'comparison' && <ComparisonSection comparison={data.dashboard.assessment.comparison} />}
      {tab === 'calendar' && <CalendarSection clientId={clientId} data={data} reload={load} />}
      {tab === 'journal' && <JournalSection data={data} />}
      {tab === 'analytics' && <AnalyticsSection data={data} days={days} setDays={setDays} />}
      {tab === 'insights' && <InsightsSection clientId={clientId} data={data} reload={load} />}
    </PageContainer>
  );
}

/* ── shared bits ───────────────────────────────────────────── */

function LoadingShell() {
  return (
    <PageContainer>
      <Skeleton className="h-[148px] w-full rounded-[24px]" />
      <Skeleton className="h-11 w-full rounded-[12px]" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-[18px]" />)}
      </div>
      <Skeleton className="h-64 w-full rounded-[18px]" />
    </PageContainer>
  );
}

function Panel({ title, subtitle, children, action }: {
  title: string; subtitle?: string; children: React.ReactNode; action?: React.ReactNode;
}) {
  return (
    <Card className="p-0">
      <div className="flex flex-wrap items-start justify-between gap-2 border-b px-4 py-3.5" style={{ borderColor: 'var(--border)' }}>
        <div>
          <h2 className="text-[14px] font-[790]" style={{ color: 'var(--text-primary)' }}>{title}</h2>
          {subtitle && <p className="mt-0.5 text-[11.5px]" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </Card>
  );
}

function Stat({ label, value, hint, tone = 'brand' }: {
  label: string; value: string; hint?: string; tone?: 'brand' | 'success' | 'warn' | 'neutral';
}) {
  const color = tone === 'success' ? 'var(--success)' : tone === 'warn' ? '#d97706' : tone === 'neutral' ? 'var(--text-primary)' : 'var(--brand)';
  return (
    <div className="rounded-[16px] px-3.5 py-3"
      style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
      <p className="text-[10.5px] font-[760] uppercase tracking-[0.08em]" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className="mt-1 text-[20px] font-[850] tracking-[-0.03em] tabular-nums" style={{ color }}>{value}</p>
      {hint && <p className="mt-0.5 text-[10.5px]" style={{ color: 'var(--text-muted)' }}>{hint}</p>}
    </div>
  );
}

const fmt = (v: unknown, digits = 1) => {
  if (v === null || v === undefined || v === '') return '—';
  const n = Number(v);
  return Number.isFinite(n) ? n.toFixed(digits).replace(/\.0+$/, '') : '—';
};
const text = (v: unknown) => (v == null || v === '' ? '—' : String(v));
const date = (v: unknown) => (v ? String(v).slice(0, 10) : '—');
const stamp = (v: unknown) => {
  if (!v) return '—';
  const d = new Date(String(v));
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
};
const signed = (v: number | null, suffix = '') => {
  if (v == null) return '—';
  return `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v)}${suffix}`;
};

const STATE_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  missing_baseline: { bg: 'rgba(239,68,68,0.10)', color: '#b91c1c', label: 'No baseline' },
  not_scheduled: { bg: 'rgba(245,158,11,0.12)', color: '#b45309', label: 'Not scheduled' },
  upcoming: { bg: 'rgba(0,103,224,0.10)', color: blue[700], label: 'Upcoming' },
  due: { bg: 'rgba(245,158,11,0.14)', color: '#b45309', label: 'Due' },
  overdue: { bg: 'rgba(239,68,68,0.12)', color: '#b91c1c', label: 'Overdue' },
  rescheduled: { bg: 'rgba(0,103,224,0.10)', color: blue[700], label: 'Rescheduled' },
  completed: { bg: 'rgba(16,185,129,0.12)', color: '#047857', label: 'Completed' },
};

function StatePill({ state }: { state: string }) {
  const s = STATE_STYLE[state] || STATE_STYLE.not_scheduled;
  return (
    <span className="inline-flex items-center rounded-full px-2.5 py-1 text-[10.5px] font-[780]"
      style={{ background: s.bg, color: s.color }}>{s.label}</span>
  );
}

/* ── 1. Overview ───────────────────────────────────────────── */

function OverviewSection({ data, days, setDays }: {
  data: HubData; days: number; setDays: (n: number) => void;
}) {
  const { dashboard, overview } = data;
  const schedule = overview.schedule;
  const base = overview.baseline;
  const latest = overview.latest;
  const comparison = dashboard.assessment.comparison;

  return (
    <div className="space-y-3.5">
      <div className="grid gap-3 lg:grid-cols-[1.35fr_1fr]">
        <div className="relative overflow-hidden rounded-[22px] p-5 text-white"
          style={{ background: `radial-gradient(120% 160% at 10% 0%, ${blue[700]} 0%, transparent 55%), linear-gradient(145deg,${gray[900]} 0%,${blue[900]} 55%,${gray[900]} 100%)`, boxShadow: '0 18px 44px -20px rgba(15,23,42,0.7)' }}>
          <div aria-hidden className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full"
            style={{ background: 'radial-gradient(circle,rgba(252,211,77,0.28),transparent 70%)', filter: 'blur(26px)' }} />
          <div className="relative flex items-start justify-between gap-3">
            <div>
              <p className="text-[10.5px] font-[760] uppercase tracking-[0.12em] text-white/50">Next fitness re-test</p>
              <p className="mt-1.5 text-[27px] font-[870] tracking-[-0.035em]">
                {schedule ? date(schedule.scheduled_date) : overview.state.label}
              </p>
              <p className="mt-1 text-[12px] text-white/55">
                {schedule
                  ? `${overview.state.days_until == null ? '' : overview.state.days_until === 0 ? 'Due today' : overview.state.days_until > 0 ? `In ${overview.state.days_until} days` : `${Math.abs(overview.state.days_until)} days overdue`} · ${schedule.cadence_months}-month cadence`
                  : overview.prompt || 'Create the next test from the latest assessment.'}
              </p>
            </div>
            <StatePill state={overview.state.state} />
          </div>
          {schedule?.next_reminder && (
            <p className="relative mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-[650] text-white/75">
              <CalendarClock size={12} /> Next reminder {date(schedule.next_reminder.on_date)} ({schedule.next_reminder.stage_days} days before)
            </p>
          )}
          {!schedule && overview.assessment_count === 0 && (
            <p className="relative mt-4 text-[11.5px] text-amber-200/80">No assessment on file. Start with Fitness Testing, then the calendar opens by itself.</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <Stat label="Assessments" value={String(overview.assessment_count)} hint="Seven-step tests" />
          <Stat label="Latest score" value={latest ? `${fmt(latest.overall_fitness_score, 0)}/100` : '—'}
            hint={latest ? date(latest.assessment_date) : 'No test yet'} tone={latest ? 'success' : 'neutral'} />
          <Stat label="Workout adherence" value={dashboard.workouts.adherence_percent == null ? '—' : `${dashboard.workouts.adherence_percent}%`}
            hint={dashboard.workouts.planned == null ? 'No weekly frequency set' : `${dashboard.workouts.completed}/${dashboard.workouts.planned} sessions`} tone="brand" />
          <Stat label="Journal logged" value={`${dashboard.habits.data_quality.logged_days}/${dashboard.habits.data_quality.expected_days}`}
            hint={`${days}-day window`} tone={dashboard.habits.data_quality.logged_days ? 'success' : 'warn'} />
        </div>
      </div>

      <Panel title="Today's checklist" subtitle={`${date(dashboard.today)} · ${Math.round(dashboard.habits.today.completion * 100)}% complete`}
        action={<span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{dashboard.habits.today.log ? 'Journal entry recorded' : 'No entry yet'}</span>}>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {dashboard.habits.today.checklist.map((item) => (
            <div key={item.key} className="rounded-[11px] px-3 py-2.5" style={{ background: 'var(--bg-subtle)' }}>
              <p className="flex items-center gap-1.5 text-[11.5px] font-[740]" style={{ color: item.done ? 'var(--success-text)' : 'var(--text-muted)' }}>
                {item.done
                  ? <CheckCircle2 size={13} aria-hidden />
                  : <span aria-hidden className="inline-block h-[11px] w-[11px] rounded-full" style={{ border: '1.5px solid var(--border)' }} />}
                <span className="sr-only">{item.done ? 'Done:' : 'Not done:'}</span> {item.label}
              </p>
              <p className="mt-1 text-[10.5px]" style={{ color: 'var(--text-muted)' }}>{item.detail || 'Not recorded'}</p>
              {item.target && <p className="mt-0.5 text-[10px]" style={{ color: 'var(--text-muted)' }}>{item.target}</p>}
            </div>
          ))}
        </div>
      </Panel>

      <div className="grid gap-3 lg:grid-cols-2">
        <Panel title="Baseline to latest" subtitle={comparison ? `${date(comparison.baseline?.assessment_date)} → ${date(comparison.latest?.assessment_date)}` : 'A second test unlocks comparison'}>
          {!comparison ? (
            <p className="text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
              {overview.assessment_count < 2 ? 'Only one assessment is on file. The seven-domain comparison appears after the next test.' : 'Comparison unavailable.'}
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Stat label="Improved" value={String(comparison.summary?.improved ?? 0)} tone="success" />
              <Stat label="Declined" value={String(comparison.summary?.declined ?? 0)} tone="warn" />
              <Stat label="Unchanged" value={String(comparison.summary?.unchanged ?? 0)} tone="neutral" />
              <Stat label="Not comparable" value={String(comparison.summary?.incomparable ?? 0)} tone="neutral" />
            </div>
          )}
        </Panel>

        <Panel title="Goal progress" subtitle={dashboard.goal ? `${dashboard.goal.goal_type} · ${date(dashboard.goal.target_date)}` : 'No active goal'}>
          {!dashboard.goal ? (
            <p className="text-[12.5px]" style={{ color: 'var(--text-muted)' }}>No numeric goal is active for this client.</p>
          ) : (
            <>
              <div className="flex items-end justify-between gap-3">
                <p className="text-[21px] font-[850] tabular-nums" style={{ color: 'var(--text-primary)' }}>
                  {dashboard.goal.progress_percent == null ? '—' : `${dashboard.goal.progress_percent}%`}
                </p>
                <p className="text-right text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  {dashboard.goal.current ? `${fmt(dashboard.goal.current.value, 1)} ${dashboard.goal.current.unit}` : 'No measurement'} →{' '}
                  {dashboard.goal.target ? `${fmt(dashboard.goal.target.value, 1)} ${dashboard.goal.target.unit}` : '—'}
                </p>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full" style={{ background: 'var(--bg-subtle)' }}>
                <div className="h-full rounded-full" style={{ width: `${dashboard.goal.progress_percent ?? 0}%`, background: `linear-gradient(90deg,${blue[500]},${emerald[500]})` }} />
              </div>
              <p className="mt-2 text-[11.5px]" style={{ color: 'var(--text-muted)' }}>{dashboard.goal.summary}</p>
            </>
          )}
        </Panel>
      </div>

      <Panel title="Data quality" subtitle="What is missing, not inferred"
        action={<div className="flex gap-1">{[7, 30].map((d) => (
          <button key={d} onClick={() => setDays(d)} className="rounded-full px-2.5 py-1 text-[10.5px] font-[750]"
            style={days === d ? { background: 'var(--brand)', color: '#fff' } : { background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
            {d}d
          </button>
        ))}</div>}>
        <div className="space-y-2">
          {dashboard.habits.data_quality.warnings.length === 0 && (
            <p className="flex items-center gap-1.5 text-[12px]" style={{ color: 'var(--success-text)' }}><CheckCircle2 size={14} /> No coverage warnings in this window.</p>
          )}
          {dashboard.habits.data_quality.warnings.map((w) => (
            <p key={w.code} className="flex items-start gap-1.5 text-[12px]" style={{ color: 'var(--text-muted)' }}>
              <AlertTriangle size={13} className="mt-0.5 shrink-0" style={{ color: '#d97706' }} /> {w.message}
            </p>
          ))}
          {dashboard.habits.data_quality.sources.imported || dashboard.habits.data_quality.sources.wearable || dashboard.habits.data_quality.sources.mixed ? (
            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              Imported/wearable entries are labelled in the journal; they are not presented as self-reported.
            </p>
          ) : null}
        </div>
      </Panel>
    </div>
  );
}

/* ── 2. Assessment history ─────────────────────────────────── */

function HistorySection({ data }: { data: HubData }) {
  const rows = useMemo(() => [...data.assessments].sort((a, b) =>
    String(b.assessment_date).localeCompare(String(a.assessment_date))), [data.assessments]);

  if (!rows.length) {
    return <EmptyState icon={<ClipboardList size={20} />} title="No assessments yet"
      description="The seven-step fitness test is the baseline for every comparison and re-test date."
      action={<Button onClick={() => window.location.assign(`/pt-os/assessment?client_id=${encodeURIComponent(data.dashboard.client_id)}`)}>Start fitness testing</Button>} />;
  }

  return (
    <Panel title="Assessment history" subtitle={`${rows.length} recorded test${rows.length === 1 ? '' : 's'}, newest first`}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-[12px]">
          <caption className="sr-only">Fitness assessments by date</caption>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Date', 'Type', 'Weight', 'Waist', 'Body fat', 'Overall', 'Conditions', 'Trainer notes'].map((h) => (
                <th key={h} scope="col" className="px-2 py-2 text-left font-[720]" style={{ color: 'var(--text-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={String(r.id)} style={i === rows.length - 1 ? undefined : { borderBottom: '1px solid var(--border)' }}>
                <th scope="row" className="whitespace-nowrap px-2 py-2.5 text-left font-[720]" style={{ color: 'var(--text-primary)' }}>{date(r.assessment_date)}</th>
                <td className="px-2 py-2.5" style={{ color: 'var(--text-muted)' }}>{text(r.assessment_type).replace(/_/g, ' ')}</td>
                <td className="px-2 py-2.5 tabular-nums" style={{ color: 'var(--text-primary)' }}>{fmt(r.weight)} kg</td>
                <td className="px-2 py-2.5 tabular-nums" style={{ color: 'var(--text-primary)' }}>{fmt(r.waist_cm)} cm</td>
                <td className="px-2 py-2.5 tabular-nums" style={{ color: 'var(--text-primary)' }}>{fmt(r.body_fat_pct)}%</td>
                <td className="px-2 py-2.5 font-[780] tabular-nums" style={{ color: 'var(--text-primary)' }}>{fmt(r.overall_fitness_score, 0)}/100</td>
                <td className="max-w-[180px] px-2 py-2.5" style={{ color: 'var(--text-muted)' }}>{text(r.testing_conditions)}</td>
                <td className="max-w-[200px] truncate px-2 py-2.5" style={{ color: 'var(--text-muted)' }}>{text(r.trainer_notes)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

/* ── 3. Seven-domain comparison ────────────────────────────── */

function ComparisonSection({ comparison }: { comparison: ProgressComparison | null }) {
  const [mode, setMode] = useState<'baseline' | 'previous'>('baseline');
  if (!comparison) {
    return <EmptyState icon={<TrendingUp size={20} />} title="A second assessment unlocks comparison"
      description="There is one test on file. Complete the next re-test and every domain is compared here — with protocol changes and missing values shown, never guessed." />;
  }
  const view = mode === 'previous' && comparison.previous_comparison ? comparison.previous_comparison : comparison;
  const summary = view.summary;

  return (
    <div className="space-y-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1">
          <button onClick={() => setMode('baseline')} className="rounded-full px-3 py-1.5 text-[11px] font-[750]"
            style={mode === 'baseline' ? { background: 'var(--brand)', color: '#fff' } : { background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
            Since baseline
          </button>
          <button onClick={() => setMode('previous')} disabled={!comparison.previous_comparison}
            className="rounded-full px-3 py-1.5 text-[11px] font-[750] disabled:opacity-40"
            style={mode === 'previous' ? { background: 'var(--brand)', color: '#fff' } : { background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
            Since last test
          </button>
        </div>
        <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
          {date(view.baseline?.assessment_date)} → {date(view.latest?.assessment_date)}
          {comparison.previous_comparison == null && ' · no third test yet'}
        </p>
      </div>

      {summary && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-6">
          <Stat label="Improved" value={String(summary.improved ?? 0)} tone="success" />
          <Stat label="Declined" value={String(summary.declined ?? 0)} tone="warn" />
          <Stat label="Changed" value={String(summary.changed ?? 0)} tone="neutral" />
          <Stat label="Unchanged" value={String(summary.unchanged ?? 0)} tone="neutral" />
          <Stat label="New" value={String(summary.new_measurements ?? 0)} tone="brand" />
          <Stat label="Not comparable" value={String(summary.incomparable ?? 0)} tone="neutral" />
        </div>
      )}

      {view.conditions && (view.conditions.baseline || view.conditions.latest) && (
        <div className="rounded-[14px] px-4 py-3 text-[12px]"
          style={{ background: view.conditions.changed ? 'rgba(245,158,11,0.08)' : 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
          <span className="font-[750]" style={{ color: 'var(--text-primary)' }}>Testing conditions: </span>
          baseline: {text(view.conditions.baseline)} · latest: {text(view.conditions.latest)}
          {view.conditions.changed && ' — conditions changed, so read small differences with that in mind.'}
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-2">
        {view.domains.map((d) => <DomainCard key={d.key} domain={d} />)}
      </div>

      {view.trainer_observations.length > 0 && (
        <Panel title="Trainer observations" subtitle="Copied from the assessments, not generated">
          {view.trainer_observations.map((o, i) => <p key={i} className="text-[12.5px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>{o}</p>)}
        </Panel>
      )}
    </div>
  );
}

function DomainCard({ domain }: { domain: ProgressComparisonDomain }) {
  return (
    <Panel title={domain.label} subtitle={domain.comparable ? 'Like-for-like across the recorded protocol' : domain.incomparable_reason || 'Protocol changed'}>
      <div className="space-y-1">
        {domain.metrics.map((m) => <MetricRow key={m.key} metric={m} />)}
      </div>
    </Panel>
  );
}

function metricTone(outcome: string) {
  if (outcome === 'improved') return 'var(--success)';
  if (outcome === 'declined') return 'var(--danger)';
  if (outcome === 'incomparable' || outcome === 'not_remeasured') return '#b45309';
  return 'var(--text-muted)';
}

function MetricRow({ metric }: { metric: ProgressComparisonMetric }) {
  const change = metric.absolute_change == null ? '—' : signed(metric.absolute_change, metric.unit ? ` ${metric.unit}` : '');
  const percent = metric.percent_change == null
    ? null
    : `${metric.percent_change > 0 ? '+' : ''}${metric.percent_change.toFixed(1)}%`;
  return (
    <div className="grid grid-cols-[1fr_auto_auto] items-center gap-2 rounded-[9px] px-1.5 py-1.5"
      title={metric.incomparable_reason || undefined}
      style={{ background: metric.outcome === 'improved' ? 'rgba(16,185,129,0.04)' : metric.outcome === 'declined' ? 'rgba(239,68,68,0.04)' : undefined }}>
      <span className="min-w-0 truncate text-[12px]" style={{ color: 'var(--text-secondary)' }}>{metric.label}</span>
      <span className="text-right text-[11.5px] tabular-nums" style={{ color: 'var(--text-muted)' }}>
        {fmt(metric.baseline_value, metric.decimals ?? 1)} → <b style={{ color: 'var(--text-primary)' }}>{fmt(metric.latest_value, metric.decimals ?? 1)}</b>
      </span>
      <span className="min-w-[84px] text-right text-[11px] font-[760] tabular-nums" style={{ color: metricTone(metric.outcome) }}>
        {metric.comparable ? (
          <>
            <span className="block">{change}</span>
            {percent && <span className="block text-[9.5px] font-[650] opacity-80">{percent}</span>}
          </>
        ) : 'not comparable'}
      </span>
    </div>
  );
}

/* ── 4. Calendar / settings ────────────────────────────────── */

function CalendarSection({ clientId, data, reload }: { clientId: string; data: HubData; reload: () => Promise<void> }) {
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [cadence, setCadence] = useState(String(data.settings.cadence_months));
  const [reminders, setReminders] = useState<number[]>(data.settings.reminder_days);
  const [startDate, setStartDate] = useState('');
  const [moveDate, setMoveDate] = useState('');
  const [reason, setReason] = useState('');

  const startField = useStandaloneField('start-date', startDate, setStartDate);
  const moveField = useStandaloneField('move-date', moveDate, setMoveDate);
  const reasonField = useStandaloneField('reschedule-reason', reason, setReason);
  const cadenceField = useStandaloneField('cadence', cadence, setCadence);

  const run = async (key: string, fn: () => Promise<unknown>) => {
    setBusy(key); setError('');
    try { await fn(); await reload(); } catch (err) { setError(errorMessage(err, 'That change could not be saved.')); }
    finally { setBusy(''); }
  };

  const saveSettings = () => run('settings', () => api.progress.retest.saveSettings({
    cadence_months: Number(cadence), reminder_days: reminders, is_enabled: data.settings.is_enabled,
  }));

  const schedule = data.overview.schedule;
  const latestAssessmentId = data.dashboard.assessment.latest?.id;
  const canComplete = Boolean(
    schedule && latestAssessmentId
    && String(latestAssessmentId) !== String(schedule.baseline_assessment_id),
  );

  return (
    <div className="space-y-3.5">
      {error && <p className="rounded-[12px] px-4 py-2.5 text-[12px]" style={{ background: 'rgba(239,68,68,0.08)', color: 'var(--danger-text)' }}>{error}</p>}

      <Panel title="Current cycle" subtitle="One open re-test per client; completed cycles stay in history">
        {!schedule ? (
          <div className="space-y-3">
            <p className="text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
              {data.overview.assessment_count === 0
                ? 'No baseline yet. Complete an initial seven-step assessment first.'
                : 'No re-test is scheduled. Start one now, or let the assessment hook create it.'}
            </p>
            {data.overview.assessment_count > 0 && (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <div className="w-full sm:max-w-[220px]">
                  <DateFieldControl field={startField} label="Re-test date (optional)" />
                </div>
                <Button onClick={() => run('start', () => api.progress.retest.start(clientId, { scheduled_date: startDate || null }))}
                  loading={busy === 'start'} disabled={!!busy}>
                  Start from latest assessment
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <StatePill state={data.overview.state.state} />
              <span className="text-[17px] font-[830] tabular-nums" style={{ color: 'var(--text-primary)' }}>{date(schedule.scheduled_date)}</span>
              <span className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>{schedule.cadence_months}-month cadence · {schedule.source}</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-[1fr_1.3fr]">
              <div>
                <DateFieldControl field={moveField} label="Move to" min={data.dashboard.today} />
              </div>
              <div>
                <TextAreaField field={reasonField} label="Reason" rows={2} maxLength={500} placeholder="Travel, illness, schedule change…" />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" loading={busy === 'move'} disabled={!moveDate || !!busy}
                onClick={() => run('move', () => api.progress.retest.reschedule(clientId, schedule.id, {
                  scheduled_date: moveDate, reason: reason || null,
                }))}>
                Reschedule
              </Button>
              {canComplete && (
                <Button variant="secondary" loading={busy === 'complete'} disabled={!!busy}
                  onClick={() => run('complete', () => api.progress.retest.complete(
                    clientId, schedule.id, String(latestAssessmentId),
                  ))}>
                  Complete with latest test
                </Button>
              )}
              <Button variant="danger" loading={busy === 'cancel'} disabled={!!busy}
                onClick={() => {
                  if (!window.confirm('Cancel this re-test cycle? It stays in history and can be restarted from the latest assessment.')) return;
                  void run('cancel', () => api.progress.retest.cancel(clientId, schedule.id, 'Cancelled from the progress hub'));
                }}>
                Cancel cycle
              </Button>
            </div>
            {schedule.rescheduled_from && (
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                Originally {date(schedule.rescheduled_from)}{schedule.reschedule_reason ? ` — ${schedule.reschedule_reason}` : ''}
              </p>
            )}
            {data.overview.state.state === 'overdue' && (
              <p className="rounded-[10px] px-3 py-2 text-[11.5px]" style={{ background: 'rgba(239,68,68,0.07)', color: '#b91c1c' }}>
                This test is overdue. Reminders are scheduled at {data.settings.reminder_days.join('/')} days before and on the due date; delivery depends on the client having a reachable channel.
              </p>
            )}
          </div>
        )}
      </Panel>

      <Panel title="Schedule history" subtitle="Every completed, cancelled and moved cycle">
        {data.overview.history.length === 0 ? (
          <p className="text-[12.5px]" style={{ color: 'var(--text-muted)' }}>No schedule history yet.</p>
        ) : (
          <div className="space-y-1.5">
            {data.overview.history.map((h) => (
              <div key={h.id} className="flex flex-wrap items-center justify-between gap-2 rounded-[10px] px-3 py-2"
                style={{ background: 'var(--bg-subtle)' }}>
                <span className="text-[12px] font-[720] tabular-nums" style={{ color: 'var(--text-primary)' }}>{date(h.scheduled_date)}</span>
                <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{h.status} · {h.cadence_months} months{h.rescheduled_from ? ` · moved from ${date(h.rescheduled_from)}` : ''}</span>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel title="Studio re-test policy" subtitle="Applies to cycles started from now; existing promised dates are not moved">
        <div className="grid gap-3 sm:grid-cols-[200px_1fr_auto] sm:items-end">
          <div>
            <SelectField
              field={cadenceField}
              label="Cadence" options={[4, 5, 6].map((n) => ({ value: String(n), label: `${n} months` }))}
            />
          </div>
          <div>
            <p className="mb-1.5 text-[11px] font-[650]" style={{ color: 'var(--text-muted)' }}>Reminder days before the test</p>
            <div className="flex gap-1.5">
              {[30, 14, 7].map((d) => {
                const on = reminders.includes(d);
                return (
                  <button key={d} onClick={() => setReminders(on ? reminders.filter((x) => x !== d) : [...reminders, d].sort((a, b) => b - a))}
                    className="rounded-full px-3 py-1.5 text-[11px] font-[750]"
                    style={on ? { background: 'var(--brand)', color: '#fff' } : { background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
                    {d} days
                  </button>
                );
              })}
            </div>
            {reminders.length === 0 && <p className="mt-1 text-[10.5px]" style={{ color: 'var(--danger-text)' }}>Keep at least one reminder stage.</p>}
          </div>
          <Button variant="secondary" onClick={saveSettings} loading={busy === 'settings'}
            disabled={!!busy || reminders.length === 0}>Save policy</Button>
        </div>
      </Panel>
    </div>
  );
}

/* ── 5. Daily journal ──────────────────────────────────────── */

function JournalSection({ data }: { data: HubData }) {
  const logs = useMemo(() => [...data.logs].sort((a, b) => b.log_date.localeCompare(a.log_date)), [data.logs]);
  return (
    <div className="space-y-3.5">
      <Panel title="Today" subtitle={`Studio date ${data.dashboard.today} · journal completion ${Math.round(data.dashboard.habits.today.completion * 100)}%`}>
        {!data.dashboard.habits.today.log ? (
          <EmptyState icon={<Ruler size={18} />} title="Nothing logged today"
            description="The member can add sleep, steps, water and recovery in the member app. The trainer view is read-only." />
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="Sleep" value={data.dashboard.habits.today.log.sleep_hours == null ? '—' : `${fmt(data.dashboard.habits.today.log.sleep_hours)} h`} tone="brand" />
            <Stat label="Steps" value={data.dashboard.habits.today.log.steps == null ? '—' : Number(data.dashboard.habits.today.log.steps).toLocaleString()} tone="success" />
            <Stat label="Water" value={data.dashboard.habits.today.log.water_ml == null ? '—' : `${Number(data.dashboard.habits.today.log.water_ml).toLocaleString()} ml`} tone="neutral" />
            <Stat label="Recovery" value={data.dashboard.habits.today.log.recovery_level == null ? '—' : `${data.dashboard.habits.today.log.recovery_level}/5`} tone="brand" />
          </div>
        )}
      </Panel>

      <Panel title="Journal history" subtitle={`${logs.length} recorded day${logs.length === 1 ? '' : 's'} in the selected window`}>
        {logs.length === 0 ? (
          <p className="text-[12.5px]" style={{ color: 'var(--text-muted)' }}>No journal entries in this period.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-[11.5px]">
              <caption className="sr-only">Daily habit journal entries</caption>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Date', 'Sleep', 'Quality', 'Water', 'Steps', 'Stress', 'Energy', 'Fatigue', 'Soreness', 'Recovery', 'Source', 'Updated', 'Notes'].map((h) => (
                    <th key={h} scope="col" className="px-2 py-2 text-left font-[720]" style={{ color: 'var(--text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map((l, i) => (
                  <tr key={l.id} style={i === logs.length - 1 ? undefined : { borderBottom: '1px solid var(--border)' }}>
                    <th scope="row" className="whitespace-nowrap px-2 py-2 text-left font-[720]" style={{ color: 'var(--text-primary)' }}>{date(l.log_date)}</th>
                    <td className="px-2 py-2 tabular-nums" style={{ color: 'var(--text-primary)' }}>{l.sleep_hours == null ? '—' : `${fmt(l.sleep_hours)}h`}</td>
                    <td className="px-2 py-2 tabular-nums" style={{ color: 'var(--text-muted)' }}>{l.sleep_quality ?? '—'}</td>
                    <td className="px-2 py-2 tabular-nums" style={{ color: 'var(--text-muted)' }}>{l.water_ml == null ? '—' : `${Number(l.water_ml).toLocaleString()} ml`}</td>
                    <td className="px-2 py-2 tabular-nums" style={{ color: 'var(--text-primary)' }}>{l.steps == null ? '—' : Number(l.steps).toLocaleString()}</td>
                    {[l.stress_level, l.energy_level, l.fatigue_level, l.soreness_level, l.recovery_level].map((v, k) => (
                      <td key={k} className="px-2 py-2 tabular-nums" style={{ color: 'var(--text-muted)' }}>{v ?? '—'}</td>
                    ))}
                    <td className="px-2 py-2" style={{ color: 'var(--text-muted)' }}>{l.source}{l.steps_source && l.steps_source !== 'manual' ? ` (${l.steps_source} steps)` : ''}</td>
                    <td className="whitespace-nowrap px-2 py-2" style={{ color: 'var(--text-muted)' }}>{stamp(l.updated_at)}</td>
                    <td className="max-w-[180px] truncate px-2 py-2" style={{ color: 'var(--text-muted)' }}>{l.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}

/* ── 6. Habit analytics ────────────────────────────────────── */

function AnalyticsSection({ data, days, setDays }: { data: HubData; days: number; setDays: (n: number) => void }) {
  const h = data.dashboard.habits;
  const chart = useMemo(() => [...data.logs]
    .sort((a, b) => a.log_date.localeCompare(b.log_date))
    .map((l) => ({
      date: l.log_date.slice(5),
      sleep: l.sleep_hours == null ? null : Number(l.sleep_hours),
      steps: l.steps == null ? null : Number(l.steps),
    })), [data.logs]);
  const sleepPoints = chart.filter((c) => c.sleep != null);
  const stepPoints = chart.filter((c) => c.steps != null);

  return (
    <div className="space-y-3.5">
      <div className="flex justify-end gap-1">
        {[7, 30].map((d) => (
          <button key={d} onClick={() => setDays(d)} className="rounded-full px-3 py-1.5 text-[11px] font-[750]"
            style={days === d ? { background: 'var(--brand)', color: '#fff' } : { background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
            Last {d} days
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Sleep average" value={h.averages.sleep_hours?.average == null ? '—' : `${fmt(h.averages.sleep_hours.average)} h`} hint={`${h.averages.sleep_hours?.samples ?? 0} samples`} tone="brand" />
        <Stat label="Steps average" value={h.averages.steps?.average == null ? '—' : Math.round(h.averages.steps.average).toLocaleString()} hint={`${h.averages.steps?.samples ?? 0} samples`} tone="success" />
        <Stat label="Recovery average" value={h.averages.recovery_level?.average == null ? '—' : `${fmt(h.averages.recovery_level.average)}/5`} hint={`${h.averages.recovery_level?.samples ?? 0} samples`} tone="brand" />
        <Stat label="Logging streak" value={`${h.streaks.logging_days ?? 0} d`} hint="Consecutive days with an entry" tone="warn" />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Panel title="Sleep duration" subtitle={`${days}-day window · 7–9 h is a general adult reference, not a prescription`}>
          {sleepPoints.length < 2 ? <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>At least two sleep entries draw the trend.</p> : (
            <PremiumAreaChart data={sleepPoints} xKey="date"
              areas={[{ key: 'sleep', label: 'Sleep (h)', color: '#0067e0' }]} height={190}
              formatValue={(v) => `${v}h`} />
          )}
          <div className="mt-2 flex flex-wrap gap-2 text-[11px]" style={{ color: 'var(--text-muted)' }}>
            <span>
              {h.last_7_days.sleep_samples > 0
                ? `Inside 7–9 h: ${h.last_7_days.sleep_target_days} of ${h.last_7_days.sleep_samples} logged days`
                : 'No sleep logged in the last 7 days'}
            </span>
            <span>·</span>
            <span>{h.reference?.note || 'Quality, energy and recovery carry more context than duration alone.'}</span>
          </div>
        </Panel>
        <Panel title="Daily steps / NEAT" subtitle="Recorded only — wearable and manual entries are labelled">
          {stepPoints.length < 2 ? <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>At least two step entries draw the trend.</p> : (
            <PremiumAreaChart data={stepPoints} xKey="date"
              areas={[{ key: 'steps', label: 'Steps', color: '#10b981' }]} height={190}
              formatValue={(v) => v.toLocaleString()} />
          )}
          <p className="mt-2 text-[11px]" style={{ color: 'var(--text-muted)' }}>
            Step target: {data.preferences.step_target == null ? 'not set' : data.preferences.step_target.toLocaleString()}.
          </p>
        </Panel>
      </div>

      <Panel title="Change vs the previous window" subtitle="Only recorded values are averaged; missing days are not zero">
        {(['sleep_hours', 'steps', 'recovery_level', 'stress_level'] as const).map((key) => {
          const t = h.trends[key]?.[`d${days}`];
          const lowerIsBetter = key === 'stress_level';
          const tone = t?.percent_change == null || t.percent_change === 0
            ? 'var(--text-muted)'
            : (t.percent_change < 0) === lowerIsBetter ? 'var(--success-text)' : 'var(--danger-text)';
          return (
            <div key={key} className="flex items-center justify-between gap-3 border-b py-2 last:border-0" style={{ borderColor: 'var(--border)' }}>
              <span className="text-[12px] font-[650]" style={{ color: 'var(--text-primary)' }}>{key.replace(/_/g, ' ')}</span>
              <span className="text-[11.5px] tabular-nums" style={{ color: tone }}>
                {t?.percent_change == null ? '—' : `${t.percent_change > 0 ? '+' : ''}${t.percent_change}%`}
                <span className="ml-2" style={{ color: 'var(--text-muted)' }}>
                  {t?.current_average == null ? '—' : fmt(t.current_average)} vs {t?.previous_average == null ? '—' : fmt(t.previous_average)}
                </span>
              </span>
            </div>
          );
        })}
      </Panel>
    </div>
  );
}

/* ── 7. Insights ───────────────────────────────────────────── */

function InsightsSection({ clientId, data, reload }: { clientId: string; data: HubData; reload: () => Promise<void> }) {
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const review = async (insight: ProgressInsight, decision: 'acknowledged' | 'approved' | 'dismissed') => {
    setBusy(insight.insight_key); setError('');
    try {
      await api.progress.habits.review(clientId, {
        insight_key: insight.insight_key, insight_type: insight.type, title: insight.title,
        observation: insight.type === 'observation' ? insight.detail : null,
        recommendation: insight.recommendation
          || (insight.type === 'recommendation' ? insight.detail : null),
        decision,
      });
      await reload();
    } catch (err) { setError(errorMessage(err, 'Could not save the review.')); }
    finally { setBusy(''); }
  };

  const reviewed = new Set(data.reviews.map((r) => r.insight_key));

  return (
    <div className="space-y-3.5">
      {error && <p className="rounded-[12px] px-4 py-2.5 text-[12px]" style={{ background: 'rgba(239,68,68,0.08)', color: 'var(--danger-text)' }}>{error}</p>}

      <div className="rounded-[18px] px-4 py-3.5"
        style={{ background: 'linear-gradient(135deg, rgba(0,103,224,0.08), rgba(16,185,129,0.06))', border: '1px solid var(--border)' }}>
        <p className="flex items-center gap-2 text-[12.5px] font-[760]" style={{ color: 'var(--text-primary)' }}>
          <Sparkles size={15} style={{ color: 'var(--brand)' }} /> Observations first, suggestions second
        </p>
        <p className="mt-1 text-[11.5px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          These are generated from the recorded period only and are not a diagnosis. A recommendation never changes a program by itself:
          review it, then edit the plan in the normal workflow.
        </p>
      </div>

      {data.dashboard.insights.length === 0 ? (
        <EmptyState icon={<HeartPulse size={20} />} title="Nothing needs attention"
          description="No overdue tests, protocol changes, data gaps or threshold flags were found in the recorded period." />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {data.dashboard.insights.map((insight) => {
            const done = reviewed.has(insight.insight_key);
            return (
              <Card key={insight.insight_key} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-[780] uppercase tracking-[0.1em]" style={{ color: insight.type === 'recommendation' ? 'var(--brand)' : 'var(--text-muted)' }}>
                      {insight.type}
                    </span>
                    <h3 className="mt-1 text-[13.5px] font-[790]" style={{ color: 'var(--text-primary)' }}>{insight.title}</h3>
                  </div>
                  {done && <CheckCircle2 size={16} style={{ color: 'var(--success-text)' }} />}
                </div>
                <p className="mt-2 text-[12.5px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>{insight.detail}</p>
                {insight.recommendation && (
                  <p className="mt-2 rounded-[10px] px-3 py-2 text-[11.5px] leading-relaxed"
                    style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}>
                    <b style={{ color: 'var(--text-primary)' }}>Suggestion for review: </b>{insight.recommendation}
                  </p>
                )}
                {Object.keys(insight.evidence).length > 0 && (
                  <ul className="mt-2 space-y-0.5">
                    {Object.entries(insight.evidence).map(([k, v]) => (
                      <li key={k} className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                        · {k.replace(/_/g, ' ')}: {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant={done ? 'outline' : 'secondary'} disabled={!!busy}
                    loading={busy === insight.insight_key} onClick={() => void review(insight, 'acknowledged')}>
                    {done ? 'Review again' : 'Acknowledge'}
                  </Button>
                  {insight.recommendation && (
                    <Button size="sm" variant="outline" disabled={!!busy}
                      onClick={() => void review(insight, 'approved')}>
                      Approve suggestion
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" disabled={!!busy} onClick={() => void review(insight, 'dismissed')}>
                    Dismiss
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Panel title="Review history" subtitle="The trainer's decision is stored, not just a UI state">
        {data.reviews.length === 0 ? <p className="text-[12.5px]" style={{ color: 'var(--text-muted)' }}>No insights reviewed yet.</p> : (
          <div className="space-y-2">
            {data.reviews.map((r) => (
              <div key={r.id} className="rounded-[10px] px-3 py-2" style={{ background: 'var(--bg-subtle)' }}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[12px] font-[720]" style={{ color: 'var(--text-primary)' }}>{r.title}</span>
                  <span className="text-[10.5px] font-[750]" style={{ color: r.decision === 'dismissed' ? 'var(--text-muted)' : 'var(--success-text)' }}>
                    {r.decision} · {date(r.created_at)}
                  </span>
                </div>
                {r.notes && <p className="mt-1 text-[11.5px]" style={{ color: 'var(--text-muted)' }}>{r.notes}</p>}
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
