'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { m } from 'framer-motion';
import {
  Zap, Loader2, TrendingUp, AlertCircle, Plus, ChevronDown, History,
} from 'lucide-react';
import Guard from '@/components/Guard';
import { Button, PageContainer, PageHero } from '@/components/ui';
import ClientPicker from '@/components/pt-os/shared/ClientPicker';
import { PremiumSparkline } from '@/components/visualizations';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { calc1RM, classifyStrength } from '@/lib/fitness-calculations';
import type { Gender, FitnessCategory } from '@/lib/fitness-calculations';

interface StrengthLog {
  id: string; client_id: string; exercise_name: string;
  weight_kg: number; sets_done: number; reps_done: number;
  one_rm_estimate: number | null; log_date: string; notes?: string | null;
}

// Exercises with published relative-strength norms in fitness-calculations.ts
// (Bench Press/Squat/Deadlift/Shoulder Press/Leg Press) get a Strength Level
// badge. Bodyweight/isometric moves (Pull Up, Push Up, Lunges, Plank, Side
// Plank, Curl Up) still log weight/reps and get a 1RM estimate where that's
// meaningful, but no fabricated ratio-based level — there's no norms table
// for them, and guessing one would be dishonest precision.
const EXERCISES_WITH_NORMS = new Set(['Bench Press', 'Squat', 'Deadlift', 'Shoulder Press', 'Leg Press']);

const CATEGORIES: { label: string; exercises: string[] }[] = [
  { label: 'Upper Body', exercises: ['Bench Press', 'Shoulder Press', 'Pull Up', 'Push Up'] },
  { label: 'Lower Body', exercises: ['Squat', 'Deadlift', 'Leg Press', 'Lunges'] },
  { label: 'Core', exercises: ['Plank', 'Side Plank', 'Curl Up'] },
];

const CATEGORY_COLOR: Record<string, string> = { 'Upper Body': '#f59e0b', 'Lower Body': '#0067e0', Core: '#059669' };

const LEVEL_STYLE: Record<FitnessCategory, { bg: string; color: string }> = {
  Excellent: { bg: 'rgba(16,185,129,0.14)', color: '#059669' },
  Good: { bg: 'rgba(245,158,11,0.14)', color: '#d97706' },
  Average: { bg: 'rgba(245,158,11,0.14)', color: '#f59e0b' },
  'Below Average': { bg: 'rgba(239,68,68,0.12)', color: '#dc2626' },
  Poor: { bg: 'rgba(220,38,38,0.16)', color: '#b91c1c' },
};

export default function StrengthTrackingPage() {
  return (
    <Guard>
      <Suspense fallback={<div className="flex min-h-[60vh] items-center justify-center"><Loader2 size={28} className="animate-spin" style={{ color: '#0067E0' }} /></div>}>
        <StrengthTrackingContent />
      </Suspense>
    </Guard>
  );
}

function StrengthTrackingContent() {
  const router = useRouter();
  const sp = useSearchParams();
  const clientId = sp.get('client_id') || '';

  if (!clientId) return <ClientPicker title="Strength Tracking" icon={<Zap size={20} color="#fff" />} basePath="/pt-os/strength-tracking" />;
  return <StrengthHub key={clientId} clientId={clientId} router={router} />;
}

/* ─────────────────────────────────────────────────────── HUB */
interface StrengthHubProps { clientId: string; router: ReturnType<typeof useRouter>; }

