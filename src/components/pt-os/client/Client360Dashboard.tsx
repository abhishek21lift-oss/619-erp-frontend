'use client';

// The Client 360 dashboard.
//
// The Overview tab used to be a summary card plus a grid of admin cards: the
// trainer still had to open Training, Check-ins, Nutrition and Payments to
// answer "how is this client doing?". This renders one server read instead,
// and each card says only what its own section holds. A card with no data
// says so; it never shows a zero that looks like a measurement.

import Link from 'next/link';
import {
  Activity, AlertTriangle, CalendarCheck, CheckCircle, ChevronRight,
  Dumbbell, IndianRupee, RefreshCw, Salad, Sparkles, TrendingDown,
  TrendingUp, Wallet,
} from 'lucide-react';
import { cardSurfaceGlow } from '@/components/ui';
import { PremiumAreaChart } from '@/components/visualizations';
import { fmtDateMedium, fmtMoney } from '@/lib/format';
import { amber, emerald, indigo, red } from '@/lib/palette';
import { tones, type Tone } from '@/components/profile/profileTheme';
import type { Client360 } from '@/lib/api';

export type Client360State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: Client360 };

const OK = tones.lime;
const WARN = tones.gold;
const BAD = tones.berry;
const NEUTRAL = tones.sky;

const n = (value: number | null | undefined, suffix = '') =>
  (value === null || value === undefined ? '—' : `${value}${suffix}`);

const pct = (value: number | null | undefined) => n(value, '%');

function DashCard({
  title, icon, tint, action, children, className = '',
}: {
  title: string; icon: React.ReactNode; tint: Tone;
  action?: React.ReactNode; children: React.ReactNode; className?: string;
}) {
  return (
    <section className={`overflow-hidden rounded-[24px] ${className}`} style={cardSurfaceGlow(tint.glow)}>
      <header className="flex items-center justify-between gap-3 px-5 pb-3 pt-4">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] text-white"
            style={{ background: `linear-gradient(145deg, ${tint.from}, ${tint.to})` }}
            aria-hidden
          >
            {icon}
          </span>
          <h2 className="truncate text-[15px] font-[720] tracking-[-0.01em]" style={{ color: 'var(--text-primary)' }}>{title}</h2>
        </div>
        {action}
      </header>
      <div className="px-5 pb-5">{children}</div>
    </section>
  );
}

function Stat({ label, value, sub, tint }: {
  label: string; value: string; sub?: string | null; tint: Tone;
}) {
  return (
    <div
      className="min-w-0 rounded-[18px] p-3"
      style={{ background: `linear-gradient(160deg, ${tint.wash}, transparent)`, border: `1px solid ${tint.wash}` }}
    >
      <p className="text-[10.5px] font-[700] uppercase tracking-[0.06em]" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className="mt-1 break-words text-[20px] font-[800] leading-tight tracking-[-0.02em] tabular-nums" style={{ color: 'var(--text-primary)' }}>{value}</p>
      {sub && <p className="mt-0.5 truncate text-[11px] font-[560]" style={{ color: 'var(--text-muted)' }}>{sub}</p>}
    </div>
  );
}

function Bar({ value, tint, label }: { value: number; tint: Tone; label: string }) {
  const width = Math.max(0, Math.min(100, value));
  return (
    <div className="h-2 w-full overflow-hidden rounded-full" style={{ background: 'var(--bg-subtle)' }}
      role="progressbar" aria-label={label} aria-valuenow={width} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full" style={{ width: `${width}%`, background: `linear-gradient(90deg, ${tint.from}, ${tint.to})` }} />
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-[12.5px] font-[560]" style={{ color: 'var(--text-muted)' }}>{children}</p>;
}

function More({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1 text-[12px] font-[700]" style={{ color: indigo[500] }}>
      {children}<ChevronRight size={13} aria-hidden />
    </Link>
  );
}

function Skeleton() {
  return (
    <div aria-label="Loading client dashboard" aria-busy="true" className="grid grid-cols-1 gap-4 lg:grid-cols-6">
      <div className="lg:col-span-6 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-[86px] animate-pulse rounded-[18px]" style={{ background: 'var(--bg-subtle)' }} />
        ))}
      </div>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className={`h-[180px] animate-pulse rounded-[24px] lg:col-span-3 ${i % 2 ? 'lg:col-span-2' : ''}`} style={{ background: 'var(--bg-subtle)' }} />
      ))}
    </div>
  );
}

