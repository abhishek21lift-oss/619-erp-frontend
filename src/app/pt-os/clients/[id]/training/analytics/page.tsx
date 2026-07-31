'use client';

// Client Profile → Training → Progress Analytics.
//
// Entirely a view over data that already exists. The backend computes
// per-session volume, best set and estimated 1RM
// (workout-log.routes.js /workout-log/progress and /volume-summary), and
// api.progress.workoutLog wraps both with typed points. Nothing is aggregated here
// that the server has not already aggregated.
//
// ── Chart rules ────────────────────────────────────────────────────────────
//
// One measure per chart, and never a dual axis. Volume (kg × reps, tens of
// thousands) and estimated 1RM (kg, tens) share no scale, so plotting them
// together would need two y-axes — which makes any crossing point meaningless
// and is the single most common way a progress chart misleads. Two charts.
//
// Bars are zero-anchored: a truncated axis on training volume turns an ordinary
// week into a cliff.

import { use, useCallback, useEffect, useMemo, useState } from 'react';
import { m } from 'framer-motion';
import { Loader2, TrendingUp, Trophy, Activity } from 'lucide-react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { EmptyState, PremiumAreaChart, PremiumBarChart } from '@/components/ui';
import AdherencePanel from '@/components/pt-os/analytics/AdherencePanel';
import MusclePanel from '@/components/pt-os/analytics/MusclePanel';
import PrTimeline from '@/components/pt-os/analytics/PrTimeline';
import LandmarkEditor from '@/components/pt-os/analytics/LandmarkEditor';
import WeeklyReport from '@/components/pt-os/analytics/WeeklyReport';
import { api } from '@/lib/api';
import type {
  WorkoutProgressPoint, WorkoutVolumePoint, WorkoutSession, TrainingAnalytics,
} from '@/lib/api';
import { useToast } from '@/lib/toast';

/** One hue for volume, one for strength. Fixed, so a measure keeps its colour. */
const VOLUME = '#2563eb';
const STRENGTH = '#7c3aed';

const shortDate = (d: string) => {
  const dt = new Date(d);
  return Number.isNaN(dt.getTime())
    ? d
    : dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
};