function StrengthHub({ clientId }: StrengthHubProps) {
  const { toast } = useToast();
  const [clientName, setClientName] = useState('');
  const [gender, setGender] = useState<Gender | null>(null);
  const [bodyWeightKg, setBodyWeightKg] = useState<number | null>(null);
  const [logs, setLogs] = useState<StrengthLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [clientRes, logsRes] = await Promise.all([
        api.pt.client(clientId) as Promise<{ data?: Record<string, unknown> }>,
        api.progress.strengthLogs.list({ client_id: clientId }) as Promise<{ data?: StrengthLog[] }>,
      ]);
      const c = clientRes?.data;
      if (!c) { setLoadError('Client not found.'); setLoading(false); return; }
      setClientName(String(c.name ?? ''));
      setGender((c.gender as Gender) || null);
      setBodyWeightKg(typeof c.weight === 'number' ? c.weight : null);
      setLogs(Array.isArray(logsRes?.data) ? logsRes.data : []);
    } catch (err: unknown) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load client.');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { loadData(); }, [loadData]);

  const latestByExercise = useMemo(() => {
    const out: Record<string, StrengthLog> = {};
    for (const l of logs) {
      if (!out[l.exercise_name] || l.log_date > out[l.exercise_name].log_date) out[l.exercise_name] = l;
    }
    return out;
  }, [logs]);

  // Oldest-first per exercise, for the trend sparkline — 1RM where the log
  // has one (the real measure of progress), the logged weight otherwise.
  const trendByExercise = useMemo(() => {
    const out: Record<string, { label: string; value: number }[]> = {};
    for (const l of [...logs].sort((a, b) => a.log_date.localeCompare(b.log_date))) {
      const v = l.one_rm_estimate ?? l.weight_kg;
      if (!Number.isFinite(v)) continue;
      (out[l.exercise_name] ??= []).push({ label: l.log_date, value: v });
    }
    return out;
  }, [logs]);

  const handleLog = async (exercise: string, weightKg: number, setsDone: number, repsDone: number) => {
    try {
      await api.progress.strengthLogs.create({
        client_id: clientId, exercise_name: exercise,
        weight_kg: weightKg, sets_done: setsDone, reps_done: repsDone,
      });
      toast.success(`${exercise} logged.`);
      loadData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to log lift.');
    }
  };

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 size={28} className="animate-spin" style={{ color: '#0067E0' }} /></div>;
  }
  if (loadError) {
    return (
      <div className="mx-auto max-w-md py-24 text-center">
        <AlertCircle size={32} style={{ color: '#ef4444', margin: '0 auto 12px' }} />
        <p className="text-[14px] font-[600] text-slate-600">{loadError}</p>
        <Button variant="outline" className="mt-4" onClick={loadData}>Retry</Button>
      </div>
    );
  }

  const sortedHistory = [...logs].sort((a, b) => b.log_date.localeCompare(a.log_date)).slice(0, 20);

  return (
    <PageContainer>
      <PageHero
        icon={<Zap size={20} />}
        title={`${clientName}'s Strength Progress`}
        subtitle="Strength Tracking"
      >
        {!bodyWeightKg && (
          <p className="text-[12.5px] font-[600]" style={{ color: '#FDE68A' }}>
            No bodyweight on file — Strength Level badges need it. Add a weight via Fitness Testing to unlock them.
          </p>
        )}
      </PageHero>

    <div className="mx-auto w-full max-w-4xl space-y-6">
      {CATEGORIES.map((cat) => (
        <div key={cat.label}>
          <div className="flex items-center gap-2 mb-3 px-1">
            <span className="h-2 w-2 rounded-full" style={{ background: CATEGORY_COLOR[cat.label] }} />
            <h2 className="text-[13px] font-[760] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{cat.label}</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {cat.exercises.map((ex) => (
              <ExerciseCard
                key={ex} exercise={ex} accent={CATEGORY_COLOR[cat.label]}
                latest={latestByExercise[ex]} trend={trendByExercise[ex]}
                gender={gender} bodyWeightKg={bodyWeightKg}
                onLog={(w, s, r) => handleLog(ex, w, s, r)}
              />
            ))}
          </div>
        </div>
      ))}

      <div className="rounded-[20px] p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2 mb-4">
          <History size={14} style={{ color: '#94a3b8' }} />
          <h2 className="text-[16px] font-[760]" style={{ color: 'var(--text-primary)' }}>Recent Lifts</h2>
        </div>
        {sortedHistory.length === 0 ? (
          <p className="text-center py-8 text-[13px]" style={{ color: 'var(--text-disabled)' }}>No lifts logged yet.</p>
        ) : (
          <div className="space-y-2">
            {sortedHistory.map((l) => (
              <div key={l.id} className="flex items-center justify-between gap-3 rounded-[12px] px-4 py-3" style={{ background: 'var(--bg-subtle)' }}>
                <div>
                  <span className="text-[13px] font-[700] text-slate-700">{l.exercise_name}</span>
                  <span className="ml-2 text-[11px] text-slate-400">{l.log_date}</span>
                </div>
                <div className="flex items-center gap-3 text-[12px]">
                  <span className="font-bold" style={{ color: '#f59e0b' }}>{l.weight_kg} kg</span>
                  <span style={{ color: 'var(--text-muted)' }}>{l.sets_done} × {l.reps_done}</span>
                  {l.one_rm_estimate != null && (
                    <span className="flex items-center gap-1" style={{ color: '#0067e0' }}>
                      <TrendingUp size={11} /> 1RM: {l.one_rm_estimate} kg
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
    </PageContainer>
  );
}

/* ─────────────────────────────────────────────────────── EXERCISE CARD */
interface ExerciseCardProps {
  exercise: string; accent: string;
  latest: StrengthLog | undefined;
  trend: { label: string; value: number }[] | undefined;
  gender: Gender | null; bodyWeightKg: number | null;
  onLog: (weightKg: number, setsDone: number, repsDone: number) => void;
}

function ExerciseCard({ exercise, accent, latest, trend, gender, bodyWeightKg, onLog }: ExerciseCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [weight, setWeight] = useState('');
  const [sets, setSets] = useState('3');
  const [reps, setReps] = useState('10');
  const [saving, setSaving] = useState(false);

  const previewOneRm = useMemo(() => calc1RM(parseFloat(weight) || null, parseInt(reps, 10) || null, 'epley'), [weight, reps]);

  const level = EXERCISES_WITH_NORMS.has(exercise) && latest?.one_rm_estimate != null
    ? classifyStrength(latest.one_rm_estimate, bodyWeightKg, exercise, gender)
    : null;

  const submit = async () => {
    const w = parseFloat(weight);
    if (!w) return;
    setSaving(true);
    try {
      await onLog(w, parseInt(sets, 10) || 3, parseInt(reps, 10) || 10);
      setWeight('');
      setExpanded(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-[16px] overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <button type="button" onClick={() => setExpanded((v) => !v)} className="flex w-full items-center justify-between px-4 py-3.5">
        <div className="text-left">
          <p className="text-[13.5px] font-[760] text-slate-900">{exercise}</p>
          {latest ? (
            <div className="mt-1 flex items-center gap-2 flex-wrap">
              <span className="text-[12px] font-[600]" style={{ color: accent }}>{latest.weight_kg} kg × {latest.reps_done}</span>
              {latest.one_rm_estimate != null && <span className="text-[11px] text-slate-400">1RM ~{latest.one_rm_estimate} kg</span>}
              {level && (
                <span className="rounded-full px-2 py-0.5 text-[10px] font-[700]" style={{ background: LEVEL_STYLE[level].bg, color: LEVEL_STYLE[level].color }}>
                  {level}
                </span>
              )}
            </div>
          ) : (
            <p className="mt-1 text-[11.5px] text-slate-400">No baseline logged yet</p>
          )}
        </div>
        <ChevronDown size={15} style={{ color: '#94a3b8', transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} />
      </button>

      {/* A trend needs at least two readings — one point is a number, not a
          shape, so the strip stays silent rather than draw a flat line. */}
      {trend && trend.length >= 2 && (
        <div className="px-4 pb-3">
          <PremiumSparkline data={trend} color={accent} metric={`${exercise} 1RM`} height={28} />
        </div>
      )}

      {expanded && (
        <div className="px-4 pb-4">
          <div className="grid grid-cols-3 gap-2 mb-2">
            <input type="number" step="0.5" placeholder="Weight (kg)" value={weight} onChange={(e) => setWeight(e.target.value)}
              className="rounded-[10px] px-3 py-2 text-[12.5px] outline-none" style={{ border: '1px solid #cbd5e1' }} />
            <input type="number" placeholder="Sets" value={sets} onChange={(e) => setSets(e.target.value)}
              className="rounded-[10px] px-3 py-2 text-[12.5px] outline-none" style={{ border: '1px solid #cbd5e1' }} />
            <input type="number" placeholder="Reps" value={reps} onChange={(e) => setReps(e.target.value)}
              className="rounded-[10px] px-3 py-2 text-[12.5px] outline-none" style={{ border: '1px solid #cbd5e1' }} />
          </div>
          {previewOneRm != null && (
            <p className="mb-2 text-[11.5px] font-[600]" style={{ color: accent }}>Est. 1RM: {previewOneRm} kg</p>
          )}
          <Button
            className="!w-full !py-2 !text-[12.5px]" iconLeft={<Plus size={12} />}
            disabled={!weight || saving} loading={saving}
            onClick={submit}
            style={{ background: `linear-gradient(135deg, ${accent}, ${accent})`, color: '#fff' }}
          >
            Log Lift
          </Button>
        </div>
      )}
    </div>
  );
}
