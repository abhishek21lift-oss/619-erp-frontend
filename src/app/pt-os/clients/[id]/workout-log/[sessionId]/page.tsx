'use client';

import { use, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { m, AnimatePresence } from 'framer-motion';
import {
  Plus, Trash2, Copy, Wand2, Check, Loader2, AlertCircle,
  Dumbbell, ChevronDown, Award, Clock, X, Minus, Pencil, ClipboardList, Layers,
} from 'lucide-react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { Button } from '@/components/ui';
import FloatInput from '@/components/ui/FloatInput';
import ExercisePicker from '@/components/pt-os/workout-log/ExercisePicker';
import SessionSummary from '@/components/pt-os/workout-log/SessionSummary';
import { api } from '@/lib/api';
import type { WorkoutSessionDetail, WorkoutSessionExercise, WorkoutSet, WorkoutPreviousExercise } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { fmtDate } from '@/lib/format';

const EASE = [0.16, 1, 0.3, 1] as const;

export default function WorkoutSessionPage({ params }: { params: Promise<{ id: string; sessionId: string }> }) {
  const { id, sessionId } = use(params);
  return <Guard><AppShell><SessionLogger clientId={id} sessionId={sessionId} /></AppShell></Guard>;
}

function SessionLogger({ clientId, sessionId }: { clientId: string; sessionId: string }) {
  const router = useRouter();
  const { toast } = useToast();

  const [session, setSession] = useState<WorkoutSessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [previousByExercise, setPreviousByExercise] = useState<Record<string, WorkoutPreviousExercise | null>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [savingHeader, setSavingHeader] = useState(false);
  const [headerOpen, setHeaderOpen] = useState(false);
  const [dayOptions, setDayOptions] = useState<string[]>([]);
  const [loadingPlanned, setLoadingPlanned] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);

  const loadSession = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const res = await api.progress.workoutLog.sessions.get(sessionId);
      const data = res?.data;
      if (!data) { setLoadError('Session not found.'); return; }
      setSession((prev) => {
        // First load only: a brand-new session (no program/day set yet) opens
        // the header form immediately so nothing blocks getting straight to it.
        if (!prev) setHeaderOpen(!data.program_name && !data.workout_day);
        return data;
      });
      setExpanded((prev) => {
        const next = { ...prev };
        data.exercises.forEach((ex) => { if (next[ex.id] === undefined) next[ex.id] = true; });
        return next;
      });
    } catch (err: unknown) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load session.');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => { loadSession(); }, [loadSession]);

  const fetchPrevious = useCallback(async (ex: WorkoutSessionExercise) => {
    if (previousByExercise[ex.id] !== undefined) return;
    try {
      const res = await api.progress.workoutLog.previous({
        client_id: clientId,
        exclude_session_id: sessionId,
        ...(ex.exercise_id ? { exercise_id: ex.exercise_id } : { exercise_name: ex.exercise_name }),
      });
      setPreviousByExercise((prev) => ({ ...prev, [ex.id]: res?.data ?? null }));
    } catch {
      setPreviousByExercise((prev) => ({ ...prev, [ex.id]: null }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, sessionId]);

  useEffect(() => {
    if (!session) return;
    session.exercises.forEach((ex) => { fetchPrevious(ex); });
  }, [session, fetchPrevious]);

  useEffect(() => {
    if (!session?.workout_assignment_id) { setDayOptions([]); return; }
    api.progress.workoutLog.sessions.plannedDayOptions(sessionId)
      .then((res) => setDayOptions(res?.data ?? []))
      .catch(() => setDayOptions([]));
  }, [session?.workout_assignment_id, sessionId]);

  const handleAddPlannedExercise = async (planned: NonNullable<WorkoutSessionDetail['planned']>['exercises'][number]) => {
    const already = session?.exercises.some((ex) => planned.exercise_id && ex.exercise_id === planned.exercise_id);
    if (already) return;
    const res = await api.progress.workoutLog.exercises.add(sessionId, {
      exercise_id: planned.exercise_id || null,
      exercise_name: planned.name,
    });
    const newExerciseId = res?.data?.id;
    if (newExerciseId) {
      for (let i = 1; i <= planned.sets; i++) {
        await api.progress.workoutLog.sets.add(newExerciseId, {
          set_number: i, reps: planned.reps, rest_seconds: planned.rest_seconds, completed: false,
          // The prescribed load for the week the client is actually in, which
          // the server resolved. Prefilling it is the entire payoff of the
          // progression rule: a trainer who has to retype "65" every set has
          // been given a spreadsheet, not a programme. It stays editable —
          // this is what was ASKED for, and the log records what was done.
          weight_kg: planned.target_weight ?? null,
          rpe: planned.rpe ?? null,
          tempo: planned.tempo ?? null,
        });
      }
    }
  };

  const handleLoadOnePlanned = async (planned: NonNullable<WorkoutSessionDetail['planned']>['exercises'][number]) => {
    setLoadingPlanned(true);
    try {
      await handleAddPlannedExercise(planned);
      await loadSession();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Could not load exercise.');
    } finally {
      setLoadingPlanned(false);
    }
  };

  const handleLoadAllPlanned = async () => {
    if (!session?.planned) return;
    setLoadingPlanned(true);
    try {
      for (const planned of session.planned.exercises) {
        await handleAddPlannedExercise(planned);
      }
      await loadSession();
      toast.success('Loaded today\'s plan into the session.');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Could not load plan.');
    } finally {
      setLoadingPlanned(false);
    }
  };

  const handleAddExercise = async (picked: { id: string; name: string }) => {
    try {
      const res = await api.progress.workoutLog.exercises.add(sessionId, {
        exercise_id: picked.id || null,
        exercise_name: picked.name,
      });
      if (res?.data) setExpanded((prev) => ({ ...prev, [res.data.id]: true }));
      await loadSession();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Could not add exercise.');
    }
  };

  const handleRemoveExercise = async (exerciseId: string) => {
    if (!window.confirm('Remove this exercise and all its logged sets?')) return;
    try {
      await api.progress.workoutLog.exercises.remove(exerciseId);
      await loadSession();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Could not remove exercise.');
    }
  };

  const handleHeaderSave = async (patch: Record<string, unknown>) => {
    if (!session) return;
    setSavingHeader(true);
    try {
      const res = await api.progress.workoutLog.sessions.update(session.id, patch);
      if (res?.data) setSession((prev) => (prev ? { ...prev, ...res.data } : prev));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Could not save.');
    } finally {
      setSavingHeader(false);
    }
  };

  // Finishing opens the summary rather than completing immediately. The old
  // one-tap finish threw away everything the session had just produced and
  // never asked for a trainer note — see components/.../SessionSummary.
  const handleFinish = () => setSummaryOpen(true);

  const handleConfirmFinish = async (patch: { notes: string | null; duration_minutes: number | null }) => {
    await handleHeaderSave({ ...patch, status: 'completed' });
    setSummaryOpen(false);
    toast.success('Workout session completed.');
    router.push(`/pt-os/clients/${clientId}/workout-log`);
  };

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 size={28} className="animate-spin" style={{ color: '#F59E0B' }} /></div>;
  }
  if (loadError || !session) {
    return (
      <div className="mx-auto max-w-md py-24 text-center">
        <AlertCircle size={32} style={{ color: '#ef4444', margin: '0 auto 12px' }} />
        <p className="text-[14px] font-[600] text-slate-600">{loadError || 'Session not found.'}</p>
        <Button variant="outline" className="mt-4" onClick={loadSession}>Retry</Button>
      </div>
    );
  }

  const s = session.summary;

  return (
    // ── Full bleed horizontally, standard gap vertically ──
    //
    // .shell-main wraps every page in 16px of padding, 24px from 768px up.
    //
    // The HORIZONTAL padding is cancelled so the hero runs edge to edge — that
    // is what "remove the container" meant. The TOP padding is left alone: it
    // is the same small gap every other hero in the app sits below, and taking
    // it away here made this one screen sit tighter than the rest. Consistency
    // across the app beats a flush edge on a single page.
    //
    // Explicit pixels, and `md:` rather than `sm:`. globals.css sets the root
    // font to 14px, so -mx-4 would be 14px against 16px of padding and leave a
    // 2px seam; and the shell's own breakpoint is 768px, which is Tailwind's
    // `md`, not `sm` at 640 — using `sm:` would over-pull by 8px between 640
    // and 767.
    <div className="-mx-[16px] pb-32 md:-mx-[24px]">
      {/* ── Hero ──
          A header sheet rather than a card in a stack: full width, rounded
          only at the bottom so it reads as a lid on the page rather than as
          the first item of content. It keeps the app's standard gap below the
          top bar, like every other hero.

          It also absorbs what used to sit above it. The back link and the
          status pill were a strip of their own between the bar and the page;
          the status now lives here where it belongs, next to the session it
          describes. Leaving this screen is "Save & Exit" at the foot, which is
          the deliberate action a half-logged workout deserves. */}
      <div className="relative overflow-hidden rounded-b-[28px]"
        style={{
          background: 'linear-gradient(150deg, #140B2E 0%, #1E1140 45%, #0F0824 100%)',
          boxShadow: '0 16px 40px -20px rgba(9,7,22,0.8)',
        }}>
        {/* Decorative wash, clipped by the rounded parent. */}
        <span aria-hidden className="pointer-events-none absolute -right-10 -top-16 h-52 w-52 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(252,211,77,0.42) 0%, transparent 70%)', filter: 'blur(52px)' }} />
        <span aria-hidden className="pointer-events-none absolute -bottom-20 -left-12 h-48 w-48 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(192,132,252,0.34) 0%, transparent 70%)', filter: 'blur(56px)' }} />

        <div className="relative mx-auto max-w-3xl px-5 pb-5 pt-4 sm:px-7">
          <div className="mb-2.5 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-[800] uppercase tracking-[0.1em]"
              style={session.status === 'completed'
                ? { background: 'rgba(16,185,129,0.18)', color: '#6EE7B7' }
                : { background: 'rgba(245,158,11,0.2)', color: '#FCD34D' }}>
              {/* A dot as well as a colour: the two states must not be
                  distinguishable by hue alone. */}
              <span className="h-1.5 w-1.5 rounded-full"
                style={{ background: session.status === 'completed' ? '#6EE7B7' : '#FCD34D' }} />
              {session.status === 'completed' ? 'Completed' : 'In Progress'}
            </span>
            {session.planned?.week != null && (
              <span className="inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-[750]"
                style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.78)' }}>
                Week {session.planned.week}
                {session.planned.duration_weeks ? ` of ${session.planned.duration_weeks}` : ''}
              </span>
            )}
          </div>

          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="truncate text-[24px] font-[860] leading-[1.1] tracking-[-0.025em] text-white">
                {fmtDate(session.session_date)}
              </h1>
              <p className="mt-1 truncate text-[12.5px] font-[550]" style={{ color: 'rgba(255,255,255,0.66)' }}>
                {[session.program_name, session.workout_day].filter(Boolean).join(' · ') || 'Tap edit to add a programme and day'}
              </p>
            </div>

            <button onClick={() => setHeaderOpen((o) => !o)}
              aria-expanded={headerOpen}
              aria-label={headerOpen ? 'Close session details' : 'Edit session details'}
              className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-[14px] transition-transform active:scale-95"
              style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.16)' }}>
              {headerOpen
                ? <ChevronDown size={16} style={{ color: 'rgba(255,255,255,0.85)' }} />
                : <Pencil size={14} style={{ color: 'rgba(255,255,255,0.85)' }} />}
            </button>
          </div>
        </div>
      </div>

      {/* Content keeps its own 16px inset — the hero is what goes edge to edge;
          rounded cards jammed against the screen edge read as broken, not as
          full-bleed. */}
      <div className="mx-auto max-w-3xl space-y-5 px-[16px] py-5 md:px-[24px]">
        {/* The editable detail, unchanged in behaviour: still a disclosure, so
            the exercises stay reachable without scrolling past a wall of
            fields. It now hangs below the hero rather than inside a card. */}
        {/* The card itself is inside the AnimatePresence, not wrapped around
            it: left outside, a closed panel still renders its border and its
            shadow, which paints a 1px line and a smudge under the hero for a
            card that is not there. */}
        <AnimatePresence initial={false}>
            {headerOpen && (
              <m.div
                initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2, ease: EASE }}
                className="overflow-hidden rounded-[24px]"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 4px 24px rgba(15,23,42,0.06)' }}
              >
                <div className="px-5 sm:px-7 pb-6 pt-1 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                    <FloatInput label="Date" type="date" value={session.session_date?.slice(0, 10) || ''}
                      onChange={(v) => setSession((p) => (p ? { ...p, session_date: v } : p))}
                      onBlur={() => handleHeaderSave({ session_date: session.session_date })} />
                    {session.workout_assignment_id ? (
                      <div>
                        <p className="mb-1.5 text-[10.5px] font-[700] uppercase tracking-wider" style={{ color: '#94a3b8' }}>Program</p>
                        <p className="rounded-[10px] px-3 py-2.5 text-[13px] font-[650]" style={{ background: 'var(--bg-subtle)', color: '#0f172a' }}>{session.program_name}</p>
                      </div>
                    ) : (
                      <FloatInput label="Program Name" value={session.program_name || ''}
                        onChange={(v) => setSession((p) => (p ? { ...p, program_name: v } : p))}
                        onBlur={() => handleHeaderSave({ program_name: session.program_name || null })} />
                    )}
                    {session.workout_assignment_id && dayOptions.length > 0 ? (
                      <div>
                        <p className="mb-1.5 text-[10.5px] font-[700] uppercase tracking-wider" style={{ color: '#94a3b8' }}>Workout Day</p>
                        <select value={session.workout_day || ''}
                          onChange={(e) => { setSession((p) => (p ? { ...p, workout_day: e.target.value } : p)); handleHeaderSave({ workout_day: e.target.value || null }); }}
                          className="w-full rounded-[10px] px-3 py-2.5 text-[13px] font-[650] outline-none" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: '#0f172a' }}>
                          <option value="">Select a day…</option>
                          {dayOptions.map((day) => <option key={day} value={day}>{day}</option>)}
                        </select>
                      </div>
                    ) : (
                      <FloatInput label="Workout Day" value={session.workout_day || ''}
                        onChange={(v) => setSession((p) => (p ? { ...p, workout_day: v } : p))}
                        onBlur={() => handleHeaderSave({ workout_day: session.workout_day || null })} />
                    )}
                  </div>
                  <FloatInput label="Notes" multiline autoGrow value={session.notes || ''}
                    onChange={(v) => setSession((p) => (p ? { ...p, notes: v } : p))}
                    onBlur={() => handleHeaderSave({ notes: session.notes || null })} />
                  <FloatInput label="Duration (minutes)" type="number" value={session.duration_minutes != null ? String(session.duration_minutes) : ''}
                    onChange={(v) => setSession((p) => (p ? { ...p, duration_minutes: v ? Number(v) : null } : p))}
                    onBlur={() => handleHeaderSave({ duration_minutes: session.duration_minutes })} />
                  {savingHeader && <p className="text-[10.5px] font-[600]" style={{ color: '#94a3b8' }}>Saving…</p>}
                </div>
              </m.div>
            )}
        </AnimatePresence>

        {/* Planned for Today — prescribed exercises for this plan/day, when linked */}
        {session.planned && session.planned.exercises.length > 0 && (
          <div className="rounded-[20px] p-5" style={{ background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.2)' }}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="min-w-0 flex items-center gap-2">
                <ClipboardList size={15} className="shrink-0" style={{ color: '#6366f1' }} />
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-[760]" style={{ color: '#312e81' }}>Planned for Today — {session.planned.plan_name}</p>
                  {/* Which week these numbers are for. A programme progresses,
                      so "3 × 8 at 65 kg" is only meaningful alongside the week
                      it belongs to — and if the trainer wrote this week by hand
                      it is an instruction, not something the rule produced. */}
                  {session.planned.week != null && (
                    <p className="text-[11px] font-[650]" style={{ color: '#818cf8' }}>
                      Week {session.planned.week}
                      {session.planned.duration_weeks ? ` of ${session.planned.duration_weeks}` : ''}
                      {session.planned.source === 'override' ? ' · written for this week' : ''}
                    </p>
                  )}
                </div>
              </div>
              <button onClick={handleLoadAllPlanned} disabled={loadingPlanned}
                className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11.5px] font-[700]" style={{ background: '#6366f1', color: '#fff' }}>
                <Layers size={12} /> Load All
              </button>
            </div>
            <div className="space-y-2">
              {session.planned.exercises.map((ex, i) => {
                const alreadyAdded = ex.exercise_id ? session.exercises.some((se) => se.exercise_id === ex.exercise_id) : false;
                return (
                  <div key={`${ex.exercise_id || ex.name}-${i}`} className="flex items-center justify-between gap-3 rounded-[12px] px-3.5 py-2.5" style={{ background: '#fff', border: '1px solid rgba(99,102,241,0.12)' }}>
                    <div className="min-w-0">
                      <p className="truncate text-[12.5px] font-[650]" style={{ color: '#1e1b4b' }}>{ex.name}</p>
                      {/* The load belongs here. It used to be dropped: the
                          server resolved the week's prescribed weight and the
                          card showed only sets × reps, so the one number that
                          changes from week to week was invisible on the only
                          screen used at the rack. */}
                      <p className="text-[11px]" style={{ color: '#818cf8' }}>
                        {ex.sets} &times; {ex.reps}
                        {ex.target_weight != null ? ` @ ${ex.target_weight} kg` : ''}
                        {ex.rpe != null ? ` · RPE ${ex.rpe}` : ''} target
                      </p>
                    </div>
                    <button onClick={() => handleLoadOnePlanned(ex)} disabled={loadingPlanned || alreadyAdded}
                      className="flex h-[44px] flex-shrink-0 items-center rounded-[8px] px-3 text-[11px] font-[700]"
                      style={{ background: alreadyAdded ? 'var(--bg-subtle)' : 'rgba(99,102,241,0.1)', color: alreadyAdded ? '#94a3b8' : '#6366f1' }}>
                      {alreadyAdded ? 'Added' : '+ Add'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Exercises */}
        <div className="space-y-3">
          {session.exercises.map((ex) => (
            <ExerciseBlock
              key={ex.id}
              exercise={ex}
              previous={previousByExercise[ex.id]}
              expanded={Boolean(expanded[ex.id])}
              onToggle={() => setExpanded((prev) => ({ ...prev, [ex.id]: !prev[ex.id] }))}
              onRemove={() => handleRemoveExercise(ex.id)}
              onChanged={loadSession}
            />
          ))}
          {session.exercises.length === 0 && (
            <div className="rounded-[20px] p-10 text-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <Dumbbell size={24} style={{ color: '#cbd5e1', margin: '0 auto 8px' }} />
              <p className="text-[13px] font-[600] text-slate-500">No exercises logged yet.</p>
            </div>
          )}
        </div>

        <Button variant="outline" iconLeft={<Plus size={14} />} onClick={() => setPickerOpen(true)} className="h-[44px] w-full">
          Add Exercise
        </Button>
      </div>

      <SessionSummary
        session={session}
        open={summaryOpen}
        onCancel={() => setSummaryOpen(false)}
        onFinish={handleConfirmFinish}
      />

      <ExercisePicker open={pickerOpen} onClose={() => setPickerOpen(false)} onSelect={handleAddExercise} />

      {/* Sticky summary + save bar */}
      <div className="page-action-bar" style={{ background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(20px)', borderTop: '1px solid rgba(15,23,42,0.08)' }}>
        <div className="mx-auto max-w-3xl px-5 sm:px-8 py-3 space-y-2.5">
          <div className="grid grid-cols-5 gap-2 text-center">
            {[
              { label: 'Sets', val: s.total_sets },
              { label: 'Reps', val: s.total_reps },
              { label: 'Volume', val: `${Math.round(s.total_volume)}kg` },
              { label: 'Exercises', val: `${s.exercises_completed}/${s.exercises_total}` },
              { label: 'Avg RPE', val: s.avg_rpe ?? '—' },
            ].map((item) => (
              <div key={item.label}>
                <p className="text-[13px] font-[800] text-gray-900">{item.val}</p>
                <p className="text-[9px] font-[650] uppercase tracking-wider" style={{ color: '#94a3b8' }}>{item.label}</p>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="h-[44px] flex-1" onClick={() => router.push(`/pt-os/clients/${clientId}/workout-log`)}>
              Save & Exit
            </Button>
            <Button className="h-[44px] flex-1" iconLeft={<Check size={14} />} disabled={session.status === 'completed'}
              onClick={handleFinish} style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)', color: '#fff' }}>
              {session.status === 'completed' ? 'Completed' : 'Finish Workout'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────── EXERCISE BLOCK */
interface ExerciseBlockProps {
  exercise: WorkoutSessionExercise;
  previous: WorkoutPreviousExercise | null | undefined;
  expanded: boolean;
  onToggle: () => void;
  onRemove: () => void;
  onChanged: () => Promise<void>;
}

function ExerciseBlock({ exercise, previous, expanded, onToggle, onRemove, onChanged }: ExerciseBlockProps) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  const nextSetNumber = exercise.sets.length + 1;

  const handleAddSet = async (prefill?: Partial<WorkoutSet>) => {
    setBusy(true);
    try {
      await api.progress.workoutLog.sets.add(exercise.id, {
        set_number: nextSetNumber,
        weight_kg: prefill?.weight_kg ?? null,
        reps: prefill?.reps ?? null,
        rpe: prefill?.rpe ?? null,
        rir: prefill?.rir ?? null,
        tempo: prefill?.tempo ?? null,
        rest_seconds: prefill?.rest_seconds ?? null,
        completed: false,
      });
      await onChanged();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Could not add set.');
    } finally {
      setBusy(false);
    }
  };

  const handleDuplicateLast = () => {
    const last = exercise.sets[exercise.sets.length - 1];
    if (!last) { handleAddSet(); return; }
    handleAddSet({ weight_kg: last.weight_kg, reps: last.reps, rpe: last.rpe, rir: last.rir, tempo: last.tempo, rest_seconds: last.rest_seconds });
  };

  const handleAutoFillPrevious = async () => {
    if (!previous || previous.sets.length === 0) { toast.info('No previous workout data for this exercise.'); return; }
    setBusy(true);
    try {
      let n = exercise.sets.length;
      for (const ps of previous.sets) {
        n += 1;
        await api.progress.workoutLog.sets.add(exercise.id, {
          set_number: n, weight_kg: ps.weight_kg, reps: ps.reps, rpe: null, rir: null, tempo: ps.tempo, rest_seconds: ps.rest_seconds, completed: false,
        });
      }
      await onChanged();
      toast.success('Filled from previous workout.');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Auto-fill failed.');
    } finally {
      setBusy(false);
    }
  };

  /**
   * Tick every outstanding set on this exercise.
   *
   * Sequential, not Promise.all: each PATCH recomputes the PR flags against
   * everything logged before it, and firing four at once would have them race
   * to read the same "previous best" — four sets of 100 kg would each be
   * declared a weight PR.
   */
  const handleCompleteAll = async () => {
    const pending = exercise.sets.filter((s) => !s.completed);
    if (pending.length === 0) return;
    setBusy(true);
    try {
      for (const s of pending) {
        await api.progress.workoutLog.sets.update(s.id, { completed: true });
      }
      await onChanged();
    } catch (err: unknown) {
      // Partially applied is fine and visible — onChanged in the finally
      // repaints whatever did land, so the trainer sees where it stopped.
      toast.error(err instanceof Error ? err.message : 'Could not mark those sets done.');
      await onChanged();
    } finally {
      setBusy(false);
    }
  };

  const anyPr = exercise.sets.some((s) => s.is_pr_weight || s.is_pr_reps || s.is_pr_volume);

  return (
    <div className="rounded-[20px] overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 2px 12px rgba(15,23,42,0.05)' }}>
      <button onClick={onToggle} className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left">
        <div className="flex items-center gap-3 min-w-0">
          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px]" style={{ background: 'var(--bg-subtle)' }}>
            <Dumbbell size={15} style={{ color: '#94a3b8' }} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[14px] font-[740] text-gray-900">{exercise.exercise_name}</p>
            <p className="text-[11px] text-slate-400">{exercise.sets.length} set{exercise.sets.length !== 1 ? 's' : ''}</p>
          </div>
          {anyPr && (
            <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[9.5px] font-[800]" style={{ background: 'rgba(245,158,11,0.15)', color: '#d97706' }}>
              <Award size={10} /> PR
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <span onClick={(e) => { e.stopPropagation(); onRemove(); }} role="button" tabIndex={0}
            className="flex h-9 w-9 items-center justify-center rounded-[10px] transition hover:bg-red-50">
            <Trash2 size={14} style={{ color: '#ef4444' }} />
          </span>
          <span className="flex h-9 w-9 items-center justify-center rounded-[10px]">
            <ChevronDown size={16} style={{ color: '#94a3b8', transform: expanded ? 'rotate(180deg)' : undefined, transition: 'transform 0.2s' }} />
          </span>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <m.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2, ease: EASE }}>
            <div className="px-5 pb-5 space-y-4">
              {previous && previous.sets.length > 0 && (
                <div className="rounded-[12px] p-3" style={{ background: 'rgba(148,163,184,0.08)' }}>
                  <p className="mb-1.5 flex items-center gap-1.5 text-[10.5px] font-[700] uppercase tracking-wider" style={{ color: '#94a3b8' }}>
                    <Clock size={11} /> Previous — {fmtDate(previous.session_date)}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {previous.sets.map((ps) => (
                      <span key={ps.id} className="rounded-full px-2.5 py-1 text-[11px] font-[650]" style={{ background: '#fff', color: '#64748b', border: '1px solid var(--border)' }}>
                        {ps.weight_kg ?? '—'}kg × {ps.reps ?? '—'}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2.5">
                {exercise.sets.map((set) => (
                  <SetRow key={set.id} set={set} onChanged={onChanged} />
                ))}
              </div>

              {/*
                ── One tap for the ordinary case ─────────────────────────
                Loading a planned exercise creates its sets already filled
                with the prescribed weight and reps and all UNTICKED, so a
                client who did exactly what was written still costs the
                trainer one tap per set — four taps to record "as planned",
                mid-session, holding a phone.
                That is the friction behind 44 sets created and 3 ticked.
                This marks the outstanding ones done in one go; anything
                that did NOT go to plan is edited set by set, which is the
                rarer case and the one worth the taps.
              */}
              {exercise.sets.some((s) => !s.completed) && (
                <button
                  onClick={handleCompleteAll}
                  disabled={busy}
                  className="mb-2 flex h-[44px] w-full items-center justify-center gap-2 rounded-[12px] text-[13px] font-[750] transition active:scale-[0.99] disabled:opacity-60"
                  style={{ background: 'rgba(16,185,129,0.12)', border: '1.5px solid rgba(16,185,129,0.4)', color: '#047857' }}
                >
                  <Check size={16} strokeWidth={3} />
                  Mark all {exercise.sets.filter((s) => !s.completed).length} sets done
                </button>
              )}

              {/*
                Explicit h-[44px] on all three. The shared Button renders 35px
                at default and 28px at size="sm" — its scale is rem-based and
                globals.css sets the root font to 14px, so every name in it is
                12.5% smaller than it reads. That is tolerable on a settings
                page and not here: this is the screen a trainer uses standing
                up, one-handed, between sets.
              */}
              <div className="space-y-2">
                <Button iconLeft={<Plus size={15} />} disabled={busy} onClick={() => handleAddSet()} className="h-[44px] w-full"
                  style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)', color: '#fff' }}>
                  Add Set
                </Button>
                <div className="grid grid-cols-2 gap-2">
                  <Button size="sm" variant="outline" className="h-[44px]" iconLeft={<Copy size={12} />} disabled={busy || exercise.sets.length === 0} onClick={handleDuplicateLast}>
                    Duplicate Last
                  </Button>
                  <Button size="sm" variant="outline" className="h-[44px]" iconLeft={<Wand2 size={12} />} disabled={busy || !previous} onClick={handleAutoFillPrevious}>
                    Auto-fill Previous
                  </Button>
                </div>
              </div>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─────────────────────────────────────────────────────── SET ROW */
// Card-per-set, not a dense grid row: big +/- steppers and a large
// completion target are the whole point of "easy to fill" on a phone —
// weight/reps are what get logged on nearly every set, so they get the
// most tappable real estate; RPE/RIR are secondary, smaller fields below.
function SetRow({ set, onChanged }: { set: WorkoutSet; onChanged: () => Promise<void> }) {
  const { toast } = useToast();
  const [weight, setWeight] = useState(set.weight_kg != null ? String(set.weight_kg) : '');
  const [reps, setReps] = useState(set.reps != null ? String(set.reps) : '');
  const [rpe, setRpe] = useState(set.rpe != null ? String(set.rpe) : '');
  const [rir, setRir] = useState(set.rir != null ? String(set.rir) : '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setWeight(set.weight_kg != null ? String(set.weight_kg) : '');
    setReps(set.reps != null ? String(set.reps) : '');
    setRpe(set.rpe != null ? String(set.rpe) : '');
    setRir(set.rir != null ? String(set.rir) : '');
  }, [set.weight_kg, set.reps, set.rpe, set.rir]);

  const save = async (patch: Record<string, unknown>) => {
    setSaving(true);
    try {
      await api.progress.workoutLog.sets.update(set.id, patch);
      await onChanged();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Could not save set.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.progress.workoutLog.sets.delete(set.id);
      await onChanged();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Could not delete set.');
    }
  };

  const numField = (val: string) => (val.trim() === '' ? null : Number(val));

  const adjustWeight = (delta: number) => {
    const cur = weight.trim() === '' ? 0 : Number(weight);
    const next = Math.max(0, Math.round((cur + delta) * 2) / 2);
    setWeight(String(next));
    save({ weight_kg: next });
  };
  const adjustReps = (delta: number) => {
    const cur = reps.trim() === '' ? 0 : Number(reps);
    const next = Math.max(0, cur + delta);
    setReps(String(next));
    save({ reps: next });
  };

  const isPr = set.is_pr_weight || set.is_pr_reps || set.is_pr_volume;
  const prLabel = [set.is_pr_weight && 'Weight', set.is_pr_reps && 'Reps', set.is_pr_volume && 'Volume'].filter(Boolean).join(' & ');

  return (
    <div className="rounded-[16px] p-3" style={{ background: isPr ? 'rgba(245,158,11,0.07)' : 'var(--bg-subtle)', border: isPr ? '1.5px solid rgba(245,158,11,0.35)' : '1px solid var(--border)' }}>
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-[800]" style={{ background: '#0f172a', color: '#fff' }}>
            {set.set_number}
          </span>
          {isPr && (
            <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[9.5px] font-[800]" style={{ background: 'rgba(245,158,11,0.18)', color: '#d97706' }}>
              <Award size={10} /> New PR — {prLabel}
            </span>
          )}
        </div>
        {/*
          Delete alone in the header. The completion control used to sit
          immediately beside it — two 35px boxes of the same size and shape,
          one of which destroys the set. It has moved to the foot of the card.
        */}
        <button onClick={handleDelete} aria-label={`Delete set ${set.set_number}`}
          className="flex h-[44px] w-[44px] items-center justify-center rounded-[12px] transition hover:bg-red-50"
          style={{ border: '1.5px solid transparent' }}>
          <X size={16} style={{ color: '#cbd5e1' }} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <div>
          <p className="mb-1 text-center text-[9.5px] font-[700] uppercase tracking-wider" style={{ color: '#94a3b8' }}>Weight (kg)</p>
          <div className="flex items-center gap-1.5">
            <button onClick={() => adjustWeight(-2.5)} aria-label="Decrease weight"
              className="flex h-[44px] w-[44px] flex-shrink-0 items-center justify-center rounded-[12px] transition active:scale-95"
              style={{ background: '#fff', border: '1.5px solid #e2e8f0', color: '#475569' }}>
              <Minus size={16} />
            </button>
            <input type="number" inputMode="decimal" value={weight} placeholder="0"
              onChange={(e) => setWeight(e.target.value)}
              onBlur={() => save({ weight_kg: numField(weight) })}
              className="w-full min-w-0 rounded-[12px] py-2.5 text-center font-[800] outline-none"
              style={{ fontSize: 17, background: '#fff', border: '1.5px solid #e2e8f0', color: '#0f172a' }} />
            <button onClick={() => adjustWeight(2.5)} aria-label="Increase weight"
              className="flex h-[44px] w-[44px] flex-shrink-0 items-center justify-center rounded-[12px] transition active:scale-95"
              style={{ background: '#fff', border: '1.5px solid #e2e8f0', color: '#475569' }}>
              <Plus size={16} />
            </button>
          </div>
        </div>
        <div>
          <p className="mb-1 text-center text-[9.5px] font-[700] uppercase tracking-wider" style={{ color: '#94a3b8' }}>Reps</p>
          <div className="flex items-center gap-1.5">
            <button onClick={() => adjustReps(-1)} aria-label="Decrease reps"
              className="flex h-[44px] w-[44px] flex-shrink-0 items-center justify-center rounded-[12px] transition active:scale-95"
              style={{ background: '#fff', border: '1.5px solid #e2e8f0', color: '#475569' }}>
              <Minus size={16} />
            </button>
            <input type="number" inputMode="numeric" value={reps} placeholder="0"
              onChange={(e) => setReps(e.target.value)}
              onBlur={() => save({ reps: numField(reps) })}
              className="w-full min-w-0 rounded-[12px] py-2.5 text-center font-[800] outline-none"
              style={{ fontSize: 17, background: '#fff', border: '1.5px solid #e2e8f0', color: '#0f172a' }} />
            <button onClick={() => adjustReps(1)} aria-label="Increase reps"
              className="flex h-[44px] w-[44px] flex-shrink-0 items-center justify-center rounded-[12px] transition active:scale-95"
              style={{ background: '#fff', border: '1.5px solid #e2e8f0', color: '#475569' }}>
              <Plus size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="mt-2.5 flex items-center gap-2.5">
        {/*
          The height belongs on the INPUT, not the label. With h-[44px] on the
          wrapper the input's content box was 42 — the 1px border top and
          bottom comes out of it — so the field a thumb actually lands on was
          still short of the minimum while the box around it measured right.
        */}
        <label className="flex flex-1 items-center gap-1.5 rounded-[10px] px-2.5" style={{ background: '#fff', border: '1px solid #e2e8f0' }}>
          <span className="text-[10px] font-[700]" style={{ color: '#94a3b8' }}>RPE</span>
          <input type="number" inputMode="decimal" min={0} max={10} value={rpe} placeholder="—"
            onChange={(e) => setRpe(e.target.value)}
            onBlur={() => save({ rpe: numField(rpe) })}
            className="h-[44px] w-full min-w-0 bg-transparent text-center outline-none" style={{ fontSize: 14, color: "#0f172a" }} />
        </label>
        {/*
          The height belongs on the INPUT, not the label. With h-[44px] on the
          wrapper the input's content box was 42 — the 1px border top and
          bottom comes out of it — so the field a thumb actually lands on was
          still short of the minimum while the box around it measured right.
        */}
        <label className="flex flex-1 items-center gap-1.5 rounded-[10px] px-2.5" style={{ background: '#fff', border: '1px solid #e2e8f0' }}>
          <span className="text-[10px] font-[700]" style={{ color: '#94a3b8' }}>RIR</span>
          <input type="number" inputMode="numeric" min={0} max={10} value={rir} placeholder="—"
            onChange={(e) => setRir(e.target.value)}
            onBlur={() => save({ rir: numField(rir) })}
            className="h-[44px] w-full min-w-0 bg-transparent text-center outline-none" style={{ fontSize: 14, color: "#0f172a" }} />
        </label>
      </div>

      {/*
        ── The most important control on this screen ──────────────────────
        A set that is not ticked does not exist: completion is what feeds
        volume, the PR flags, the session summary and every panel on the
        analytics page. In the live database 44 sets had been created and 3
        ticked.
        This used to be a bare 35px checkbox in the header, beside a delete
        button of identical size and shape. `h-10` reads as 40px and is not,
        because globals.css sets the root font to 14px — so the single most
        repeated action in the app had a target smaller than the guideline
        minimum, and its neighbour destroyed the row.
        It is now a full-width labelled button at the foot of the card: the
        last thing under your thumb after typing the weight and reps, and
        nowhere near delete.
      */}
      <button
        onClick={() => save({ completed: !set.completed })}
        disabled={saving}
        aria-pressed={set.completed}
        className="mt-2.5 flex h-[44px] w-full items-center justify-center gap-2 rounded-[12px] text-[13px] font-[750] transition active:scale-[0.99] disabled:opacity-60"
        style={{
          background: set.completed ? '#10b981' : '#fff',
          border: set.completed ? '1.5px solid #10b981' : '1.5px solid #cbd5e1',
          color: set.completed ? '#fff' : '#475569',
        }}
      >
        <Check size={16} strokeWidth={3} />
        {set.completed ? 'Done' : 'Mark done'}
      </button>
    </div>
  );
}