export default function Client360Dashboard({
  clientId, state, onRetry,
}: { clientId: string; state: Client360State; onRetry: () => void }) {
  if (state.status === 'loading') return <Skeleton />;

  if (state.status === 'error') {
    return (
      <div role="alert" className="flex flex-col items-start gap-3 rounded-[24px] p-5"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2 text-[13.5px] font-[650]" style={{ color: 'var(--text-primary)' }}>
          <AlertTriangle size={16} style={{ color: red[500] }} aria-hidden />
          {state.message}
        </div>
        <button type="button" onClick={onRetry}
          className="inline-flex h-[40px] items-center gap-2 rounded-full px-4 text-[12.5px] font-[700] text-white"
          style={{ background: `linear-gradient(135deg, ${indigo[500]}, ${indigo[600]})` }}>
          <RefreshCw size={14} aria-hidden /> Retry
        </button>
      </div>
    );
  }

  const d = state.data;
  const k = d.kpis;
  const weightPoints = [...d.progress.weight_series].reverse().map((p) => ({
    date: fmtDateMedium(p.on),
    weight: p.kg,
  }));
  const change = k.weight_change_kg;
  const changeTint = change === null ? NEUTRAL : change < 0 ? OK : change > 0 ? WARN : NEUTRAL;
  const scores = [
    ['Strength', d.assessment.capacity.strength],
    ['Cardio', d.assessment.capacity.cardio],
    ['Endurance', d.assessment.capacity.endurance],
    ['Flexibility', d.assessment.capacity.flexibility],
  ] as const;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-6">

      {/* ── KPIs ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:col-span-6 lg:grid-cols-6">
        <Stat label="Weight" value={n(k.weight_kg, ' kg')}
          sub={change === null ? null : `${change > 0 ? '+' : ''}${change} kg since ${fmtDateMedium(k.weight_change_since)}`}
          tint={changeTint} />
        <Stat label="Body fat" value={pct(k.body_fat_pct)} sub={k.bmi === null ? null : `BMI ${k.bmi}`} tint={NEUTRAL} />
        <Stat label="Sessions left" value={n(k.sessions_remaining)} sub={d.attendance.packages.length ? `${d.attendance.packages.length} active package${d.attendance.packages.length === 1 ? '' : 's'}` : 'No active package'} tint={OK} />
        <Stat label="Attendance · 30d" value={n(k.attendance_30d)} sub={`${d.attendance.last_90d} in 90 days`} tint={tones.indigo} />
        <Stat label="Workout adherence" value={pct(k.workout_adherence_pct)} sub={`${d.training.completed_28d}/${d.training.sessions_28d} logged`} tint={WARN} />
        <Stat label="Outstanding" value={k.outstanding_balance === null ? '—' : fmtMoney(k.outstanding_balance)}
          sub={k.outstanding_balance === null ? null : d.membership.due_status === 'OVERDUE' ? 'Overdue' : d.membership.due_status === 'DUE' ? 'Due' : 'Cleared'}
          tint={k.outstanding_balance === null ? NEUTRAL : k.outstanding_balance ? BAD : OK} />
      </div>

      {/* ── Assessment ───────────────────────────────────────────────────── */}
      <DashCard title="Fitness assessment" icon={<Activity size={16} />} tint={tones.indigo} className="lg:col-span-2"
        action={<More href={`/pt-os/assessment?client_id=${clientId}`}>Open</More>}>
        {d.assessment.present ? (
          <>
            <div className="flex items-end justify-between gap-2">
              <div>
                <p className="text-[30px] font-[800] leading-none tracking-[-0.03em] tabular-nums" style={{ color: 'var(--text-primary)' }}>
                  {n(d.assessment.capacity.overall)}
                </p>
                <p className="mt-1 text-[11.5px] font-[600]" style={{ color: 'var(--text-muted)' }}>
                  Fitness score{d.assessment.overall_max ? ` / ${d.assessment.overall_max}` : ''}
                </p>
              </div>
              <p className="text-[11.5px] font-[600]" style={{ color: 'var(--text-muted)' }}>{fmtDateMedium(d.assessment.as_of)}</p>
            </div>
            <div className="mt-4 space-y-2.5">
              {scores.map(([label, score]) => (
                <div key={label}>
                  <div className="mb-1 flex items-center justify-between text-[11.5px] font-[650]" style={{ color: 'var(--text-muted)' }}>
                    <span>{label}</span>
                    <span className="tabular-nums" style={{ color: 'var(--text-primary)' }}>
                      {score?.score === null || score?.score === undefined ? '—' : `${score.score}${score.max ? `/${score.max}` : ''}`}
                    </span>
                  </div>
                  <Bar value={score?.max ? ((score.score ?? 0) / score.max) * 100 : 0} tint={tones.indigo} label={`${label} score`} />
                </div>
              ))}
            </div>
          </>
        ) : (
          <Empty>No fitness assessment yet.</Empty>
        )}
      </DashCard>

      {/* ── Training ─────────────────────────────────────────────────────── */}
      <DashCard title="Training" icon={<Dumbbell size={16} />} tint={tones.lime} className="lg:col-span-2"
        action={<More href={`/pt-os/clients/${clientId}/workout-log`}>Log</More>}>
        {d.training.present ? (
          <>
            <p className="truncate text-[15px] font-[750]" style={{ color: 'var(--text-primary)' }}>{d.training.plan_name || 'Assigned programme'}</p>
            <p className="mt-0.5 text-[11.5px] font-[600]" style={{ color: 'var(--text-muted)' }}>
              Started {fmtDateMedium(d.training.started_on)}
            </p>
            <div className="mt-3">
              <Bar value={d.training.progress_pct ?? 0} tint={tones.lime} label="Programme progress" />
              <div className="mt-1 flex justify-between text-[11px] font-[600]" style={{ color: 'var(--text-muted)' }}>
                <span>Programme</span><span className="tabular-nums">{pct(d.training.progress_pct)}</span>
              </div>
            </div>
          </>
        ) : (
          <Empty>No programme assigned.</Empty>
        )}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div>
            <p className="text-[18px] font-[800] tabular-nums" style={{ color: 'var(--text-primary)' }}>{d.training.completed_28d}/{d.training.sessions_28d}</p>
            <p className="text-[10.5px] font-[650] uppercase tracking-[0.05em]" style={{ color: 'var(--text-muted)' }}>Sessions · 28d</p>
          </div>
          <div>
            <p className="text-[18px] font-[800] tabular-nums" style={{ color: 'var(--text-primary)' }}>{pct(d.training.adherence_pct)}</p>
            <p className="text-[10.5px] font-[650] uppercase tracking-[0.05em]" style={{ color: 'var(--text-muted)' }}>Adherence</p>
          </div>
        </div>
        {d.training.last_session && (
          <p className="mt-3 text-[11.5px] font-[600]" style={{ color: 'var(--text-muted)' }}>
            Last session {fmtDateMedium(d.training.last_session.date)}
          </p>
        )}
      </DashCard>

      {/* ── Nutrition ────────────────────────────────────────────────────── */}
      <DashCard title="Nutrition" icon={<Salad size={16} />} tint={tones.mint} className="lg:col-span-2"
        action={<More href={`/pt-os/diet-plans?client_id=${clientId}`}>Plan</More>}>
        {d.nutrition.present ? (
          <>
            <p className="truncate text-[15px] font-[750]" style={{ color: 'var(--text-primary)' }}>{d.nutrition.plan_name || 'Active diet plan'}</p>
            <div className="mt-3 grid grid-cols-4 gap-1.5">
              {[
                ['kcal', d.nutrition.targets?.calories],
                ['P', d.nutrition.targets?.protein_g],
                ['C', d.nutrition.targets?.carbs_g],
                ['F', d.nutrition.targets?.fats_g],
              ].map(([label, value]) => (
                <div key={label} className="rounded-[12px] px-2 py-1.5" style={{ background: 'var(--bg-subtle)' }}>
                  <p className="text-[13px] font-[750] tabular-nums" style={{ color: 'var(--text-primary)' }}>{n(value as number | null)}</p>
                  <p className="text-[9.5px] font-[700] uppercase tracking-[0.05em]" style={{ color: 'var(--text-muted)' }}>{label}</p>
                </div>
              ))}
            </div>
          </>
        ) : (
          <Empty>No diet plan assigned.</Empty>
        )}
        <div className="mt-3">
          <Bar value={d.nutrition.adherence_pct ?? 0} tint={tones.mint} label="Nutrition logging adherence" />
          <div className="mt-1 flex justify-between text-[11px] font-[600]" style={{ color: 'var(--text-muted)' }}>
            <span>{d.nutrition.logged_days_7d}/7 days logged</span>
            <span className="tabular-nums">{pct(d.nutrition.adherence_pct)}</span>
          </div>
        </div>
        {d.nutrition.avg_calories_7d !== null && (
          <p className="mt-2 text-[11.5px] font-[600]" style={{ color: 'var(--text-muted)' }}>
            {d.nutrition.avg_calories_7d} kcal average
          </p>
        )}
      </DashCard>

      {/* ── Progress + goal ──────────────────────────────────────────────── */}
      <DashCard title="Progress & goal" icon={<TrendingUp size={16} />} tint={tones.sky} className="lg:col-span-4"
        action={<More href={`/pt-os/progress?client_id=${clientId}`}>Progress</More>}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            {weightPoints.length >= 2 ? (
              <>
                <PremiumAreaChart
                  data={weightPoints as Record<string, unknown>[]}
                  xKey="date"
                  areas={[{ key: 'weight', label: 'Weight (kg)', color: emerald[500] }]}
                  height={110}
                  formatValue={(v) => `${v} kg`}
                  yMin="auto"
                  bordered={false}
                  ariaLabel="Weight trend"
                />
                <p className="sr-only">
                  Weight trend: {weightPoints[0].weight} kg on {weightPoints[0].date} to {weightPoints[weightPoints.length - 1].weight} kg on {weightPoints[weightPoints.length - 1].date}.
                </p>
              </>
            ) : (
              <Empty>Two readings are needed for a trend.</Empty>
            )}
          </div>
          <div className="flex flex-col justify-center">
            {d.goals.primary.present ? (
              <>
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-[13px] font-[700]" style={{ color: 'var(--text-primary)' }}>{d.goals.primary.goal_type || 'Goal'}</p>
                  <p className="text-[11.5px] font-[600] tabular-nums" style={{ color: 'var(--text-muted)' }}>
                    {d.goals.primary.current_kg ?? '—'} → {d.goals.primary.target_kg ?? '—'} kg
                  </p>
                </div>
                <div className="mt-2">
                  <Bar value={d.goals.primary.pct ?? 0} tint={tones.sky} label="Goal progress" />
                </div>
                <p className="mt-1.5 text-[11.5px] font-[600]" style={{ color: 'var(--text-muted)' }}>
                  {d.goals.primary.pct === null || d.goals.primary.pct === undefined
                    ? 'Not enough readings to measure progress.'
                    : `${d.goals.primary.pct}% of the way there${d.goals.primary.remaining_kg !== null && d.goals.primary.remaining_kg !== undefined ? ` · ${Math.abs(d.goals.primary.remaining_kg)} kg to go` : ''}`}
                </p>
              </>
            ) : (
              <Empty>No goal set.</Empty>
            )}
            <div className="mt-3 grid grid-cols-2 gap-2 text-[11.5px] font-[600]" style={{ color: 'var(--text-muted)' }}>
              <span>Body fat <b style={{ color: 'var(--text-primary)' }}>{pct(d.progress.measurements.body_fat_pct)}</b></span>
              <span>Waist <b style={{ color: 'var(--text-primary)' }}>{n(d.progress.measurements.waist_cm, ' cm')}</b></span>
            </div>
          </div>
        </div>
      </DashCard>

      {/* ── Attendance ───────────────────────────────────────────────────── */}
      <DashCard title="Attendance & sessions" icon={<CalendarCheck size={16} />} tint={tones.gold} className="lg:col-span-2"
        action={<More href={`/pt-os/session-balance?client_id=${clientId}`}>Balance</More>}>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-[14px] p-2.5" style={{ background: 'var(--bg-subtle)' }}>
            <p className="text-[18px] font-[800] tabular-nums" style={{ color: 'var(--text-primary)' }}>{d.attendance.last_30d}</p>
            <p className="text-[10px] font-[700] uppercase tracking-[0.05em]" style={{ color: 'var(--text-muted)' }}>Visits · 30d</p>
          </div>
          <div className="rounded-[14px] p-2.5" style={{ background: 'var(--bg-subtle)' }}>
            <p className="text-[18px] font-[800] tabular-nums" style={{ color: 'var(--text-primary)' }}>{d.attendance.last_90d}</p>
            <p className="text-[10px] font-[700] uppercase tracking-[0.05em]" style={{ color: 'var(--text-muted)' }}>Visits · 90d</p>
          </div>
        </div>
        {d.attendance.packages.length ? (
          <div className="mt-3 space-y-2">
            {d.attendance.packages.slice(0, 3).map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-2 text-[12px] font-[650]">
                <span className="truncate" style={{ color: 'var(--text-primary)' }}>{p.name || 'PT package'}</span>
                <span className="shrink-0 tabular-nums" style={{ color: p.remaining_sessions && p.remaining_sessions <= 3 ? amber[600] : 'var(--text-muted)' }}>
                  {p.remaining_sessions}/{p.total_sessions} left
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-3"><Empty>No active session package.</Empty></div>
        )}
      </DashCard>

      {/* ── Finance ──────────────────────────────────────────────────────── */}
      <DashCard title="Finance" icon={<Wallet size={16} />} tint={tones.berry} className="lg:col-span-2"
        action={<More href={`/pt-os/clients/${clientId}?tab=payments`}>Payments</More>}>
        <p className="text-[28px] font-[800] leading-none tracking-[-0.03em] tabular-nums"
          style={{ color: d.finance.outstanding ? red[600] : 'var(--text-primary)' }}>
          {d.finance.outstanding === null ? '—' : fmtMoney(d.finance.outstanding)}
        </p>
        <p className="mt-1 text-[11.5px] font-[600]" style={{ color: 'var(--text-muted)' }}>
          {d.finance.outstanding === null ? 'No term recorded' : d.finance.outstanding ? 'Outstanding this term' : 'Term cleared'}
        </p>
        {d.finance.recent_payments.slice(0, 2).map((p) => (
          <div key={p.id} className="mt-2 flex items-center justify-between gap-2 text-[11.5px] font-[600]">
            <span className="truncate" style={{ color: 'var(--text-muted)' }}>{fmtDateMedium(p.date)} · {p.method || 'Payment'}</span>
            <span className="shrink-0 tabular-nums" style={{ color: 'var(--text-primary)' }}>{fmtMoney(p.amount)}</span>
          </div>
        ))}
      </DashCard>

      {/* ── Timeline ─────────────────────────────────────────────────────── */}
      <DashCard title="Recent activity" icon={<TrendingDown size={16} />} tint={tones.violet} className="lg:col-span-4">
        {d.timeline.length ? (
          <ol className="space-y-2.5">
            {d.timeline.slice(0, 8).map((e) => (
              <li key={e.id} className="flex items-start gap-3">
                <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full" style={{ background: 'var(--bg-subtle)', color: indigo[500] }} aria-hidden>
                  {e.kind === 'payment' ? <IndianRupee size={12} /> : e.kind === 'workout' ? <Dumbbell size={12} /> : e.kind === 'nutrition' ? <Salad size={12} /> : e.kind === 'assessment' ? <Activity size={12} /> : <CheckCircle size={12} />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12.5px] font-[650]" style={{ color: 'var(--text-primary)' }}>{e.title}</p>
                  <p className="truncate text-[11px] font-[560]" style={{ color: 'var(--text-muted)' }}>
                    {[fmtDateMedium(e.at), e.detail].filter(Boolean).join(' · ')}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <Empty>No recent activity.</Empty>
        )}
      </DashCard>

      {/* ── Insights ─────────────────────────────────────────────────────── */}
      <DashCard title="Insights" icon={<Sparkles size={16} />} tint={tones.indigo} className="lg:col-span-6"
        action={<More href={`/pt-os/clients/${clientId}?tab=ai`}>Ask AI</More>}>
        {d.alerts.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {d.alerts.slice(0, 4).map((a) => (
              <span key={a.id} className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-[700]"
                style={{
                  background: a.severity === 'critical' ? 'rgba(185,28,28,0.10)' : a.severity === 'warning' ? 'rgba(180,120,10,0.10)' : 'var(--bg-subtle)',
                  color: a.severity === 'critical' ? red[600] : a.severity === 'warning' ? amber[600] : 'var(--text-muted)',
                }}>
                <AlertTriangle size={11} aria-hidden />{a.label}
              </span>
            ))}
          </div>
        )}
        {d.insights.length ? (
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {d.insights.slice(0, 4).map((i) => (
              <li key={i.id} className="rounded-[14px] p-3" style={{ background: 'var(--bg-subtle)' }}>
                <p className="flex items-start gap-2 text-[12.5px] font-[650]" style={{ color: 'var(--text-primary)' }}>
                  {i.tone === 'good'
                    ? <TrendingUp size={14} className="mt-0.5 shrink-0" style={{ color: emerald[600] }} aria-hidden />
                    : <AlertTriangle size={14} className="mt-0.5 shrink-0" style={{ color: amber[600] }} aria-hidden />}
                  {i.text}
                </p>
                <p className="mt-1 text-[10.5px] font-[560]" style={{ color: 'var(--text-muted)' }}>{i.because}</p>
              </li>
            ))}
          </ul>
        ) : d.alerts.length === 0 ? (
          <Empty>Nothing flagged.</Empty>
        ) : null}
        {d.completeness.missing.length > 0 && (
          <p className="mt-3 text-[11px] font-[560]" style={{ color: 'var(--text-muted)' }}>
            Missing: {d.completeness.missing.join(', ')} · {d.completeness.pct}% complete
          </p>
        )}
      </DashCard>
    </div>
  );
}
