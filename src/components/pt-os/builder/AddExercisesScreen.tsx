'use client';

// Add exercises to one day of a programme.
//
// ── Why this is a route and not a dialog ───────────────────────────────────
//
// Adding exercises is not a question with two answers. It is search, filters,
// a library of hundreds and a batch being assembled — the same shape as any
// other index screen in this app, and it was being done inside a modal sitting
// on top of the screen it edits.
//
// A route buys three things a dialog cannot:
//
//   · the back button works, and so does the OS back gesture on a phone
//   · the URL carries the plan and the day, so the screen is linkable,
//     refreshable and survives an accidental reload mid-selection
//   · the full viewport, on the screen where a trainer is reading a long list
//
// ── Why it is a component and not a page ──────────────────────────────────
//
// A programme reached from a client lives under that client; a programme with
// nobody on it has no client to live under, and one still has to be able to
// add exercises to it. So the screen is mounted from two routes and told where
// "back" goes, rather than existing twice.
//
// The dialog form of the picker still exists and is still used by the callers
// that genuinely add one exercise and continue: a logged session row and a
// template row. Both render the same ExercisePickerPanel, so the search,
// filters and keyboard behaviour cannot drift apart.

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowLeft, Dumbbell, Plus } from 'lucide-react';
import Guard from '@/components/Guard';
import { Button, EmptyState, PageActions, PageContainer, PageHero } from '@/components/ui';
import { ExercisePickerPanel } from '@/components/pt-os/workout-log/ExercisePicker';
import { addSequentially } from '@/components/pt-os/builder/addSequentially';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';
import type { WorkoutPlanExercise } from '@/lib/api';

const DAY_NAMES = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export interface AddExercisesScreenProps {
  /** The programme being filled. Empty renders the "nothing selected" state. */
  planId: string;
  /** 1-7, already clamped by the route that read it out of the URL. */
  day: number;
  /**
   * The week the builder was showing. Adds belong to that week; the route
   * defaults to week 1 when the builder never named one.
   */
  week: number;
  /** Where "Back to builder" and a finished batch both return to. */
  backHref: string;
  /** Just created in the library; attach it to this day on arrival. */
  newExerciseId?: string | null;
}

