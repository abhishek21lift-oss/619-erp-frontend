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

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Dumbbell } from 'lucide-react';
import Guard from '@/components/Guard';
import { EmptyState, PageContainer, PageHero } from '@/components/ui';
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
  /** Where "Back to builder" and a finished batch both return to. */
  backHref: string;
}

export default function AddExercisesScreen({ planId, day, backHref }: AddExercisesScreenProps) {
  const router = useRouter();
  const { toast } = useToast();

  const goBack = useCallback(() => router.push(backHref), [router, backHref]);

  // What this day already holds, so the panel can mark those rows and refuse
  // to add them twice. Fetched here rather than passed through the URL: a list
  // of ids is unbounded, and the builder's copy is stale the moment anything
  // else edits the plan.
  const [existingIds, setExistingIds] = useState<string[]>([]);
  const [recentNames, setRecentNames] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!planId) return;
    let cancelled = false;
    (async () => {
      try {
        const detail = await api.workouts.plans.detail(planId);
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
      }
    })();
    return () => { cancelled = true; };
  }, [planId, day]);

  const addAll = useCallback(async (picked: { id: string; name: string }[]) => {
    if (picked.length === 0 || saving) return;
    setSaving(true);

    const { created, failed } = await addSequentially(picked, async (exerciseId) => {
      const res = await api.workouts.plans.exercises.add(planId, {
        exercise_id: exerciseId,
        day_of_week: day,
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
  }, [planId, day, saving, toast, goBack]);

  if (!planId) {
    return (
      <Guard roles={['admin', 'manager', 'trainer']}>
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
    <Guard roles={['admin', 'manager', 'trainer']}>
      <PageContainer>
        <PageHero
          icon={<Dumbbell size={20} />}
          title="Add exercises"
          subtitle={`${DAY_NAMES[day]} · pick as many as you like`}
          actions={
            <button
              type="button"
              onClick={goBack}
              className="inline-flex h-[44px] w-full cursor-pointer items-center justify-center gap-2 rounded-[14px] px-5 text-[13px] font-[700] transition-transform active:scale-95 sm:w-auto"
              style={{ background: '#fff', color: '#0F172A' }}
            >
              <ArrowLeft size={16} /> Back to builder
            </button>
          }
        />

        <div className="mx-auto w-full max-w-3xl">
          <div
            className="rounded-[20px] p-4 sm:p-5"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
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
              recentNames={recentNames}
              existingIds={existingIds}
            />
          </div>
        </div>
      </PageContainer>
    </Guard>
  );
}
