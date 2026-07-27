'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { m } from 'framer-motion';
import { ArrowLeft, ClipboardList, Dumbbell, Pencil, Plus, Trash2, Loader2, Check, Target, Clock } from 'lucide-react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { Button } from '@/components/ui';
import { api } from '@/lib/api';
import type { WorkoutPlan, WorkoutPlanExercise } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { ExercisePicker, type PickedExercise } from '@/components/pt-os/workout-log/ExercisePicker';

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

interface DraftExercise {
  exercise_id: string;
  name: string;
  day_of_week: number;
  sets: number;
  reps: number;
  rest_seconds: number;
}

export default function WorkoutPlanDetailPage() {
  return (
    <Guard roles={['admin', 'manager', 'trainer']}>
      <AppShell>
        <Suspense fallback={
          <div className="flex items-center justify-center py-24">
            <Loader2 size={22} className="animate-spin" style={{ color: 'var(--text-disabled)' }} />
          </div>
        }>
          <Inner />
        </Suspense>
      </AppShell>
    </Guard>
  );
}

function Inner() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  // Carried from the builder (Save & Assign Plan) or the client profile's
  // Workout Plans button — the client this plan session belongs to, so the
  // Workout Log button below knows whose session to open next.
  const clientId = searchParams.get('client_id');
  const [clientName, setClientName] = useState('');

  const [plan, setPlan] = useState<WorkoutPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<DraftExercise[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerDay, setPickerDay] = useState(1);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!clientId) return;
    api.pt.client(clientId)
      .then((res) => setClientName(String((res as { data?: { name?: string } })?.data?.name ?? '')))
      .catch(() => {});
  }, [clientId]);

  const load = useCallback(() => {
    setLoading(true);
    api.workouts.plans.detail(id)
      .then(setPlan)
      .catch(() => toast.error('Could not load this plan.'))
      .finally(() => setLoading(false));
  }, [id, toast]);

  useEffect(() => { load(); }, [load]);

  const startEditing = () => {
    if (!plan) return;
    setDraft(plan.exercises.map((ex) => ({
      exercise_id: ex.exercise_id || '', name: ex.name, day_of_week: ex.day_of_week,
      sets: ex.sets, reps: ex.reps, rest_seconds: ex.rest_seconds,
    })));
    setEditing(true);
  };

  const handlePick = (ex: PickedExercise) => {
    if (!ex.id) return;
    setDraft((d) => [...d, { exercise_id: ex.id, name: ex.name, day_of_week: pickerDay, sets: 3, reps: 12, rest_seconds: 60 }]);
  };

  const updateDraftField = (index: number, field: keyof DraftExercise, value: number) => {
    setDraft((d) => d.map((ex, i) => (i === index ? { ...ex, [field]: value } : ex)));
  };

  const removeDraft = (index: number) => setDraft((d) => d.filter((_, i) => i !== index));

  const handleSave = async () => {
    if (!plan) return;
    setSaving(true);
    try {
      await api.workouts.plans.update(plan.id, {
        exercises: draft.map((ex, i) => ({
          exercise_id: ex.exercise_id, day_of_week: ex.day_of_week, sort_order: i,
          sets: ex.sets, reps: ex.reps, rest_seconds: ex.rest_seconds,
        })),
      });
      toast.success('Plan updated.');
      setEditing(false);
      load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Could not save changes.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={22} className="animate-spin" style={{ color: 'var(--text-disabled)' }} />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <p style={{ color: 'var(--text-muted)' }}>Plan not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/pt-os/workout-plans')}>Back to Plans</Button>
      </div>
    );
  }

  const grouped = new Map<number, WorkoutPlanExercise[]>();
  for (const ex of plan.exercises) {
    if (!grouped.has(ex.day_of_week)) grouped.set(ex.day_of_week, []);
    grouped.get(ex.day_of_week)!.push(ex);
  }
  const draftGrouped = new Map<number, Array<DraftExercise & { index: number }>>();
  draft.forEach((ex, index) => {
    if (!draftGrouped.has(ex.day_of_week)) draftGrouped.set(ex.day_of_week, []);
    draftGrouped.get(ex.day_of_week)!.push({ ...ex, index });
  });

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <button onClick={() => router.push('/pt-os/workout-plans')}
        className="mb-4 flex items-center gap-1.5 text-[13px] font-[600]" style={{ color: 'var(--text-muted)' }}>
        <ArrowLeft size={14} /> Workout Plans
      </button>

      <m.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-[24px] p-6 sm:p-8 mb-6"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)' }}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[14px]" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
              <Dumbbell size={18} color="#fff" />
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-[22px] font-[800] tracking-[-0.02em]" style={{ color: 'var(--text-primary)' }}>{plan.name}</h1>
              {clientName && (
                <p className="mt-0.5 text-[13px] font-[650]" style={{ color: '#6366f1' }}>For {clientName}</p>
              )}
              {plan.description && <p className="mt-0.5 text-[13px]" style={{ color: 'var(--text-muted)' }}>{plan.description}</p>}
            </div>
          </div>
          {!editing && (
            <div className="flex shrink-0 items-center gap-2">
              <Button variant="outline" size="sm" iconLeft={<Pencil size={13} />} onClick={startEditing}>Edit Exercises</Button>
              {/* Saved the plan — now log the actual session against it. */}
              {clientId && (
                <Button
                  variant="primary" size="sm" iconLeft={<ClipboardList size={13} />}
                  onClick={() => router.push(`/pt-os/clients/${clientId}/workout-log`)}
                >
                  Workout Log
                </Button>
              )}
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <span className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-[650]" style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}>
            <Target size={12} /> {plan.goal.replace('_', ' ')}
          </span>
          <span className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-[650]" style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}>
            <Clock size={12} /> {plan.sessions_per_week}x/week &middot; {plan.duration_weeks}wk
          </span>
          <span className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-[650] capitalize" style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}>
            {plan.difficulty}
          </span>
        </div>
      </m.div>

      {!editing ? (
        <div className="space-y-4">
          {WEEKDAYS.map((day, i) => {
            const exercises = grouped.get(i + 1);
            if (!exercises?.length) return null;
            return (
              <div key={day} className="rounded-[18px] p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <p className="mb-3 text-[13px] font-[750]" style={{ color: 'var(--text-primary)' }}>{day}</p>
                <div className="space-y-2">
                  {exercises.map((ex) => (
                    <div key={ex.id} className="flex items-center justify-between gap-3 rounded-[12px] px-3.5 py-2.5" style={{ background: 'var(--bg-subtle)' }}>
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-[650]" style={{ color: 'var(--text-primary)' }}>{ex.name}</p>
                        {ex.muscle_group && <p className="text-[11px] capitalize" style={{ color: 'var(--text-disabled)' }}>{ex.muscle_group}</p>}
                      </div>
                      <span className="flex-shrink-0 text-[12px] font-[650]" style={{ color: 'var(--text-muted)' }}>
                        {ex.sets} &times; {ex.reps} &middot; {ex.rest_seconds}s rest
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          {plan.exercises.length === 0 && (
            <div className="rounded-[18px] p-10 text-center" style={{ background: 'var(--bg-card)', border: '1px dashed var(--border)' }}>
              <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>No exercises prescribed yet.</p>
              <Button variant="outline" size="sm" className="mt-3" iconLeft={<Pencil size={13} />} onClick={startEditing}>Add Exercises</Button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {WEEKDAYS.map((day, i) => (
            <div key={day} className="rounded-[18px] p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[13px] font-[750]" style={{ color: 'var(--text-primary)' }}>{day}</p>
                <button onClick={() => { setPickerDay(i + 1); setPickerOpen(true); }}
                  className="flex items-center gap-1 rounded-[8px] px-2.5 py-1 text-[11.5px] font-[650]" style={{ color: '#6366f1' }}>
                  <Plus size={12} /> Add
                </button>
              </div>
              <div className="space-y-2">
                {(draftGrouped.get(i + 1) || []).map((ex) => (
                  <div key={ex.index} className="flex flex-wrap items-center gap-2 rounded-[12px] px-3 py-2.5" style={{ background: 'var(--bg-subtle)' }}>
                    <span className="min-w-0 flex-1 truncate text-[13px] font-[650]" style={{ color: 'var(--text-primary)' }}>{ex.name}</span>
                    <input type="number" min={1} value={ex.sets} onChange={(e) => updateDraftField(ex.index, 'sets', Number(e.target.value))}
                      className="w-12 rounded-[8px] px-2 py-1 text-center text-[12px] outline-none" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }} />
                    <span className="text-[11px]" style={{ color: 'var(--text-disabled)' }}>&times;</span>
                    <input type="number" min={1} value={ex.reps} onChange={(e) => updateDraftField(ex.index, 'reps', Number(e.target.value))}
                      className="w-12 rounded-[8px] px-2 py-1 text-center text-[12px] outline-none" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }} />
                    <input type="number" min={0} step={15} value={ex.rest_seconds} onChange={(e) => updateDraftField(ex.index, 'rest_seconds', Number(e.target.value))}
                      className="w-14 rounded-[8px] px-2 py-1 text-center text-[12px] outline-none" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                      title="Rest seconds" />
                    <button onClick={() => removeDraft(ex.index)} className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-[8px]" style={{ color: '#ef4444' }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
                {!(draftGrouped.get(i + 1) || []).length && (
                  <p className="text-[12px]" style={{ color: 'var(--text-disabled)' }}>No exercises on this day.</p>
                )}
              </div>
            </div>
          ))}

          <div className="flex justify-end gap-2 pb-8">
            <Button variant="ghost" onClick={() => setEditing(false)} disabled={saving}>Cancel</Button>
            <Button variant="primary" iconLeft={saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} onClick={handleSave} disabled={saving}>
              Save Changes
            </Button>
          </div>
        </div>
      )}

      <ExercisePicker open={pickerOpen} onClose={() => setPickerOpen(false)} onSelect={handlePick} />
    </div>
  );
}
