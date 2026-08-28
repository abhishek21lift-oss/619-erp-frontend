'use client';

// The Workout Builder: one day at a time, every exercise an editable card.
//
// ── Why one day at a time ─────────────────────────────────────────────────
//
// A week is up to seven lists; showing them together is the spreadsheet the
// redesign exists to remove, and on a phone it is unusable. Day tabs also make
// the save model honest — the granular endpoints are scoped per exercise, and
// the reorder endpoint is scoped per day, so the visible unit matches the unit
// that gets written.
//
// ── Drag and drop ─────────────────────────────────────────────────────────
//
// framer-motion's Reorder, not dnd-kit. framer-motion is already a dependency
// driving every other animation in the app, so this adds no bytes and no second
// animation idiom. Reorder.Group gives touch-friendly dragging and the layout
// animation for free.
//
// ── Optimistic, but not credulous ─────────────────────────────────────────
//
// Every edit paints immediately and queues a save. If the save fails the local
// value stays (retyping it would be worse) but the status pill goes red and
// says so — an optimistic UI that hides a failed write is worse than a save
// button, because the trainer leaves believing the programme is stored.
//
// ── One week, until you change one ────────────────────────────────────────
//
// The builder authors WEEK 1 and a progression rule; weeks 2..N are computed
// from those and are not stored. But every week is EDITABLE, and an edit means
// "from here on": editing week 4 leaves weeks 1-3 alone and restarts the climb
// from week 4's new numbers.
//
// The server does the hard part. A computed week has no rows, so a card shown
// in week 6 carries WEEK 1's row id — which is why later weeks used to be
// read-only, since an "edit" of week 6 would have PATCHed week 1 and moved
// every other week with it. Now the first edit to a computed week makes the
// server write that week out and land the edit on the new row, and every
// later write resolves the id it is given to that week's counterpart.
//
// So the one rule this file has to hold up: EVERY WRITE CARRIES ITS WEEK.
// A patch, a delete, a reorder or an add that forgets it edits week 1, and
// week 1 is the week every other week is computed from — one forgotten
// parameter moves the whole programme.
//
// ── Why the sizes are h-[44px] and not h-11 ───────────────────────────────
//
// globals.css sets `html { font-size: 14px }`, so Tailwind's rem-based sizes
// render at 87.5% of their names: h-11 is 38.5px, h-12 is 42, h-14 is 49. Every
// control on this screen was written as h-11 for "44px touch target" and shipped
// measuring 38.5. Sizes that have to be exact are written in pixels here.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, Reorder, useDragControls } from 'framer-motion';
import { Plus, Loader2, Check, CloudOff, Dumbbell, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { api } from '@/lib/api';
import type {
  ProgressionPreview, ProgressionType, WorkoutPlan, WorkoutPlanExercise, WorkoutExerciseInput,
} from '@/lib/api';
import { useToast } from '@/lib/toast';
import { EmptyState, PageContainer, PageHero } from '@/components/ui';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import ExerciseCard from './ExerciseCard';
import PlanVersions from './PlanVersions';
import ProgressionRule from './ProgressionRule';
import { useAutosave, saveStatusLabel } from './useAutosave';

/** ISO-ish: 1 = Monday, matching workout_exercises.day_of_week. */
const DAYS = [
  { n: 1, short: 'Mon', long: 'Monday' },
  { n: 2, short: 'Tue', long: 'Tuesday' },
  { n: 3, short: 'Wed', long: 'Wednesday' },
  { n: 4, short: 'Thu', long: 'Thursday' },
  { n: 5, short: 'Fri', long: 'Friday' },
  { n: 6, short: 'Sat', long: 'Saturday' },
  { n: 7, short: 'Sun', long: 'Sunday' },
];

export interface WorkoutBuilderProps {
  planId: string;
  /**
   * The client whose programme this is, when it is reached through one.
   *
   * Adding exercises is its own route, and that route lives under the client
   * when there is one. A programme nobody is assigned to has no client to
   * live under and still has to be fillable, so it is optional and the plan's
   * own route is used instead.
   */
  clientId?: string;
}

export default function WorkoutBuilder({ planId, clientId }: WorkoutBuilderProps) {
  const { toast } = useToast();
  const [plan, setPlan] = useState<WorkoutPlan | null>(null);
  const [rows, setRows] = useState<WorkoutPlanExercise[]>([]);
  // `day` lives in the URL, not in state.
  //
  // Adding exercises is now a separate route, so a trainer building Thursday
  // leaves this screen and comes back. With local state that round trip always
  // returned them to Monday, and the rows they had just added were on a tab
  // they had to go and find. The URL survives the navigation, a refresh, and
  // being shared.
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const dayParam = Number(searchParams.get('day'));
  const day = Number.isFinite(dayParam) && dayParam >= 1 && dayParam <= 7 ? Math.trunc(dayParam) : 1;

  const setDay = useCallback((n: number) => {
    const next = new URLSearchParams(searchParams.toString());
    next.set('day', String(n));
    // replace, not push: flicking between days is not navigation history a
    // trainer wants to walk back through one tab at a time.
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }, [router, pathname, searchParams]);
  const [week, setWeek] = useState(1);
  const [loading, setLoading] = useState(true);
  /**
   * Adding exercises is a route now, not a dialog.
   *
   * The day travels in the URL so the page knows which day it is filling, and
   * so the builder is back on that same day when the trainer returns.
   */
  const addExercisesHref = clientId
    ? `/pt-os/clients/${clientId}/training/builder/add-exercises`
      + `?plan=${encodeURIComponent(planId)}&day=${day}`
    : `/pt-os/workout-plans/${encodeURIComponent(planId)}/builder/add-exercises?day=${day}`;

  const { status, enqueue, flushNow } = useAutosave<WorkoutExerciseInput & { week_number?: number }>({
    // The week travels INSIDE the patch, put there by patchRow at the moment
    // the trainer typed. Reading `week` here instead would take whichever week
    // is on screen when the debounce fires — switch tabs mid-edit and the
    // keystroke lands on the week you switched to.
    save: (rowId, patch) => api.workouts.plans.exercises.patch(planId, rowId, patch),
    onError: () => toast.error('Could not save that change'),
  });

  // Week 1 is the authored week; anything higher is fetched because the server
  // resolves it — deriving it here would be a second copy of the arithmetic,
  // free to drift from the one the client's log runs on.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const detail = await api.workouts.plans.detail(planId, week > 1 ? { week } : undefined);
        if (cancelled) return;
        setPlan(detail);
        setRows(detail.exercises ?? []);
      } catch {
        if (!cancelled) toast.error('Could not load this programme');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [planId, week, toast]);

  /**
   * Save the progression rule and re-read week 1.
   *
   * Re-reading rather than merging the response: the plan carries
   * `progression_preview`, which the PUT does not return and which is stale
   * the moment the rule changes. Showing last rule's ramp under this rule's
   * label would be worse than showing none.
   */
  const saveRule = useCallback(async (patch: {
    progression_type: ProgressionType;
    progression_amount: number | null;
    progression_every_weeks: number;
  }) => {
    const snapshot = plan;
    setPlan((p) => (p ? { ...p, ...patch } : p));   // paint the chip immediately
    try {
      await api.workouts.plans.update(planId, patch);
      const fresh = await api.workouts.plans.detail(planId);
      setPlan(fresh);
      setRows(fresh.exercises ?? []);
      setWeek(1);
    } catch {
      setPlan(snapshot);
      toast.error('Could not save the progression rule');
    }
  }, [planId, plan, toast]);

  // Flush on unmount so navigating away mid-debounce still saves.
  useEffect(() => () => { void flushNow(); }, [flushNow]);

  /**
   * Re-read the ramp after an edit lands.
   *
   * `progression_preview` is computed server-side from the numbers as they
   * were when the plan was fetched. Change a squat from 60 to 80 kg and the
   * ramp underneath it still says "W1 60 → W12 87.5" — a prescription for a
   * weight the exercise no longer carries, sitting directly below the field
   * that contradicts it.
   *
   * Recomputing it locally would be a second copy of arithmetic that already
   * exists in one place, so it is re-read instead. Only the preview is
   * adopted: taking the whole plan would replace `rows` and fight whatever
   * the trainer is typing next.
   */
  const lastStatus = useRef(status);
  useEffect(() => {
    const settled = status === 'saved' && lastStatus.current !== 'saved';
    lastStatus.current = status;
    if (!settled || week !== 1) return;
    let cancelled = false;
    api.workouts.plans.detail(planId)
      .then((fresh) => {
        if (!cancelled) setPlan((p) => (p ? { ...p, progression_preview: fresh.progression_preview } : p));
      })
      .catch(() => { /* the ramp is a hint; a failed refresh is not worth a toast */ });
    return () => { cancelled = true; };
  }, [status, week, planId]);

  const forDay = useMemo(
    () => rows.filter((r) => r.day_of_week === day).sort((a, b) => a.sort_order - b.sort_order),
    [rows, day],
  );

  /** How many exercises each day holds — drives the count dots on the tabs. */
  const counts = useMemo(() => {
    const m = new Map<number, number>();
    for (const r of rows) m.set(r.day_of_week, (m.get(r.day_of_week) ?? 0) + 1);
    return m;
  }, [rows]);

  /** Where the rule lands, per exercise row id. Empty when there is no rule. */
  const previews = useMemo(() => {
    const m = new Map<string, ProgressionPreview>();
    for (const p of plan?.progression_preview ?? []) m.set(p.id, p);
    return m;
  }, [plan?.progression_preview]);

  const weeks = Math.max(1, plan?.duration_weeks ?? 1);
  const hasRule = (plan?.progression_type ?? 'none') !== 'none';
  /** Whether this week has been written by hand, rather than computed. */
  const edited = week > 1 && plan?.week_source === 'override';
  /** Which week these numbers are computed from — this one, or an earlier edit. */
  const anchor = plan?.anchor_week ?? 1;

  /**
   * Note that this week now stands on its own.
   *
   * The server decides this — the first write to a computed week makes it
   * real — but the client has to say so immediately, or the banner keeps
   * calling the week computed while the trainer is editing it. Local rather
   * than a refetch: a refetch would replace the rows underneath whatever they
   * are typing next.
   */
  const markEdited = useCallback(() => {
    setPlan((p) => (p ? { ...p, week_source: 'override', anchor_week: week } : p));
  }, [week]);

  /** Put this week back on the rule, and take the rule's numbers with it. */
  const resetWeek = useCallback(async () => {
    try {
      await api.workouts.plans.resetWeek(planId, week);
      const fresh = await api.workouts.plans.detail(planId, { week });
      setPlan(fresh);
      setRows(fresh.exercises ?? []);
      toast.success(`Week ${week} follows the rule again`);
    } catch {
      toast.error('Could not reset this week');
    }
  }, [planId, week, toast]);

  const patchRow = useCallback((rowId: string, patch: WorkoutExerciseInput) => {
    setRows((prev) => prev.map((r) => (r.id === rowId ? { ...r, ...patch } as WorkoutPlanExercise : r)));
    // week_number rides along with the fields, so the edit is bound to the
    // week it was made in rather than the week that happens to be on screen
    // when it saves.
    enqueue(rowId, week > 1 ? { ...patch, week_number: week } : patch);
  }, [enqueue, week]);

  const duplicate = useCallback(async (row: WorkoutPlanExercise) => {
    try {
      const { exercise: created } = await api.workouts.plans.exercises.add(planId, {
        exercise_id: row.exercise_id ?? '',
        day_of_week: row.day_of_week,
        week_number: week,
        sets: row.sets, reps: row.reps, rest_seconds: row.rest_seconds,
        notes: row.notes, target_weight: row.target_weight, tempo: row.tempo,
        rpe: row.rpe, warmup_sets: row.warmup_sets, superset_group: row.superset_group,
      });
      setRows((prev) => [...prev, created]);
      if (week > 1) markEdited();
    } catch {
      toast.error('Could not duplicate that exercise');
    }
  }, [planId, week, markEdited, toast]);

  const remove = useCallback(async (rowId: string) => {
    const snapshot = rows;
    setRows((prev) => prev.filter((r) => r.id !== rowId));   // optimistic
    try {
      await api.workouts.plans.exercises.remove(planId, rowId, week);
      if (week > 1) markEdited();
    } catch {
      setRows(snapshot);                                      // put it back
      toast.error('Could not remove that exercise');
    }
  }, [planId, rows, week, markEdited, toast]);

  const reorder = useCallback(async (next: WorkoutPlanExercise[]) => {
    // Paint the new order, and renumber sort_order locally so the memo above
    // does not immediately re-sort the list back.
    const renumbered = next.map((r, i) => ({ ...r, sort_order: i }));
    setRows((prev) => [...prev.filter((r) => r.day_of_week !== day), ...renumbered]);
    try {
      await api.workouts.plans.exercises.reorder(planId, day, next.map((r) => r.id), week);
      if (week > 1) markEdited();
    } catch {
      toast.error('Could not save the new order');
    }
  }, [planId, day, week, markEdited, toast]);

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 size={26} className="animate-spin" style={{ color: 'var(--brand)' }} />
      </div>
    );
  }

  return (
    <PageContainer>
      <PageHero
        icon={<Dumbbell size={20} />}
        title={plan?.name ?? 'Workout'}
        subtitle={`${forDay.length} exercise${forDay.length === 1 ? '' : 's'} on ${DAYS.find((d) => d.n === day)?.long}`}
        actions={<SaveIndicator status={status} />}
      />

      <div className="mx-auto w-full max-w-screen-md">
      {/* ── The rule ──
          Only on week 1. It describes how the programme grows from its first
          week, and offering it from inside week 6 would read as a rule about
          week 6. */}
      {plan && week === 1 && <ProgressionRule plan={plan} onChange={saveRule} />}

      {plan && week === 1 && (
        <PlanVersions
          planId={planId}
          version={plan.version ?? 1}
          onSaved={(next) => setPlan((p) => (p ? { ...p, version: next } : p))}
        />
      )}

      {/* ── Week stepper ──
          Hidden without a rule, because then every week is byte-identical and a
          control that changes nothing is worse than no control.

          No box around it: it is a heading for what follows, not a panel. The
          hairline is the whole separation the page needs. */}
      {hasRule && weeks > 1 && (
        <div
          className="mb-3 flex items-center justify-between gap-2 pb-3"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <WeekStep
            label="Previous week"
            disabled={week <= 1}
            onClick={() => setWeek((w) => Math.max(1, w - 1))}
          >
            <ChevronLeft size={18} />
          </WeekStep>
          <div className="min-w-0 text-center">
            <p className="text-[13px] font-[750]" style={{ color: 'var(--text-primary)' }}>
              Week {week}
              <span className="font-[600]" style={{ color: 'var(--text-muted)' }}> of {weeks}</span>
            </p>
            <p className="text-[10.5px] font-[650]" style={{ color: 'var(--text-muted)' }}>
              {week === 1 ? 'The week you write'
                : edited ? 'Edited — later weeks build on this'
                  : anchor > 1 ? `Following week ${anchor}` : 'Following week 1'}
            </p>
          </div>
          <WeekStep
            label="Next week"
            disabled={week >= weeks}
            onClick={() => setWeek((w) => Math.min(weeks, w + 1))}
          >
            <ChevronRight size={18} />
          </WeekStep>
        </div>
      )}

      {/* ── What this week is ──
          A sentence, not a panel. It used to be a bordered notice saying the
          week was read-only; the week is editable now, so what is left to say
          is where its numbers came from and — once it has been edited — how to
          undo that.

          The action is its own control below the sentence, not a link inside
          it. Set inline, it inherits the paragraph's 12px line box — a ~15px
          tall tap target on the screen this is designed for, which the device
          check failed it for. A sentence cannot carry a 44px target without
          wrecking its own leading, so the two are separated. */}
      {week > 1 && (
        <div className="mb-3">
          <div className="flex items-start gap-2">
            <Eye size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--text-muted)' }} />
            <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
              {edited
                ? `Week ${week} is written by hand. Weeks after it build on these numbers; weeks before it are unchanged.`
                : `Week ${week} follows week ${anchor}${hasRule ? ' plus the rule' : ''}. Change anything here and it becomes this week's own — weeks before it stay as they are.`}
            </p>
          </div>
          {edited && (
            <button
              type="button"
              onClick={resetWeek}
              className="mt-1 flex h-[44px] items-center text-[12.5px] font-[700]"
              style={{ color: 'var(--brand)' }}
            >
              Put week {week} back on the rule
            </button>
          )}
        </div>
      )}

      {/* ── Day tabs ──
          Horizontally scrollable rather than wrapped: seven tabs plus counts do
          not fit at 390px, and a wrapped second row pushes the cards down. */}
      <div className="-mx-1 mb-4 flex gap-1.5 overflow-x-auto px-1 pb-1" role="tablist" aria-label="Workout day">
        {DAYS.map((d) => {
          const active = d.n === day;
          const count = counts.get(d.n) ?? 0;
          return (
            <button
              key={d.n}
              role="tab"
              aria-selected={active}
              onClick={() => setDay(d.n)}
              // Only the selected day carries a shape. Seven outlined pills in
              // a row is six boxes drawn to say "not this one"; the selection
              // is the only thing that needs a background to read.
              className="flex h-[44px] shrink-0 items-center gap-1.5 rounded-[14px] px-3.5 text-[13px] font-[700] transition-[background,box-shadow]"
              style={{
                background: active ? 'linear-gradient(135deg, #0067e0, #0059ce)' : 'transparent',
                color: active ? '#fff' : 'var(--text-muted)',
                border: '1px solid transparent',
                boxShadow: active ? '0 4px 14px -4px rgba(0,103,224,0.5)' : 'none',
              }}
            >
              {d.short}
              {count > 0 && (
                <span
                  className="rounded-full px-1.5 text-[10px] font-[800]"
                  style={{
                    background: active ? 'rgba(255,255,255,0.25)' : 'transparent',
                    color: active ? '#fff' : 'var(--text-disabled)',
                  }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── The day's exercises ──
          One branch, not two. Every week is editable now, so the read-only
          list that used to render for weeks 2..N is gone — and with it the
          second copy of this list that could drift from the first. */}
      {forDay.length === 0 ? (
        <EmptyState
          icon={<Dumbbell size={22} />}
          title={`Nothing on ${DAYS.find((d) => d.n === day)?.long} yet`}
          description="Add the first exercise and it becomes a card you can edit, duplicate and reorder."
          action={(
            <button
              type="button"
              onClick={() => router.push(addExercisesHref)}
              className="inline-flex h-[44px] items-center gap-2 rounded-[14px] px-4 text-[13.5px] font-[700] text-white"
              style={{
                background: 'linear-gradient(135deg, #0067e0, #0059ce)',
                boxShadow: '0 4px 14px -4px rgba(0,103,224,0.5)',
              }}
            >
              <Plus size={16} /> Add exercise
            </button>
          )}
        />
      ) : (
        // No gap between the rows: each exercise carries its own hairline, so
        // the day reads as one list rather than a stack of separate cards.
        <Reorder.Group axis="y" values={forDay} onReorder={reorder} className="flex flex-col">
          <AnimatePresence initial={false}>
            {forDay.map((row) => (
              <DraggableExercise
                key={row.id}
                row={row}
                preview={previews.get(row.id)}
                onChange={(patch) => patchRow(row.id, patch)}
                onDuplicate={() => duplicate(row)}
                onDelete={() => remove(row.id)}
              />
            ))}
          </AnimatePresence>
        </Reorder.Group>
      )}

      {/* ── Add, inline after the list ── */}
      {forDay.length > 0 && (
        <button
          type="button"
          onClick={() => router.push(addExercisesHref)}
          className="mt-1 flex h-[48px] w-full items-center justify-center gap-2 text-[13.5px] font-[700] transition-colors"
          style={{ color: 'var(--brand)' }}
        >
          <Plus size={16} /> Add exercise
        </button>
      )}

      {/* ── Floating action button ──
          Sits above the bottom nav via the --bottom-nav-h token rather than a
          magic number, so it stays put if the nav height changes. */}
      <button
        type="button"
        onClick={() => router.push(addExercisesHref)}
        aria-label="Add exercise"
        className="fixed right-4 z-40 flex h-[56px] w-[56px] items-center justify-center rounded-full text-white transition-transform active:scale-95"
        style={{
          bottom: 'calc(var(--bottom-nav-h, 52px) + env(safe-area-inset-bottom, 0px) + 16px)',
          background: 'linear-gradient(135deg, #0067e0, #3B8DF5)',
          boxShadow: '0 8px 24px -4px rgba(0,103,224,0.55)',
        }}
      >
        <Plus size={24} />
      </button>
      </div>
    </PageContainer>
  );
}

/**
 * One reorderable row.
 *
 * Exists as its own component solely so each item can own a `useDragControls`
 * — hooks cannot be called inside a `.map()` callback in the parent. The
 * controls are what let dragging start ONLY from the grip handle: the card is
 * full of text inputs, and a whole-card drag listener would hijack every
 * attempt to place a cursor or select a value.
 */
function DraggableExercise({
  row, preview, onChange, onDuplicate, onDelete,
}: {
  row: WorkoutPlanExercise;
  preview?: ProgressionPreview;
  onChange: (patch: WorkoutExerciseInput) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const controls = useDragControls();
  const [dragging, setDragging] = useState(false);

  return (
    <Reorder.Item
      value={row}
      dragListener={false}
      dragControls={controls}
      onDragStart={() => setDragging(true)}
      onDragEnd={() => setDragging(false)}
      className="list-none"
    >
      <ExerciseCard
        exercise={row}
        preview={preview}
        onChange={onChange}
        onDuplicate={onDuplicate}
        onDelete={onDelete}
        isDragging={dragging}
        dragHandleProps={{
          // Pointer events rather than onMouseDown: this has to work with a
          // thumb, and touch is the primary input for this screen.
          onPointerDown: (e) => { e.preventDefault(); controls.start(e); },
        }}
      />
    </Reorder.Item>
  );
}

function WeekStep({
  children, label, disabled, onClick,
}: { children: React.ReactNode; label: string; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-[12px] disabled:opacity-30"
      style={{ color: 'var(--text-muted)' }}
    >
      {children}
    </button>
  );
}

function SaveIndicator({ status }: { status: ReturnType<typeof useAutosave>['status'] }) {
  if (status === 'idle') return null;
  const label = saveStatusLabel(status);
  const tone =
    status === 'error' ? 'var(--danger-text)'
      : status === 'saved' ? 'var(--success-text)'
        : 'var(--text-muted)';
  return (
    <div
      // polite, not assertive: a save confirmation should not interrupt a
      // screen-reader user mid-sentence.
      role="status"
      aria-live="polite"
      className="flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11.5px] font-[700]"
      style={{ background: 'var(--bg-subtle)', color: tone }}
    >
      {status === 'saving' && <Loader2 size={12} className="animate-spin" />}
      {status === 'saved' && <Check size={12} />}
      {status === 'error' && <CloudOff size={12} />}
      {label}
    </div>
  );
}
