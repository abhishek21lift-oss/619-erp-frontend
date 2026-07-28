'use client';

import { use, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { m, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Plus, Trash2, Copy, Wand2, Check, Loader2, AlertCircle,
  Dumbbell, ChevronDown, Award, Clock, X, Minus, Pencil, Calendar, ClipboardList, Layers,
} from 'lucide-react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { Button } from '@/components/ui';
import FloatInput from '@/components/ui/FloatInput';
import ExercisePicker from '@/components/pt-os/workout-log/ExercisePicker';
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

  const handleFinish = async () => {
    await handleHeaderSave({ status: 'completed' });
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
    <div className="pb-32">
      {/* Header — in normal flow on the page background (no sticky card). */}
      <div className="pt-1">
        <div className="mx-auto max-w-3xl py-4 flex items-center justify-between gap-3">
          <button onClick={() => router.push(`/pt-os/clients/${clientId}/workout-log`)}
            className="flex items-center gap-2 text-[12px] font-[650]" style={{ color: '#94a3b8' }}>
            <ArrowLeft size={13} /> Workout Log
          </button>
          <span className="rounded-full px-3 py-1 text-[10.5px] font-[700]"
            style={{ background: session.status === 'completed' ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)', color: session.status === 'completed' ? '#059669' : '#d97706' }}>
            {session.status === 'completed' ? 'Completed' : 'In Progress'}
          </span>
        </div>
      </div>

      <div className="mx-auto max-w-3xl py-6 space-y-5">
        {/* Session header — a compact summary strip by default so the
            exercises (the actual logging work) are reachable without
            scrolling past a wall of fields; tap to edit. */}
        <div className="rounded-[24px] overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 4px 24px rgba(15,23,42,0.06)' }}>
          <button onClick={() => setHeaderOpen((o) => !o)} className="flex w-full items-center justify-between gap-3 px-5 sm:px-7 py-4 text-left">
            <div className="flex items-center gap-3 min-w-0">
              <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[12px]" style={{ background: 'rgba(245,158,11,0.1)' }}>
                <Calendar size={16} style={{ color: '#d97706' }} />
              </span>
              <div className="min-w-0">
                <p className="truncate text-[14px] font-[760] text-gray-900">{fmtDate(session.session_date)}</p>
                <p className="truncate text-[12px] text-slate-400">
                  {[session.program_name, session.workout_day].filter(Boolean).join(' · ') || 'Tap to add program & day'}
                </p>
              </div>
            </div>
            <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[10px]" style={{ background: 'var(--bg-subtle)' }}>
              {headerOpen ? <ChevronDown size={14} style={{ color: '#64748b' }} /> : <Pencil size={13} style={{ color: '#64748b' }} />}
            </span>
          </button>

          <AnimatePresence initial={false}>
            {headerOpen && (
              <m.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2, ease: EASE }}>
                <div className="px-5 sm:px-7 pb-6 pt-1 space-y-4" style={{ borderTop: '1px solid var(--border)' }}>
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
        </div>

        {/* Planned for Today — prescribed exercises for this plan/day, when linked */}
        {session.planned && session.planned.exercises.length > 0 && (
          <div className="rounded-[20px] p-5" style={{ background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.2)' }}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ClipboardList size={15} style={{ color: '#6366f1' }} />
                <p className="text-[13px] font-[760]" style={{ color: '#312e81' }}>Planned for Today — {session.planned.plan_name}</p>
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
                      <p className="text-[11px]" style={{ color: '#818cf8' }}>{ex.sets} &times; {ex.reps} target</p>
                    </div>
                    <button onClick={() => handleLoadOnePlanned(ex)} disabled={loadingPlanned || alreadyAdded}
                      className="flex-shrink-0 rounded-[8px] px-2.5 py-1.5 text-[11px] font-[700]"
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

        <Button variant="outline" iconLeft={<Plus size={14} />} onClick={() => setPickerOpen(true)} className="w-full">
          Add Exercise
        </Button>
      </div>

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
            <Button variant="outline" className="flex-1" onClick={() => router.push(`/pt-os/clients/${clientId}/workout-log`)}>
              Save & Exit
            </Button>
            <Button className="flex-1" iconLeft={<Check size={14} />} disabled={session.status === 'completed'}
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

              <div className="space-y-2">
                <Button iconLeft={<Plus size={15} />} disabled={busy} onClick={() => handleAddSet()} className="w-full"
                  style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)', color: '#fff' }}>
                  Add Set
                </Button>
                <div className="grid grid-cols-2 gap-2">
                  <Button size="sm" variant="outline" iconLeft={<Copy size={12} />} disabled={busy || exercise.sets.length === 0} onClick={handleDuplicateLast}>
                    Duplicate Last
                  </Button>
                  <Button size="sm" variant="outline" iconLeft={<Wand2 size={12} />} disabled={busy || !previous} onClick={handleAutoFillPrevious}>
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
        <div className="flex items-center gap-2">
          <button onClick={() => save({ completed: !set.completed })} disabled={saving}
            aria-label="Mark set complete"
            className="flex h-10 w-10 items-center justify-center rounded-[12px] transition"
            style={{ background: set.completed ? '#10b981' : '#fff', border: set.completed ? 'none' : '1.5px solid #cbd5e1' }}>
            {set.completed && <Check size={17} color="#fff" strokeWidth={3} />}
          </button>
          <button onClick={handleDelete} aria-label="Delete set"
            className="flex h-10 w-10 items-center justify-center rounded-[12px] transition hover:bg-red-50" style={{ border: '1.5px solid transparent' }}>
            <X size={16} style={{ color: '#cbd5e1' }} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <div>
          <p className="mb-1 text-center text-[9.5px] font-[700] uppercase tracking-wider" style={{ color: '#94a3b8' }}>Weight (kg)</p>
          <div className="flex items-center gap-1.5">
            <button onClick={() => adjustWeight(-2.5)} aria-label="Decrease weight"
              className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[12px] transition active:scale-95"
              style={{ background: '#fff', border: '1.5px solid #e2e8f0', color: '#475569' }}>
              <Minus size={16} />
            </button>
            <input type="number" inputMode="decimal" value={weight} placeholder="0"
              onChange={(e) => setWeight(e.target.value)}
              onBlur={() => save({ weight_kg: numField(weight) })}
              className="w-full min-w-0 rounded-[12px] py-2.5 text-center font-[800] outline-none"
              style={{ fontSize: 17, background: '#fff', border: '1.5px solid #e2e8f0', color: '#0f172a' }} />
            <button onClick={() => adjustWeight(2.5)} aria-label="Increase weight"
              className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[12px] transition active:scale-95"
              style={{ background: '#fff', border: '1.5px solid #e2e8f0', color: '#475569' }}>
              <Plus size={16} />
            </button>
          </div>
        </div>
        <div>
          <p className="mb-1 text-center text-[9.5px] font-[700] uppercase tracking-wider" style={{ color: '#94a3b8' }}>Reps</p>
          <div className="flex items-center gap-1.5">
            <button onClick={() => adjustReps(-1)} aria-label="Decrease reps"
              className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[12px] transition active:scale-95"
              style={{ background: '#fff', border: '1.5px solid #e2e8f0', color: '#475569' }}>
              <Minus size={16} />
            </button>
            <input type="number" inputMode="numeric" value={reps} placeholder="0"
              onChange={(e) => setReps(e.target.value)}
              onBlur={() => save({ reps: numField(reps) })}
              className="w-full min-w-0 rounded-[12px] py-2.5 text-center font-[800] outline-none"
              style={{ fontSize: 17, background: '#fff', border: '1.5px solid #e2e8f0', color: '#0f172a' }} />
            <button onClick={() => adjustReps(1)} aria-label="Increase reps"
              className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[12px] transition active:scale-95"
              style={{ background: '#fff', border: '1.5px solid #e2e8f0', color: '#475569' }}>
              <Plus size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="mt-2.5 flex items-center gap-2.5">
        <label className="flex flex-1 items-center gap-1.5 rounded-[10px] px-2.5 py-1.5" style={{ background: '#fff', border: '1px solid #e2e8f0' }}>
          <span className="text-[10px] font-[700]" style={{ color: '#94a3b8' }}>RPE</span>
          <input type="number" inputMode="decimal" min={0} max={10} value={rpe} placeholder="—"
            onChange={(e) => setRpe(e.target.value)}
            onBlur={() => save({ rpe: numField(rpe) })}
            className="w-full min-w-0 text-center outline-none" style={{ fontSize: 14, color: '#0f172a' }} />
        </label>
        <label className="flex flex-1 items-center gap-1.5 rounded-[10px] px-2.5 py-1.5" style={{ background: '#fff', border: '1px solid #e2e8f0' }}>
          <span className="text-[10px] font-[700]" style={{ color: '#94a3b8' }}>RIR</span>
          <input type="number" inputMode="numeric" min={0} max={10} value={rir} placeholder="—"
            onChange={(e) => setRir(e.target.value)}
            onBlur={() => save({ rir: numField(rir) })}
            className="w-full min-w-0 text-center outline-none" style={{ fontSize: 14, color: '#0f172a' }} />
        </label>
      </div>
    </div>
  );
}