export default function TrainingAnalyticsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: clientId } = use(params);
  const { toast } = useToast();

  const [volume, setVolume] = useState<WorkoutVolumePoint[]>([]);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [exerciseNames, setExerciseNames] = useState<string[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [progress, setProgress] = useState<WorkoutProgressPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(false);
  const [stats, setStats] = useState<TrainingAnalytics | null>(null);
  const [editingRanges, setEditingRanges] = useState(false);

  /** Adherence, records and per-muscle sets. Re-read after a range edit. */
  const loadStats = useCallback(async () => {
    try {
      const { data } = await api.progress.workoutLog.analytics({ client_id: clientId, weeks: 12 });
      setStats(data);
    } catch {
      // The charts below stand on their own; a failed analytics call should
      // cost the panels, not the page.
      setStats(null);
    }
  }, [clientId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [vol, sess] = await Promise.all([
          api.progress.workoutLog.volumeSummary({ client_id: clientId }).catch(() => ({ data: [] })),
          api.progress.workoutLog.sessions.list({ client_id: clientId, limit: 50 }).catch(() => ({ data: [] })),
          loadStats(),
        ]);
        if (cancelled) return;
        setVolume(vol.data ?? []);
        setSessions(sess.data ?? []);
      } catch {
        if (!cancelled) toast.error('Could not load training analytics');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [clientId, toast, loadStats]);

  // Exercise choices come from what this client has actually logged. Offering
  // the whole library would mostly offer exercises with no data behind them.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const names = new Set<string>();
      // Only the most recent handful — enough to populate the picker without
      // fetching every session detail the client has ever recorded.
      for (const s of sessions.slice(0, 10)) {
        try {
          const { data } = await api.progress.workoutLog.sessions.get(s.id);
          for (const ex of data.exercises ?? []) names.add(ex.exercise_name);
        } catch { /* a single unreadable session should not empty the picker */ }
        if (cancelled) return;
      }
      if (cancelled) return;
      const list = [...names].sort();
      setExerciseNames(list);
      setSelected((cur) => cur || list[0] || '');
    })();
    return () => { cancelled = true; };
  }, [sessions]);

  useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    setLoadingProgress(true);
    (async () => {
      try {
        const { data } = await api.progress.workoutLog.progress({
          client_id: clientId, exercise_name: selected,
        });
        if (!cancelled) setProgress(data ?? []);
      } catch {
        if (!cancelled) setProgress([]);
      } finally {
        if (!cancelled) setLoadingProgress(false);
      }
    })();
    return () => { cancelled = true; };
  }, [clientId, selected]);

  const volumeData = useMemo(
    () => volume.map((v) => ({ period: shortDate(v.period), volume: v.volume })),
    [volume],
  );

  const strengthData = useMemo(
    () => progress
      .filter((p) => p.est_1rm != null)
      .map((p) => ({ date: shortDate(p.session_date), est_1rm: p.est_1rm as number })),
    [progress],
  );

  const totals = useMemo(() => {
    const kg = volume.reduce((s, v) => s + Number(v.volume || 0), 0);
    const count = volume.reduce((s, v) => s + Number(v.session_count || 0), 0);
    return { kg, count };
  }, [volume]);

  const best = useMemo(() => {
    if (!progress.length) return null;
    return progress.reduce((b, p) => (p.best_weight > b.best_weight ? p : b));
  }, [progress]);

  return (
    <Guard roles={['admin', 'manager', 'trainer']}>
      <AppShell>
        <div className="mx-auto max-w-screen-md px-4 py-4">
          <h1 className="text-[20px] font-[800]" style={{ color: 'var(--text-primary)' }}>
            Progress Analytics
          </h1>
          <p className="mb-4 mt-0.5 text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
            Built from logged sessions — not from the plan.
          </p>

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 size={24} className="animate-spin" style={{ color: 'var(--brand)' }} />
            </div>
          ) : volume.length === 0 && sessions.length === 0 && !stats?.plan ? (
            // Only truly empty when there is no log AND no programme. A client
            // on a plan who has logged nothing is not an empty screen — they
            // are a client at 0% attendance, which is the single most useful
            // thing this page can say about them.
            <EmptyState
              icon={<Activity size={22} />}
              title="Nothing logged yet"
              description="Analytics appear once this client has completed workouts in the Workout Log."
            />
          ) : (
            <div className="flex flex-col gap-4">
              {/* Attendance first: it is the question asked most often, and the
                  only one whose answer changes what the trainer does today. */}
              {stats && (
                <AdherencePanel
                  adherence={stats.adherence}
                  thisWeek={stats.this_week}
                  planName={stats.plan?.name}
                />
              )}

              <div className="grid grid-cols-2 gap-3">
                <Stat label="Total volume" value={`${Math.round(totals.kg).toLocaleString('en-IN')} kg`} tone={VOLUME} />
                <Stat label="Sessions logged" value={String(totals.count)} tone={STRENGTH} />
              </div>

              {/* ── Volume over time ── */}
              <Panel title="Training volume" icon={<TrendingUp size={14} />} tone={VOLUME}>
                {volumeData.length === 0 ? (
                  <Muted>No volume recorded yet.</Muted>
                ) : (
                  <PremiumBarChart
                    data={volumeData as unknown as Record<string, unknown>[]}
                    xKey="period"
                    bars={[{ key: 'volume', label: 'Volume (kg)', color: VOLUME }]}
                    height={180}
                    formatValue={(v) => `${Math.round(v).toLocaleString('en-IN')} kg`}
                  />
                )}
              </Panel>

              {/* ── Estimated 1RM, per exercise ──
                  Its own chart, not a second axis on the one above. */}
              <Panel title="Estimated 1RM" icon={<TrendingUp size={14} />} tone={STRENGTH}>
                {exerciseNames.length > 0 && (
                  <div className="-mx-1 mb-3 flex gap-1.5 overflow-x-auto px-1 pb-1">
                    {exerciseNames.map((n) => {
                      const active = n === selected;
                      return (
                        <button
                          key={n}
                          onClick={() => setSelected(n)}
                          className="h-[44px] shrink-0 rounded-[12px] px-3 text-[12.5px] font-[700] transition-colors"
                          style={{
                            background: active ? STRENGTH : 'var(--bg-subtle)',
                            color: active ? '#fff' : 'var(--text-muted)',
                          }}
                        >
                          {n}
                        </button>
                      );
                    })}
                  </div>
                )}

                {loadingProgress ? (
                  <div className="flex justify-center py-10">
                    <Loader2 size={18} className="animate-spin" style={{ color: 'var(--brand)' }} />
                  </div>
                ) : strengthData.length < 2 ? (
                  // One point is not a trend. Saying so is more useful than
                  // drawing a line through a single dot.
                  <Muted>
                    {strengthData.length === 0
                      ? 'No completed sets with weight and reps for this exercise yet.'
                      : 'Only one session logged — a trend needs at least two.'}
                  </Muted>
                ) : (
                  <PremiumAreaChart
                    data={strengthData as unknown as Record<string, unknown>[]}
                    xKey="date"
                    areas={[{ key: 'est_1rm', label: 'Est. 1RM (kg)', color: STRENGTH }]}
                    height={180}
                    formatValue={(v) => `${v.toFixed(1)} kg`}
                  />
                )}
              </Panel>

              {/* ── Sets per muscle, against the studio's ranges ── */}
              {stats && (
                <MusclePanel
                  muscles={stats.muscles}
                  unattributedSets={stats.unattributed_sets}
                  weeks={stats.weeks}
                  onEditRanges={() => setEditingRanges(true)}
                />
              )}

              {/* ── Personal records ── */}
              {stats && <PrTimeline prs={stats.prs} />}

              {/* ── The week's report ── */}
              <WeeklyReport clientId={clientId} stats={stats} />

              {/* ── Best set ── */}
              {best && (
                <Panel title="Best set" icon={<Trophy size={14} />} tone="#d97706">
                  <div className="flex items-baseline gap-2">
                    <span className="text-[24px] font-[860]" style={{ color: 'var(--text-primary)' }}>
                      {best.best_weight} kg
                    </span>
                    <span className="text-[13px] font-[650]" style={{ color: 'var(--text-muted)' }}>
                      × {best.best_reps} reps
                    </span>
                  </div>
                  <p className="mt-1 text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
                    {selected} · {shortDate(best.session_date)}
                  </p>
                </Panel>
              )}
            </div>
          )}
        </div>

        <LandmarkEditor
          open={editingRanges}
          onClose={() => setEditingRanges(false)}
          // Re-read so the verdicts above match the ranges just edited. Doing
          // it on close rather than per field keeps one refetch instead of one
          // per keystroke.
          onSaved={loadStats}
        />
      </AppShell>
    </Guard>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <m.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-[18px] p-4"
      style={{ background: 'var(--bg-card)', border: `1px solid ${tone}28` }}
    >
      <p className="text-[19px] font-[860]" style={{ color: 'var(--text-primary)' }}>{value}</p>
      <p className="mt-0.5 text-[11px] font-[650]" style={{ color: 'var(--text-muted)' }}>{label}</p>
    </m.div>
  );
}

function Panel({
  title, icon, tone, children,
}: { title: string; icon: React.ReactNode; tone: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-[20px] p-4"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      <div className="mb-3 flex items-center gap-2">
        <div
          className="flex h-7 w-7 items-center justify-center rounded-[8px]"
          style={{ background: `${tone}20`, color: tone }}
        >
          {icon}
        </div>
        <span className="text-[12.5px] font-[700]" style={{ color: 'var(--text-primary)' }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

const Muted = ({ children }: { children: React.ReactNode }) => (
  <p className="py-6 text-center text-[12.5px]" style={{ color: 'var(--text-muted)' }}>{children}</p>
);
