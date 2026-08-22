'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { m } from 'framer-motion';
import { ClipboardList, Dumbbell, Pencil, Loader2, Target, Clock } from 'lucide-react';
import Guard from '@/components/Guard';
import { Button } from '@/components/ui';
import { api } from '@/lib/api';
import type { WorkoutPlan, WorkoutPlanExercise } from '@/lib/api';
import { useToast } from '@/lib/toast';

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function WorkoutPlanDetailPage() {
  return (
    <Guard roles={['admin', 'manager', 'trainer']}>
      <Suspense fallback={
        <div className="flex items-center justify-center py-24">
          <Loader2 size={22} className="animate-spin" style={{ color: 'var(--text-disabled)' }} />
        </div>
      }>
        <Inner />
      </Suspense>
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

  /**
   * Editing a programme opens the Workout Builder.
   *
   * This used to flip the page into a local draft editor whose "add" buttons
   * opened the exercise picker as a floating window over the plan. Both are
   * gone: the builder is the editing surface, it is a real screen with the
   * week, the day tabs, reordering and autosave, and its add-exercises step
   * is its own page rather than a modal on top of the thing being edited.
   *
   * The plan's own route is used when nobody is assigned, since the client
   * route needs a client.
   */
  const builderHref = clientId
    ? `/pt-os/clients/${clientId}/training/builder?plan=${encodeURIComponent(String(id))}`
    : `/pt-os/workout-plans/${encodeURIComponent(String(id))}/builder`;
  const openBuilder = useCallback(() => router.push(builderHref), [router, builderHref]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={22} className="animate-spin" style={{ color: 'var(--text-disabled)' }} />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
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

  return (
    <div className="mx-auto w-full max-w-3xl pt-1 pb-6 sm:pb-8">
      <m.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-[24px] p-6 sm:p-8 mb-6"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)' }}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[14px]" style={{ background: 'linear-gradient(135deg, #0067e0, #0059ce)' }}>
              <Dumbbell size={18} color="#fff" />
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-[22px] font-[800] tracking-[-0.02em]" style={{ color: 'var(--text-primary)' }}>{plan.name}</h1>
              {clientName && (
                <p className="mt-0.5 text-[13px] font-[650]" style={{ color: '#0067e0' }}>For {clientName}</p>
              )}
              {plan.description && <p className="mt-0.5 text-[13px]" style={{ color: 'var(--text-muted)' }}>{plan.description}</p>}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
              <Button variant="outline" size="sm" iconLeft={<Pencil size={13} />} onClick={openBuilder}>Edit Exercises</Button>
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
              <Button variant="outline" size="sm" className="mt-3" iconLeft={<Pencil size={13} />} onClick={openBuilder}>Add Exercises</Button>
            </div>
          )}
      </div>
    </div>
  );
}
