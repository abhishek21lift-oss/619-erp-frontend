'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { m } from 'framer-motion';
import { ClipboardList, Dumbbell, Pencil, Loader2, Target, Clock, SlidersHorizontal } from 'lucide-react';
import Guard from '@/components/Guard';
import { Button, HeroButton, HeroChip, PageHero } from '@/components/ui';
import { api } from '@/lib/api';
import type { WorkoutPlan, WorkoutPlanExercise } from '@/lib/api';
import { useToast } from '@/lib/toast';
import EditProgrammeDialog from '@/components/pt-os/builder/EditProgrammeDialog';
import { PROGRAMME_GOALS } from '@/components/pt-os/builder/NewProgrammeDialog';

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function WorkoutPlanDetailPage() {
  return (
    <Guard role="trainer">
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
  const [editing, setEditing] = useState(false);

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
   * Addressed by the plan whether or not a client is assigned. The client-
   * scoped twin this used to branch to is gone: it mounted the same builder
   * and the client segment fed nothing but its own add-exercises link.
   */
  const builderHref = `/pt-os/workout-plans/${encodeURIComponent(String(id))}/builder`;
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
      <PageHero
        className="mb-5"
        icon={<Dumbbell size={20} />}
        title={plan.name}
        subtitle={[clientName ? `For ${clientName}` : null, plan.description].filter(Boolean).join(' · ') || undefined}
        actions={
          <div className="flex gap-2">
            <HeroButton variant="glass" className="flex-1 sm:flex-none" onClick={() => setEditing(true)} icon={<SlidersHorizontal size={14} />}>
              Edit Details
            </HeroButton>
            <HeroButton variant="glass" className="flex-1 sm:flex-none" onClick={openBuilder} icon={<Pencil size={14} />}>
              Edit Exercises
            </HeroButton>
            {/* Saved the plan — now log the actual session against it. */}
            {clientId && (
              <HeroButton
                className="flex-1 sm:flex-none"
                onClick={() => router.push(`/pt-os/clients/${clientId}/workout-log`)}
                icon={<ClipboardList size={14} />}
              >
                Workout Log
              </HeroButton>
            )}
          </div>
        }
      >
        <div className="flex flex-wrap gap-2">
          {/* Goal by its label, and only when there is one: an AI-saved
              programme can carry none, and `.replace` on null took the page
              down. The old single `.replace('_', ' ')` also left
              "general fitness" half-converted. */}
          {plan.goal && (
            <HeroChip icon={<Target size={12} />}>
              {PROGRAMME_GOALS.find((g) => g.value === plan.goal)?.label ?? plan.goal.replace(/_/g, ' ')}
            </HeroChip>
          )}
          <HeroChip icon={<Clock size={12} />}>{plan.sessions_per_week}x/week &middot; {plan.duration_weeks}wk</HeroChip>
          {plan.difficulty && <HeroChip className="capitalize">{plan.difficulty}</HeroChip>}
        </div>
      </PageHero>

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
      {editing && (
        <EditProgrammeDialog
          plan={plan}
          onClose={() => setEditing(false)}
          onSaved={setPlan}
        />
      )}
    </div>
  );
}