export default function AddExercisesScreen({
  planId, day, week, backHref, newExerciseId,
}: AddExercisesScreenProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  const goBack = useCallback(() => router.push(backHref), [router, backHref]);

  /** This screen's own address, with the week carried through every round trip. */
  const here = `${pathname}?day=${day}${week > 1 ? `&week=${week}` : ''}`;

  // What this day already holds, so the panel can mark those rows and refuse
  // to add them twice. Fetched here rather than passed through the URL: a list
  // of ids is unbounded, and the builder's copy is stale the moment anything
  // else edits the plan.
  const [existingIds, setExistingIds] = useState<string[]>([]);
  const [recentNames, setRecentNames] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  // The attach below must wait for this read: it appends to `existingIds`,
  // and a late detail response would otherwise overwrite the append.
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!planId) return;
    let cancelled = false;
    (async () => {
      try {
        // Read the week being filled, not week 1: what is already on Thursday
        // of week 6 is not what is on Thursday of week 1.
        const detail = await api.workouts.plans.detail(planId, week > 1 ? { week } : undefined);
        if (cancelled) return;
        const rows: WorkoutPlanExercise[] = detail.exercises ?? [];
        setExistingIds(
          rows.filter((r) => r.day_of_week === day)
            .map((r) => r.exercise_id ?? '')
            .filter(Boolean),
        );
        setRecentNames(rows.map((r) => r.name ?? '').filter(Boolean).slice(0, 12));
      } catch {
        // Non-fatal. Worst case the panel does not grey out what is already
        // there — the server still rejects a duplicate, and refusing to open
        // the screen over a failed convenience read would be worse.
        if (!cancelled) setExistingIds([]);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, [planId, day, week]);

  /** Survives StrictMode's double effect without firing the attach twice. */
  const attachedNew = useRef<string | null>(null);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);

  useEffect(() => {
    if (!newExerciseId || !loaded || attachedNew.current === newExerciseId) return;
    attachedNew.current = newExerciseId;
    (async () => {
      try {
        await api.workouts.plans.exercises.add(planId, {
          exercise_id: newExerciseId,
          day_of_week: day,
          ...(week > 1 ? { week_number: week } : {}),
        });
        if (!alive.current) return;
        setExistingIds((ids) => (ids.includes(newExerciseId) ? ids : [...ids, newExerciseId]));
        toast.success('Custom exercise created and added');
      } catch {
        if (!alive.current) return;
        // It is in the library now, so the trainer can still find it below.
        toast.error('The exercise was saved, but could not be added. Search for it below.');
      } finally {
        // Drop ?new either way: a refresh must not retry the attach.
        if (alive.current) router.replace(here);
      }
    })();
  }, [newExerciseId, loaded, planId, day, week, here, router, toast]);

  /** The picker found nothing exact — author it, then come straight back. */
  const createExercise = useCallback((name: string) => {
    router.push(
      `/pt-os/exercise-library/new?name=${encodeURIComponent(name)}&returnTo=${encodeURIComponent(here)}`,
    );
  }, [router, here]);

  /** The same destination without a typed name, for the visible action. */
  const openNewExercise = useCallback(() => {
    router.push(`/pt-os/exercise-library/new?returnTo=${encodeURIComponent(here)}`);
  }, [router, here]);

  const addAll = useCallback(async (picked: { id: string; name: string }[]) => {
    if (picked.length === 0 || saving) return;
    setSaving(true);

    const { created, failed } = await addSequentially(picked, async (exerciseId) => {
      const res = await api.workouts.plans.exercises.add(planId, {
        exercise_id: exerciseId,
        day_of_week: day,
        ...(week > 1 ? { week_number: week } : {}),
      });
      return res.exercise;
    });

    if (failed === picked.length) {
      toast.error(picked.length === 1 ? 'Could not add that exercise' : 'Could not add those exercises');
      setSaving(false);
      return;                                    // stay put so the batch is not lost
    }
    if (failed > 0) toast.error(`Added ${created.length}, but ${failed} could not be added`);
    else toast.success(created.length === 1 ? 'Exercise added' : `${created.length} exercises added`);

    // Back to the builder, which refetches on mount and so shows the new rows.
    goBack();
  }, [planId, day, week, saving, toast, goBack]);

  if (!planId) {
    return (
      <Guard role="trainer">
        <PageContainer>
          <EmptyState
            icon={<Dumbbell size={22} />}
            title="No programme selected"
            description="Open a programme from Workout Programs, then add exercises to a day."
          />
        </PageContainer>
      </Guard>
    );
  }

  return (
    <Guard role="trainer">
      <PageContainer>
        <PageHero
          icon={<Dumbbell size={20} />}
          title="Add exercises"
          subtitle={`${DAY_NAMES[day]} · pick as many as you like`}
        />
        <PageActions>
          <Button onClick={openNewExercise} iconLeft={<Plus size={16} />}>
            New exercise
          </Button>
          <Button variant="secondary" onClick={goBack} iconLeft={<ArrowLeft size={16} />}>
            Back to builder
          </Button>
        </PageActions>

        <div className="mx-auto w-full max-w-3xl">
          <div
            className="rounded-[20px] p-4 sm:p-5"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              boxShadow: '0 4px 24px rgba(15,23,42,0.06)',
            }}
          >
            <ExercisePickerPanel
              live
              multiple
              // A trainer builds a day standing on the gym floor with a phone
              // in one hand. Speaking "barbell bench press" is the difference
              // between that and thumb-typing it — see the prop's own note for
              // why the three dialog callers do not get this.
              voiceSearch
              busy={saving}
              onClose={goBack}
              // Unused in batch mode; the panel takes the batch through
              // onSelectMany. Required by the shared props, so it is explicit
              // rather than quietly optional.
              onSelect={() => {}}
              onSelectMany={addAll}
              onCreateExercise={createExercise}
              recentNames={recentNames}
              existingIds={existingIds}
            />
          </div>
        </div>
      </PageContainer>
    </Guard>
  );
}
